import { prisma } from '@/lib/prisma'
import { GmailService } from '@/lib/services/gmail'
import { AsanaService } from '@/lib/services/asana'
import { XeroService } from '@/lib/services/xero'

export interface ProjectContext {
  timestamp: string
  userId: string
  services: Array<{
    name: string
    status: 'active' | 'inactive' | 'error'
    lastSync: string
    itemCount: number
    error?: string
  }>
  summary: {
    totalItems: number
    urgentItems: number
    recentActivity: number
  }
  communications?: {
    unreadCount: number
    urgentItems: Array<{
      title: string
      description: string
      source: string
      priority: 'high' | 'medium' | 'low'
    }>
    recentActivity: Array<{
      title: string
      description: string
      timestamp: string
      source: string
    }>
  }
  projects?: Array<{
    name: string
    completion: number
    deadline?: string
    status: string
    source: string
  }>
  financials?: {
    totalReceivables: number
    totalPayables: number
    overdueAmount: number
    overdueCount: number
    currency: string
  }
  urgentItems?: Array<{
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    source: string
    dueDate?: string
  }>
}

export class ContextCompiler {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async compileProjectContext(): Promise<ProjectContext> {
    // Get connections that are managed by Nango
    const connections = await prisma.oAuthConnection.findMany({
      where: {
        userId: this.userId,
        isActive: true,
      },
    })

    const context: ProjectContext = {
      timestamp: new Date().toISOString(),
      userId: this.userId,
      services: [],
      summary: {
        totalItems: 0,
        urgentItems: 0,
        recentActivity: 0,
      },
      urgentItems: [],
    }

    // Compile context from each connected service using Nango connection IDs
    const servicePromises = connections.map(async conn => {
      try {
        // Use the user ID as the Nango connection ID (standard pattern)
        const nangoConnectionId = this.userId

        switch (conn.service) {
          case 'gmail':
            return await this.compileGmailContext(nangoConnectionId)
          case 'asana':
            return await this.compileAsanaContext(nangoConnectionId)
          case 'xero':
            return await this.compileXeroContext(nangoConnectionId)
          default:
            return null
        }
      } catch (error) {
        console.error(`Failed to compile context for ${conn.service}:`, error)
        return {
          service: conn.service,
          status: 'error' as const,
          lastSync: new Date().toISOString(),
          itemCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    const serviceContexts = await Promise.all(servicePromises)
    const validContexts = serviceContexts.filter(Boolean)

    // Merge all contexts
    return this.mergeContexts(context, validContexts)
  }

  private async compileGmailContext(connectionId: string) {
    const gmail = new GmailService(connectionId)

    try {
      const [stats, urgentEmails, recentEmails] = await Promise.all([
        gmail.getEmailStats(),
        gmail.getUrgentEmails(),
        gmail.getEmails(10),
      ])

      return {
        service: 'gmail',
        status: 'active' as const,
        lastSync: new Date().toISOString(),
        itemCount: stats.unread,
        communications: {
          unreadCount: stats.unread,
          urgentItems: urgentEmails.slice(0, 5).map(email => ({
            title: email.subject,
            description: `From: ${email.from}`,
            source: 'gmail',
            priority: 'high' as const,
          })),
          recentActivity: recentEmails.slice(0, 10).map(email => ({
            title: email.subject,
            description: `From: ${email.from}`,
            timestamp: email.date.toISOString(),
            source: 'gmail',
          })),
        },
        urgentItems: urgentEmails.slice(0, 3).map(email => ({
          title: `Email: ${email.subject}`,
          description: `From ${email.from}`,
          priority: 'high' as const,
          source: 'gmail',
        })),
      }
    } catch (error) {
      throw new Error(`Gmail context compilation failed: ${error}`)
    }
  }

  private async compileAsanaContext(connectionId: string) {
    const asana = new AsanaService(connectionId)

    try {
      const [stats, upcomingTasks, myTasks] = await Promise.all([
        asana.getTaskStats(),
        asana.getUpcomingTasks(),
        asana.getMyTasks(),
      ])

      const incompleteTasks = myTasks.filter(task => !task.completed)

      return {
        service: 'asana',
        status: 'active' as const,
        lastSync: new Date().toISOString(),
        itemCount: incompleteTasks.length,
        projects: incompleteTasks.map(task => ({
          name: task.name,
          completion: task.completed ? 100 : 0,
          deadline: task.due_date,
          status: task.completed ? 'completed' : 'in_progress',
          source: 'asana',
        })),
        urgentItems: [
          ...upcomingTasks.slice(0, 2).map(task => ({
            title: `Task: ${task.name}`,
            description: task.due_date ? `Due: ${task.due_date}` : 'No due date',
            priority: 'medium' as const,
            source: 'asana',
            dueDate: task.due_date,
          })),
          ...(stats.overdue > 0
            ? [
                {
                  title: `${stats.overdue} Overdue Tasks`,
                  description: 'Tasks that are past their due date',
                  priority: 'high' as const,
                  source: 'asana',
                },
              ]
            : []),
        ],
      }
    } catch (error) {
      throw new Error(`Asana context compilation failed: ${error}`)
    }
  }

  private async compileXeroContext(connectionId: string) {
    const xero = new XeroService(connectionId)

    try {
      const [summary, overdueInvoices] = await Promise.all([
        xero.getFinancialSummary(),
        xero.getOverdueInvoices(),
      ])

      return {
        service: 'xero',
        status: 'active' as const,
        lastSync: new Date().toISOString(),
        itemCount: summary.totalInvoices,
        financials: {
          totalReceivables: summary.totalReceivables,
          totalPayables: summary.totalPayables,
          overdueAmount: summary.overdueAmount,
          overdueCount: summary.overdueCount,
          currency: 'USD', // Default, could be enhanced to detect from Xero
        },
        urgentItems: [
          ...(summary.overdueCount > 0
            ? [
                {
                  title: `${summary.overdueCount} Overdue Invoices`,
                  description: `$${summary.overdueAmount.toFixed(2)} in overdue payments`,
                  priority: 'high' as const,
                  source: 'xero',
                },
              ]
            : []),
          ...(summary.totalReceivables > 10000
            ? [
                {
                  title: 'High Outstanding Receivables',
                  description: `$${summary.totalReceivables.toFixed(2)} in outstanding payments`,
                  priority: 'medium' as const,
                  source: 'xero',
                },
              ]
            : []),
        ],
      }
    } catch (error) {
      throw new Error(`Xero context compilation failed: ${error}`)
    }
  }

  private mergeContexts(baseContext: ProjectContext, contexts: any[]): ProjectContext {
    const merged = { ...baseContext }

    // Add service statuses
    contexts.forEach(ctx => {
      if (ctx) {
        merged.services.push({
          name: ctx.service,
          status: ctx.status,
          lastSync: ctx.lastSync,
          itemCount: ctx.itemCount,
          error: ctx.error,
        })

        // Merge communications
        if (ctx.communications) {
          if (!merged.communications) {
            merged.communications = {
              unreadCount: 0,
              urgentItems: [],
              recentActivity: [],
            }
          }

          merged.communications.unreadCount += ctx.communications.unreadCount || 0
          merged.communications.urgentItems.push(...(ctx.communications.urgentItems || []))
          merged.communications.recentActivity.push(...(ctx.communications.recentActivity || []))
        }

        // Merge projects
        if (ctx.projects) {
          if (!merged.projects) merged.projects = []
          merged.projects.push(...ctx.projects)
        }

        // Merge financials
        if (ctx.financials) {
          merged.financials = ctx.financials
        }

        // Merge urgent items
        if (ctx.urgentItems) {
          merged.urgentItems!.push(...ctx.urgentItems)
        }
      }
    })

    // Update summary
    merged.summary = {
      totalItems: merged.services.reduce((sum, service) => sum + service.itemCount, 0),
      urgentItems: merged.urgentItems?.length || 0,
      recentActivity: merged.communications?.recentActivity?.length || 0,
    }

    // Sort urgent items by priority
    merged.urgentItems?.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    return merged
  }

  async generateMarkdown(): Promise<string> {
    const context = await this.compileProjectContext()

    const urgentSection =
      context.urgentItems && context.urgentItems.length > 0
        ? context.urgentItems
            .map(
              item =>
                `- **${item.title}**: ${item.description}${item.dueDate ? ` (Due: ${item.dueDate})` : ''}`
            )
            .join('\n')
        : 'No urgent items'

    const projectsSection =
      context.projects && context.projects.length > 0
        ? context.projects
            .map(
              p =>
                `- **${p.name}**: ${p.completion}% complete${p.deadline ? `, deadline ${p.deadline}` : ''}`
            )
            .join('\n')
        : 'No active projects'

    const communicationsSection = context.communications
      ? `- ${context.communications.unreadCount} unread emails
- ${context.communications.urgentItems.length} urgent items requiring response`
      : '- No communication data available'

    const financialsSection = context.financials
      ? `- Outstanding Receivables: $${context.financials.totalReceivables.toFixed(2)}
- Outstanding Payables: $${context.financials.totalPayables.toFixed(2)}
- Overdue Amount: $${context.financials.overdueAmount.toFixed(2)} (${context.financials.overdueCount} invoices)`
      : '- No financial data available'

    return `# Studio Status - ${new Date(context.timestamp).toLocaleString()}

## 🚨 Immediate Attention Required
${urgentSection}

## 📋 Active Projects
${projectsSection}

## Communications Summary
${communicationsSection}

## 💰 Financial Overview
${financialsSection}

## Service Status
${context.services
  .map(
    s =>
      `- **${s.name}**: ${s.status} (${s.itemCount} items, last sync: ${new Date(s.lastSync).toLocaleTimeString()})`
  )
  .join('\n')}

---
*Last updated: ${new Date(context.timestamp).toLocaleString()}*
*Total items tracked: ${context.summary.totalItems}*`
  }
}
