import { NextRequest, NextResponse } from 'next/server'
import { evaluateDomain } from '../../../lib/valuation'
import { checkRateLimit } from '../../../lib/rate-limiter'
import { pool } from '../../../lib/database'
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
          error: 'Rate limit exceeded. You have reached the maximum of 5 evaluations per hour.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
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
    
    const appraisal = await evaluateDomain(cleanDomain, options)
    
    // Persist appraisal to database
    try {
      const client = await pool.connect()
      try {
        await client.query(`
          INSERT INTO appraisals (domain, final_score, breakdown, price_estimate, comps, legal_flag, ai_comment)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          appraisal.domain,
          appraisal.finalScore,
          JSON.stringify(appraisal.breakdown),
          JSON.stringify(appraisal.priceEstimate),
          JSON.stringify(appraisal.comps),
          appraisal.legalFlag,
          appraisal.aiComment
        ])
      } finally {
        client.release()
      }
    } catch (dbError) {
      console.error('Failed to persist appraisal:', dbError)
      // Continue anyway - don't fail the request if DB save fails
    }
    
    const response = NextResponse.json(appraisal)
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString())
    
    return response
  } catch (error) {
    console.error('Domain evaluation error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate domain' },
      { status: 500 }
    )
  }
}