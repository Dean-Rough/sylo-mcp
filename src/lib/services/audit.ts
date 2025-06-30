import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface AuditLogEntry {
  userId: string
  service: string
  action: string
  resource?: string
  parameters?: Record<string, any>
  result?: Record<string, any>
  status: 'success' | 'error' | 'pending' | 'cancelled'
  errorCode?: string
  errorMessage?: string
  executionTime?: number
  retryCount?: number
  ipAddress?: string
  userAgent?: string
}

export class AuditService {
  private static instance: AuditService

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService()
    }
    return AuditService.instance
  }

  /**
   * Create an audit log entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          ...entry,
          parameters: entry.parameters || {},
          result: entry.result || {},
          executedAt: new Date(),
        },
      })
    } catch (error) {
      // Log to console but don't throw - audit logging should not break the main flow
      console.error('Failed to create audit log:', error)
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    userId: string,
    service: string,
    action: string,
    options?: {
      resource?: string
      parameters?: Record<string, any>
      result?: Record<string, any>
      executionTime?: number
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    await this.log({
      userId,
      service,
      action,
      status: 'success',
      ...options,
    })
  }

  /**
   * Log a failed action
   */
  async logError(
    userId: string,
    service: string,
    action: string,
    error: Error | string,
    options?: {
      resource?: string
      parameters?: Record<string, any>
      executionTime?: number
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN_ERROR'

    await this.log({
      userId,
      service,
      action,
      status: 'error',
      errorCode,
      errorMessage,
      ...options,
    })
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userId: string,
    options?: {
      service?: string
      action?: string
      status?: string
      limit?: number
      offset?: number
      startDate?: Date
      endDate?: Date
    }
  ): Promise<Prisma.AuditLogGetPayload<{}>[]> {
    const where: Prisma.AuditLogWhereInput = {
      userId,
      ...(options?.service && { service: options.service }),
      ...(options?.action && { action: options.action }),
      ...(options?.status && { status: options.status }),
      ...(options?.startDate && options?.endDate && {
        executedAt: {
          gte: options.startDate,
          lte: options.endDate,
        },
      }),
    }

    return prisma.auditLog.findMany({
      where,
      orderBy: { executedAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    })
  }

  /**
   * Get service statistics
   */
  async getServiceStats(
    service: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalActions: number
    successfulActions: number
    failedActions: number
    averageExecutionTime: number
    topActions: Array<{ action: string; count: number }>
    errorRate: number
  }> {
    const logs = await prisma.auditLog.findMany({
      where: {
        service,
        executedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const totalActions = logs.length
    const successfulActions = logs.filter((log) => log.status === 'success').length
    const failedActions = logs.filter((log) => log.status === 'error').length

    const executionTimes = logs
      .filter((log) => log.executionTime !== null)
      .map((log) => log.executionTime as number)
    
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0

    // Group by action and count
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }))

    const errorRate = totalActions > 0 ? failedActions / totalActions : 0

    return {
      totalActions,
      successfulActions,
      failedActions,
      averageExecutionTime: Math.round(averageExecutionTime),
      topActions,
      errorRate,
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.auditLog.deleteMany({
      where: {
        executedAt: {
          lt: cutoffDate,
        },
      },
    })

    return result.count
  }

  /**
   * Create a middleware for Express/API routes
   */
  createMiddleware() {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now()
      const originalSend = res.send
      const originalJson = res.json

      // Capture response
      const captureResponse = (body: any) => {
        const executionTime = Date.now() - startTime
        const userId = req.user?.id || 'anonymous'
        const service = req.params?.service || 'api'
        const action = `${req.method} ${req.path}`
        const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'error'

        // Log the API call
        this.log({
          userId,
          service,
          action,
          status,
          parameters: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body,
          },
          result: {
            statusCode: res.statusCode,
            body: typeof body === 'object' ? body : { response: body },
          },
          executionTime,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          userAgent: req.headers['user-agent'],
        }).catch(console.error)
      }

      // Override response methods
      res.send = function (body: any) {
        captureResponse(body)
        return originalSend.call(this, body)
      }

      res.json = function (body: any) {
        captureResponse(body)
        return originalJson.call(this, body)
      }

      next()
    }
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance()