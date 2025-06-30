import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  // API endpoints
  api: {
    default: { requests: 100, window: '1h' },
    webhook: { requests: 50, window: '1h' },
    mcp: { requests: 20, window: '1h' },
    audit: { requests: 200, window: '1h' },
  },
  // Service-specific limits
  services: {
    gmail: { requests: 30, window: '1h' },
    asana: { requests: 50, window: '1h' },
    xero: { requests: 20, window: '1h' },
  },
} as const

// In-memory rate limiter for development
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>()

  async limit(
    identifier: string,
    requests: number = 10,
    window: string = '1h'
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now()
    const windowMs = this.parseWindow(window)
    const key = identifier

    const current = this.store.get(key)
    const reset = now + windowMs

    if (!current || now > current.resetTime) {
      this.store.set(key, { count: 1, resetTime: reset })
      return {
        success: true,
        limit: requests,
        remaining: requests - 1,
        reset: Math.floor(reset / 1000),
      }
    }

    if (current.count >= requests) {
      return {
        success: false,
        limit: requests,
        remaining: 0,
        reset: Math.floor(current.resetTime / 1000),
      }
    }

    current.count++
    this.store.set(key, current)

    return {
      success: true,
      limit: requests,
      remaining: requests - current.count,
      reset: Math.floor(current.resetTime / 1000),
    }
  }

  private parseWindow(window: string): number {
    const unit = window.slice(-1)
    const value = parseInt(window.slice(0, -1))

    switch (unit) {
      case 's':
        return value * 1000
      case 'm':
        return value * 60 * 1000
      case 'h':
        return value * 60 * 60 * 1000
      case 'd':
        return value * 24 * 60 * 60 * 1000
      default:
        return 60 * 60 * 1000 // Default to 1 hour
    }
  }
}

// Create rate limiter instance
const createRateLimiter = () => {
  // Use Upstash Redis in production
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: 'sylo-mcp',
    })
  }

  // Use in-memory rate limiter in development
  return new InMemoryRateLimiter()
}

const rateLimiter = createRateLimiter()

export interface RateLimitOptions {
  requests?: number
  window?: string
  identifier?: (req: NextRequest) => string
  bypassToken?: string
}

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<Response>,
  options: RateLimitOptions = {}
) {
  return async (req: NextRequest, context?: any) => {
    try {
      // Check for bypass token (for internal services)
      if (options.bypassToken && req.headers.get('x-bypass-token') === options.bypassToken) {
        return handler(req, context)
      }

      // Generate identifier
      const defaultIdentifier = (req: NextRequest) => {
        // Try to get user ID from various sources
        const userId = req.headers.get('x-user-id')
        const apiKey = req.headers.get('x-api-key')
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
        
        return userId || apiKey || ip
      }

      const identifier = (options.identifier || defaultIdentifier)(req)
      const requests = options.requests || 100
      const window = options.window || '1h'

      // Check rate limit
      const result = await rateLimiter.limit(identifier, requests, window)

      // Add rate limit headers
      const headers = new Headers({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
      })

      if (!result.success) {
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Please retry after ${new Date(result.reset * 1000).toISOString()}`,
          }),
          {
            status: 429,
            headers,
          }
        )
      }

      // Call the original handler
      const response = await handler(req, context)

      // Add rate limit headers to successful response
      const newHeaders = new Headers(response.headers)
      headers.forEach((value, key) => {
        newHeaders.set(key, value)
      })

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      // Don't block requests on rate limiter errors
      return handler(req, context)
    }
  }
}

/**
 * Rate limiting middleware for specific services
 */
export function withServiceRateLimit(service: keyof typeof RATE_LIMIT_CONFIGS.services) {
  const config = RATE_LIMIT_CONFIGS.services[service]
  return (handler: (req: NextRequest, context?: any) => Promise<Response>) => {
    return withRateLimit(handler, {
      requests: config.requests,
      window: config.window,
      identifier: (req) => {
        // Include service in the identifier
        const base = req.headers.get('x-user-id') || 
                    req.headers.get('x-forwarded-for') || 
                    'unknown'
        return `${base}:${service}`
      },
    })
  }
}