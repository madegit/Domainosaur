// Enhanced rate limiter with IP validation and session tracking
interface RateLimitEntry {
  count: number
  resetTime: number
  lastUserAgent?: string
}

interface SessionRateLimit {
  sessionCount: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
const sessionLimitMap = new Map<string, SessionRateLimit>()
// Use environment variables or default to 3 requests (matching frontend)
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_REQUESTS || '3', 10)
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW || '3600', 10) * 1000 // Convert seconds to milliseconds

// Enhanced rate limiting with IP validation and session support
export function checkRateLimit(ip: string, userAgent?: string, sessionId?: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of Array.from(rateLimitMap.entries())) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key)
      }
    }
  }
  
  if (!entry || entry.resetTime < now) {
    // First request or window expired
    const newEntry = {
      count: 1,
      resetTime: now + WINDOW_MS
    }
    rateLimitMap.set(ip, newEntry)
    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetTime: newEntry.resetTime
    }
  }
  
  if (entry.count >= RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }
  
  entry.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT - entry.count,
    resetTime: entry.resetTime
  }
}

export function getRemainingRequests(ip: string): number {
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetTime < Date.now()) {
    return RATE_LIMIT
  }
  return Math.max(0, RATE_LIMIT - entry.count)
}