// TLD utility functions for proper multi-level TLD support
// Supports common multi-level TLDs like .co.uk, .com.ng, .net.au, etc.

// Comprehensive list of common multi-level TLDs
const MULTI_LEVEL_TLDS = new Set([
  // UK TLDs
  'co.uk', 'ac.uk', 'gov.uk', 'net.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk',
  
  // Australia TLDs
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'asn.au', 'id.au',
  
  // Canada TLDs
  'co.ca', 'gc.ca',
  
  // New Zealand TLDs
  'co.nz', 'net.nz', 'org.nz', 'ac.nz', 'govt.nz', 'geek.nz', 'gen.nz', 'kiwi.nz', 'maori.nz', 'iwi.nz', 'school.nz',
  
  // South Africa TLDs
  'co.za', 'org.za', 'net.za', 'ac.za', 'gov.za', 'law.za', 'mil.za', 'nom.za', 'school.za', 'web.za',
  
  // India TLDs
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in',
  
  // Japan TLDs
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'ad.jp', 'ed.jp', 'go.jp', 'gr.jp', 'lg.jp',
  
  // Brazil TLDs
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'mil.br', 'art.br', 'esp.br', 'rec.br', 'inf.br',
  
  // Nigeria TLDs
  'com.ng', 'net.ng', 'org.ng', 'gov.ng', 'edu.ng', 'mil.ng',
  
  // Kenya TLDs
  'co.ke', 'ne.ke', 'or.ke', 'ac.ke', 'sc.ke', 'go.ke', 'me.ke', 'mobi.ke', 'info.ke',
  
  // Israel TLDs
  'co.il', 'net.il', 'org.il', 'ac.il', 'gov.il', 'muni.il', 'idf.il',
  
  // Germany TLDs
  'co.de', 'com.de',
  
  // France TLDs
  'co.fr', 'com.fr',
  
  // Spain TLDs
  'com.es', 'nom.es', 'org.es', 'gob.es', 'edu.es',
  
  // Italy TLDs
  'co.it', 'com.it',
  
  // Russia TLDs
  'co.ru', 'com.ru', 'net.ru', 'org.ru', 'pp.ru', 'msk.ru', 'spb.ru',
  
  // China TLDs
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'mil.cn', 'ac.cn', 'ah.cn', 'bj.cn', 'cq.cn', 'fj.cn', 'gd.cn', 'gs.cn', 'gz.cn', 'gx.cn', 'ha.cn', 'hb.cn', 'he.cn', 'hi.cn', 'hk.cn', 'hl.cn', 'hn.cn', 'jl.cn', 'js.cn', 'jx.cn', 'ln.cn', 'mo.cn', 'nm.cn', 'nx.cn', 'qh.cn', 'sc.cn', 'sd.cn', 'sh.cn', 'sn.cn', 'sx.cn', 'tj.cn', 'tw.cn', 'xj.cn', 'xz.cn', 'yn.cn', 'zj.cn',
  
  // Hong Kong TLDs
  'com.hk', 'net.hk', 'org.hk', 'gov.hk', 'edu.hk', 'idv.hk',
  
  // Singapore TLDs
  'com.sg', 'net.sg', 'org.sg', 'gov.sg', 'edu.sg', 'per.sg',
  
  // Malaysia TLDs
  'com.my', 'net.my', 'org.my', 'gov.my', 'edu.my', 'mil.my', 'name.my',
  
  // Thailand TLDs
  'co.th', 'ac.th', 'go.th', 'in.th', 'mi.th', 'net.th', 'or.th',
  
  // Philippines TLDs
  'com.ph', 'net.ph', 'org.ph', 'gov.ph', 'edu.ph', 'mil.ph', 'ngo.ph',
  
  // Indonesia TLDs
  'co.id', 'net.id', 'org.id', 'ac.id', 'sch.id', 'go.id', 'mil.id', 'web.id', 'war.net.id',
  
  // Vietnam TLDs
  'com.vn', 'net.vn', 'org.vn', 'edu.vn', 'gov.vn', 'int.vn', 'ac.vn', 'biz.vn', 'info.vn', 'name.vn', 'pro.vn', 'health.vn',
  
  // South Korea TLDs
  'co.kr', 'ne.kr', 'or.kr', 'ac.kr', 'go.kr', 'mil.kr', 'pe.kr', 'ra.kr', 'sc.kr', 'seoul.kr', 'kyonggi.kr',
  
  // Taiwan TLDs
  'com.tw', 'net.tw', 'org.tw', 'idv.tw', 'game.tw', 'ebiz.tw', 'club.tw',
  
  // Mexico TLDs
  'com.mx', 'net.mx', 'org.mx', 'gob.mx', 'edu.mx',
  
  // Argentina TLDs
  'com.ar', 'net.ar', 'org.ar', 'gov.ar', 'edu.ar', 'mil.ar', 'int.ar', 'tur.ar',
  
  // Chile TLDs
  'co.cl', 'gob.cl', 'gov.cl',
  
  // Colombia TLDs
  'com.co', 'net.co', 'org.co', 'edu.co', 'gov.co', 'mil.co', 'nom.co', 'web.co',
  
  // Peru TLDs
  'com.pe', 'net.pe', 'org.pe', 'edu.pe', 'gob.pe', 'mil.pe', 'nom.pe',
  
  // Venezuela TLDs
  'co.ve', 'com.ve', 'net.ve', 'org.ve', 'gov.ve', 'mil.ve', 'edu.ve', 'int.ve', 'tec.ve', 'web.ve', 'info.ve',
  
  // Egypt TLDs
  'com.eg', 'net.eg', 'org.eg', 'edu.eg', 'gov.eg', 'mil.eg', 'sci.eg',
  
  // Turkey TLDs
  'com.tr', 'net.tr', 'org.tr', 'edu.tr', 'gov.tr', 'mil.tr', 'gen.tr', 'av.tr', 'dr.tr', 'biz.tr', 'info.tr', 'name.tr', 'web.tr',
  
  // Poland TLDs
  'com.pl', 'net.pl', 'org.pl', 'edu.pl', 'gov.pl', 'mil.pl', 'ngo.pl', 'pc.pl', 'powiat.pl', 'priv.pl', 'realestate.pl', 'rel.pl', 'sex.pl', 'shop.pl', 'sklep.pl', 'sos.pl', 'szkola.pl', 'targi.pl', 'tm.pl', 'tourism.pl', 'travel.pl', 'turystyka.pl',
  
  // Czech Republic TLDs
  'co.cz', 'com.cz',
  
  // Slovakia TLDs
  'co.sk', 'com.sk',
  
  // Hungary TLDs
  'co.hu', 'com.hu',
  
  // Romania TLDs
  'com.ro', 'org.ro', 'tm.ro', 'nt.ro', 'nom.ro', 'info.ro', 'rec.ro', 'arts.ro', 'firm.ro', 'store.ro', 'www.ro',
  
  // Bulgaria TLDs
  'com.bg', 'org.bg', 'net.bg', 'edu.bg', 'gov.bg', 'biz.bg', 'info.bg', 'name.bg',
  
  // Croatia TLDs
  'com.hr', 'from.hr', 'iz.hr', 'name.hr',
  
  // Serbia TLDs
  'co.rs', 'org.rs', 'edu.rs', 'ac.rs', 'gov.rs', 'in.rs',
  
  // Ukraine TLDs
  'com.ua', 'net.ua', 'org.ua', 'edu.ua', 'gov.ua', 'in.ua', 'ua.ua', 'dp.ua', 'kharkov.ua', 'kherson.ua', 'kiev.ua', 'kirovograd.ua', 'kremenchug.ua', 'kr.ua', 'lg.ua', 'lutsk.ua', 'lviv.ua', 'mk.ua', 'nikolaev.ua', 'od.ua', 'pl.ua', 'poltava.ua', 'rovno.ua', 'sebastopol.ua', 'sumy.ua', 'te.ua', 'uzhgorod.ua', 'vinnica.ua', 'zaporizhzhe.ua', 'zhitomir.ua', 'zp.ua', 'zt.ua'
]);

/**
 * Extracts the proper TLD from a domain, including multi-level TLDs
 * @param domain - The domain to extract TLD from (e.g., "example.co.uk")
 * @returns The TLD (e.g., "co.uk" for multi-level, "com" for single-level)
 */
export function extractTLD(domain: string): string {
  const cleanDomain = domain.toLowerCase().trim();
  const parts = cleanDomain.split('.');
  
  if (parts.length < 2) {
    return ''; // Invalid domain
  }
  
  // Check for multi-level TLDs (starting from longest possible)
  for (let i = Math.max(1, parts.length - 3); i < parts.length - 1; i++) {
    const possibleTLD = parts.slice(i).join('.');
    if (MULTI_LEVEL_TLDS.has(possibleTLD)) {
      return possibleTLD;
    }
  }
  
  // Fall back to single-level TLD (last part)
  return parts[parts.length - 1];
}

/**
 * Extracts the domain name without the TLD
 * @param domain - The full domain (e.g., "example.co.uk")
 * @returns The domain name part (e.g., "example")
 */
export function extractDomainName(domain: string): string {
  const cleanDomain = domain.toLowerCase().trim();
  const tld = extractTLD(cleanDomain);
  
  if (!tld) {
    return cleanDomain; // Invalid domain, return as-is
  }
  
  // Remove the TLD and the preceding dot
  return cleanDomain.slice(0, -(tld.length + 1));
}

/**
 * Gets TLD quality score for various TLD types
 * @param tld - The TLD to score
 * @param targetCountry - Optional target country for country-specific TLD boost
 * @returns Numeric score from 0-100
 */
export function getTLDScore(tld: string, targetCountry?: string): number {
  const normalizedTLD = tld.toLowerCase();
  
  // Premium global TLDs
  if (normalizedTLD === 'com') return 100;
  
  // Strong global TLDs
  if (['net', 'org'].includes(normalizedTLD)) return 70;
  
  // Tech-focused TLDs
  if (['io', 'ai'].includes(normalizedTLD)) return 65;
  
  // Good alternative TLDs
  if (['co', 'me'].includes(normalizedTLD)) return 60;
  
  // Decent modern TLDs
  if (['app', 'tech', 'dev'].includes(normalizedTLD)) return 55;
  
  // Standard alternative TLDs
  if (['xyz', 'info', 'biz'].includes(normalizedTLD)) return 45;
  
  // Multi-level TLD scoring
  if (MULTI_LEVEL_TLDS.has(normalizedTLD)) {
    // Premium country-specific TLDs
    if (['co.uk', 'com.au', 'co.nz'].includes(normalizedTLD)) return 85;
    
    // High-quality country TLDs
    if (['com.br', 'co.za', 'co.jp', 'com.sg', 'co.in'].includes(normalizedTLD)) return 75;
    
    // Good country TLDs
    if (normalizedTLD.startsWith('com.') || normalizedTLD.startsWith('co.')) return 65;
    
    // Other multi-level TLDs
    return 55;
  }
  
  // Country code TLDs (2-letter)
  if (normalizedTLD.length === 2) {
    // Boost if matches target country
    return targetCountry && targetCountry.toLowerCase() === normalizedTLD ? 75 : 50;
  }
  
  // Unknown/new TLDs
  return 40;
}

/**
 * Checks if a TLD is a multi-level TLD
 * @param tld - The TLD to check
 * @returns Boolean indicating if it's a multi-level TLD
 */
export function isMultiLevelTLD(tld: string): boolean {
  return MULTI_LEVEL_TLDS.has(tld.toLowerCase());
}

/**
 * Gets the country from a country-specific TLD
 * @param tld - The TLD to analyze
 * @returns The country code if determinable, null otherwise
 */
export function getTLDCountry(tld: string): string | null {
  const normalizedTLD = tld.toLowerCase();
  
  // Handle multi-level TLDs
  if (normalizedTLD.includes('.')) {
    const countryPart = normalizedTLD.split('.').pop();
    if (countryPart && countryPart.length === 2) {
      return countryPart;
    }
  }
  
  // Handle 2-letter country codes
  if (normalizedTLD.length === 2) {
    return normalizedTLD;
  }
  
  return null;
}