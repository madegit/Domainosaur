export interface DomainAppraisal {
  domain: string
  finalScore: number
  bracket: string
  priceEstimate: {
    investor: string
    retail: string
    explanation: string
  }
  breakdown: FactorBreakdown[]
  comps?: ComparableSale[]
  legalFlag: 'clear' | 'warning' | 'severe'
  aiComment: string
  createdAt?: string
}

export interface FactorBreakdown {
  factor: string
  score: number
  weight: number
  contribution: number
  description?: string
}

export interface ComparableSale {
  domain: string
  soldPrice: number
  soldDate: string
  source: string
  similarity?: number
}

export interface ValuationFactors {
  length: number
  keywords: number
  tld: number
  brandability: number
  industry: number
  comps: number
  age: number
  traffic: number
  liquidity: number
}

export interface FactorWeights {
  length: number
  keywords: number
  tld: number
  brandability: number
  industry: number
  comps: number
  age: number
  traffic: number
  liquidity: number
}

export interface AppraisalOptions {
  userTraffic?: number
  country?: string
  useComps?: boolean
}

export interface IndustryKeyword {
  keyword: string
  industry: string
  value: number
}

export interface BrandName {
  name: string
  risk: 'low' | 'medium' | 'high'
}