// Core domain valuation algorithm implementing the 10-factor system
import type { ValuationFactors, FactorWeights, FactorBreakdown, DomainAppraisal, ComparableSale } from '../types'
import { findKeywordValue } from '../data/industry-keywords'
import { findComparables } from '../data/sample-comps'
import { findDatabaseComparables } from './database-comps'
import { analyzeBrandability, estimateTraffic, analyzeTrademarkRisk, getWhoisData, type WhoisData } from './xai'
import { extractTLD, extractDomainName, getTLDScore } from './tld-utils'

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
  // Extract domain name without TLD using proper TLD extraction
  const domainName = extractDomainName(domain)
  
  const length = domainName.length
  const wordCount = domainName.split(/[-_]/).length
  const hasHyphen = domainName.includes('-')
  const hasNumber = /\d/.test(domainName)
  const hasUnderscore = domainName.includes('_')
  
  let score = 0
  
  // Premium short domain scoring - reflects extreme rarity and value
  if (length === 1) {
    score = 100 // Practically impossible to get
  } else if (length === 2) {
    score = 100 // Extremely rare, mostly reserved
  } else if (length === 3) {
    score = 100 // Super rare and extremely valuable
  } else if (length === 4) {
    score = 95  // Rare and very valuable
  } else if (length === 5) {
    score = 85  // Valuable and sought after
  } else if (length === 6) {
    score = 75  // Good length, still valuable
  } else if (length === 7) {
    score = 65  // Decent length
  } else if (length === 8) {
    score = 55  // Acceptable length
  } else if (length <= 10) {
    score = 45  // Moderate length
  } else if (length <= 12) {
    score = 35  // Getting long
  } else if (length <= 15) {
    score = 25  // Long domain
  } else {
    score = 15  // Very long, hard to remember
  }
  
  // Penalties for complexity
  if (hasHyphen) score -= 20
  if (hasNumber) {
    // Numbers are less penalized in very short domains
    score -= length <= 4 ? 5 : 10
  }
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
  const tld = extractTLD(domain);
  return getTLDScore(tld, targetCountry);
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
  const domainName = extractDomainName(domain)
  const tld = extractTLD(domain)
  const length = domainName.length
  
  // Premium short domains have extremely high liquidity due to rarity
  if (tld === 'com') {
    if (length <= 2 && /^[a-z]+$/.test(domainName)) {
      return 100 // Extremely rare, instant liquidity
    }
    if (length === 3 && /^[a-z]+$/.test(domainName)) {
      return 100 // 3-letter .com - premium liquidity
    }
    if (length === 4 && /^[a-z]+$/.test(domainName)) {
      return 95 // 4-letter .com - excellent liquidity
    }
    if (length === 5 && /^[a-z]+$/.test(domainName) && !domainName.includes('-')) {
      return 90 // 5-letter .com - high liquidity
    }
    if (length <= 6 && /^[a-z]+$/.test(domainName) && !domainName.includes('-')) {
      return 85 // 6-letter .com - good liquidity
    }
  }
  
  // Premium TLD short patterns
  if (['net', 'org'].includes(tld)) {
    if (length <= 3 && /^[a-z]+$/.test(domainName)) {
      return 95 // Short premium TLD
    }
    if (length === 4 && /^[a-z]+$/.test(domainName)) {
      return 85
    }
  }
  
  // Tech TLDs
  if (['io', 'ai'].includes(tld)) {
    if (length <= 3 && /^[a-z]+$/.test(domainName)) {
      return 90
    }
    if (length === 4 && /^[a-z]+$/.test(domainName)) {
      return 80
    }
  }
  
  // Premium country TLD patterns
  if (['co.uk', 'com.au', 'co.nz'].includes(tld)) {
    if (length <= 4 && /^[a-z]+$/.test(domainName)) {
      return 85
    }
    if (length === 5 && /^[a-z]+$/.test(domainName)) {
      return 75
    }
  }
  
  // Standard scoring based on length and TLD
  let baseScore = 50
  
  if (tld === 'com') {
    if (length <= 8) baseScore = 75
    else if (length <= 12) baseScore = 65
    else baseScore = 55
  } else if (['net', 'org'].includes(tld)) {
    if (length <= 8) baseScore = 65
    else if (length <= 12) baseScore = 55
    else baseScore = 45
  } else if (['io', 'ai', 'co'].includes(tld)) {
    if (length <= 8) baseScore = 60
    else if (length <= 12) baseScore = 50
    else baseScore = 40
  } else {
    if (length <= 8) baseScore = 50
    else if (length <= 12) baseScore = 40
    else baseScore = 30
  }
  
  // Penalties for complexity
  if (domainName.includes('-')) baseScore -= 15
  if (/\d/.test(domainName)) {
    // Numbers less penalized in short domains
    baseScore -= length <= 4 ? 5 : 10
  }
  
  return Math.max(20, baseScore)
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

export function mapScoreToPriceBracket(score: number, domain?: string): { min: number; max: number; bracket: string } {
  let min: number, max: number
  
  // Check if this is a premium short .com domain for special pricing
  const isPremium3Letter = domain && extractTLD(domain) === 'com' && extractDomainName(domain).length === 3
  const isPremium4Letter = domain && extractTLD(domain) === 'com' && extractDomainName(domain).length === 4
  
  if (score >= 80) {
    if (isPremium3Letter) {
      min = 50000; max = 500000 // 3-letter .com premium range
    } else if (isPremium4Letter) {
      min = 25000; max = 100000 // 4-letter .com premium range
    } else {
      min = 5000; max = 50000 // Standard high-score range
    }
    return { min, max, bracket: '80-100' }
  } else if (score >= 60) {
    if (isPremium3Letter) {
      min = 25000; max = 100000
    } else if (isPremium4Letter) {
      min = 10000; max = 50000
    } else {
      min = 1000; max = 5000
    }
    return { min, max, bracket: '60-80' }
  } else if (score >= 40) {
    if (isPremium3Letter) {
      min = 10000; max = 50000
    } else if (isPremium4Letter) {
      min = 5000; max = 25000
    } else {
      min = 300; max = 1000
    }
    return { min, max, bracket: '40-60' }
  } else if (score >= 20) {
    min = 100; max = 300
    return { min, max, bracket: '20-40' }
  } else {
    min = 25; max = 100
    return { min, max, bracket: '0-20' }
  }
}

export function calculatePriceEstimate(finalScore: number, compsMedian?: number, domain?: string): { investor: string; retail: string; explanation: string } {
  const bracket = mapScoreToPriceBracket(finalScore, domain)
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
  
  // Check if this is a premium short domain and adjust weights accordingly
  const domainName = extractDomainName(domain)
  const tld = extractTLD(domain)
  const isPremiumShortDomain = (tld === 'com' && domainName.length <= 4) || 
                               (['net', 'org'].includes(tld) && domainName.length <= 3) ||
                               (['io', 'ai'].includes(tld) && domainName.length <= 3)
  
  // Dynamic weighting for premium short domains
  let adjustedWeights = { ...weights }
  if (isPremiumShortDomain) {
    // Significantly increase length and liquidity weights for premium short domains
    adjustedWeights = {
      length: 0.25,     // Increased from 0.12 for premium shorts
      keywords: 0.15,   // Slightly reduced
      tld: 0.20,        // Increased since premium TLD matters more
      brandability: 0.15, // Keep same
      industry: 0.05,   // Reduced since length matters more
      comps: 0.10,      // Slightly reduced  
      age: 0.03,        // Reduced
      traffic: 0.02,    // Reduced
      liquidity: 0.15,  // Significantly increased for premium shorts
      legal: 0.0        // Legal is still a multiplier
    }
  }
  
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
  let comparables: ComparableSale[]
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
  
  // Calculate weighted score using adjusted weights
  const breakdown: FactorBreakdown[] = [
    { factor: 'length', score: lengthScore, weight: adjustedWeights.length, contribution: adjustedWeights.length * lengthScore },
    { factor: 'keywords', score: keywordResult.score, weight: adjustedWeights.keywords, contribution: adjustedWeights.keywords * keywordResult.score },
    { factor: 'tld', score: tldScore, weight: adjustedWeights.tld, contribution: adjustedWeights.tld * tldScore },
    { factor: 'brandability', score: brandabilityResult.score, weight: adjustedWeights.brandability, contribution: adjustedWeights.brandability * brandabilityResult.score },
    { factor: 'industry', score: industryScore, weight: adjustedWeights.industry, contribution: adjustedWeights.industry * industryScore },
    { factor: 'comps', score: compsScore, weight: adjustedWeights.comps, contribution: adjustedWeights.comps * compsScore },
    { factor: 'age', score: ageResult.score, weight: adjustedWeights.age, contribution: adjustedWeights.age * ageResult.score },
    { factor: 'traffic', score: trafficResult.score, weight: adjustedWeights.traffic, contribution: adjustedWeights.traffic * trafficResult.score },
    { factor: 'liquidity', score: liquidityScore, weight: adjustedWeights.liquidity, contribution: adjustedWeights.liquidity * liquidityScore },
    { factor: 'legal', score: legalRisk.score, weight: 0, contribution: 0, description: `${legalRisk.flag.toUpperCase()}: Acts as ${legalRisk.multiplier}x multiplier` },
    { factor: 'availability', score: options.skipWhois ? 80 : (whoisData.isAvailable ? 100 : 60), weight: 0, contribution: 0, description: options.skipWhois ? 'ESTIMATED: Acts as 0.8x multiplier' : `${whoisData.isAvailable ? 'AVAILABLE' : 'TAKEN'}: Acts as ${availabilityMultiplier}x multiplier` }
  ]
  
  const rawScore = breakdown.reduce((sum, factor) => sum + factor.contribution, 0)
  
  // Premium domain multiplier for extremely rare short domains
  let premiumMultiplier = 1.0
  if (tld === 'com') {
    if (domainName.length === 3 && /^[a-z]+$/.test(domainName)) {
      premiumMultiplier = 1.3 // 30% bonus for 3-letter .com
    } else if (domainName.length === 4 && /^[a-z]+$/.test(domainName)) {
      premiumMultiplier = 1.15 // 15% bonus for 4-letter .com
    }
  }
  
  const finalScore = rawScore * legalRisk.multiplier * availabilityMultiplier * premiumMultiplier
  
  // Calculate price estimate with comps median
  const sortedComparables = [...comparables].sort((a, b) => a.soldPrice - b.soldPrice)
  const compsMedian = comparables.length > 0 
    ? sortedComparables[Math.floor(sortedComparables.length / 2)].soldPrice
    : undefined
    
  const priceEstimate = calculatePriceEstimate(finalScore, compsMedian, domain)
  const bracket = mapScoreToPriceBracket(finalScore, domain)
  
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