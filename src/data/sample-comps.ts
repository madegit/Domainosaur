// Sample comparable sales data for domain valuation
export interface ComparableSale {
  domain: string
  soldPrice: number
  soldDate: string
  source: string
}

export const sampleComps: ComparableSale[] = [
  // Finance/Crypto domains
  { domain: 'cryptowallet.com', soldPrice: 250000, soldDate: '2023-08-15', source: 'NameBio' },
  { domain: 'bitcoinexchange.com', soldPrice: 175000, soldDate: '2023-06-22', source: 'Sedo' },
  { domain: 'financepro.com', soldPrice: 85000, soldDate: '2023-09-10', source: 'GoDaddy' },
  { domain: 'payfast.com', soldPrice: 95000, soldDate: '2023-07-18', source: 'NameBio' },
  
  // Tech/AI domains
  { domain: 'aitools.com', soldPrice: 125000, soldDate: '2023-05-20', source: 'Flippa' },
  { domain: 'smartapp.com', soldPrice: 65000, soldDate: '2023-08-03', source: 'Sedo' },
  { domain: 'cloudtech.com', soldPrice: 78000, soldDate: '2023-06-15', source: 'GoDaddy' },
  { domain: 'databot.com', soldPrice: 45000, soldDate: '2023-09-25', source: 'NameBio' },
  
  // E-commerce domains
  { domain: 'shopfast.com', soldPrice: 55000, soldDate: '2023-07-08', source: 'Flippa' },
  { domain: 'buyeasy.com', soldPrice: 42000, soldDate: '2023-06-30', source: 'Sedo' },
  { domain: 'marketpro.com', soldPrice: 68000, soldDate: '2023-08-12', source: 'GoDaddy' },
  
  // Health domains
  { domain: 'healthapp.com', soldPrice: 72000, soldDate: '2023-05-15', source: 'NameBio' },
  { domain: 'medcare.com', soldPrice: 85000, soldDate: '2023-07-22', source: 'Sedo' },
  { domain: 'wellness.io', soldPrice: 35000, soldDate: '2023-08-28', source: 'Flippa' },
  
  // Travel domains
  { domain: 'travelfast.com', soldPrice: 48000, soldDate: '2023-06-12', source: 'GoDaddy' },
  { domain: 'hotelbook.com', soldPrice: 62000, soldDate: '2023-09-05', source: 'NameBio' },
  { domain: 'flightdeal.com', soldPrice: 38000, soldDate: '2023-07-20', source: 'Sedo' },
  
  // Business domains
  { domain: 'bizpro.com', soldPrice: 52000, soldDate: '2023-08-18', source: 'Flippa' },
  { domain: 'worktech.com', soldPrice: 45000, soldDate: '2023-06-25', source: 'GoDaddy' },
  
  // Short/Premium domains
  { domain: 'ace.com', soldPrice: 750000, soldDate: '2023-04-10', source: 'Private Sale' },
  { domain: 'zap.com', soldPrice: 425000, soldDate: '2023-05-08', source: 'Private Sale' },
  { domain: 'hub.io', soldPrice: 185000, soldDate: '2023-07-15', source: 'NameBio' }
]

export function findComparables(domain: string, limit: number = 5): ComparableSale[] {
  const domainName = domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz)$/, '')
  const tld = domain.split('.').pop()?.toLowerCase()
  
  // Simple similarity scoring based on:
  // 1. Same TLD (bonus)
  // 2. Similar length
  // 3. Common keywords
  
  const scored = sampleComps.map(comp => {
    const compName = comp.domain.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|xyz)$/, '')
    const compTld = comp.domain.split('.').pop()?.toLowerCase()
    
    let similarity = 0
    
    // TLD match bonus
    if (tld === compTld) similarity += 30
    
    // Length similarity
    const lengthDiff = Math.abs(domainName.length - compName.length)
    if (lengthDiff === 0) similarity += 25
    else if (lengthDiff <= 2) similarity += 15
    else if (lengthDiff <= 4) similarity += 10
    
    // Keyword overlap (simple substring matching)
    const domainWords = domainName.toLowerCase().split(/[-_]/)
    const compWords = compName.toLowerCase().split(/[-_]/)
    
    for (const word of domainWords) {
      if (word.length >= 3 && compWords.some(cw => cw.includes(word) || word.includes(cw))) {
        similarity += 20
      }
    }
    
    // Exact substring matches
    if (compName.includes(domainName) || domainName.includes(compName)) {
      similarity += 40
    }
    
    return { ...comp, similarity }
  })
  
  return scored
    .filter(comp => comp.similarity > 20)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}