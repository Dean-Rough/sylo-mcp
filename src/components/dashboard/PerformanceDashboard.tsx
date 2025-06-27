'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  PerformanceMonitor,
  PerformanceMetrics,
  PerformanceAlert,
  usePerformanceTracking,
} from '@/lib/monitoring/performance'

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const { trackAction } = usePerformanceTracking('PerformanceDashboard')

  const loadMetrics = useCallback(() => {
    try {
      const performanceMetrics = PerformanceMonitor.getPerformanceMetrics()
      setMetrics(performanceMetrics)

      // Load alerts from localStorage
      const storedAlerts = localStorage.getItem('sylo_performance_alerts')
      if (storedAlerts) {
        const parsedAlerts = JSON.parse(storedAlerts)
        setAlerts(parsedAlerts.slice(-10)) // Show last 10 alerts
      }

      trackAction('metrics_loaded', {
        apiCallsCount: performanceMetrics.apiCalls.length,
        alertsCount: alerts.length,
      })
    } catch (error) {
      console.error('Failed to load performance metrics:', error)
      trackAction('metrics_load_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [trackAction, alerts.length])

  useEffect(() => {
    trackAction('mount')
    loadMetrics()

    // Set up periodic refresh
    const interval = setInterval(loadMetrics, 30000) // Refresh every 30 seconds

    return () => {
      clearInterval(interval)
      trackAction('unmount')
    }
  }, [trackAction, loadMetrics])

  const getAverageResponseTime = () => {
    if (!metrics || metrics.apiCalls.length === 0) return 0
    const total = metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0)
    return Math.round(total / metrics.apiCalls.length)
  }

  const getErrorRate = () => {
    if (!metrics || metrics.apiCalls.length === 0) return 0
    const errorCount = metrics.apiCalls.filter(call => call.status >= 400).length
    return Math.round((errorCount / metrics.apiCalls.length) * 100)
  }

  const getSlowQueriesCount = () => {
    if (!metrics) return 0
    return metrics.dbQueries.filter(query => query.duration > 1000).length
  }

  const getRecentActivity = () => {
    if (!metrics) return []
    const allActivity = [
      ...metrics.apiCalls.map(call => ({ ...call, type: 'api' })),
      ...metrics.userActions.map(action => ({ ...action, type: 'user' })),
      ...metrics.dbQueries.map(query => ({ ...query, type: 'db' })),
    ]

    return allActivity.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusColor = (status?: number) => {
    if (!status) return 'secondary'
    if (status >= 500) return 'destructive'
    if (status >= 400) return 'warning'
    return 'success'
  }

  const getAlertColor = (level: string) => {
    return level === 'critical' ? 'destructive' : 'warning'
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading performance metrics...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <button
          onClick={() => {
            loadMetrics()
            trackAction('manual_refresh')
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Performance Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Recent Alerts</h3>
          {alerts.map((alert, index) => (
            <Alert key={index} variant={getAlertColor(alert.level)}>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <Badge variant={getAlertColor(alert.level)}>{alert.level}</Badge>
                  <span className="text-sm text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getAverageResponseTime()}ms</div>
            <p className="text-xs text-gray-500">Based on {metrics.apiCalls.length} API calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getErrorRate()}%</div>
            <p className="text-xs text-gray-500">4xx/5xx responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getSlowQueriesCount()}</div>
            <p className="text-xs text-gray-500">Queries &gt; 1000ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.userActions.length}</div>
            <p className="text-xs text-gray-500">Tracked interactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getRecentActivity().map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{activity.type}</Badge>
                  <span className="text-sm">
                    {activity.type === 'api' &&
                      'method' in activity &&
                      'endpoint' in activity &&
                      `${activity.method} ${activity.endpoint}`}
                    {activity.type === 'user' && 'action' in activity && activity.action}
                    {activity.type === 'db' &&
                      'query' in activity &&
                      activity.query.substring(0, 50)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {activity.type === 'api' && 'status' in activity && (
                    <Badge variant={getStatusColor(activity.status)}>{activity.status}</Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    {'duration' in activity && activity.duration ? `${activity.duration}ms` : ''}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      {metrics.systemHealth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.systemHealth.slice(-6).map((health, index) => (
                <div key={index} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{health.component}</span>
                    <Badge
                      variant={
                        health.status === 'healthy'
                          ? 'success'
                          : health.status === 'degraded'
                            ? 'warning'
                            : 'destructive'
                      }
                    >
                      {health.status}
                    </Badge>
                  </div>
                  {health.responseTime && (
                    <p className="text-sm text-gray-500 mt-1">Response: {health.responseTime}ms</p>
                  )}
                  <p className="text-xs text-gray-400">{formatTimestamp(health.timestamp)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Usage */}
      {metrics.resourceUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.resourceUsage.slice(-1).map((usage, index) => (
              <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium">Heap Used</p>
                  <p className="text-lg">{Math.round(usage.heapUsed / 1024 / 1024)}MB</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Heap Total</p>
                  <p className="text-lg">{Math.round(usage.heapTotal / 1024 / 1024)}MB</p>
                </div>
                <div>
                  <p className="text-sm font-medium">External</p>
                  <p className="text-lg">{Math.round(usage.external / 1024 / 1024)}MB</p>
                </div>
                <div>
                  <p className="text-sm font-medium">RSS</p>
                  <p className="text-lg">{Math.round(usage.rss / 1024 / 1024)}MB</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cleanup Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            PerformanceMonitor.cleanupMetrics()
            loadMetrics()
            trackAction('cleanup_metrics')
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Cleanup Old Metrics
        </button>
      </div>
    </div>
  )
}
