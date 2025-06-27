# AI Agent Build Sequence - Sylo V2

**PURPOSE**: Ultra-precise implementation directives for autonomous AI development agents  
**FORMAT**: Atomic, prompt-optimized tasks with explicit inputs/outputs  
**EXECUTION**: Sequential with dependency validation

---

## 🏗️ PHASE 0: INFRASTRUCTURE

### ✅ INFRA-001: Initialize App Router Structure

```typescript
// TASK: Create Next.js App Router file structure with TypeScript
// INPUT: Empty src/ directory
// OUTPUT: Complete app/ directory with layout and pages

mkdir -p src/app/{dashboard,auth/{sign-in,sign-up,callback/[service]}}
touch src/app/{layout.tsx,page.tsx,globals.css}
touch src/app/dashboard/{page.tsx,layout.tsx}
touch src/app/dashboard/{connections,config,logs}/page.tsx
touch src/app/auth/sign-in/[[...sign-in]]/page.tsx
touch src/app/auth/sign-up/[[...sign-up]]/page.tsx
touch src/app/auth/callback/[service]/page.tsx

// VALIDATION: All required route files exist
```

### ✅ INFRA-002: Setup Clerk Authentication

```typescript
// TASK: Implement Clerk App Router integration
// INPUT: Existing middleware.ts, .env.example
// OUTPUT: Working authentication with protected routes

// 1. Create src/app/layout.tsx with ClerkProvider
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html><body>{children}</body></html>
    </ClerkProvider>
  )
}

// 2. Create auth pages using Clerk components
// src/app/auth/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'
export default function Page() { return <SignIn /> }

// VALIDATION: npm run dev → auth flows work at /auth/sign-in
```

### ✅ INFRA-003: Initialize Database Connection

```typescript
// TASK: Setup Prisma client with connection utilities
// INPUT: prisma/schema.prisma
// OUTPUT: Working database connection with type safety

// 1. Create src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 2. Create database utility functions
// src/lib/db.ts
export async function getUser(clerkId: string) {
  return prisma.user.findUnique({ where: { clerkId } })
}

// VALIDATION: npm run db:push succeeds, prisma.user.findMany() works
```

---

## 🔐 PHASE 1: AUTHENTICATION & NANGO OAUTH

### ✅ AUTH-001: Create User Management System

```typescript
// TASK: Implement Clerk user synchronization with database
// INPUT: Prisma schema User model
// OUTPUT: Automatic user creation on Clerk signup

// Create src/lib/auth.ts
import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'

export async function getCurrentUser() {
  const { userId } = auth()
  if (!userId) return null

  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { connections: true },
  })
}

export async function createUserFromClerk(clerkUser: any) {
  return prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    },
  })
}

// VALIDATION: User auto-created on first Clerk login
```

### ✅ AUTH-002: Setup Nango OAuth Integration

```typescript
// TASK: Create Nango client for OAuth management
// INPUT: Nango secret and public keys
// OUTPUT: Simplified OAuth flow with zero token management

// Create src/lib/nango/client.ts
import { Nango } from '@nangohq/node'

export const nango = new Nango({
  secretKey: process.env.NANGO_SECRET_KEY!,
})

export const SUPPORTED_INTEGRATIONS = {
  GMAIL: 'gmail',
  ASANA: 'asana',
  XERO: 'xero',
} as const

export async function createConnectSession(
  integration: string,
  endUserId: string,
  userEmail?: string,
  displayName?: string
) {
  const session = await nango.createConnectSession({
    end_user: {
      id: endUserId,
      email: userEmail,
      display_name: displayName,
    },
    allowed_integrations: [integration],
  })

  return session.data
}

// VALIDATION: createConnectSession() returns valid session token
```

### ✅ AUTH-003: Implement Nango Connection Management

```typescript
// TASK: Create connection utilities for Nango
// INPUT: Nango SDK and connection IDs
// OUTPUT: Connection status and API proxy functions

// Create src/lib/nango/connections.ts
import { nango } from './client'

export async function getConnection(integration: string, connectionId: string) {
  try {
    const connection = await nango.getConnection(integration, connectionId)
    return connection
  } catch (error) {
    console.error(`Failed to get connection for ${integration}:`, error)
    return null
  }
}

export async function makeAPICall(
  integration: string,
  connectionId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
) {
  const response = await nango.proxy({
    providerConfigKey: integration,
    connectionId,
    endpoint,
    method,
    data,
  })

  return response.data
}

// VALIDATION: API calls work through Nango proxy
```

---

## 🔗 PHASE 2: NANGO SERVICE INTEGRATIONS

### ✅ GMAIL-001: Configure Gmail Integration in Nango

```typescript
// TASK: Set up Gmail integration through Nango dashboard
// INPUT: Nango account with Gmail provider configured
// OUTPUT: Working Gmail authentication flow

// Create src/lib/services/gmail.ts
import { makeAPICall } from '@/lib/nango/connections'

export class GmailService {
  constructor(private connectionId: string) {}

  async getMessages(query?: string, maxResults = 10) {
    const params = new URLSearchParams({
      q: query || '',
      maxResults: maxResults.toString(),
    })

    return makeAPICall('gmail', this.connectionId, `/gmail/v1/users/me/messages?${params}`, 'GET')
  }

  async sendMessage(to: string, subject: string, body: string) {
    const message = {
      raw: Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`).toString('base64url'),
    }

    return makeAPICall(
      'gmail',
      this.connectionId,
      '/gmail/v1/users/me/messages/send',
      'POST',
      message
    )
  }
}

// VALIDATION: Gmail API calls work through Nango proxy
```

### ✅ API-001: Create Nango Connect Session Endpoint

```typescript
// TASK: Implement Nango connect session API route
// INPUT: Service name, user authentication
// OUTPUT: Nango session token for frontend

// Create src/app/api/auth/oauth/initiate/[service]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createConnectSession, SUPPORTED_INTEGRATIONS } from '@/lib/nango/client'

export async function GET(request: NextRequest, { params }: { params: { service: string } }) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = params.service.toLowerCase()

    // Validate service
    const supportedServices = Object.values(SUPPORTED_INTEGRATIONS)
    if (!supportedServices.includes(service as any)) {
      return NextResponse.json({ error: 'Unsupported service' }, { status: 400 })
    }

    // Create connect session for Nango
    const session = await createConnectSession(
      service as any,
      user.id,
      user.emailAddresses[0]?.emailAddress,
      `${user.firstName} ${user.lastName}`.trim()
    )

    return NextResponse.json({
      sessionToken: session.token,
      expiresAt: session.expires_at,
      service,
    })
  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 })
  }
}

// VALIDATION: GET /api/auth/oauth/initiate/gmail returns Nango session token
```

### ✅ API-002: Create OAuth Callback Handler

```typescript
// TASK: Implement OAuth callback processing with token exchange
// INPUT: Authorization code, state, PKCE verifier
// OUTPUT: Encrypted tokens stored in database

// Create src/app/api/auth/oauth/callback/[service]/route.ts
export async function GET(request: NextRequest, { params }: { params: { service: string } }) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return Response.json(
      {
        error: 'OAUTH_ERROR',
        message: error,
        description: url.searchParams.get('error_description'),
      },
      { status: 400 }
    )
  }

  if (!code || !state) {
    return Response.json(
      {
        error: 'MISSING_PARAMETERS',
      },
      { status: 400 }
    )
  }

  try {
    // Verify JWT state
    const { userId, service: stateService } = jwt.verify(state, process.env.JWT_SECRET!)
    if (stateService !== params.service) throw new Error('Service mismatch')

    // Retrieve stored PKCE verifier
    const codeVerifier = await redis.get(`oauth:${userId}:${params.service}`)
    if (!codeVerifier) throw new Error('PKCE verifier not found')

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/gmail`,
      }),
    })

    const tokens = await tokenResponse.json()
    if (!tokenResponse.ok) throw new Error(tokens.error_description)

    // Encrypt and store tokens
    const connection = await prisma.oAuthConnection.upsert({
      where: { userId_service: { userId, service: params.service } },
      create: {
        userId,
        service: params.service,
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        scopes: tokens.scope.split(' '),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
        lastUsed: new Date(),
      },
    })

    // Clean up Redis
    await redis.del(`oauth:${userId}:${params.service}`)

    return Response.json({
      success: true,
      connection: {
        id: connection.id,
        service: connection.service,
        scopes: connection.scopes,
        isActive: connection.isActive,
        expiresAt: connection.expiresAt,
        connectedAt: connection.createdAt,
      },
    })
  } catch (error) {
    return Response.json(
      {
        error: 'TOKEN_EXCHANGE_FAILED',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// VALIDATION: OAuth callback completes and stores encrypted tokens
```

---

## 🧠 PHASE 3: CONTEXT COMPILATION

### ✅ CONTEXT-001: Create Gmail Service Client

```typescript
// TASK: Implement Gmail API client with token management
// INPUT: Encrypted OAuth tokens from database
// OUTPUT: Gmail service with email read/send capabilities

// Create src/lib/services/gmail.ts
export class GmailService {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async getEmails(maxResults = 10): Promise<Email[]> {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) throw new Error(`Gmail API error: ${response.status}`)

    const data = await response.json()
    const emails = await Promise.all(
      data.messages?.map(async (message: any) => {
        const detail = await this.getEmailDetail(message.id)
        return {
          id: message.id,
          subject: this.getHeader(detail, 'Subject'),
          from: this.getHeader(detail, 'From'),
          date: new Date(this.getHeader(detail, 'Date')),
          snippet: detail.snippet,
        }
      }) || []
    )

    return emails
  }

  private async getEmailDetail(messageId: string) {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    )
    return response.json()
  }

  private getHeader(message: any, name: string): string {
    return (
      message.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        ?.value || ''
    )
  }
}

// VALIDATION: getEmails() returns structured email data
```

### ✅ CONTEXT-002: Create Context Compilation Engine

```typescript
// TASK: Build real-time context aggregator from all services
// INPUT: User OAuth connections
// OUTPUT: Structured context in multiple formats

// Create src/lib/context/compiler.ts
export class ContextCompiler {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async compileProjectContext(): Promise<ProjectContext> {
    const connections = await prisma.oAuthConnection.findMany({
      where: { userId: this.userId, isActive: true },
    })

    const contexts = await Promise.all(
      connections.map(async conn => {
        const decryptedToken = decryptToken(conn.accessToken)

        switch (conn.service) {
          case 'gmail':
            return this.compileGmailContext(decryptedToken)
          case 'asana':
            return this.compileAsanaContext(decryptedToken)
          case 'xero':
            return this.compileXeroContext(decryptedToken)
          default:
            return null
        }
      })
    )

    return this.mergeContexts(contexts.filter(Boolean))
  }

  private async compileGmailContext(token: string) {
    const gmail = new GmailService(token)
    const emails = await gmail.getEmails(20)

    return {
      service: 'gmail',
      communications: {
        unreadCount: emails.filter(e => !e.read).length,
        urgentItems: emails
          .filter(e => e.subject.includes('urgent') || e.subject.includes('ASAP'))
          .slice(0, 5),
        recentActivity: emails.slice(0, 10),
      },
    }
  }

  async generateMarkdown(): Promise<string> {
    const context = await this.compileProjectContext()

    return `# Studio Status - ${new Date().toLocaleString()}
    
## 🚨 Immediate Attention Required
${context.urgentItems?.map(item => `- **${item.title}**: ${item.description}`).join('\n') || 'No urgent items'}

## 📋 Active Projects
${
  context.projects
    ?.map(p => `- **${p.name}**: ${p.completion}% complete, deadline ${p.deadline}`)
    .join('\n') || 'No active projects'
}

## 📧 Communications Summary
- ${context.communications?.unreadCount || 0} unread emails
- ${context.communications?.urgentItems?.length || 0} urgent items requiring response
`
  }
}

// VALIDATION: generateMarkdown() produces structured context summary
```

---

## 🎣 PHASE 4: MCP GENERATION

### ✅ MCP-001: Create MCP Configuration Generator

```typescript
// TASK: Generate Model Context Protocol configurations
// INPUT: User connections and context compilation
// OUTPUT: Standards-compliant MCP config for LLM agents

// Create src/lib/mcp/generator.ts
export class MCPGenerator {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async generateConfig(): Promise<MCPConfig> {
    const user = await prisma.user.findUnique({
      where: { id: this.userId },
      include: { connections: { where: { isActive: true } } },
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

    const config = {
      mcpVersion: '1.0',
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      agent: {
        name: 'Sylo Studio Manager',
        description: 'Autonomous creative studio management agent',
        userId: user.id,
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
        refreshInterval: 3600,
        format: 'markdown',
      },
      webhooks: {
        baseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
        authentication: {
          type: 'hmac',
          header: 'X-Sylo-Signature',
          algorithm: 'sha256',
        },
        timeout: 30000,
        retries: 3,
      },
    }

    // Store in database
    await prisma.mCPConfig.create({
      data: {
        userId: this.userId,
        name: 'Default Configuration',
        config,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    return config
  }

  private getServiceType(service: string): string {
    const types = {
      gmail: 'email',
      asana: 'project_management',
      xero: 'accounting',
    }
    return types[service] || 'unknown'
  }
}

// VALIDATION: generateConfig() produces valid MCP JSON
```

### ✅ API-003: Create MCP Configuration Endpoint

```typescript
// TASK: Implement API endpoint for MCP config generation
// INPUT: Authenticated user request
// OUTPUT: Real-time MCP configuration with caching

// Create src/app/api/config/mcp/route.ts
export async function GET(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const format = url.searchParams.get('format') || 'json'
  const forceRefresh = url.searchParams.get('refresh') === 'true'

  try {
    // Check for cached config
    const cacheKey = `mcp_config:${userId}`
    let config = !forceRefresh ? await redis.get(cacheKey) : null

    if (!config) {
      const generator = new MCPGenerator(userId)
      config = await generator.generateConfig()

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(config))
    } else {
      config = JSON.parse(config)
    }

    if (format === 'yaml') {
      return new Response(yaml.dump(config), {
        headers: { 'Content-Type': 'application/x-yaml' },
      })
    }

    return Response.json(config)
  } catch (error) {
    return Response.json(
      {
        error: 'CONFIG_GENERATION_FAILED',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// VALIDATION: GET /api/config/mcp returns valid MCP configuration
```

---

## 🎣 PHASE 5: WEBHOOK PROCESSING

### ✅ WEBHOOK-001: Create HMAC Signature Validator

```typescript
// TASK: Implement secure webhook signature validation
// INPUT: Request payload, signature header
// OUTPUT: Cryptographically verified request authenticity

// Create src/lib/security/hmac.ts
export function validateHMACSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')

  const receivedSignature = signature.replace('sha256=', '')

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  )
}

export function generateHMACSignature(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`
}

// VALIDATION: validateHMACSignature() prevents signature attacks
```

### ✅ WEBHOOK-002: Create Agent Command Router

```typescript
// TASK: Implement webhook endpoint for agent command processing
// INPUT: HMAC-signed agent commands
// OUTPUT: Secure command execution with audit logging

// Create src/app/api/webhook/command/route.ts
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-sylo-signature')
  const timestamp = request.headers.get('x-sylo-timestamp')

  if (!signature || !timestamp) {
    return Response.json({ error: 'Missing signature' }, { status: 401 })
  }

  const body = await request.text()

  // Validate HMAC signature
  if (!validateHMACSignature(body, signature, process.env.WEBHOOK_SECRET!)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Validate timestamp (prevent replay attacks)
  const requestTime = parseInt(timestamp)
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - requestTime) > 300) {
    // 5 minute window
    return Response.json({ error: 'Request too old' }, { status: 401 })
  }

  try {
    const command = JSON.parse(body) as AgentCommand

    // Validate command structure
    if (!command.action || !command.service || !command.parameters) {
      return Response.json({ error: 'Invalid command structure' }, { status: 400 })
    }

    // Rate limiting
    const rateLimitKey = `rate_limit:${command.userId}:webhook`
    const requestCount = await redis.incr(rateLimitKey)
    if (requestCount === 1) await redis.expire(rateLimitKey, 3600) // 1 hour window
    if (requestCount > 50) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Execute command
    const result = await executeCommand(command)

    // Audit logging
    await prisma.auditLog.create({
      data: {
        userId: command.userId,
        service: command.service,
        action: command.action,
        parameters: command.parameters,
        result,
        status: 'success',
        executedAt: new Date(),
        ipAddress: request.headers.get('x-forwarded-for'),
        requestId: crypto.randomUUID(),
      },
    })

    return Response.json({
      success: true,
      commandId: result.commandId,
      status: 'completed',
      result: result.data,
    })
  } catch (error) {
    return Response.json(
      {
        error: 'COMMAND_EXECUTION_FAILED',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

async function executeCommand(command: AgentCommand) {
  // Route to appropriate service handler
  switch (command.service) {
    case 'gmail':
      return executeGmailCommand(command)
    case 'asana':
      return executeAsanaCommand(command)
    case 'xero':
      return executeXeroCommand(command)
    default:
      throw new Error(`Unsupported service: ${command.service}`)
  }
}

// VALIDATION: Webhook processes commands securely with audit trail
```

---

## 🎨 PHASE 6: USER INTERFACE

### ✅ UI-001: Create Dashboard Layout

```typescript
// TASK: Build main dashboard with service connection status
// INPUT: User authentication, connection data
// OUTPUT: Responsive dashboard with real-time updates

// Create src/app/dashboard/layout.tsx
import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// Create src/app/dashboard/page.tsx
import { ServiceConnectionPanel } from '@/components/dashboard/ServiceConnectionPanel'
import { MCPConfigPanel } from '@/components/dashboard/MCPConfigPanel'
import { ContextViewer } from '@/components/dashboard/ContextViewer'

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Studio Management Dashboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceConnectionPanel />
        <MCPConfigPanel />
      </div>

      <ContextViewer />
    </div>
  )
}

// VALIDATION: Dashboard renders with proper layout and navigation
```

### ✅ UI-002: Create Service Connection Component

```typescript
// TASK: Build OAuth service connection interface
// INPUT: User connections from database
// OUTPUT: Visual service status with connect/disconnect actions

// Create src/components/dashboard/ServiceConnectionPanel.tsx
'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ServiceConnection {
  id: string
  service: string
  isActive: boolean
  lastUsed: Date
  scopes: string[]
}

export function ServiceConnectionPanel() {
  const { user } = useUser()
  const [connections, setConnections] = useState<ServiceConnection[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)

  const services = [
    { id: 'gmail', name: 'Gmail', icon: '📧', color: 'bg-red-500' },
    { id: 'asana', name: 'Asana', color: 'bg-purple-500' },
    { id: 'xero', name: 'Xero', color: 'bg-blue-500' }
  ]

  const handleConnect = async (serviceId: string) => {
    setConnecting(serviceId)

    try {
      const response = await fetch(`/api/auth/oauth/initiate/${serviceId}`, {
        method: 'POST'
      })

      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setConnecting(null)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Service Connections</h2>

      <div className="space-y-4">
        {services.map(service => {
          const connection = connections.find(c => c.service === service.id)
          const isConnected = connection?.isActive

          return (
            <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full ${service.color} flex items-center justify-center text-white font-semibold`}>
                  {service.name[0]}
                </div>
                <div>
                  <h3 className="font-medium">{service.name}</h3>
                  <Badge variant={isConnected ? 'success' : 'secondary'}>
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </Badge>
                </div>
              </div>

              <Button
                onClick={() => handleConnect(service.id)}
                disabled={connecting === service.id}
                variant={isConnected ? 'outline' : 'default'}
              >
                {connecting === service.id ? 'Connecting...' :
                 isConnected ? 'Reconnect' : 'Connect'}
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// VALIDATION: Service connections display status and allow OAuth flow
```

---

## 🚀 PHASE 7: PRODUCTION OPTIMIZATION

### ✅ PROD-001: Implement Comprehensive Error Handling

```typescript
// TASK: Add global error boundaries and API error handling
// INPUT: Application errors, API failures
// OUTPUT: User-friendly error recovery with logging

// Create src/components/ErrorBoundary.tsx
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)

    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { extra: errorInfo })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We've encountered an unexpected error. Our team has been notified.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// VALIDATION: Error boundary catches and displays user-friendly errors
```

### ✅ PROD-002: Add Performance Monitoring

```typescript
// TASK: Implement performance tracking and optimization
// INPUT: API response times, user interactions
// OUTPUT: Performance metrics with alerting

// Create src/lib/monitoring/performance.ts
export class PerformanceMonitor {
  static trackAPICall(endpoint: string, duration: number, status: number) {
    // Track API performance
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'api_call', {
        endpoint,
        duration,
        status,
        custom_map: { metric1: 'api_performance' },
      })
    }

    // Alert on slow responses
    if (duration > 2000) {
      console.warn(`Slow API response: ${endpoint} took ${duration}ms`)
    }
  }

  static trackUserAction(action: string, metadata?: Record<string, any>) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        ...metadata,
        timestamp: Date.now(),
      })
    }
  }
}

// Add to API routes
export function withPerformanceTracking(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const start = Date.now()

    try {
      const response = await handler(req, ...args)
      const duration = Date.now() - start

      PerformanceMonitor.trackAPICall(req.url || 'unknown', duration, response.status || 200)

      return response
    } catch (error) {
      const duration = Date.now() - start

      PerformanceMonitor.trackAPICall(req.url || 'unknown', duration, 500)

      throw error
    }
  }
}

// VALIDATION: Performance metrics captured for all API calls
```

---

## 🎯 EXECUTION SUCCESS CRITERIA

### Phase Completion Validation

**PHASE 0 ✅**: `npm run dev` starts without errors, Clerk auth working  
**PHASE 1 ✅**: User creation on signup, OAuth PKCE flow functional  
**PHASE 2 ✅**: Gmail connection working end-to-end with token storage  
**PHASE 3 ✅**: Context compilation returns structured data in <500ms  
**PHASE 4 ✅**: MCP config generation produces valid JSON  
**PHASE 5 ✅**: Webhook processes agent commands with audit logging  
**PHASE 6 ✅**: Dashboard displays service status and allows connections  
**PHASE 7 ✅**: Error handling, monitoring, production optimizations active

### Final Integration Test

```bash
# Complete system validation
npm run test:all              # All tests pass
npm run type-check           # No TypeScript errors
npm run build               # Production build succeeds
npm run db:studio           # Database accessible with data

# Manual validation flow
1. Sign up new user → User created in database
2. Connect Gmail → OAuth flow completes, tokens encrypted
3. Generate MCP config → Valid configuration returned
4. Send webhook command → Command executed, audit logged
5. View dashboard → Real-time service status displayed
```

**COMPLETION**: All phases validated = Production-ready Sylo V2 system\*\*
