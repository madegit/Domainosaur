// Core domain valuation algorithm implementing the 10-factor system
import type { ValuationFactors, FactorWeights, FactorBreakdown, DomainAppraisal } from '../types'
import { findKeywordValue } from '../data/industry-keywords'
import { findComparables } from '../data/sample-comps'
import { findDatabaseComparables } from './database-comps'
import { analyzeBrandability, estimateTraffic, analyzeTrademarkRisk, getWhoisData, type WhoisData } from './xai'

export const DEFAULT_WEIGHTS: FactorWeights = {
  length: 0.12,
  keywords: 0.20,
  tld: 0.15,
  brandability: 0.15,
  industry: 0.10,
  comps: 0.12,
  age: 0.06,
  traffic: 0.04,
  liquidity: 0.06,
  legal: 0.0 // Legal is a gating factor (multiplier), not weighted
}

// Legal brand list for trademark risk assessment
const LEGAL_BRANDS = [
  'google', 'facebook', 'amazon', 'microsoft', 'apple', 'twitter', 'instagram', 
  'youtube', 'linkedin', 'netflix', 'tesla', 'uber', 'airbnb', 'spotify', 
  'paypal', 'visa', 'mastercard', 'coca-cola', 'pepsi', 'nike', 'adidas', 
  'samsung', 'sony', 'intel', 'oracle', 'salesforce', 'adobe', 'zoom', 
  'slack', 'dropbox', 'github', 'reddit', 'pinterest', 'snapchat', 'tiktok', 
  'whatsapp', 'telegram', 'discord', 'twitch', 'shopify', 'square', 'stripe'
]

export function scoreLengthAndSimplicity(domain: string): number {
  // Extract domain name without TLD
  const domainName = domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz|info|biz|me|tv|cc|ly|gl|tech|online|store|blog|site|news|pro|club|agency|studio|digital|dev|design|marketing|services|solutions|group|ventures|holdings|capital|fund|invest|crypto|blockchain|finance|bank|pay|wallet|trade|exchange|market|shop|buy|sell|deal|sale|cart|travel|hotel|flight|trip|vacation|booking|resort|learn|education|course|study|school|training|food|restaurant|delivery|recipe|kitchen|real|estate|property|home|house|rent|game|gaming|play|entertainment|fun|business|work|career|job|hire|health|medical|care|wellness|fitness|doctor|therapy|clinic|tech|software|cloud|data|digital|smart|auto|bot|ai)$/, '')
  
  const length = domainName.length
  const wordCount = domainName.split(/[-_]/).length
  const hasHyphen = domainName.includes('-')
  const hasNumber = /\d/.test(domainName)
  const hasUnderscore = domainName.includes('_')
  
  let score = 0
  
  // Base score based on length
  if (length <= 6) {
    score = 100
  } else if (length <= 10) {
    score = 70
  } else if (length <= 15) {
    score = 40
  } else {
    score = 20
  }
  
  // Penalties
  if (hasHyphen) score -= 20
  if (hasNumber) score -= 10
  if (hasUnderscore) score -= 15
  if (wordCount > 3) score -= 10
  
  return Math.max(0, score)
}

export function scoreKeywords(domain: string): { score: number; industry: string; keywords: string[] } {
  const result = findKeywordValue(domain)
  return {
    score: result.score,
    industry: result.industry,
    keywords: result.matchedKeywords
  }
}

export function scoreTLD(domain: string, targetCountry?: string): number {
  const tld = domain.toLowerCase().split('.').pop() || ''
  
  switch (tld) {
    case 'com':
      return 100
    case 'net':
    case 'org':
      return 70
    case 'io':
    case 'ai':
      return 65
    case 'co':
    case 'me':
      return 60
    case 'app':
    case 'tech':
    case 'dev':
      return 55
    case 'xyz':
    case 'info':
    case 'biz':
      return 45
    default:
      // Country code TLDs - boost if matches target country
      if (tld.length === 2) {
        return targetCountry && targetCountry.toLowerCase() === tld ? 75 : 50
      }
      return 40
  }
}

export function scoreIndustryRelevance(industry: string, keywords: string[]): number {
  const highValueIndustries = ['finance', 'technology', 'health', 'ecommerce', 'travel']
  const mediumValueIndustries = ['education', 'realestate', 'business', 'gaming']
  
  let baseScore = 30
  
  if (highValueIndustries.includes(industry)) {
    baseScore = 85
  } else if (mediumValueIndustries.includes(industry)) {
    baseScore = 60
  } else if (industry !== 'generic') {
    baseScore = 45
  }
  
  // Bonus for multiple relevant keywords
  if (keywords.length >= 2) {
    baseScore = Math.min(100, baseScore + 10)
  }
  
  return baseScore
}

export function scoreComparableSales(domain: string, comps: any[] = []): number {
  if (!comps || comps.length === 0) {
    return 50
  }
  
  // Calculate average similarity score from comparables
  const avgSimilarity = comps.reduce((sum, comp) => sum + (comp.similarity || 0), 0) / comps.length
  
  // Convert similarity to score (0-100 scale)
  // High similarity (80+) = good comps data = high score (80-90)
  // Medium similarity (50-80) = decent comps = medium score (60-80)  
  // Low similarity (20-50) = weak comps = lower score (40-60)
  
  if (avgSimilarity >= 80) {
    return 85
  } else if (avgSimilarity >= 60) {
    return 75
  } else if (avgSimilarity >= 40) {
    return 65
  } else if (avgSimilarity >= 20) {
    return 55
  } else {
    return 50
  }
}

export async function scoreDomainAge(domain: string, providedAgeInYears?: number, skipNetwork?: boolean): Promise<{score: number; dataSource: string; error?: string}> {
  // If age is already provided, use it
  if (providedAgeInYears) {
    return {
      score: calculateAgeScore(providedAgeInYears), 
      dataSource: 'user_provided'
    }
  }

  // Skip network calls for fast evaluation mode
  if (skipNetwork) {
    return {
      score: 25, // Conservative neutral score for fast evaluation
      dataSource: 'estimated',
      error: 'Network calls skipped for fast evaluation'
    }
  }

  // Try to fetch real domain age from WHOIS API
  try {
    const ageInYears = await fetchDomainAge(domain)
    if (ageInYears !== null) {
      return {
        score: calculateAgeScore(ageInYears), 
        dataSource: 'ip2whois_api',
        error: undefined
      }
    }
  } catch (error) {
    console.warn('Failed to fetch domain age:', error)
    return {
      score: 25, 
      dataSource: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error fetching domain age'
    }
  }

  // Fallback to neutral score if unable to determine age
  return {
    score: 25, 
    dataSource: 'fallback',
    error: 'No age data available'
  }
}

function calculateAgeScore(ageInYears: number): number {
  if (ageInYears >= 15) {
    return 95
  } else if (ageInYears >= 10) {
    return 90
  } else if (ageInYears >= 5) {
    return 70
  } else if (ageInYears >= 2) {
    return 50
  } else {
    return 25
  }
}

async function fetchDomainAge(domain: string): Promise<number | null> {
  // Check if API key is configured
  const apiKey = process.env.IP2WHOIS_API_KEY
  if (!apiKey || apiKey.includes('your_') || apiKey.trim() === '') {
    throw new Error('IP2WHOIS API key not configured - using fallback data')
  }

  // IP2WHOIS API implementation (free tier available)
  const API_URL = 'https://api.ip2whois.com/v2'
  
  try {
    const response = await fetch(`${API_URL}?key=${apiKey}&domain=${domain}`)
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(`Invalid IP2WHOIS API key - check your credentials`)
      }
      throw new Error(`WHOIS API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.create_date) {
      const creationDate = new Date(data.create_date)
      const now = new Date()
      const ageInYears = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      return Math.floor(ageInYears * 10) / 10 // Round to 1 decimal place
    }
    
    return null
  } catch (error) {
    console.log('Domain age data unavailable:', error instanceof Error ? error.message : 'Unknown error')
    return null // Return null instead of throwing to prevent stack traces in logs
  }
}

export async function scoreDomainTraffic(domain: string, providedMonthlyTraffic?: number): Promise<{score: number; dataSource: string; error?: string}> {
  // If traffic data is already provided, use it
  if (providedMonthlyTraffic && providedMonthlyTraffic > 0) {
    return {
      score: calculateTrafficScore(providedMonthlyTraffic),
      dataSource: 'user_provided'
    }
  }

  // Use AI-powered traffic estimation
  try {
    const monthlyTraffic = await estimateDomainTraffic(domain)
    return {
      score: calculateTrafficScore(monthlyTraffic),
      dataSource: 'ai_estimate'
    }
  } catch (error) {
    console.warn('Failed to estimate domain traffic:', error)
    return {
      score: 20,
      dataSource: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error estimating traffic'
    }
  }

  // Fallback to low score if unable to determine traffic
  return {
    score: 20,
    dataSource: 'fallback',
    error: 'No traffic data available'
  }
}

function calculateTrafficScore(monthlyTraffic: number): number {
  if (monthlyTraffic >= 1000000) {
    return 95
  } else if (monthlyTraffic >= 100000) {
    return 90
  } else if (monthlyTraffic >= 10000) {
    return 70
  } else if (monthlyTraffic >= 1000) {
    return 50
  } else if (monthlyTraffic >= 100) {
    return 30
  } else {
    return 20
  }
}

async function estimateDomainTraffic(domain: string): Promise<number> {
  // Use AI-powered traffic estimation instead of expensive SimilarWeb API
  try {
    const trafficEstimate = await estimateTraffic(domain)
    return trafficEstimate.monthlyTraffic
  } catch (error) {
    console.warn('Error estimating domain traffic with AI:', error)
    // Return conservative estimate
    return 100
  }
}

export function scoreLiquidity(domain: string): number {
  const domainName = domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz|info|biz)$/, '')
  const tld = domain.toLowerCase().split('.').pop() || ''
  const length = domainName.length
  
  // Very high liquidity patterns
  if (tld === 'com') {
    if (length <= 3 && /^[a-z]+$/.test(domainName)) {
      return 100 // LLL.com, LL.com
    }
    if (length <= 6 && /^[a-z]+$/.test(domainName) && !domainName.includes('-')) {
      return 90 // Short dictionary words
    }
  }
  
  // High liquidity
  if (tld === 'com' && length <= 8 && !domainName.includes('-') && !domainName.includes('_')) {
    return 80
  }
  
  // Medium liquidity
  if ((tld === 'com' || tld === 'net' || tld === 'org') && length <= 12) {
    return 60
  }
  
  // Lower liquidity for newer TLDs or longer domains
  if (length <= 10) {
    return 45
  }
  
  return 25
}

export async function assessLegalRisk(domain: string): Promise<{ flag: 'clear' | 'warning' | 'severe'; multiplier: number; score: number }> {
  const domainName = domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz|info|biz)$/, '')
  
  // Use AI-powered trademark analysis first
  try {
    const trademarkResult = await checkAITrademarkConflicts(domainName)
    if (trademarkResult.hasConflict) {
      return {
        flag: trademarkResult.severity,
        multiplier: trademarkResult.severity === 'severe' ? 0 : trademarkResult.severity === 'warning' ? 0.5 : 1.0,
        score: trademarkResult.severity === 'severe' ? 0 : trademarkResult.severity === 'warning' ? 25 : 100
      }
    }
  } catch (error) {
    console.warn('Failed to check trademark with AI:', error)
  }

  // Fallback to static brand checking
  return assessStaticLegalRisk(domainName)
}

async function checkAITrademarkConflicts(term: string): Promise<{hasConflict: boolean; severity: 'clear' | 'warning' | 'severe'}> {
  // Use AI-powered trademark analysis instead of expensive MarkerAPI
  try {
    const trademarkResult = await analyzeTrademarkRisk(term)
    return {
      hasConflict: trademarkResult.hasConflict,
      severity: trademarkResult.severity
    }
  } catch (error) {
    console.warn('Error analyzing trademark risk with AI:', error)
    throw error
  }
}

function assessStaticLegalRisk(domainName: string): { flag: 'clear' | 'warning' | 'severe'; multiplier: number; score: number } {
  // Enhanced static brand list (keeping as fallback)
  const ENHANCED_LEGAL_BRANDS = [
    ...LEGAL_BRANDS,
    'chatgpt', 'openai', 'anthropic', 'claude', 'midjourney', 'stability',
    'binance', 'coinbase', 'kraken', 'ftx', 'ethereum', 'polygon',
    'shopify', 'etsy', 'walmart', 'target', 'bestbuy', 'macys',
    'booking', 'expedia', 'marriott', 'hilton', 'hyatt', 'airbnb'
  ]
  
  // Check for exact matches - severe risk
  for (const brand of ENHANCED_LEGAL_BRANDS) {
    if (domainName === brand) {
      return { flag: 'severe', multiplier: 0, score: 0 }
    }
  }
  
  // Check for brand + common suffixes - warning only (not severe)
  for (const brand of ENHANCED_LEGAL_BRANDS) {
    if (domainName === brand + 's' || domainName === brand + 'app' || 
        domainName === brand + 'api' || domainName === brand + 'pro' ||
        domainName === brand + 'hub' || domainName === brand + 'store') {
      return { flag: 'warning', multiplier: 0.7, score: 40 }
    }
  }
  
  // Check for word boundary matches (avoid false positives like "evisa")
  for (const brand of ENHANCED_LEGAL_BRANDS) {
    if (brand.length >= 5) { // Only check longer brands to avoid common words
      const wordBoundaryRegex = new RegExp(`\\b${brand}\\b`)
      if (wordBoundaryRegex.test(domainName)) {
        return { flag: 'warning', multiplier: 0.6, score: 30 }
      }
    }
  }
  
  return { flag: 'clear', multiplier: 1.0, score: 100 }
}

export function mapScoreToPriceBracket(score: number): { min: number; max: number; bracket: string } {
  // Recalibrated price brackets to reflect realistic market values
  if (score >= 80) {
    return { min: 5000, max: 50000, bracket: '80-100' }
  } else if (score >= 60) {
    return { min: 1000, max: 5000, bracket: '60-80' }
  } else if (score >= 40) {
    return { min: 300, max: 1000, bracket: '40-60' }
  } else if (score >= 20) {
    return { min: 100, max: 300, bracket: '20-40' }
  } else {
    return { min: 25, max: 100, bracket: '0-20' }
  }
}

export function calculatePriceEstimate(finalScore: number, compsMedian?: number): { investor: string; retail: string; explanation: string } {
  const bracket = mapScoreToPriceBracket(finalScore)
  const bracketMidpoint = (bracket.min + bracket.max) / 2
  
  let investorPrice = bracket.min
  let retailPrice = bracketMidpoint
  
  if (compsMedian && compsMedian > 0) {
    // Blend comps median with bracket midpoint (60/40 favoring comps)
    retailPrice = Math.round(0.6 * compsMedian + 0.4 * bracketMidpoint)
    investorPrice = Math.round(retailPrice * 0.6) // Investor price is typically 40% less
  }
  
  const explanation = compsMedian 
    ? `Price estimate based on ${finalScore.toFixed(1)}/100 score and comparable sales data.`
    : `Price estimate based on ${finalScore.toFixed(1)}/100 algorithmic score. Add comparable sales data for more accurate pricing.`
  
  return {
    investor: `$${investorPrice.toLocaleString()}`,
    retail: `$${retailPrice.toLocaleString()}`,
    explanation
  }
}

export async function evaluateDomain(
  domain: string, 
  options: { 
    userTraffic?: number; 
    country?: string; 
    useComps?: boolean;
    domainAge?: number;
    skipWhois?: boolean; // New option for fast evaluation
  } = {},
  weights: FactorWeights = DEFAULT_WEIGHTS
): Promise<DomainAppraisal> {
  
  // Get WHOIS data only if not skipping (for fast evaluation)
  let whoisData: WhoisData
  if (options.skipWhois) {
    // Use fallback WHOIS data for fast evaluation
    whoisData = {
      domain: domain,
      isAvailable: true, // Default assumption for faster processing
      ageInYears: 0 // Will be updated in background
    }
  } else {
    whoisData = await getWhoisData(domain)
  }
  
  // Score each factor
  const lengthScore = scoreLengthAndSimplicity(domain)
  const keywordResult = scoreKeywords(domain)
  const tldScore = scoreTLD(domain, options.country)
  const industryScore = scoreIndustryRelevance(keywordResult.industry, keywordResult.keywords)
  
  // Load comparable sales - use database comparables if available, fallback to sample data
  let comparables
  if (options.useComps !== false) {
    try {
      comparables = await findDatabaseComparables(domain, 5)
      if (comparables.length === 0) {
        // Fallback to sample data if no database comparables found
        comparables = await findComparables(domain, 5)
        console.log(`Using sample comparables for ${domain} (no database matches found)`)
      } else {
        console.log(`Using ${comparables.length} database comparables for ${domain}`)
      }
    } catch (error) {
      console.error('Database comparables error, falling back to sample data:', error)
      comparables = await findComparables(domain, 5)
    }
  } else {
    comparables = []
  }
  const compsScore = scoreComparableSales(domain, comparables)
  const ageResult = await scoreDomainAge(domain, whoisData.ageInYears || options.domainAge, options.skipWhois)
  const trafficResult = await scoreDomainTraffic(domain, options.userTraffic)
  const liquidityScore = scoreLiquidity(domain)
  
  // Get AI brandability score
  const brandabilityResult = await analyzeBrandability(domain)
  
  // Assess legal risk
  const legalRisk = await assessLegalRisk(domain)
  
  // Apply availability penalty - if domain is not available, reduce value significantly
  // Use conservative estimate when WHOIS is skipped
  const availabilityMultiplier = options.skipWhois ? 0.8 : (whoisData.isAvailable ? 1.0 : 0.6)
  
  // Calculate weighted score
  const breakdown: FactorBreakdown[] = [
    { factor: 'length', score: lengthScore, weight: weights.length, contribution: weights.length * lengthScore },
    { factor: 'keywords', score: keywordResult.score, weight: weights.keywords, contribution: weights.keywords * keywordResult.score },
    { factor: 'tld', score: tldScore, weight: weights.tld, contribution: weights.tld * tldScore },
    { factor: 'brandability', score: brandabilityResult.score, weight: weights.brandability, contribution: weights.brandability * brandabilityResult.score },
    { factor: 'industry', score: industryScore, weight: weights.industry, contribution: weights.industry * industryScore },
    { factor: 'comps', score: compsScore, weight: weights.comps, contribution: weights.comps * compsScore },
    { factor: 'age', score: ageResult.score, weight: weights.age, contribution: weights.age * ageResult.score },
    { factor: 'traffic', score: trafficResult.score, weight: weights.traffic, contribution: weights.traffic * trafficResult.score },
    { factor: 'liquidity', score: liquidityScore, weight: weights.liquidity, contribution: weights.liquidity * liquidityScore },
    { factor: 'legal', score: legalRisk.score, weight: 0, contribution: 0, description: `${legalRisk.flag.toUpperCase()}: Acts as ${legalRisk.multiplier}x multiplier` },
    { factor: 'availability', score: options.skipWhois ? 80 : (whoisData.isAvailable ? 100 : 60), weight: 0, contribution: 0, description: options.skipWhois ? 'ESTIMATED: Acts as 0.8x multiplier' : `${whoisData.isAvailable ? 'AVAILABLE' : 'TAKEN'}: Acts as ${availabilityMultiplier}x multiplier` }
  ]
  
  const rawScore = breakdown.reduce((sum, factor) => sum + factor.contribution, 0)
  const finalScore = rawScore * legalRisk.multiplier * availabilityMultiplier
  
  // Calculate price estimate with comps median
  const sortedComparables = [...comparables].sort((a, b) => a.soldPrice - b.soldPrice)
  const compsMedian = comparables.length > 0 
    ? sortedComparables[Math.floor(sortedComparables.length / 2)].soldPrice
    : undefined
    
  const priceEstimate = calculatePriceEstimate(finalScore, compsMedian)
  const bracket = mapScoreToPriceBracket(finalScore)
  
  return {
    domain,
    finalScore,
    bracket: bracket.bracket,
    priceEstimate,
    breakdown,
    legalFlag: legalRisk.flag,
    aiComment: brandabilityResult.commentary,
    comps: comparables,
    whoisData
  }
}