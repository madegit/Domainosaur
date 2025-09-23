// Core domain valuation algorithm implementing the 10-factor system
import type { ValuationFactors, FactorWeights, FactorBreakdown, DomainAppraisal } from '@/types'
import { findKeywordValue } from '@/data/industry-keywords'
import { analyzeBrandability } from './xai'

export const DEFAULT_WEIGHTS: FactorWeights = {
  length: 0.12,
  keywords: 0.20,
  tld: 0.15,
  brandability: 0.15,
  industry: 0.10,
  comps: 0.12,
  age: 0.06,
  traffic: 0.04,
  liquidity: 0.06
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
  return findKeywordValue(domain)
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
  // For MVP, return neutral score if no comps available
  if (!comps || comps.length === 0) {
    return 50
  }
  
  // TODO: Implement similarity scoring based on:
  // - Length similarity
  // - Keyword similarity  
  // - TLD similarity
  // - Industry relevance
  
  return 50
}

export function scoreAge(domain: string, ageInYears?: number): number {
  if (!ageInYears) {
    // Default to new domain if age not provided
    return 25
  }
  
  if (ageInYears >= 10) {
    return 90
  } else if (ageInYears >= 5) {
    return 70
  } else if (ageInYears >= 2) {
    return 50
  } else {
    return 25
  }
}

export function scoreTraffic(domain: string, monthlyTraffic?: number): number {
  if (!monthlyTraffic || monthlyTraffic === 0) {
    return 20
  }
  
  if (monthlyTraffic >= 100000) {
    return 90
  } else if (monthlyTraffic >= 10000) {
    return 70
  } else if (monthlyTraffic >= 1000) {
    return 50
  } else {
    return 30
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

export function assessLegalRisk(domain: string): { flag: 'clear' | 'warning' | 'severe'; multiplier: number } {
  const domainName = domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz|info|biz)$/, '')
  
  // Check for exact matches
  for (const brand of LEGAL_BRANDS) {
    if (domainName === brand || domainName === brand + 's' || domainName === brand + 'app' || domainName === brand + 'api') {
      return { flag: 'severe', multiplier: 0 }
    }
  }
  
  // Check for substring matches
  for (const brand of LEGAL_BRANDS) {
    if (domainName.includes(brand) && brand.length >= 4) {
      return { flag: 'warning', multiplier: 0.5 }
    }
  }
  
  return { flag: 'clear', multiplier: 1.0 }
}

export function mapScoreToPriceBracket(score: number): { min: number; max: number; bracket: string } {
  if (score >= 80) {
    return { min: 100000, max: 5000000, bracket: '80-100' }
  } else if (score >= 60) {
    return { min: 10000, max: 100000, bracket: '60-80' }
  } else if (score >= 40) {
    return { min: 1500, max: 10000, bracket: '40-60' }
  } else if (score >= 20) {
    return { min: 500, max: 1500, bracket: '20-40' }
  } else {
    return { min: 50, max: 500, bracket: '0-20' }
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
  } = {},
  weights: FactorWeights = DEFAULT_WEIGHTS
): Promise<DomainAppraisal> {
  
  // Score each factor
  const lengthScore = scoreLengthAndSimplicity(domain)
  const keywordResult = scoreKeywords(domain)
  const tldScore = scoreTLD(domain, options.country)
  const industryScore = scoreIndustryRelevance(keywordResult.industry, keywordResult.keywords)
  const compsScore = scoreComparableSales(domain, []) // TODO: Load actual comps
  const ageScore = scoreAge(domain, options.domainAge)
  const trafficScore = scoreTraffic(domain, options.userTraffic)
  const liquidityScore = scoreLiquidity(domain)
  
  // Get AI brandability score
  const brandabilityResult = await analyzeBrandability(domain)
  
  // Assess legal risk
  const legalRisk = assessLegalRisk(domain)
  
  // Calculate weighted score
  const breakdown: FactorBreakdown[] = [
    { factor: 'length', score: lengthScore, weight: weights.length, contribution: weights.length * lengthScore },
    { factor: 'keywords', score: keywordResult.score, weight: weights.keywords, contribution: weights.keywords * keywordResult.score },
    { factor: 'tld', score: tldScore, weight: weights.tld, contribution: weights.tld * tldScore },
    { factor: 'brandability', score: brandabilityResult.score, weight: weights.brandability, contribution: weights.brandability * brandabilityResult.score },
    { factor: 'industry', score: industryScore, weight: weights.industry, contribution: weights.industry * industryScore },
    { factor: 'comps', score: compsScore, weight: weights.comps, contribution: weights.comps * compsScore },
    { factor: 'age', score: ageScore, weight: weights.age, contribution: weights.age * ageScore },
    { factor: 'traffic', score: trafficScore, weight: weights.traffic, contribution: weights.traffic * trafficScore },
    { factor: 'liquidity', score: liquidityScore, weight: weights.liquidity, contribution: weights.liquidity * liquidityScore }
  ]
  
  const rawScore = breakdown.reduce((sum, factor) => sum + factor.contribution, 0)
  const finalScore = rawScore * legalRisk.multiplier
  
  const priceEstimate = calculatePriceEstimate(finalScore)
  const bracket = mapScoreToPriceBracket(finalScore)
  
  return {
    domain,
    finalScore,
    bracket: bracket.bracket,
    priceEstimate,
    breakdown,
    legalFlag: legalRisk.flag,
    aiComment: brandabilityResult.commentary,
    comps: [] // TODO: Load actual comparable sales
  }
}