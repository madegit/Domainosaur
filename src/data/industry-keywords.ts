export interface IndustryKeyword {
  keyword: string
  industry: string
  value: number // Score multiplier for high-value keywords
}

export const industryKeywords: IndustryKeyword[] = [
  // Finance & Crypto
  { keyword: 'crypto', industry: 'finance', value: 95 },
  { keyword: 'bitcoin', industry: 'finance', value: 90 },
  { keyword: 'finance', industry: 'finance', value: 85 },
  { keyword: 'bank', industry: 'finance', value: 90 },
  { keyword: 'pay', industry: 'finance', value: 80 },
  { keyword: 'wallet', industry: 'finance', value: 85 },
  { keyword: 'loan', industry: 'finance', value: 75 },
  { keyword: 'invest', industry: 'finance', value: 80 },
  { keyword: 'trade', industry: 'finance', value: 75 },
  { keyword: 'exchange', industry: 'finance', value: 85 },
  
  // AI & Technology
  { keyword: 'ai', industry: 'technology', value: 95 },
  { keyword: 'tech', industry: 'technology', value: 80 },
  { keyword: 'app', industry: 'technology', value: 75 },
  { keyword: 'software', industry: 'technology', value: 70 },
  { keyword: 'cloud', industry: 'technology', value: 85 },
  { keyword: 'data', industry: 'technology', value: 75 },
  { keyword: 'digital', industry: 'technology', value: 70 },
  { keyword: 'smart', industry: 'technology', value: 75 },
  { keyword: 'auto', industry: 'technology', value: 70 },
  { keyword: 'bot', industry: 'technology', value: 65 },
  
  // Health & Medical
  { keyword: 'health', industry: 'health', value: 85 },
  { keyword: 'medical', industry: 'health', value: 80 },
  { keyword: 'care', industry: 'health', value: 75 },
  { keyword: 'wellness', industry: 'health', value: 70 },
  { keyword: 'fitness', industry: 'health', value: 75 },
  { keyword: 'doctor', industry: 'health', value: 80 },
  { keyword: 'therapy', industry: 'health', value: 70 },
  { keyword: 'clinic', industry: 'health', value: 75 },
  
  // E-commerce & Retail
  { keyword: 'shop', industry: 'ecommerce', value: 80 },
  { keyword: 'store', industry: 'ecommerce', value: 75 },
  { keyword: 'market', industry: 'ecommerce', value: 80 },
  { keyword: 'buy', industry: 'ecommerce', value: 70 },
  { keyword: 'sell', industry: 'ecommerce', value: 70 },
  { keyword: 'deal', industry: 'ecommerce', value: 65 },
  { keyword: 'sale', industry: 'ecommerce', value: 65 },
  { keyword: 'cart', industry: 'ecommerce', value: 60 },
  
  // Travel & Hospitality
  { keyword: 'travel', industry: 'travel', value: 85 },
  { keyword: 'hotel', industry: 'travel', value: 80 },
  { keyword: 'flight', industry: 'travel', value: 75 },
  { keyword: 'trip', industry: 'travel', value: 70 },
  { keyword: 'vacation', industry: 'travel', value: 70 },
  { keyword: 'booking', industry: 'travel', value: 75 },
  { keyword: 'resort', industry: 'travel', value: 70 },
  
  // Education & Learning
  { keyword: 'learn', industry: 'education', value: 70 },
  { keyword: 'education', industry: 'education', value: 75 },
  { keyword: 'course', industry: 'education', value: 65 },
  { keyword: 'study', industry: 'education', value: 60 },
  { keyword: 'school', industry: 'education', value: 70 },
  { keyword: 'training', industry: 'education', value: 65 },
  
  // Food & Dining
  { keyword: 'food', industry: 'food', value: 70 },
  { keyword: 'restaurant', industry: 'food', value: 65 },
  { keyword: 'delivery', industry: 'food', value: 70 },
  { keyword: 'recipe', industry: 'food', value: 60 },
  { keyword: 'kitchen', industry: 'food', value: 55 },
  
  // Real Estate
  { keyword: 'real', industry: 'realestate', value: 75 },
  { keyword: 'estate', industry: 'realestate', value: 75 },
  { keyword: 'property', industry: 'realestate', value: 70 },
  { keyword: 'home', industry: 'realestate', value: 70 },
  { keyword: 'house', industry: 'realestate', value: 65 },
  { keyword: 'rent', industry: 'realestate', value: 70 },
  
  // Gaming & Entertainment
  { keyword: 'game', industry: 'gaming', value: 70 },
  { keyword: 'gaming', industry: 'gaming', value: 75 },
  { keyword: 'play', industry: 'gaming', value: 60 },
  { keyword: 'entertainment', industry: 'gaming', value: 65 },
  { keyword: 'fun', industry: 'gaming', value: 55 },
  
  // Business & Professional
  { keyword: 'business', industry: 'business', value: 75 },
  { keyword: 'pro', industry: 'business', value: 65 },
  { keyword: 'work', industry: 'business', value: 60 },
  { keyword: 'career', industry: 'business', value: 65 },
  { keyword: 'job', industry: 'business', value: 60 },
  { keyword: 'hire', industry: 'business', value: 65 },
  
  // Generic high-value terms
  { keyword: 'best', industry: 'generic', value: 60 },
  { keyword: 'top', industry: 'generic', value: 60 },
  { keyword: 'premium', industry: 'generic', value: 65 },
  { keyword: 'elite', industry: 'generic', value: 65 },
  { keyword: 'expert', industry: 'generic', value: 60 },
  { keyword: 'master', industry: 'generic', value: 60 },
  { keyword: 'quick', industry: 'generic', value: 55 },
  { keyword: 'fast', industry: 'generic', value: 55 },
  { keyword: 'easy', industry: 'generic', value: 55 },
  { keyword: 'simple', industry: 'generic', value: 55 }
]

export function findKeywordValue(domain: string): { score: number; industry: string; matchedKeywords: string[] } {
  const domainLower = domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz|info|biz)$/, '')
  let bestScore = 20 // Default score for no meaningful keywords
  let bestIndustry = 'generic'
  let matchedKeywords: string[] = []
  
  for (const item of industryKeywords) {
    if (domainLower.includes(item.keyword)) {
      matchedKeywords.push(item.keyword)
      if (item.value > bestScore) {
        bestScore = item.value
        bestIndustry = item.industry
      }
    }
  }
  
  // Bonus for exact match of high-value single keyword
  const exactMatch = industryKeywords.find(item => 
    domainLower === item.keyword || domainLower === item.keyword + 's'
  )
  if (exactMatch && exactMatch.value >= 80) {
    bestScore = Math.min(100, bestScore + 10)
  }
  
  // Penalty for too many keywords (seems spammy)
  if (matchedKeywords.length > 3) {
    bestScore = Math.max(30, bestScore - 10)
  }
  
  return {
    score: bestScore,
    industry: bestIndustry,
    matchedKeywords
  }
}