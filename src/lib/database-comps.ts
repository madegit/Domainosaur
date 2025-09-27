import { getSupabaseClient } from './database'
import type { ComparableSale } from '../types'
import { extractTLD, extractDomainName } from './tld-utils'

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
  try {
    const targetInfo = extractDomainInfo(targetDomain)
    if (!targetInfo) {
      return []
    }
    
    const supabase = await getSupabaseClient()
    
    // Calculate reasonable price range based on domain characteristics
    const estimatedPriceRange = estimatePriceRange(targetInfo)
    
    // Get candidates using Supabase query
    // We'll filter by similar characteristics and then calculate similarity
    const { data: candidates, error } = await supabase
      .from('domain_sales')
      .select('date, domain, price, venue')
      .gte('price', estimatedPriceRange.min)
      .lte('price', estimatedPriceRange.max)
      .gte('date', '2014-01-01') // Recent sales (last 10+ years)
      .order('date', { ascending: false })
      .limit(limit * 10) // Get more candidates to choose from
    
    if (error) {
      console.error('Error querying domain sales:', error)
      return []
    }
    
    if (!candidates || candidates.length === 0) {
      return []
    }
    
    // Calculate similarity scores for each candidate
    const comparables: ComparableSale[] = []
    
    for (const row of candidates) {
      const candidateInfo = extractDomainInfo(row.domain)
      if (!candidateInfo) continue
      
      const similarity = Math.round(calculateSimilarity(targetInfo, candidateInfo, weights))
      
      if (similarity >= 40) { // Only include reasonably similar domains
        comparables.push({
          domain: row.domain,
          soldPrice: row.price,
          soldDate: row.date,
          source: `Database (${row.venue})`,
          similarity: similarity
        })
      }
    }
    
    // Sort by similarity and take top results
    comparables.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    const finalComparables = comparables.slice(0, limit)
    
    console.log(`Found ${finalComparables.length} comparable domain sales for ${targetDomain}`)
    return finalComparables
    
  } catch (error) {
    console.error('Error finding database comparables:', error)
    return []
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
  const lowerDomain = domain.toLowerCase().trim()
  
  if (!lowerDomain.includes('.')) {
    return null
  }
  
  const tld = extractTLD(lowerDomain)
  const domainName = extractDomainName(lowerDomain)
  
  if (!tld || !domainName) {
    return null
  }
  
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
  try {
    const supabase = await getSupabaseClient()
    
    // Get total count and basic stats
    const { count: totalRecords, error: countError } = await supabase
      .from('domain_sales')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Error getting total count:', countError)
      return getDefaultStats()
    }
    
    // Get aggregated stats
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_domain_sales_stats')
    
    if (statsError) {
      // Fallback: get basic stats with separate queries
      const { data: priceData } = await supabase
        .from('domain_sales')
        .select('price')
        .order('price', { ascending: false })
        .limit(1000)
      
      const { data: dateData } = await supabase
        .from('domain_sales')
        .select('date')
        .order('date', { ascending: true })
        .limit(1)
      
      const { data: latestDateData } = await supabase
        .from('domain_sales')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
      
      const avgPrice = priceData ? 
        Math.round(priceData.reduce((sum, row) => sum + row.price, 0) / priceData.length) : 0
      
      return {
        total_records: totalRecords || 0,
        unique_tlds: 'N/A',
        avg_price: avgPrice,
        oldest_sale: dateData?.[0]?.date || null,
        newest_sale: latestDateData?.[0]?.date || null
      }
    }
    
    return {
      total_records: totalRecords || 0,
      unique_tlds: statsData?.unique_tlds || 'N/A',
      avg_price: Math.round(statsData?.avg_price || 0),
      oldest_sale: statsData?.oldest_sale || null,
      newest_sale: statsData?.newest_sale || null
    }
    
  } catch (error) {
    console.error('Error getting comparables stats:', error)
    return getDefaultStats()
  }
}

function getDefaultStats() {
  return {
    total_records: 0,
    unique_tlds: 0,
    avg_price: 0,
    oldest_sale: null,
    newest_sale: null
  }
}