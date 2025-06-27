/**
 * @jest-environment jsdom
 */
import {
  PerformanceMonitor,
  withPerformanceTracking,
  withDatabaseTracking,
  usePerformanceTracking,
  PerformanceMetrics,
  PerformanceAlert,
} from '../performance'

// Mock NextRequest for testing
class MockNextRequest {
  url: string
  method: string
  headers: Map<string, string>

  constructor(url: string, options: { method?: string } = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map()
  }

  get(name: string) {
    return this.headers.get(name) || null
  }
}

// Mock NextRequest globally
global.NextRequest = MockNextRequest as any

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

// Mock gtag
const mockGtag = jest.fn()
Object.defineProperty(window, 'gtag', {
  value: mockGtag,
  writable: true,
})

// Mock process.memoryUsage for Node.js environment
const mockMemoryUsage = jest.fn()
Object.defineProperty(process, 'memoryUsage', {
  value: mockMemoryUsage,
  writable: true,
})

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation()
    mockGtag.mockImplementation()
  })

  describe('trackAPICall', () => {
    it('should track API call performance data', () => {
      const endpoint = '/api/test'
      const duration = 1500
      const status = 200
      const metadata = { method: 'GET', userAgent: 'test-agent' }

      PerformanceMonitor.trackAPICall(endpoint, duration, status, metadata)

      expect(mockConsoleLog).toHaveBeenCalledWith('API Performance:', {
        endpoint,
        duration,
        status,
        timestamp: expect.any(Number),
        ...metadata,
      })
    })

    it('should send gtag event when gtag is available', () => {
      const endpoint = '/api/test'
      const duration = 1500
      const status = 200

      PerformanceMonitor.trackAPICall(endpoint, duration, status)

      expect(mockGtag).toHaveBeenCalledWith('event', 'api_call', {
        endpoint,
        duration,
        status,
        custom_map: { metric1: 'api_performance' },
      })
    })

    it('should send warning alert for slow API calls', () => {
      const endpoint = '/api/slow'
      const duration = 3000 // Above SLOW_API_THRESHOLD (2000ms)
      const status = 200

      PerformanceMonitor.trackAPICall(endpoint, duration, status)

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        `Slow API response: ${endpoint} took ${duration}ms`
      )
    })

    it('should send critical alert for very slow API calls', () => {
      const endpoint = '/api/very-slow'
      const duration = 6000 // Above VERY_SLOW_API_THRESHOLD (5000ms)
      const status = 200

      PerformanceMonitor.trackAPICall(endpoint, duration, status)

      expect(mockConsoleError).toHaveBeenCalledWith(
        `Very slow API response: ${endpoint} took ${duration}ms`
      )
    })

    it('should store metrics in localStorage when in browser', () => {
      const mockMetrics = {
        apiCalls: [],
        userActions: [],
        systemHealth: [],
        dbQueries: [],
        resourceUsage: [],
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockMetrics))

      PerformanceMonitor.trackAPICall('/api/test', 1000, 200)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sylo_performance_metrics',
        expect.stringContaining('apiCalls')
      )
    })
  })

  describe('trackUserAction', () => {
    it('should track user action with metadata', () => {
      const action = 'button_click'
      const metadata = { buttonId: 'submit', page: 'dashboard' }

      PerformanceMonitor.trackUserAction(action, metadata)

      expect(mockConsoleLog).toHaveBeenCalledWith('User Action:', {
        action,
        timestamp: expect.any(Number),
        url: '/',
        ...metadata,
      })
    })

    it('should send gtag event for user actions', () => {
      const action = 'form_submit'
      const metadata = { formType: 'contact' }

      PerformanceMonitor.trackUserAction(action, metadata)

      expect(mockGtag).toHaveBeenCalledWith('event', action, {
        ...metadata,
        timestamp: expect.any(Number),
      })
    })
  })

  describe('trackSystemHealth', () => {
    it('should track healthy system component', () => {
      const component = 'database'
      const status = 'healthy'
      const responseTime = 50

      PerformanceMonitor.trackSystemHealth(component, status, responseTime)

      expect(mockConsoleLog).toHaveBeenCalledWith('System Health:', {
        component,
        status,
        responseTime,
        timestamp: expect.any(Number),
      })
    })

    it('should send critical alert for error status', () => {
      const component = 'redis'
      const status = 'error'

      PerformanceMonitor.trackSystemHealth(component, status)

      // Check that alert was stored in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sylo_performance_alerts',
        expect.stringContaining('critical')
      )
    })

    it('should send warning alert for degraded status', () => {
      const component = 'api'
      const status = 'degraded'

      PerformanceMonitor.trackSystemHealth(component, status)

      // Check that alert was stored in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sylo_performance_alerts',
        expect.stringContaining('warning')
      )
    })
  })

  describe('trackDatabaseQuery', () => {
    it('should track database query performance', () => {
      const query = 'SELECT * FROM users WHERE id = ?'
      const duration = 500
      const recordCount = 1

      PerformanceMonitor.trackDatabaseQuery(query, duration, recordCount)

      expect(mockConsoleLog).toHaveBeenCalledWith('Database Query:', {
        query,
        duration,
        recordCount,
        timestamp: expect.any(Number),
      })
    })

    it('should truncate long queries for privacy', () => {
      const longQuery = 'SELECT * FROM users WHERE '.repeat(10) + 'id = ?'
      const duration = 500

      PerformanceMonitor.trackDatabaseQuery(longQuery, duration)

      expect(mockConsoleLog).toHaveBeenCalledWith('Database Query:', {
        query: longQuery.substring(0, 100),
        duration,
        recordCount: undefined,
        timestamp: expect.any(Number),
      })
    })

    it('should send warning for slow database queries', () => {
      const query = 'SELECT * FROM large_table'
      const duration = 2000 // Above 1000ms threshold

      PerformanceMonitor.trackDatabaseQuery(query, duration)

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        `Slow database query: ${query.substring(0, 50)}... took ${duration}ms`
      )
    })
  })

  describe('trackResourceUsage', () => {
    it('should track memory usage when process.memoryUsage is available', () => {
      const mockMemUsage = {
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024, // 200MB
        external: 50 * 1024 * 1024, // 50MB
        rss: 300 * 1024 * 1024, // 300MB
      }
      mockMemoryUsage.mockReturnValue(mockMemUsage)

      PerformanceMonitor.trackResourceUsage()

      expect(mockConsoleLog).toHaveBeenCalledWith('Resource Usage:', {
        ...mockMemUsage,
        timestamp: expect.any(Number),
      })
    })

    it('should send warning for high memory usage', () => {
      const mockMemUsage = {
        heapUsed: 600 * 1024 * 1024, // 600MB (above 500MB threshold)
        heapTotal: 800 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        rss: 900 * 1024 * 1024,
      }
      mockMemoryUsage.mockReturnValue(mockMemUsage)

      PerformanceMonitor.trackResourceUsage()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sylo_performance_alerts',
        expect.stringContaining('High memory usage: 600MB')
      )
    })

    it('should not track when process.memoryUsage is not available', () => {
      // Temporarily remove memoryUsage
      const originalMemoryUsage = process.memoryUsage
      delete (process as any).memoryUsage

      PerformanceMonitor.trackResourceUsage()

      expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('Resource Usage:'))

      // Restore memoryUsage
      process.memoryUsage = originalMemoryUsage
    })
  })

  describe('getPerformanceMetrics', () => {
    it('should return empty metrics when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const metrics = PerformanceMonitor.getPerformanceMetrics()

      expect(metrics).toEqual({
        apiCalls: [],
        userActions: [],
        systemHealth: [],
        dbQueries: [],
        resourceUsage: [],
      })
    })

    it('should return parsed metrics from localStorage', () => {
      const mockMetrics = {
        apiCalls: [{ endpoint: '/api/test', duration: 100, status: 200, timestamp: Date.now() }],
        userActions: [],
        systemHealth: [],
        dbQueries: [],
        resourceUsage: [],
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockMetrics))

      const metrics = PerformanceMonitor.getPerformanceMetrics()

      expect(metrics).toEqual(mockMetrics)
    })

    it('should return empty metrics in server environment', () => {
      // Mock server environment
      const originalWindow = global.window
      delete (global as any).window

      const metrics = PerformanceMonitor.getPerformanceMetrics()

      expect(metrics).toEqual({
        apiCalls: [],
        userActions: [],
        systemHealth: [],
        dbQueries: [],
        resourceUsage: [],
      })

      // Restore window
      global.window = originalWindow
    })
  })

  describe('cleanupMetrics', () => {
    it('should remove old metrics older than 24 hours', () => {
      const now = Date.now()
      const oneDayAgo = now - 24 * 60 * 60 * 1000
      const twoDaysAgo = now - 48 * 60 * 60 * 1000

      const mockMetrics = {
        apiCalls: [
          { endpoint: '/api/old', duration: 100, status: 200, timestamp: twoDaysAgo },
          { endpoint: '/api/recent', duration: 100, status: 200, timestamp: now },
        ],
        userActions: [],
        systemHealth: [],
        dbQueries: [],
        resourceUsage: [],
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockMetrics))

      PerformanceMonitor.cleanupMetrics()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sylo_performance_metrics',
        expect.stringContaining('/api/recent')
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sylo_performance_metrics',
        expect.not.stringContaining('/api/old')
      )
    })

    it('should not run in server environment', () => {
      // Mock server environment
      const originalWindow = global.window
      delete (global as any).window

      PerformanceMonitor.cleanupMetrics()

      expect(localStorageMock.getItem).not.toHaveBeenCalled()

      // Restore window
      global.window = originalWindow
    })
  })
})

describe('withPerformanceTracking', () => {
  it('should track successful API calls', async () => {
    const mockHandler = jest.fn().mockResolvedValue(new Response('OK', { status: 200 }))
    const wrappedHandler = withPerformanceTracking(mockHandler)

    const mockRequest = new MockNextRequest('http://localhost/api/test', { method: 'GET' })
    const response = await wrappedHandler(mockRequest as any)

    expect(response.status).toBe(200)
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'API Performance:',
      expect.objectContaining({
        endpoint: 'http://localhost/api/test',
        status: 200,
        method: 'GET',
      })
    )
  })

  it('should track failed API calls', async () => {
    const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'))
    const wrappedHandler = withPerformanceTracking(mockHandler)

    const mockRequest = new MockNextRequest('http://localhost/api/error', { method: 'POST' })

    await expect(wrappedHandler(mockRequest as any)).rejects.toThrow('Test error')

    expect(mockConsoleLog).toHaveBeenCalledWith(
      'API Performance:',
      expect.objectContaining({
        endpoint: 'http://localhost/api/error',
        status: 500,
        method: 'POST',
        error: 'Test error',
      })
    )
  })
})

describe('withDatabaseTracking', () => {
  it('should track successful database queries', async () => {
    const mockQueryFn = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
    const trackedQuery = withDatabaseTracking('getUserList', mockQueryFn)

    const result = await trackedQuery

    expect(result).toEqual([{ id: 1 }, { id: 2 }])
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'Database Query:',
      expect.objectContaining({
        query: 'getUserList',
        recordCount: 2,
      })
    )
  })

  it('should track failed database queries', async () => {
    const mockQueryFn = jest.fn().mockRejectedValue(new Error('Database error'))
    const trackedQuery = withDatabaseTracking('failedQuery', mockQueryFn)

    await expect(trackedQuery).rejects.toThrow('Database error')

    expect(mockConsoleLog).toHaveBeenCalledWith(
      'Database Query:',
      expect.objectContaining({
        query: 'failedQuery (ERROR)',
      })
    )
  })

  it('should handle non-array results', async () => {
    const mockQueryFn = jest.fn().mockResolvedValue({ id: 1, name: 'test' })
    const trackedQuery = withDatabaseTracking('getSingleUser', mockQueryFn)

    const result = await trackedQuery

    expect(result).toEqual({ id: 1, name: 'test' })
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'Database Query:',
      expect.objectContaining({
        query: 'getSingleUser',
        recordCount: undefined,
      })
    )
  })
})

describe('usePerformanceTracking', () => {
  it('should return tracking functions for component', () => {
    const { trackAction, trackRender } = usePerformanceTracking('TestComponent')

    expect(typeof trackAction).toBe('function')
    expect(typeof trackRender).toBe('function')
  })

  it('should track component actions with component prefix', () => {
    const { trackAction } = usePerformanceTracking('TestComponent')

    trackAction('click', { buttonId: 'submit' })

    expect(mockConsoleLog).toHaveBeenCalledWith(
      'User Action:',
      expect.objectContaining({
        action: 'TestComponent:click',
        buttonId: 'submit',
      })
    )
  })

  it('should track component render time', () => {
    const { trackRender } = usePerformanceTracking('TestComponent')

    trackRender(150)

    expect(mockConsoleLog).toHaveBeenCalledWith(
      'User Action:',
      expect.objectContaining({
        action: 'TestComponent:render',
        renderTime: 150,
      })
    )
  })
})

describe('Type definitions', () => {
  it('should have correct PerformanceMetrics interface', () => {
    const metrics: PerformanceMetrics = {
      apiCalls: [
        {
          endpoint: '/api/test',
          duration: 100,
          status: 200,
          timestamp: Date.now(),
          method: 'GET',
          userAgent: 'test-agent',
          error: undefined,
        },
      ],
      userActions: [
        {
          action: 'click',
          timestamp: Date.now(),
          url: '/dashboard',
          customField: 'value',
        },
      ],
      systemHealth: [
        {
          component: 'database',
          status: 'healthy',
          responseTime: 50,
          timestamp: Date.now(),
        },
      ],
      dbQueries: [
        {
          query: 'SELECT * FROM users',
          duration: 100,
          recordCount: 5,
          timestamp: Date.now(),
        },
      ],
      resourceUsage: [
        {
          heapUsed: 100000000,
          heapTotal: 200000000,
          external: 50000000,
          rss: 300000000,
          timestamp: Date.now(),
        },
      ],
    }

    expect(metrics).toBeDefined()
  })

  it('should have correct PerformanceAlert interface', () => {
    const alert: PerformanceAlert = {
      level: 'warning',
      message: 'API response slow',
      timestamp: Date.now(),
    }

    expect(alert).toBeDefined()
  })
})
