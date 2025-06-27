import { ContextCompiler } from '../compiler'
import { prisma } from '@/lib/prisma'
import { GmailService } from '@/lib/services/gmail'
import { AsanaService } from '@/lib/services/asana'
import { XeroService } from '@/lib/services/xero'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    oAuthConnection: {
      findMany: jest.fn(),
    },
  },
}))
jest.mock('@/lib/services/gmail')
jest.mock('@/lib/services/asana')
jest.mock('@/lib/services/xero')
jest.mock('@/lib/nango/client', () => ({
  nango: {
    getConnection: jest.fn(),
    createSession: jest.fn(),
  },
  makeAPICall: jest.fn(),
  createConnectSession: jest.fn(),
  getConnection: jest.fn(),
  SUPPORTED_INTEGRATIONS: {
    GMAIL: 'gmail',
    ASANA: 'asana',
    XERO: 'xero',
  },
}))

const mockPrismaFindMany = prisma.oAuthConnection.findMany as jest.MockedFunction<
  typeof prisma.oAuthConnection.findMany
>
const mockGmailService = GmailService as jest.MockedClass<typeof GmailService>
const mockAsanaService = AsanaService as jest.MockedClass<typeof AsanaService>
const mockXeroService = XeroService as jest.MockedClass<typeof XeroService>

describe('ContextCompiler', () => {
  const testUserId = 'user-123'
  let compiler: ContextCompiler

  beforeEach(() => {
    jest.clearAllMocks()
    compiler = new ContextCompiler(testUserId)

    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('compileProjectContext', () => {
    it('should handle user with no connections', async () => {
      mockPrismaFindMany.mockResolvedValue([])

      const result = await compiler.compileProjectContext()

      expect(result).toEqual({
        timestamp: expect.any(String),
        userId: testUserId,
        services: [],
        summary: {
          totalItems: 0,
          urgentItems: 0,
          recentActivity: 0,
        },
        urgentItems: [],
      })
    })

    it('should compile context from Gmail connection', async () => {
      const mockConnection = {
        id: '1',
        userId: testUserId,
        service: 'gmail',
        accessToken: 'managed_by_nango',
        isActive: true,
      }

      mockPrismaFindMany.mockResolvedValue([mockConnection as any])

      const mockGmailInstance = {
        getEmailStats: jest.fn().mockResolvedValue({
          unread: 5,
          total: 100,
        }),
        getUrgentEmails: jest.fn().mockResolvedValue([
          {
            id: '1',
            subject: 'URGENT: Meeting today',
            from: 'boss@company.com',
            date: new Date(),
            snippet: 'Important meeting',
          },
        ]),
        getEmails: jest.fn().mockResolvedValue([
          {
            id: '1',
            subject: 'Test Email',
            from: 'test@example.com',
            date: new Date(),
            snippet: 'Test content',
          },
        ]),
      }

      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      const result = await compiler.compileProjectContext()

      expect(result.services).toHaveLength(1)
      expect(result.services[0]).toMatchObject({
        name: 'gmail',
        status: 'active',
        itemCount: 5,
      })
      expect(result.communications).toBeDefined()
      expect(result.communications!.unreadCount).toBe(5)
      expect(result.urgentItems).toHaveLength(1)
      expect(result.urgentItems![0].title).toBe('Email: URGENT: Meeting today')
    })

    it('should compile context from Asana connection', async () => {
      const mockConnection = {
        id: '2',
        userId: testUserId,
        service: 'asana',
        accessToken: 'managed_by_nango',
        isActive: true,
      }

      mockPrismaFindMany.mockResolvedValue([mockConnection as any])

      const mockAsanaInstance = {
        getTaskStats: jest.fn().mockResolvedValue({
          total: 10,
          completed: 5,
          overdue: 2,
          dueToday: 1,
          upcoming: 3,
        }),
        getUpcomingTasks: jest.fn().mockResolvedValue([
          {
            gid: '1',
            name: 'Important Task',
            completed: false,
            due_date: '2024-12-31',
            created_at: '2024-01-01',
            modified_at: '2024-01-01',
            projects: [],
            tags: [],
          },
        ]),
        getMyTasks: jest.fn().mockResolvedValue([
          {
            gid: '1',
            name: 'My Task',
            completed: false,
            due_date: '2024-12-31',
            created_at: '2024-01-01',
            modified_at: '2024-01-01',
            projects: [],
            tags: [],
          },
          {
            gid: '2',
            name: 'Completed Task',
            completed: true,
            created_at: '2024-01-01',
            modified_at: '2024-01-01',
            projects: [],
            tags: [],
          },
        ]),
      }

      mockAsanaService.mockImplementation(() => mockAsanaInstance as any)

      const result = await compiler.compileProjectContext()

      expect(result.services).toHaveLength(1)
      expect(result.services[0]).toMatchObject({
        name: 'asana',
        status: 'active',
        itemCount: 1, // Only incomplete tasks
      })
      expect(result.projects).toHaveLength(1)
      expect(result.projects![0].name).toBe('My Task')
      expect(result.urgentItems).toHaveLength(2) // 1 upcoming + 1 overdue notice
    })

    it('should compile context from Xero connection', async () => {
      const mockConnection = {
        id: '3',
        userId: testUserId,
        service: 'xero',
        accessToken: 'managed_by_nango',
        isActive: true,
      }

      mockPrismaFindMany.mockResolvedValue([mockConnection as any])

      const mockXeroInstance = {
        getFinancialSummary: jest.fn().mockResolvedValue({
          totalReceivables: 15000,
          totalPayables: 5000,
          overdueAmount: 2000,
          overdueCount: 3,
          totalInvoices: 25,
          paidInvoices: 15,
        }),
        getOverdueInvoices: jest.fn().mockResolvedValue([
          {
            InvoiceID: '1',
            InvoiceNumber: 'INV-001',
            Type: 'ACCREC' as const,
            Status: 'AUTHORISED',
            Date: '2024-01-01',
            DueDate: '2024-01-15',
            Total: 1000,
            AmountDue: 1000,
            AmountPaid: 0,
            Contact: { ContactID: '1', Name: 'Client A' },
            CurrencyCode: 'USD',
          },
        ]),
      }

      mockXeroService.mockImplementation(() => mockXeroInstance as any)

      const result = await compiler.compileProjectContext()

      expect(result.services).toHaveLength(1)
      expect(result.services[0]).toMatchObject({
        name: 'xero',
        status: 'active',
        itemCount: 25,
      })
      expect(result.financials).toBeDefined()
      expect(result.financials!.totalReceivables).toBe(15000)
      expect(result.urgentItems).toHaveLength(2) // Overdue invoices + high receivables
    })

    it('should handle service errors gracefully', async () => {
      const mockConnection = {
        id: '1',
        userId: testUserId,
        service: 'gmail',
        accessToken: 'managed_by_nango',
        isActive: true,
      }

      mockPrismaFindMany.mockResolvedValue([mockConnection as any])

      const mockGmailInstance = {
        getEmailStats: jest.fn().mockRejectedValue(new Error('Gmail API error')),
        getUrgentEmails: jest.fn().mockRejectedValue(new Error('Gmail API error')),
        getEmails: jest.fn().mockRejectedValue(new Error('Gmail API error')),
      }

      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      const result = await compiler.compileProjectContext()

      expect(result.services).toHaveLength(1)
      expect(result.services[0]).toMatchObject({
        name: 'gmail',
        status: 'error',
        itemCount: 0,
        error: 'Gmail context compilation failed: Error: Gmail API error',
      })
    })

    it('should handle unknown service gracefully', async () => {
      const mockConnection = {
        id: '1',
        userId: testUserId,
        service: 'unknown',
        accessToken: 'managed_by_nango',
        isActive: true,
      }

      mockPrismaFindMany.mockResolvedValue([mockConnection as any])

      const result = await compiler.compileProjectContext()

      expect(result.services).toHaveLength(0)
      expect(result.summary.totalItems).toBe(0)
    })

    it('should merge contexts from multiple services', async () => {
      const mockConnections = [
        {
          id: '1',
          userId: testUserId,
          service: 'gmail',
          accessToken: 'managed_by_nango',
          isActive: true,
        },
        {
          id: '2',
          userId: testUserId,
          service: 'asana',
          accessToken: 'managed_by_nango',
          isActive: true,
        },
      ]

      mockPrismaFindMany.mockResolvedValue(mockConnections as any)

      // Mock Gmail
      const mockGmailInstance = {
        getEmailStats: jest.fn().mockResolvedValue({ unread: 3, total: 50 }),
        getUrgentEmails: jest.fn().mockResolvedValue([]),
        getEmails: jest.fn().mockResolvedValue([]),
      }
      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      // Mock Asana
      const mockAsanaInstance = {
        getTaskStats: jest.fn().mockResolvedValue({
          total: 5,
          completed: 2,
          overdue: 0,
          dueToday: 0,
          upcoming: 1,
        }),
        getUpcomingTasks: jest.fn().mockResolvedValue([]),
        getMyTasks: jest.fn().mockResolvedValue([
          {
            gid: '1',
            name: 'Task 1',
            completed: false,
            projects: [],
            tags: [],
            created_at: '2024-01-01',
            modified_at: '2024-01-01',
          },
        ]),
      }
      mockAsanaService.mockImplementation(() => mockAsanaInstance as any)

      const result = await compiler.compileProjectContext()

      expect(result.services).toHaveLength(2)
      expect(result.summary.totalItems).toBe(4) // 3 + 1
      expect(result.communications).toBeDefined()
      expect(result.projects).toBeDefined()
    })

    it('should sort urgent items by priority', async () => {
      const mockConnection = {
        id: '1',
        userId: testUserId,
        service: 'asana',
        accessToken: 'managed_by_nango',
        isActive: true,
      }

      mockPrismaFindMany.mockResolvedValue([mockConnection as any])

      const mockAsanaInstance = {
        getTaskStats: jest.fn().mockResolvedValue({
          total: 10,
          completed: 5,
          overdue: 2,
          dueToday: 1,
          upcoming: 3,
        }),
        getUpcomingTasks: jest.fn().mockResolvedValue([
          {
            gid: '1',
            name: 'Medium Priority Task',
            completed: false,
            due_date: '2024-12-31',
            created_at: '2024-01-01',
            modified_at: '2024-01-01',
            projects: [],
            tags: [],
          },
        ]),
        getMyTasks: jest.fn().mockResolvedValue([]),
      }

      mockAsanaService.mockImplementation(() => mockAsanaInstance as any)

      const result = await compiler.compileProjectContext()

      // Should have overdue (high) then upcoming task (medium)
      expect(result.urgentItems).toHaveLength(2)
      expect(result.urgentItems![0].priority).toBe('high') // Overdue tasks
      expect(result.urgentItems![1].priority).toBe('medium') // Upcoming task
    })
  })

  describe('generateMarkdown', () => {
    it('should generate markdown with no data', async () => {
      mockPrismaFindMany.mockResolvedValue([])

      const markdown = await compiler.generateMarkdown()

      expect(markdown).toContain('# Studio Status')
      expect(markdown).toContain('No urgent items')
      expect(markdown).toContain('No active projects')
      expect(markdown).toContain('No communication data available')
      expect(markdown).toContain('No financial data available')
    })

    it('should generate comprehensive markdown with all data types', async () => {
      const mockConnections = [
        {
          id: '1',
          userId: testUserId,
          service: 'gmail',
          accessToken: 'managed_by_nango',
          isActive: true,
        },
        {
          id: '2',
          userId: testUserId,
          service: 'xero',
          accessToken: 'managed_by_nango',
          isActive: true,
        },
      ]

      mockPrismaFindMany.mockResolvedValue(mockConnections as any)

      // Mock Gmail with urgent items
      const mockGmailInstance = {
        getEmailStats: jest.fn().mockResolvedValue({ unread: 5, total: 100 }),
        getUrgentEmails: jest.fn().mockResolvedValue([
          {
            id: '1',
            subject: 'URGENT: Please respond',
            from: 'client@example.com',
            date: new Date(),
            snippet: 'Urgent matter',
          },
        ]),
        getEmails: jest.fn().mockResolvedValue([]),
      }
      mockGmailService.mockImplementation(() => mockGmailInstance as any)

      // Mock Xero with financial data
      const mockXeroInstance = {
        getFinancialSummary: jest.fn().mockResolvedValue({
          totalReceivables: 25000,
          totalPayables: 10000,
          overdueAmount: 5000,
          overdueCount: 5,
          totalInvoices: 50,
          paidInvoices: 30,
        }),
        getOverdueInvoices: jest.fn().mockResolvedValue([]),
      }
      mockXeroService.mockImplementation(() => mockXeroInstance as any)

      const markdown = await compiler.generateMarkdown()

      expect(markdown).toContain('# Studio Status')
      expect(markdown).toContain('🚨 Immediate Attention Required')
      expect(markdown).toContain('Email: URGENT: Please respond')
      expect(markdown).toContain('📧 Communications Summary')
      expect(markdown).toContain('5 unread emails')
      expect(markdown).toContain('💰 Financial Overview')
      expect(markdown).toContain('$25000.00')
      expect(markdown).toContain('📊 Service Status')
      expect(markdown).toContain('**gmail**: active')
      expect(markdown).toContain('**xero**: active')
    })

    it('should format projects correctly in markdown', async () => {
      const mockConnection = {
        id: '1',
        userId: testUserId,
        service: 'asana',
        accessToken: 'managed_by_nango',
        isActive: true,
      }

      mockPrismaFindMany.mockResolvedValue([mockConnection as any])

      const mockAsanaInstance = {
        getTaskStats: jest.fn().mockResolvedValue({
          total: 5,
          completed: 2,
          overdue: 0,
          dueToday: 0,
          upcoming: 1,
        }),
        getUpcomingTasks: jest.fn().mockResolvedValue([]),
        getMyTasks: jest.fn().mockResolvedValue([
          {
            gid: '1',
            name: 'Website Redesign',
            completed: false,
            due_date: '2024-12-31',
            projects: [],
            tags: [],
            created_at: '2024-01-01',
            modified_at: '2024-01-01',
          },
        ]),
      }

      mockAsanaService.mockImplementation(() => mockAsanaInstance as any)

      const markdown = await compiler.generateMarkdown()

      expect(markdown).toContain('📋 Active Projects')
      expect(markdown).toContain('**Website Redesign**: 0% complete, deadline 2024-12-31')
    })

    it('should handle urgent items with due dates', async () => {
      const mockConnection = {
        id: '1',
        userId: testUserId,
        service: 'asana',
        accessToken: 'managed_by_nango',
        isActive: true,
      }

      mockPrismaFindMany.mockResolvedValue([mockConnection as any])

      const mockAsanaInstance = {
        getTaskStats: jest.fn().mockResolvedValue({
          total: 5,
          completed: 2,
          overdue: 0,
          dueToday: 0,
          upcoming: 1,
        }),
        getUpcomingTasks: jest.fn().mockResolvedValue([
          {
            gid: '1',
            name: 'Important Deadline',
            completed: false,
            due_date: '2024-12-25',
            projects: [],
            tags: [],
            created_at: '2024-01-01',
            modified_at: '2024-01-01',
          },
        ]),
        getMyTasks: jest.fn().mockResolvedValue([]),
      }

      mockAsanaService.mockImplementation(() => mockAsanaInstance as any)

      const markdown = await compiler.generateMarkdown()

      expect(markdown).toContain('**Task: Important Deadline**: Due: 2024-12-25 (Due: 2024-12-25)')
    })
  })
})
