import { NextResponse } from 'next/server'

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // OAuth & Integration
  OAUTH_ERROR = 'OAUTH_ERROR',
  INTEGRATION_FAILED = 'INTEGRATION_FAILED',
  NANGO_ERROR = 'NANGO_ERROR',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',

  // API & Services
  API_ERROR = 'API_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',

  // Data & Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Webhook & Command Processing
  WEBHOOK_ERROR = 'WEBHOOK_ERROR',
  COMMAND_EXECUTION_FAILED = 'COMMAND_EXECUTION_FAILED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',

  // Configuration & MCP
  CONFIG_GENERATION_FAILED = 'CONFIG_GENERATION_FAILED',
  INVALID_CONFIG = 'INVALID_CONFIG',

  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export interface AppError {
  code: ErrorCode
  message: string
  details?: any
  stack?: string
  timestamp: string
  requestId?: string
}

export class AppErrorClass extends Error implements AppError {
  code: ErrorCode
  details?: any
  timestamp: string
  requestId?: string

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()

    // Generate request ID for tracking
    this.requestId = crypto.randomUUID()
  }

  static fromError(error: unknown, code: ErrorCode = ErrorCode.INTERNAL_ERROR): AppErrorClass {
    if (error instanceof AppErrorClass) {
      return error
    }

    if (error instanceof Error) {
      const appError = new AppErrorClass(code, error.message)
      appError.stack = error.stack
      return appError
    }

    return new AppErrorClass(code, String(error))
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
      timestamp: this.timestamp,
      requestId: this.requestId,
    }
  }

  toResponse(includeStack = false): { body: any; status: number } {
    const statusCode = this.getHttpStatusCode()
    const response: any = {
      error: this.code,
      message: this.message,
      timestamp: this.timestamp,
      requestId: this.requestId,
    }

    if (this.details) {
      response.details = this.details
    }

    if (includeStack && this.stack && process.env.NODE_ENV === 'development') {
      response.stack = this.stack
    }

    return { body: response, status: statusCode }
  }

  private getHttpStatusCode(): number {
    switch (this.code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_TOKEN:
      case ErrorCode.SESSION_EXPIRED:
        return 401
      case ErrorCode.FORBIDDEN:
        return 403
      case ErrorCode.NOT_FOUND:
        return 404
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_SIGNATURE:
      case ErrorCode.INVALID_CONFIG:
        return 400
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429
      case ErrorCode.SERVICE_UNAVAILABLE:
      case ErrorCode.EXTERNAL_API_ERROR:
        return 503
      case ErrorCode.TIMEOUT:
        return 408
      case ErrorCode.DUPLICATE_ENTRY:
        return 409
      default:
        return 500
    }
  }
}

// Error logging function
export async function logError(error: AppError | Error, context?: any) {
  const errorData = {
    ...error,
    context,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }

  console.error('Application Error:', errorData)

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    try {
      // TODO: Integrate with error tracking service (Sentry, DataDog, etc.)
      // await sendToErrorTrackingService(errorData)
    } catch (logError) {
      console.error('Failed to send error to tracking service:', logError)
    }
  }
}

// API route error handler
export function handleAPIError(error: unknown, context?: string) {
  let appError: AppErrorClass

  if (error instanceof AppErrorClass) {
    appError = error
  } else if (error instanceof Error) {
    // Map common errors to specific error codes
    if (error.message.includes('not found')) {
      appError = AppErrorClass.fromError(error, ErrorCode.NOT_FOUND)
    } else if (error.message.includes('unauthorized')) {
      appError = AppErrorClass.fromError(error, ErrorCode.UNAUTHORIZED)
    } else if (error.message.includes('rate limit')) {
      appError = AppErrorClass.fromError(error, ErrorCode.RATE_LIMIT_EXCEEDED)
    } else {
      appError = AppErrorClass.fromError(error, ErrorCode.INTERNAL_ERROR)
    }
  } else {
    appError = new AppErrorClass(ErrorCode.INTERNAL_ERROR, 'Unknown error occurred')
  }

  // Log the error
  logError(appError, { context })

  const responseData = appError.toResponse(process.env.NODE_ENV === 'development')

  // In test environment, return the response data directly
  if (process.env.NODE_ENV === 'test') {
    return responseData
  }

  // Import NextResponse only when needed to avoid test issues
  try {
    const { NextResponse } = require('next/server')
    return NextResponse.json(responseData.body, { status: responseData.status })
  } catch (importError) {
    // Fallback for test environment
    return responseData
  }
}

// Client-side error handler
export function handleClientError(error: unknown, context?: string): void {
  const errorData = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  }

  console.error('Client Error:', errorData)

  // Send to error logging endpoint
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch(logError => console.error('Failed to log client error:', logError))
  }
}

// Async error wrapper for API routes
export function withErrorHandler<T extends any[], R>(fn: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleAPIError(error, fn.name)
    }
  }
}
