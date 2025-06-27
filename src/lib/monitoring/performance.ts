import { NextRequest } from 'next/server'

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, action: string, parameters?: Record<string, unknown>) => void
  }
}

/**
 * Performance monitoring and tracking system
 * Tracks API response times, user interactions, and system health
 */
export class PerformanceMonitor {
  private static readonly SLOW_API_THRESHOLD = 2000 // 2 seconds
  private static readonly VERY_SLOW_API_THRESHOLD = 5000 // 5 seconds

  /**
   * Track API call performance metrics
   */
  static trackAPICall(
    endpoint: string,
    duration: number,
    status: number,
    metadata?: Record<string, unknown>
  ) {
    const performanceData = {
      endpoint,
      duration,
      status,
      timestamp: Date.now(),
      ...metadata,
    }

    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'api_call', {
        endpoint,
        duration,
        status,
        custom_map: { metric1: 'api_performance' },
      })
    }

    // Log performance data
    console.log('API Performance:', performanceData)

    // Alert on slow responses
    if (duration > this.VERY_SLOW_API_THRESHOLD) {
      console.error(`Very slow API response: ${endpoint} took ${duration}ms`)
      this.sendAlert('critical', `API ${endpoint} extremely slow: ${duration}ms`)
    } else if (duration > this.SLOW_API_THRESHOLD) {
      console.warn(`Slow API response: ${endpoint} took ${duration}ms`)
      this.sendAlert('warning', `API ${endpoint} slow: ${duration}ms`)
    }

    // Store in performance metrics if in browser
    if (typeof window !== 'undefined') {
      this.storeMetric('apiCalls', performanceData)
    }
  }

  /**
   * Track user action performance and engagement
   */
  static trackUserAction(action: string, metadata?: Record<string, unknown>) {
    const actionData = {
      action,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.pathname : 'server',
      ...metadata,
    }

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        ...metadata,
        timestamp: Date.now(),
      })
    }

    console.log('User Action:', actionData)
    this.storeMetric('userActions', actionData)
  }

  /**
   * Track system health metrics
   */
  static trackSystemHealth(
    component: string,
    status: 'healthy' | 'degraded' | 'error',
    responseTime?: number
  ) {
    const healthData = {
      component,
      status,
      responseTime,
      timestamp: Date.now(),
    }

    console.log('System Health:', healthData)

    if (status === 'error') {
      this.sendAlert('critical', `System component ${component} is down`)
    } else if (status === 'degraded') {
      this.sendAlert('warning', `System component ${component} is degraded`)
    }

    this.storeMetric('systemHealth', healthData)
  }

  /**
   * Track database query performance
   */
  static trackDatabaseQuery(query: string, duration: number, recordCount?: number) {
    const queryData = {
      query: query.substring(0, 100), // Truncate for privacy
      duration,
      recordCount,
      timestamp: Date.now(),
    }

    console.log('Database Query:', queryData)

    if (duration > 1000) {
      // 1 second threshold for DB queries
      console.warn(`Slow database query: ${query.substring(0, 50)}... took ${duration}ms`)
      this.sendAlert('warning', `Slow database query: ${duration}ms`)
    }

    this.storeMetric('dbQueries', queryData)
  }

  /**
   * Track memory and resource usage
   */
  static trackResourceUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage()
      const resourceData = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        timestamp: Date.now(),
      }

      console.log('Resource Usage:', resourceData)

      // Alert if memory usage is high (>500MB heap)
      if (memUsage.heapUsed > 500 * 1024 * 1024) {
        this.sendAlert(
          'warning',
          `High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
        )
      }

      this.storeMetric('resourceUsage', resourceData)
    }
  }

  /**
   * Get performance metrics summary
   */
  static getPerformanceMetrics(): PerformanceMetrics {
    if (typeof window === 'undefined') {
      return {
        apiCalls: [],
        userActions: [],
        systemHealth: [],
        dbQueries: [],
        resourceUsage: [],
      }
    }

    const stored = localStorage.getItem('sylo_performance_metrics')
    return stored
      ? JSON.parse(stored)
      : {
          apiCalls: [],
          userActions: [],
          systemHealth: [],
          dbQueries: [],
          resourceUsage: [],
        }
  }

  /**
   * Clear old performance metrics (keep last 24 hours)
   */
  static cleanupMetrics() {
    if (typeof window === 'undefined') return

    const metrics = this.getPerformanceMetrics()
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    const cleanedMetrics = {
      apiCalls: metrics.apiCalls.filter(m => m.timestamp > oneDayAgo),
      userActions: metrics.userActions.filter(m => m.timestamp > oneDayAgo),
      systemHealth: metrics.systemHealth.filter(m => m.timestamp > oneDayAgo),
      dbQueries: metrics.dbQueries.filter(m => m.timestamp > oneDayAgo),
      resourceUsage: metrics.resourceUsage.filter(m => m.timestamp > oneDayAgo),
    }

    localStorage.setItem('sylo_performance_metrics', JSON.stringify(cleanedMetrics))
  }

  /**
   * Store metric in local storage
   */
  private static storeMetric(type: keyof PerformanceMetrics, data: unknown) {
    if (typeof window === 'undefined') return

    const metrics = this.getPerformanceMetrics()
    ;(metrics[type] as unknown[]).push(data)

    // Keep only last 1000 entries per type
    if ((metrics[type] as unknown[]).length > 1000) {
      ;(metrics[type] as unknown[]) = (metrics[type] as unknown[]).slice(-1000)
    }

    localStorage.setItem('sylo_performance_metrics', JSON.stringify(metrics))
  }

  /**
   * Send alert (placeholder for actual alerting system)
   */
  private static sendAlert(level: 'warning' | 'critical', message: string) {
    // In production, this would integrate with alerting services like:
    // - Slack webhooks
    // - Email notifications
    // - PagerDuty
    // - Discord webhooks

    console.log(`[${level.toUpperCase()}] Performance Alert: ${message}`)

    // Store alert for dashboard display
    if (typeof window !== 'undefined') {
      const alerts = JSON.parse(localStorage.getItem('sylo_performance_alerts') || '[]')
      alerts.push({
        level,
        message,
        timestamp: Date.now(),
      })

      // Keep only last 50 alerts
      if (alerts.length > 50) {
        alerts.splice(0, alerts.length - 50)
      }

      localStorage.setItem('sylo_performance_alerts', JSON.stringify(alerts))
    }
  }
}

/**
 * Higher-order function to wrap API routes with performance tracking
 */
export function withPerformanceTracking<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<Response>
) {
  return async (req: NextRequest, ...args: T): Promise<Response> => {
    const start = Date.now()
    const endpoint = req.url || 'unknown'

    try {
      const response = await handler(req, ...args)
      const duration = Date.now() - start

      PerformanceMonitor.trackAPICall(endpoint, duration, response.status || 200, {
        method: req.method,
        userAgent: req.headers.get('user-agent')?.substring(0, 100),
      })

      return response
    } catch (error) {
      const duration = Date.now() - start

      PerformanceMonitor.trackAPICall(endpoint, duration, 500, {
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }
}

/**
 * Database query performance wrapper
 */
export function withDatabaseTracking<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now()

    try {
      const result = await queryFn()
      const duration = Date.now() - start

      PerformanceMonitor.trackDatabaseQuery(
        queryName,
        duration,
        Array.isArray(result) ? result.length : undefined
      )

      resolve(result)
    } catch (error) {
      const duration = Date.now() - start

      PerformanceMonitor.trackDatabaseQuery(`${queryName} (ERROR)`, duration)

      reject(error)
    }
  })
}

/**
 * React hook for tracking component performance
 */
export function usePerformanceTracking(componentName: string) {
  const trackAction = (action: string, metadata?: Record<string, unknown>) => {
    PerformanceMonitor.trackUserAction(`${componentName}:${action}`, metadata)
  }

  const trackRender = (renderTime: number) => {
    PerformanceMonitor.trackUserAction(`${componentName}:render`, { renderTime })
  }

  return { trackAction, trackRender }
}

// Type definitions
export interface PerformanceMetrics {
  apiCalls: Array<{
    endpoint: string
    duration: number
    status: number
    timestamp: number
    method?: string
    userAgent?: string
    error?: string
  }>
  userActions: Array<{
    action: string
    timestamp: number
    url: string
    [key: string]: unknown
  }>
  systemHealth: Array<{
    component: string
    status: 'healthy' | 'degraded' | 'error'
    responseTime?: number
    timestamp: number
  }>
  dbQueries: Array<{
    query: string
    duration: number
    recordCount?: number
    timestamp: number
  }>
  resourceUsage: Array<{
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
    timestamp: number
  }>
}

export interface PerformanceAlert {
  level: 'warning' | 'critical'
  message: string
  timestamp: number
}
