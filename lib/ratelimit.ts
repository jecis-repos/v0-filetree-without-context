/**
 * Rate Limiting Service
 * Implements rate limiting following Vercel best practices
 *
 * References:
 * - https://vercel.com/docs/storage/vercel-kv
 * - https://github.com/vercel/examples/tree/main/edge-functions/api-rate-limit
 */

import { kv } from "@vercel/kv"

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

class RateLimitService {
  private defaultLimit = 100 // requests per window
  private defaultWindow = 60 * 1000 // 1 minute in milliseconds

  async limit(
    identifier: string,
    limit: number = this.defaultLimit,
    window: number = this.defaultWindow,
  ): Promise<RateLimitResult> {
    try {
      const key = `ratelimit:${identifier}`
      const now = Date.now()
      const windowStart = now - window

      // Get current count
      const current = (await kv.get<number>(key)) || 0

      if (current >= limit) {
        const reset = now + window
        return {
          success: false,
          limit,
          remaining: 0,
          reset,
        }
      }

      // Increment counter
      await kv.set(key, current + 1, { ex: Math.ceil(window / 1000) })

      return {
        success: true,
        limit,
        remaining: limit - current - 1,
        reset: now + window,
      }
    } catch (error) {
      console.error("Rate limiting error:", error)
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Date.now() + window,
      }
    }
  }

  async reset(identifier: string): Promise<void> {
    try {
      const key = `ratelimit:${identifier}`
      await kv.del(key)
    } catch (error) {
      console.error("Rate limit reset error:", error)
    }
  }
}

export const ratelimit = new RateLimitService()
