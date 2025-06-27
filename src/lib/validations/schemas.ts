import { z } from 'zod'

// MCP Configuration Schemas
export const MCPConfigSchema = z.object({
  mcpVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  agent: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    userId: z.string().min(1),
  }),
  services: z.array(
    z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      status: z.enum(['active', 'inactive', 'error']),
      endpoints: z.object({
        read: z.string().url(),
        write: z.string().url(),
        search: z.string().url(),
      }),
      authentication: z.object({
        type: z.enum(['hmac', 'bearer', 'api_key']),
        key: z.string().min(1),
        algorithm: z.string().min(1),
      }),
      capabilities: z.array(z.string()),
      scopes: z.array(z.string()),
    })
  ),
  context: z.object({
    baseUrl: z.string().url(),
    sources: z.object({
      projects: z.string(),
      communications: z.string(),
      tasks: z.string(),
      financials: z.string(),
    }),
    refreshInterval: z.number().positive(),
    format: z.enum(['json', 'yaml', 'markdown']),
  }),
  webhooks: z.object({
    baseUrl: z.string().url(),
    authentication: z.object({
      type: z.enum(['hmac', 'bearer', 'api_key']),
      header: z.string().min(1),
      algorithm: z.string().min(1),
    }),
    timeout: z.number().positive(),
    retries: z.number().nonnegative(),
  }),
})

// OAuth Connection Schemas
export const OAuthConnectionSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().min(1),
  service: z.enum(['gmail', 'asana', 'xero']),
  connectionId: z.string().min(1),
  scopes: z.array(z.string()),
  expiresAt: z.date().optional(),
  isActive: z.boolean(),
  lastUsed: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Context Compilation Schemas
export const ProjectContextSchema = z.object({
  timestamp: z.string().datetime(),
  userId: z.string().min(1),
  services: z.array(
    z.object({
      name: z.string().min(1),
      status: z.enum(['active', 'inactive', 'error']),
      lastSync: z.string().datetime(),
      itemCount: z.number().nonnegative(),
      error: z.string().optional(),
    })
  ),
  summary: z.object({
    totalItems: z.number().nonnegative(),
    urgentItems: z.number().nonnegative(),
    recentActivity: z.number().nonnegative(),
  }),
  communications: z
    .object({
      unreadCount: z.number().nonnegative(),
      urgentItems: z.array(
        z.object({
          title: z.string().min(1),
          description: z.string().min(1),
          source: z.string().min(1),
          priority: z.enum(['high', 'medium', 'low']),
        })
      ),
      recentActivity: z.array(
        z.object({
          title: z.string().min(1),
          description: z.string().min(1),
          timestamp: z.string().datetime(),
          source: z.string().min(1),
        })
      ),
    })
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string().min(1),
        completion: z.number().min(0).max(100),
        deadline: z.string().optional(),
        status: z.string().min(1),
        source: z.string().min(1),
      })
    )
    .optional(),
  financials: z
    .object({
      totalReceivables: z.number(),
      totalPayables: z.number(),
      overdueAmount: z.number(),
      overdueCount: z.number().nonnegative(),
      currency: z.string().length(3),
    })
    .optional(),
  urgentItems: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        priority: z.enum(['high', 'medium', 'low']),
        source: z.string().min(1),
        dueDate: z.string().optional(),
      })
    )
    .optional(),
})

// Webhook Command Schemas
export const AgentCommandSchema = z.object({
  action: z.string().min(1),
  service: z.enum(['gmail', 'asana', 'xero']),
  parameters: z.record(z.unknown()),
  signature: z.string().min(1),
  timestamp: z.number().positive(),
  userId: z.string().min(1),
})

// API Query Parameters
export const ConfigQuerySchema = z.object({
  format: z.enum(['json', 'yaml', 'download']).optional().default('json'),
  refresh: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  validate: z
    .string()
    .optional()
    .transform(val => val === 'true'),
})

export const ContextQuerySchema = z.object({
  format: z.enum(['json', 'markdown']).optional().default('json'),
  type: z.enum(['full', 'markdown']).optional().default('full'),
})

// Service-specific schemas
export const GmailEmailSchema = z.object({
  id: z.string().min(1),
  subject: z.string(),
  from: z.string().min(1),
  date: z.date(),
  snippet: z.string(),
  read: z.boolean().optional(),
  labels: z.array(z.string()).optional(),
})

export const AsanaTaskSchema = z.object({
  gid: z.string().min(1),
  name: z.string().min(1),
  completed: z.boolean(),
  due_date: z.string().optional(),
  assignee: z
    .object({
      gid: z.string().min(1),
      name: z.string().min(1),
    })
    .optional(),
  projects: z.array(
    z.object({
      gid: z.string().min(1),
      name: z.string().min(1),
    })
  ),
  tags: z.array(
    z.object({
      gid: z.string().min(1),
      name: z.string().min(1),
    })
  ),
  created_at: z.string().datetime(),
  modified_at: z.string().datetime(),
})

export const XeroInvoiceSchema = z.object({
  InvoiceID: z.string().min(1),
  InvoiceNumber: z.string().min(1),
  Type: z.enum(['ACCREC', 'ACCPAY']),
  Status: z.string().min(1),
  Date: z.string(),
  DueDate: z.string(),
  Total: z.number(),
  AmountDue: z.number(),
  AmountPaid: z.number(),
  Contact: z.object({
    ContactID: z.string().min(1),
    Name: z.string().min(1),
  }),
  CurrencyCode: z.string().length(3),
})

// Error Response Schema
export const ErrorResponseSchema = z.object({
  error: z.string().min(1),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
})

// Success Response Schema
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
})

// Type exports for use throughout the application
export type MCPConfig = z.infer<typeof MCPConfigSchema>
export type OAuthConnection = z.infer<typeof OAuthConnectionSchema>
export type ProjectContext = z.infer<typeof ProjectContextSchema>
export type AgentCommand = z.infer<typeof AgentCommandSchema>
export type ConfigQuery = z.infer<typeof ConfigQuerySchema>
export type ContextQuery = z.infer<typeof ContextQuerySchema>
export type GmailEmail = z.infer<typeof GmailEmailSchema>
export type AsanaTask = z.infer<typeof AsanaTaskSchema>
export type XeroInvoice = z.infer<typeof XeroInvoiceSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>
