import { NextRequest } from 'next/server'
import {
  withPerformanceTracking,
  PerformanceMonitor,
  withDatabaseTracking,
} from '@/lib/monitoring/performance'

// Simulate a database query
async function simulateDBQuery(delay: number = 100) {
  return withDatabaseTracking('demo_query', async () => {
    await new Promise(resolve => setTimeout(resolve, delay))
    return [
      { id: 1, name: 'Demo User' },
      { id: 2, name: 'Test User' },
    ]
  })
}

// Demo API handler
async function handler(request: NextRequest) {
  const url = new URL(request.url)
  const delay = parseInt(url.searchParams.get('delay') || '100')
  const simulateError = url.searchParams.get('error') === 'true'
  const slowQuery = url.searchParams.get('slow') === 'true'

  try {
    // Track system health
    PerformanceMonitor.trackSystemHealth('demo-api', 'healthy', 50)

    // Track resource usage
    PerformanceMonitor.trackResourceUsage()

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, delay))

    // Simulate database query
    const queryDelay = slowQuery ? 2000 : 200
    const users = await simulateDBQuery(queryDelay)

    if (simulateError) {
      throw new Error('Simulated API error for testing')
    }

    return Response.json({
      success: true,
      message: 'Performance monitoring demo endpoint',
      data: {
        users,
        processingTime: delay,
        queryTime: queryDelay,
        timestamp: new Date().toISOString(),
      },
      performance: {
        note: 'This endpoint is being monitored for performance metrics',
        metrics: 'Check browser localStorage for sylo_performance_metrics',
      },
    })
  } catch (error) {
    // Track system health as degraded
    PerformanceMonitor.trackSystemHealth('demo-api', 'error')

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Export the handler wrapped with performance tracking
export const GET = withPerformanceTracking(handler)
export const POST = withPerformanceTracking(handler)
