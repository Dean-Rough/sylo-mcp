import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { validateHMACSignature, validateTimestamp } from '@/lib/security/hmac'
import { prisma } from '@/lib/prisma'
import { AgentCommand, CommandResult, WebhookResponse } from '@/types/webhook'
import { GmailService } from '@/lib/services/gmail'
import { AsanaService } from '@/lib/services/asana'
import { XeroService } from '@/lib/services/xero'
import { makeAPICall } from '@/lib/nango/client'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'

async function postHandler(request: NextRequest) {
  const signature = request.headers.get('x-sylo-signature')
  const timestamp = request.headers.get('x-sylo-timestamp')

  if (!signature || !timestamp) {
    return Response.json({ error: 'Missing signature or timestamp' }, { status: 401 })
  }

  const body = await request.text()

  // Validate HMAC signature
  if (!validateHMACSignature(body, signature, process.env.WEBHOOK_SECRET!)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Validate timestamp (prevent replay attacks)
  if (!validateTimestamp(timestamp, 300)) {
    // 5 minute window
    return Response.json({ error: 'Request too old or invalid timestamp' }, { status: 401 })
  }

  try {
    const command = JSON.parse(body) as AgentCommand

    // Validate command structure
    if (!command.action || !command.service || !command.parameters || !command.userId) {
      return Response.json({ error: 'Invalid command structure' }, { status: 400 })
    }


    // Generate unique command ID
    const commandId = crypto.randomUUID()

    // Execute command
    const result = await executeCommand({ ...command, requestId: commandId })

    // Audit logging
    await prisma.auditLog.create({
      data: {
        userId: command.userId,
        service: command.service,
        action: command.action,
        parameters: command.parameters,
        result: result.data || {},
        status: result.status,
        executedAt: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        requestId: commandId,
      },
    })

    const response: WebhookResponse = {
      success: result.status === 'success',
      commandId: result.commandId,
      status: result.status,
      result: result.data,
      error: result.error,
    }

    return Response.json(response)
  } catch (error) {
    console.error('Webhook command processing error:', error)

    return Response.json(
      {
        error: 'COMMAND_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function executeCommand(command: AgentCommand): Promise<CommandResult> {
  try {
    // Route to appropriate service handler
    switch (command.service) {
      case 'gmail':
        return await executeGmailCommand(command)
      case 'asana':
        return await executeAsanaCommand(command)
      case 'xero':
        return await executeXeroCommand(command)
      default:
        throw new Error(`Unsupported service: ${command.service}`)
    }
  } catch (error) {
    return {
      commandId: command.requestId!,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown execution error',
    }
  }
}

async function executeGmailCommand(command: AgentCommand): Promise<CommandResult> {
  const gmail = new GmailService(command.userId) // Using userId as connection ID for Nango

  switch (command.action) {
    case 'send_email':
      const { to, subject, body } = command.parameters
      if (!to || !subject || !body) {
        throw new Error('Missing required parameters: to, subject, body')
      }

      const sent = await gmail.sendEmail(to, subject, body)
      return {
        commandId: command.requestId!,
        status: sent ? 'success' : 'error',
        data: { sent, to, subject },
        error: sent ? undefined : 'Failed to send email',
      }

    case 'get_emails':
      const { maxResults = 10, query } = command.parameters
      const emails = await gmail.getEmails(maxResults, query)
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { emails, count: emails.length },
      }

    case 'get_unread_emails':
      const unreadEmails = await gmail.getUnreadEmails()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { emails: unreadEmails, count: unreadEmails.length },
      }

    case 'get_email_stats':
      const stats = await gmail.getEmailStats()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: stats,
      }

    default:
      throw new Error(`Unsupported Gmail action: ${command.action}`)
  }
}

async function executeAsanaCommand(command: AgentCommand): Promise<CommandResult> {
  const asana = new AsanaService(command.userId)

  switch (command.action) {
    case 'get_tasks':
      const tasks = await asana.getMyTasks()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { tasks, count: tasks.length },
      }

    case 'create_task':
      const { name, notes, due_date, project_gid } = command.parameters
      if (!name) {
        throw new Error('Missing required parameter: name')
      }

      const task = await asana.createTask(name, project_gid, due_date, notes)
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { task },
      }

    case 'get_task_stats':
      const taskStats = await asana.getTaskStats()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: taskStats,
      }

    case 'get_upcoming_tasks':
      const upcomingTasks = await asana.getUpcomingTasks()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { tasks: upcomingTasks, count: upcomingTasks.length },
      }

    case 'get_projects':
      const projects = await asana.getProjects()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { projects, count: projects.length },
      }

    default:
      throw new Error(`Unsupported Asana action: ${command.action}`)
  }
}

async function executeXeroCommand(command: AgentCommand): Promise<CommandResult> {
  const xero = new XeroService(command.userId)

  switch (command.action) {
    case 'get_financial_summary':
      const summary = await xero.getFinancialSummary()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: summary,
      }

    case 'get_overdue_invoices':
      const overdueInvoices = await xero.getOverdueInvoices()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { invoices: overdueInvoices, count: overdueInvoices.length },
      }

    case 'get_outstanding_invoices':
      const outstandingInvoices = await xero.getOutstandingInvoices()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { invoices: outstandingInvoices, count: outstandingInvoices.length },
      }

    case 'get_contacts':
      const contacts = await xero.getContacts()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { contacts, count: contacts.length },
      }

    case 'get_invoices':
      const invoices = await xero.getInvoices()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { invoices, count: invoices.length },
      }

    case 'get_accounts':
      const accounts = await xero.getAccounts()
      return {
        commandId: command.requestId!,
        status: 'success',
        data: { accounts, count: accounts.length },
      }

    default:
      throw new Error(`Unsupported Xero action: ${command.action}`)
  }
}

// Export the POST handler with rate limiting
export const POST = withRateLimit(postHandler, {
  requests: RATE_LIMIT_CONFIGS.api.webhook.requests,
  window: RATE_LIMIT_CONFIGS.api.webhook.window,
  identifier: (req) => {
    // Try to extract user ID from the request body
    // This is a bit hacky but necessary for webhook rate limiting
    return req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'unknown'
  },
})
