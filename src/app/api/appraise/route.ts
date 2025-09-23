import { NextRequest, NextResponse } from 'next/server'
import { evaluateDomain } from '@/lib/valuation'
import { checkRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimit = checkRateLimit(ip)
    
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