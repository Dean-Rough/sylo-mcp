import { NextRequest } from 'next/server'
import { POST } from '../route'
import { validateHMACSignature, validateTimestamp } from '@/lib/security/hmac'
import { prisma } from '@/lib/prisma'
import { GmailService } from '@/lib/services/gmail'
import { AsanaService } from '@/lib/services/asana'
import { XeroService } from '@/lib/services/xero'

// Mock dependencies
jest.mock('@/lib/security/hmac')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}))
jest.mock('@/lib/services/gmail')
jest.mock('@/lib/services/asana')
jest.mock('@/lib/services/xero')
jest.mock('@/lib/nango/client', () => ({
  makeAPICall: jest.fn(),
}))

const mockValidateHMACSignature = validateHMACSignature as jest.MockedFunction<
  typeof validateHMACSignature
>
const mockValidateTimestamp = validateTimestamp as jest.MockedFunction<typeof validateTimestamp>
const mockPrismaCreate = prisma.auditLog.create as jest.MockedFunction<
  typeof prisma.auditLog.create
>

// Mock service classes
const mockGmailService = GmailService as jest.MockedClass<typeof GmailService>
const mockAsanaService = AsanaService as jest.MockedClass<typeof AsanaService>
const mockXeroService = XeroService as jest.MockedClass<typeof XeroService>

describe('/api/webhook/command', () => {
  const validCommand = {
    userId: 'user-123',
    action: 'get_emails',
    service: 'gmail',
    parameters: { maxResults: 10 },
  }

  const mockRequest = (body: any, headers: Record<string, string> = {}) => {
    return {
      text: jest.fn().mockResolvedValue(JSON.stringify(body)),
      headers: {
        get: jest.fn((name: string) => headers[name] || null),
      },
    } as unknown as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Set up environment variable
    process.env.WEBHOOK_SECRET = 'test-secret'

    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})

    // Mock Response.json for Next.js API routes
    global.Response = {
      json: jest.fn((data: any, init?: ResponseInit) => ({
        json: jest.fn().mockResolvedValue(data),
        status: init?.status || 200,
      })),
    } as any
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Authentication and Security', () => {
    it('should reject requests without signature', async () => {
      const request = mockRequest(validCommand, { 'x-sylo-timestamp': '1640995200' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Missing signature or timestamp')
    })

    it('should reject requests without timestamp', async () => {
      const request = mockRequest(validCommand, { 'x-sylo-signature': 'sha256=test' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Missing signature or timestamp')
    })

    it('should reject requests with invalid signature', async () => {
      mockValidateHMACSignature.mockReturnValue(false)
      mockValidateTimestamp.mockReturnValue(true)

      const request = mockRequest(validCommand, {
        'x-sylo-signature': 'sha256=invalid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid signature')
    })

    it('should reject requests with invalid timestamp', async () => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(false)

      const request = mockRequest(validCommand, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Request too old or invalid timestamp')
    })

    it('should validate HMAC signature with correct parameters', async () => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(true)

      // Mock Gmail service
      const mockGmailInstance = {
        getEmails: jest.fn().mockResolvedValue([]),
      }
      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      const request = mockRequest(validCommand, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      await POST(request)

      expect(mockValidateHMACSignature).toHaveBeenCalledWith(
        JSON.stringify(validCommand),
        'sha256=valid',
        'test-secret'
      )
    })
  })

  describe('Command Validation', () => {
    beforeEach(() => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(true)
    })

    it('should reject commands with missing action', async () => {
      const invalidCommand = { ...validCommand, action: undefined }
      const request = mockRequest(invalidCommand, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid command structure')
    })

    it('should reject commands with missing service', async () => {
      const invalidCommand = { ...validCommand, service: undefined }
      const request = mockRequest(invalidCommand, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid command structure')
    })

    it('should reject commands with missing userId', async () => {
      const invalidCommand = { ...validCommand, userId: undefined }
      const request = mockRequest(invalidCommand, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid command structure')
    })
  })

  describe('Gmail Commands', () => {
    beforeEach(() => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(true)
    })

    it('should execute get_emails command successfully', async () => {
      const mockEmails = [
        {
          id: '1',
          subject: 'Test Email',
          from: 'test@example.com',
          date: new Date(),
          snippet: 'Test',
        },
      ]

      const mockGmailInstance = {
        getEmails: jest.fn().mockResolvedValue(mockEmails),
      }
      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      const command = {
        userId: 'user-123',
        action: 'get_emails',
        service: 'gmail',
        parameters: { maxResults: 10 },
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.emails).toEqual(mockEmails)
      expect(data.result.count).toBe(1)
      expect(mockGmailInstance.getEmails).toHaveBeenCalledWith(10, undefined)
    })

    it('should execute send_email command successfully', async () => {
      const mockGmailInstance = {
        sendEmail: jest.fn().mockResolvedValue(true),
      }
      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      const command = {
        userId: 'user-123',
        action: 'send_email',
        service: 'gmail',
        parameters: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test Body',
        },
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.sent).toBe(true)
      expect(mockGmailInstance.sendEmail).toHaveBeenCalledWith(
        'recipient@example.com',
        'Test Subject',
        'Test Body'
      )
    })

    it('should reject send_email command with missing parameters', async () => {
      const command = {
        userId: 'user-123',
        action: 'send_email',
        service: 'gmail',
        parameters: { to: 'test@example.com' }, // Missing subject and body
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Missing required parameters')
    })

    it('should handle unsupported Gmail actions', async () => {
      const command = {
        userId: 'user-123',
        action: 'unsupported_action',
        service: 'gmail',
        parameters: {},
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Unsupported Gmail action')
    })
  })

  describe('Asana Commands', () => {
    beforeEach(() => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(true)
    })

    it('should execute get_tasks command successfully', async () => {
      const mockTasks = [
        { gid: '1', name: 'Test Task', completed: false, created_at: '2024-01-01' },
      ]

      const mockAsanaInstance = {
        getMyTasks: jest.fn().mockResolvedValue(mockTasks),
      }
      mockAsanaService.mockImplementation(() => mockAsanaInstance as any)

      const command = {
        userId: 'user-123',
        action: 'get_tasks',
        service: 'asana',
        parameters: {},
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.tasks).toEqual(mockTasks)
      expect(data.result.count).toBe(1)
    })

    it('should execute create_task command successfully', async () => {
      const mockTask = { gid: '1', name: 'New Task', completed: false }

      const mockAsanaInstance = {
        createTask: jest.fn().mockResolvedValue(mockTask),
      }
      mockAsanaService.mockImplementation(() => mockAsanaInstance as any)

      const command = {
        userId: 'user-123',
        action: 'create_task',
        service: 'asana',
        parameters: {
          name: 'New Task',
          notes: 'Task notes',
          due_date: '2024-12-31',
        },
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.task).toEqual(mockTask)
      expect(mockAsanaInstance.createTask).toHaveBeenCalledWith(
        'New Task',
        undefined,
        '2024-12-31',
        'Task notes'
      )
    })
  })

  describe('Xero Commands', () => {
    beforeEach(() => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(true)
    })

    it('should execute get_financial_summary command successfully', async () => {
      const mockSummary = {
        totalReceivables: 10000,
        totalPayables: 5000,
        overdueAmount: 1000,
        overdueCount: 2,
        totalInvoices: 15,
        paidInvoices: 10,
      }

      const mockXeroInstance = {
        getFinancialSummary: jest.fn().mockResolvedValue(mockSummary),
      }
      mockXeroService.mockImplementation(() => mockXeroInstance as any)

      const command = {
        userId: 'user-123',
        action: 'get_financial_summary',
        service: 'xero',
        parameters: {},
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result).toEqual(mockSummary)
    })
  })

  describe('Audit Logging', () => {
    beforeEach(() => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(true)
      mockPrismaCreate.mockResolvedValue({} as any)
    })

    it('should create audit log for successful command execution', async () => {
      const mockGmailInstance = {
        getEmails: jest.fn().mockResolvedValue([]),
      }
      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      const command = {
        userId: 'user-123',
        action: 'get_emails',
        service: 'gmail',
        parameters: { maxResults: 10 },
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
        'x-forwarded-for': '192.168.1.1',
      })

      await POST(request)

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          service: 'gmail',
          action: 'get_emails',
          parameters: { maxResults: 10 },
          status: 'success',
          ipAddress: '192.168.1.1',
          requestId: expect.any(String),
        }),
      })
    })
  })

  describe('Unsupported Services', () => {
    beforeEach(() => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(true)
    })

    it('should handle unsupported service', async () => {
      const command = {
        userId: 'user-123',
        action: 'test_action',
        service: 'unsupported_service',
        parameters: {},
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Unsupported service')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockValidateHMACSignature.mockReturnValue(true)
      mockValidateTimestamp.mockReturnValue(true)
    })

    it('should handle malformed JSON', async () => {
      const request = {
        text: jest.fn().mockResolvedValue('invalid json'),
        headers: {
          get: jest.fn().mockImplementation((name: string) => {
            if (name === 'x-sylo-signature') return 'sha256=valid'
            if (name === 'x-sylo-timestamp') return '1640995200'
            return null
          }),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('COMMAND_EXECUTION_FAILED')
    })

    it('should handle service execution errors', async () => {
      const mockGmailInstance = {
        getEmails: jest.fn().mockRejectedValue(new Error('Service error')),
      }
      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      const command = {
        userId: 'user-123',
        action: 'get_emails',
        service: 'gmail',
        parameters: {},
      }

      const request = mockRequest(command, {
        'x-sylo-signature': 'sha256=valid',
        'x-sylo-timestamp': '1640995200',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Service error')
    })
  })
})
