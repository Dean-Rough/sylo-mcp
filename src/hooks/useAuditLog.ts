import { useCallback } from 'react'
import { useUser } from '@clerk/nextjs'

interface AuditLogOptions {
  resource?: string
  parameters?: Record<string, any>
  result?: Record<string, any>
  status?: string
}

export function useAuditLog() {
  const { user } = useUser()

  const logAction = useCallback(
    async (service: string, action: string, options?: AuditLogOptions) => {
      if (!user?.id) return

      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            service,
            action,
            ...options,
          }),
        })
      } catch (error) {
        console.error('Failed to log audit action:', error)
      }
    },
    [user]
  )

  const logSuccess = useCallback(
    (service: string, action: string, options?: AuditLogOptions) => {
      return logAction(service, action, { ...options, status: 'success' })
    },
    [logAction]
  )

  const logError = useCallback(
    (service: string, action: string, error: Error | string, options?: AuditLogOptions) => {
      return logAction(service, action, {
        ...options,
        status: 'error',
        result: {
          error: error instanceof Error ? error.message : error,
        },
      })
    },
    [logAction]
  )

  return {
    logAction,
    logSuccess,
    logError,
  }
}