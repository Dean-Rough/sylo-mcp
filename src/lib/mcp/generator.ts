import { prisma } from '@/lib/prisma'

export interface MCPConfig {
  mcpVersion: string
  generatedAt: string
  expiresAt: string
  agent: {
    name: string
    description: string
    userId: string
  }
  services: Array<{
    name: string
    type: string
    status: string
    endpoints: {
      read: string
      write: string
      search: string
    }
    authentication: {
      type: string
      key: string
      algorithm: string
    }
    capabilities: string[]
    scopes: string[]
  }>
  context: {
    baseUrl: string
    sources: {
      projects: string
      communications: string
      tasks: string
      financials: string
    }
    refreshInterval: number
    format: string
  }
  webhooks: {
    baseUrl: string
    authentication: {
      type: string
      header: string
      algorithm: string
    }
    timeout: number
    retries: number
  }
}

export class MCPGenerator {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async generateConfig(): Promise<MCPConfig> {
    const user = await prisma.user.findUnique({
      where: { clerkId: this.userId },
      include: {
        connections: {
          where: {
            isActive: true,
          },
        },
      },
    })

    if (!user) throw new Error('User not found')

    const services = user.connections.map(conn => ({
      name: conn.service,
      type: this.getServiceType(conn.service),
      status: 'active',
      endpoints: {
        read: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/${conn.service}/read`,
        write: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/${conn.service}/write`,
        search: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/${conn.service}/search`,
      },
      authentication: {
        type: 'hmac',
        key: '{{SYLO_API_KEY}}',
        algorithm: 'sha256',
      },
      capabilities: this.getServiceCapabilities(conn.service),
      scopes: conn.scopes,
    }))

    const config: MCPConfig = {
      mcpVersion: '1.0',
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      agent: {
        name: 'Sylo Studio Manager',
        description: 'Autonomous creative studio management agent with Nango-powered OAuth',
        userId: user.clerkId,
      },
      services,
      context: {
        baseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/context`,
        sources: {
          projects: '/projects',
          communications: '/communications',
          tasks: '/tasks',
          financials: '/financials',
        },
        refreshInterval: 3600, // 1 hour
        format: 'markdown',
      },
      webhooks: {
        baseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
        authentication: {
          type: 'hmac',
          header: 'X-Sylo-Signature',
          algorithm: 'sha256',
        },
        timeout: 30000, // 30 seconds
        retries: 3,
      },
    }

    // Store in database for tracking
    await prisma.mCPConfig.create({
      data: {
        userId: user.id,
        name: 'Default Configuration',
        description: 'Auto-generated MCP configuration for AI agents',
        version: config.mcpVersion,
        config: config as any, // Prisma Json type
        expiresAt: new Date(config.expiresAt),
        isActive: true,
        isDefault: true,
      },
    })

    return config
  }

  private getServiceType(service: string): string {
    const types: Record<string, string> = {
      gmail: 'email',
      asana: 'project_management',
      xero: 'accounting',
    }
    return types[service] || 'unknown'
  }

  private getServiceCapabilities(service: string): string[] {
    const capabilities: Record<string, string[]> = {
      gmail: ['read_emails', 'send_emails', 'search_emails', 'get_email_stats', 'list_unread'],
      asana: [
        'read_tasks',
        'create_tasks',
        'update_tasks',
        'read_projects',
        'get_task_stats',
        'list_upcoming',
      ],
      xero: [
        'read_invoices',
        'read_contacts',
        'read_accounts',
        'get_financial_summary',
        'list_overdue_invoices',
      ],
    }
    return capabilities[service] || []
  }

  async validateConfig(config: MCPConfig): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate required fields
    if (!config.mcpVersion) errors.push('Missing mcpVersion')
    if (!config.agent?.name) errors.push('Missing agent name')
    if (!config.services?.length) errors.push('No services configured')

    // Validate service configurations
    config.services?.forEach((service, index) => {
      if (!service.name) errors.push(`Service ${index}: Missing name`)
      if (!service.endpoints?.read) errors.push(`Service ${service.name}: Missing read endpoint`)
      if (!service.capabilities?.length)
        warnings.push(`Service ${service.name}: No capabilities defined`)
    })

    // Validate webhook configuration
    if (!config.webhooks?.baseUrl) errors.push('Missing webhook baseUrl')
    if (config.webhooks?.timeout && config.webhooks.timeout > 60000) {
      warnings.push('Webhook timeout exceeds recommended 60 seconds')
    }

    // Validate expiration
    const expiresAt = new Date(config.expiresAt)
    const now = new Date()
    if (expiresAt <= now) {
      errors.push('Configuration has expired')
    } else if (expiresAt.getTime() - now.getTime() < 60 * 60 * 1000) {
      // Less than 1 hour
      warnings.push('Configuration expires soon')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}

export async function getUserMCPConfigs(userId: string) {
  return prisma.mCPConfig.findMany({
    where: {
      user: { clerkId: userId },
      isActive: true,
      expiresAt: { gt: new Date() }, // Only non-expired configs
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function deactivateMCPConfig(configId: string, userId: string) {
  return prisma.mCPConfig.updateMany({
    where: {
      id: configId,
      user: { clerkId: userId },
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  })
}
