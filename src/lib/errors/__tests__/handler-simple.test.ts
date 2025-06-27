import { AppErrorClass, ErrorCode } from '../handler'

describe('AppErrorClass - Core Functionality', () => {
  describe('constructor', () => {
    it('should create an AppError with required fields', () => {
      const error = new AppErrorClass(ErrorCode.VALIDATION_ERROR, 'Invalid input')

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.message).toBe('Invalid input')
      expect(error.timestamp).toBeDefined()
      expect(error.requestId).toBeDefined()
      expect(error.name).toBe('AppError')
    })

    it('should accept optional details', () => {
      const details = { field: 'email', value: 'invalid-email' }
      const error = new AppErrorClass(ErrorCode.VALIDATION_ERROR, 'Invalid email', details)

      expect(error.details).toEqual(details)
    })
  })

  describe('fromError', () => {
    it('should convert regular Error to AppErrorClass', () => {
      const originalError = new Error('Something went wrong')
      const appError = AppErrorClass.fromError(originalError, ErrorCode.API_ERROR)

      expect(appError).toBeInstanceOf(AppErrorClass)
      expect(appError.code).toBe(ErrorCode.API_ERROR)
      expect(appError.message).toBe('Something went wrong')
      expect(appError.stack).toBe(originalError.stack)
    })

    it('should return AppErrorClass as-is', () => {
      const originalError = new AppErrorClass(ErrorCode.NOT_FOUND, 'Resource not found')
      const result = AppErrorClass.fromError(originalError)

      expect(result).toBe(originalError)
    })

    it('should handle non-Error values', () => {
      const appError = AppErrorClass.fromError('Simple string error')

      expect(appError).toBeInstanceOf(AppErrorClass)
      expect(appError.code).toBe(ErrorCode.INTERNAL_ERROR)
      expect(appError.message).toBe('Simple string error')
    })
  })

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      const details = { field: 'email' }
      const error = new AppErrorClass(ErrorCode.VALIDATION_ERROR, 'Invalid email', details)

      const json = error.toJSON()

      expect(json).toEqual({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid email',
        details,
        stack: error.stack,
        timestamp: error.timestamp,
        requestId: error.requestId,
      })
    })
  })

  describe('toResponse', () => {
    it('should return response data with correct status for validation error', () => {
      const error = new AppErrorClass(ErrorCode.VALIDATION_ERROR, 'Invalid input')
      const response = error.toResponse()

      expect(response.status).toBe(400)
      expect(response.body.error).toBe(ErrorCode.VALIDATION_ERROR)
    })

    it('should return response data with correct status for unauthorized error', () => {
      const error = new AppErrorClass(ErrorCode.UNAUTHORIZED, 'Not authorized')
      const response = error.toResponse()

      expect(response.status).toBe(401)
      expect(response.body.error).toBe(ErrorCode.UNAUTHORIZED)
    })

    it('should return response data with correct status for not found error', () => {
      const error = new AppErrorClass(ErrorCode.NOT_FOUND, 'Resource not found')
      const response = error.toResponse()

      expect(response.status).toBe(404)
      expect(response.body.error).toBe(ErrorCode.NOT_FOUND)
    })

    it('should return response data with correct status for rate limit error', () => {
      const error = new AppErrorClass(ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many requests')
      const response = error.toResponse()

      expect(response.status).toBe(429)
      expect(response.body.error).toBe(ErrorCode.RATE_LIMIT_EXCEEDED)
    })

    it('should return response data with correct status for internal error', () => {
      const error = new AppErrorClass(ErrorCode.INTERNAL_ERROR, 'Internal error')
      const response = error.toResponse()

      expect(response.status).toBe(500)
      expect(response.body.error).toBe(ErrorCode.INTERNAL_ERROR)
    })

    it('should include stack trace when requested in development', () => {
      const error = new AppErrorClass(ErrorCode.INTERNAL_ERROR, 'Test error')
      // Mock NODE_ENV for this test
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
      })

      const response = error.toResponse(true)

      expect(response.body.stack).toBeDefined()
      expect(response.status).toBe(500)

      // Restore original NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
      })
    })
  })
})
