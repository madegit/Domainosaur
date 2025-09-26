import { NextRequest, NextResponse } from 'next/server'
import { evaluateDomain } from '../../../lib/valuation'
import { checkRateLimit } from '../../../lib/rate-limiter'
import { pool } from '../../../lib/database'
import { createHash } from 'crypto'
import '../../../app/startup' // Ensure database is initialized

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - get client IP with proper fallback and additional security
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const rateLimit = checkRateLimit(ip, userAgent)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. You have reached the maximum of 3 evaluations per hour.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      )
    }
    
    const { domain, options = {} } = await request.json()
    
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { error: 'Valid domain name is required' },
        { status: 400 }
      )
    }
    
    // Clean and validate domain format
    const cleanDomain = domain.toLowerCase().trim()
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(cleanDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      )
    }
    
    // Generate options hash for cache key
    const optionsHash = createHash('md5').update(JSON.stringify(options || {})).digest('hex')
    
    // Check for recent cached evaluation (within 24 hours)
    let appraisal = null
    const cacheWindow = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    
    try {
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT domain, final_score, breakdown, price_estimate, comps, legal_flag, ai_comment, whois_data, created_at
          FROM appraisals 
          WHERE domain = $1 
            AND (options_hash = $2 OR options_hash IS NULL)
            AND created_at > $3 
          ORDER BY created_at DESC 
          LIMIT 1
        `, [cleanDomain, optionsHash, new Date(Date.now() - cacheWindow)])
        
        if (result.rows.length > 0) {
          const cached = result.rows[0]
          console.log(`Using cached evaluation for ${cleanDomain} from ${cached.created_at}`)
          
          // Return cached evaluation in the same format as fresh evaluation
          appraisal = {
            domain: cached.domain,
            finalScore: parseFloat(cached.final_score),
            bracket: getBracket(parseFloat(cached.final_score)),
            priceEstimate: cached.price_estimate,
            breakdown: cached.breakdown,
            legalFlag: cached.legal_flag,
            aiComment: cached.ai_comment,
            comps: cached.comps || [],
            whoisData: cached.whois_data || null
          }
        }
      } finally {
        client.release()
      }
    } catch (cacheError) {
      console.error('Cache lookup failed, proceeding with fresh evaluation:', cacheError)
    }
    
    // If no cached result, perform fresh evaluation
    if (!appraisal) {
      console.log(`Performing fresh evaluation for ${cleanDomain}`)
      appraisal = await evaluateDomain(cleanDomain, options)
      
      // Persist new appraisal to database
      try {
        const client = await pool.connect()
        try {
          await client.query(`
            INSERT INTO appraisals (domain, final_score, breakdown, price_estimate, comps, legal_flag, ai_comment, whois_data, options_hash)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            appraisal.domain,
            appraisal.finalScore,
            JSON.stringify(appraisal.breakdown),
            JSON.stringify(appraisal.priceEstimate),
            JSON.stringify(appraisal.comps),
            appraisal.legalFlag,
            appraisal.aiComment,
            JSON.stringify(appraisal.whoisData),
            optionsHash
          ])
        } finally {
          client.release()
        }
      } catch (dbError) {
        console.error('Failed to persist appraisal:', dbError)
        // Continue anyway - don't fail the request if DB save fails
      }
    } else {
      console.log(`Cache hit: returning cached evaluation for ${cleanDomain}`)
    }

    // Create response with rate limit headers
    const headers = {
      'X-RateLimit-Limit': '3',
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.resetTime.toString()
    }
    
    // Helper function to determine price bracket
    function getBracket(score: number): string {
      if (score >= 80) return "80-100"
      if (score >= 60) return "60-80"
      if (score >= 40) return "40-60"
      if (score >= 20) return "20-40"
      return "0-20"
    }
    
    return NextResponse.json(appraisal, { headers })
  } catch (error) {
    console.error('Domain evaluation error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate domain' },
      { status: 500 }
    )
  }
}