import { pool } from './database'
import type { ComparableSale } from '../types'

export interface SimilarityFactors {
  lengthWeight: number
  tldWeight: number
  keywordWeight: number
  priceRangeWeight: number
}

const DEFAULT_SIMILARITY_WEIGHTS: SimilarityFactors = {
  lengthWeight: 0.3,
  tldWeight: 0.25,
  keywordWeight: 0.3,
  priceRangeWeight: 0.15
}

/**
 * Find comparable domain sales from the database using similarity matching
 */
export async function findDatabaseComparables(
  targetDomain: string, 
  limit: number = 5,
  weights: SimilarityFactors = DEFAULT_SIMILARITY_WEIGHTS
): Promise<ComparableSale[]> {
  const client = await pool.connect()
  
  try {
    const targetInfo = extractDomainInfo(targetDomain)
    if (!targetInfo) {
      return []
    }
    
    // Query strategy: Find candidates and then calculate similarity
    const candidateQuery = `
      SELECT 
        domain, 
        sale_price, 
        sale_date, 
        sale_venue,
        domain_name,
        tld,
        domain_length,
        has_hyphens,
        has_numbers
      FROM domain_sales 
      WHERE 
        -- Same TLD gets priority, but include others
        (tld = $1 OR tld IN ('com', 'net', 'org'))
        -- Similar length (±3 characters)
        AND domain_length BETWEEN $2 AND $3
        -- Price range filtering (avoid extreme outliers)
        AND sale_price BETWEEN $4 AND $5
        -- Recent sales (last 10 years) get priority
        AND sale_date >= '2014-01-01'
      ORDER BY 
        -- Prioritize same TLD
        CASE WHEN tld = $1 THEN 0 ELSE 1 END,
        -- Prioritize similar length
        ABS(domain_length - $6),
        -- Recent sales first
        sale_date DESC
      LIMIT $7
    `
    
    // Calculate reasonable price range based on domain characteristics
    const estimatedPriceRange = estimatePriceRange(targetInfo)
    
    const result = await client.query(candidateQuery, [
      targetInfo.tld,
      Math.max(1, targetInfo.domainLength - 3), // min length
      targetInfo.domainLength + 3, // max length
      estimatedPriceRange.min,
      estimatedPriceRange.max,
      targetInfo.domainLength,
      limit * 3 // Get more candidates to choose from
    ])
    
    // Calculate similarity scores for each candidate
    const comparables: ComparableSale[] = result.rows
      .map(row => {
        const similarity = calculateSimilarity(targetInfo, {
          domainName: row.domain_name,
          tld: row.tld,
          domainLength: row.domain_length,
          hasHyphens: row.has_hyphens,
          hasNumbers: row.has_numbers
        }, weights)
        
        return {
          domain: row.domain,
          soldPrice: row.sale_price,
          soldDate: row.sale_date,
          source: `Database (${row.sale_venue})`,
          similarity: Math.round(similarity)
        }
      })
      .filter(comp => comp.similarity >= 40) // Only include reasonably similar domains
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0)) // Sort by similarity
      .slice(0, limit) // Take top results
    
    return comparables
    
  } catch (error) {
    console.error('Error finding database comparables:', error)
    return []
  } finally {
    client.release()
  }
}

/**
 * Calculate similarity between target domain and candidate
 */
function calculateSimilarity(
  target: DomainInfo, 
  candidate: DomainInfo, 
  weights: SimilarityFactors
): number {
  let similarityScore = 0
  
  // 1. Length similarity (closer lengths are more similar)
  const lengthDiff = Math.abs(target.domainLength - candidate.domainLength)
  const lengthSimilarity = Math.max(0, 100 - (lengthDiff * 10))
  similarityScore += lengthSimilarity * weights.lengthWeight
  
  // 2. TLD similarity
  const tldSimilarity = target.tld === candidate.tld ? 100 : 
                       (target.tld === 'com' || candidate.tld === 'com') ? 60 : 40
  similarityScore += tldSimilarity * weights.tldWeight
  
  // 3. Keyword/pattern similarity
  const keywordSimilarity = calculateKeywordSimilarity(target.domainName, candidate.domainName)
  similarityScore += keywordSimilarity * weights.keywordWeight
  
  // 4. Structure similarity (hyphens, numbers)
  const structureSimilarity = calculateStructureSimilarity(target, candidate)
  similarityScore += structureSimilarity * weights.priceRangeWeight
  
  return Math.min(100, Math.max(0, similarityScore))
}

/**
 * Calculate keyword/pattern similarity between domain names
 */
function calculateKeywordSimilarity(target: string, candidate: string): number {
  // Exact match
  if (target === candidate) return 100
  
  // Check for common substrings
  const targetWords = extractWords(target)
  const candidateWords = extractWords(candidate)
  
  if (targetWords.length === 0 || candidateWords.length === 0) {
    return 20 // Fallback similarity
  }
  
  // Calculate Jaccard similarity of word sets
  const targetSet = new Set(targetWords)
  const candidateSet = new Set(candidateWords)
  
  const intersection = new Set([...targetSet].filter(x => candidateSet.has(x)))
  const union = new Set([...targetSet, ...candidateSet])
  
  const jaccardSimilarity = intersection.size / union.size
  
  // Also check for partial matches and common patterns
  let patternBonus = 0
  
  // Check for common prefixes/suffixes
  if (target.startsWith(candidate.substring(0, 3)) || candidate.startsWith(target.substring(0, 3))) {
    patternBonus += 20
  }
  
  // Check for shared industry keywords
  const industryKeywords = ['shop', 'buy', 'sell', 'tech', 'app', 'web', 'net', 'online', 'digital']
  const targetHasIndustry = industryKeywords.some(kw => target.includes(kw))
  const candidateHasIndustry = industryKeywords.some(kw => candidate.includes(kw))
  
  if (targetHasIndustry && candidateHasIndustry) {
    patternBonus += 15
  }
  
  return Math.min(100, (jaccardSimilarity * 60) + patternBonus)
}

/**
 * Extract meaningful words from domain name
 */
function extractWords(domain: string): string[] {
  // Split on common separators and extract meaningful parts
  return domain
    .toLowerCase()
    .split(/[-_]/)
    .flatMap(part => {
      // Try to split camelCase and extract known words
      return part.match(/[a-z]+/g) || []
    })
    .filter(word => word.length >= 2) // Filter very short words
}

/**
 * Calculate structure similarity (hyphens, numbers, etc.)
 */
function calculateStructureSimilarity(target: DomainInfo, candidate: DomainInfo): number {
  let score = 100
  
  // Penalize different hyphen usage
  if (target.hasHyphens !== candidate.hasHyphens) {
    score -= 30
  }
  
  // Penalize different number usage
  if (target.hasNumbers !== candidate.hasNumbers) {
    score -= 20
  }
  
  return Math.max(0, score)
}

/**
 * Estimate reasonable price range for filtering
 */
function estimatePriceRange(domainInfo: DomainInfo): { min: number; max: number } {
  let baseMin = 100
  let baseMax = 100000
  
  // Adjust based on TLD
  if (domainInfo.tld === 'com') {
    baseMin = 500
    baseMax = 500000
  } else if (['net', 'org'].includes(domainInfo.tld)) {
    baseMin = 200
    baseMax = 100000
  } else if (['io', 'ai'].includes(domainInfo.tld)) {
    baseMin = 300
    baseMax = 150000
  }
  
  // Adjust based on length
  if (domainInfo.domainLength <= 4) {
    baseMin *= 5
    baseMax *= 10
  } else if (domainInfo.domainLength <= 6) {
    baseMin *= 2
    baseMax *= 5
  } else if (domainInfo.domainLength >= 15) {
    baseMin = Math.max(100, baseMin / 2)
    baseMax = Math.max(1000, baseMax / 3)
  }
  
  return { min: baseMin, max: baseMax }
}

interface DomainInfo {
  domainName: string
  tld: string
  domainLength: number
  hasHyphens: boolean
  hasNumbers: boolean
}

/**
 * Extract domain information for analysis
 */
function extractDomainInfo(domain: string): DomainInfo | null {
  const lowerDomain = domain.toLowerCase()
  const parts = lowerDomain.split('.')
  
  if (parts.length < 2) {
    return null
  }
  
  const tld = parts[parts.length - 1]
  const domainName = parts.slice(0, -1).join('.')
  
  return {
    domainName,
    tld,
    domainLength: domainName.length,
    hasHyphens: domainName.includes('-'),
    hasNumbers: /\d/.test(domainName)
  }
}

/**
 * Get statistics about comparable sales for debugging
 */
export async function getComparablesStats(): Promise<any> {
  const client = await pool.connect()
  
  try {
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT tld) as unique_tlds,
        AVG(sale_price)::int as avg_price,
        MIN(sale_date) as oldest_sale,
        MAX(sale_date) as newest_sale
      FROM domain_sales
    `)
    
    return stats.rows[0]
  } finally {
    client.release()
  }
}