// Simple in-memory rate limiter for 5 searches per IP
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT = 5
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimitMap.entries()) {
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