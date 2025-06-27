# Nango Integration Guide - Sylo V2

## Overview: Nango as Core Architecture

Sylo V2 is **fundamentally built around Nango** as the central OAuth and integration platform. This is not an optional integration - **Nango IS the OAuth layer**. Every connection, every API call, and every security decision flows through Nango's enterprise infrastructure, providing 200+ integrations while eliminating OAuth complexity entirely.

## Why Nango?

### **Enterprise OAuth Management**

- **200+ Pre-built Integrations**: Gmail, Asana, Xero, and hundreds more
- **SOC2 Compliance**: Enterprise security standards built-in
- **Token Management**: Automatic refresh, rotation, and secure storage
- **Rate Limiting**: Built-in protection against API limits
- **Webhook Support**: Real-time connection status updates

### **Developer Experience**

- **Zero OAuth Complexity**: No PKCE flows, redirect handling, or token management
- **Unified API**: Single interface for all service interactions
- **TypeScript Support**: Full type safety for all integrations
- **Real-time Updates**: Webhook notifications for connection changes
- **Testing Tools**: Sandbox environment for development

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Sylo V2 UI    │    │   Nango Cloud   │    │ Service APIs    │
│                 │    │                 │    │                 │
│ • Dashboard     │◄──►│ • OAuth Flows   │◄──►│ • Gmail API     │
│ • Connections   │    │ • Token Mgmt    │    │ • Asana API     │
│ • Config Gen    │    │ • API Proxy     │    │ • Xero API      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ Connect UI            │ Webhooks              │ Direct API
         │ + API Calls           │ + Status              │ (via Nango)
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend SDK   │    │ Server SDK      │    │ API Responses   │
│                 │    │                 │    │                 │
│ @nangohq/       │    │ @nangohq/node   │    │ • Structured    │
│ frontend        │    │                 │    │ • Type-safe     │
│                 │    │ • getConnection │    │ • Cached        │
└─────────────────┘    │ • makeAPICall   │    └─────────────────┘
                       │ • proxy         │
                       └─────────────────┘
```

## Implementation Details

### 1. **Frontend Integration** (`@nangohq/frontend`)

**Connect UI Implementation:**

```typescript
// ServiceConnectionPanel.tsx
const handleConnect = async (serviceId: string) => {
  // Get session token from our backend
  const response = await fetch(`/api/auth/oauth/initiate/${serviceId}`)
  const { sessionToken } = await response.json()

  // Use Nango Connect UI
  const { default: Nango } = await import('@nangohq/frontend')
  const nango = new Nango()

  const connect = nango.openConnectUI({
    onEvent: event => {
      if (event.type === 'connect') {
        // Connection successful - refresh UI
        toast({ title: 'Connected successfully!' })
        window.location.reload()
      }
    },
  })

  connect.setSessionToken(sessionToken)
}
```

### 2. **Backend Integration** (`@nangohq/node`)

**Server-side Client:**

```typescript
// src/lib/nango/client.ts
import { Nango } from '@nangohq/node'

export const nango = new Nango({
  secretKey: process.env.NANGO_SECRET_KEY!,
})

export const SUPPORTED_INTEGRATIONS = {
  GMAIL: 'gmail',
  ASANA: 'asana',
  XERO: 'xero',
} as const
```

**OAuth Initiation API:**

```typescript
// src/app/api/auth/oauth/initiate/[service]/route.ts
export async function GET(request: NextRequest, { params }) {
  const user = await currentUser()
  const service = params.service.toLowerCase()

  // Create Nango connect session
  const session = await createConnectSession(
    service,
    user.id,
    user.emailAddresses[0]?.emailAddress,
    `${user.firstName} ${user.lastName}`.trim()
  )

  return NextResponse.json({
    sessionToken: session.token,
    expiresAt: session.expires_at,
    service,
  })
}
```

**OAuth Callback Handler:**

```typescript
// src/app/api/auth/oauth/callback/[service]/route.ts
export async function GET(request: NextRequest, { params }) {
  const { searchParams } = new URL(request.url)
  const connectionId = searchParams.get('connection_id') || user.id

  // Verify connection via Nango
  const connection = await getConnection(params.service, connectionId)

  if (connection) {
    // Store connection info in our database
    await prisma.oAuthConnection.upsert({
      where: { userId_service: { userId: user.id, service: params.service } },
      create: {
        userId: user.id,
        service: params.service,
        isActive: true,
        accessToken: 'managed_by_nango', // Nango handles tokens
        tokenType: 'Bearer',
        scopes: [],
        providerData: {},
      },
      update: { isActive: true, updatedAt: new Date() },
    })
  }

  return NextResponse.redirect(`/dashboard?success=oauth_connected`)
}
```

### 3. **Service API Clients**

**Gmail Service via Nango:**

```typescript
// src/lib/services/gmail.ts
export class GmailService {
  constructor(private connectionId: string) {}

  async getEmails(maxResults = 10): Promise<Email[]> {
    const response = await makeAPICall(
      'gmail',
      this.connectionId,
      `/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      'GET'
    )

    // Process Gmail API response...
    return emails
  }
}
```

**Nango API Proxy Function:**

```typescript
// src/lib/nango/client.ts
export async function makeAPICall(
  integration: SupportedIntegration,
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
```

### 4. **Webhook Handling**

**Connection Status Updates:**

```typescript
// src/app/api/auth/oauth/callback/[service]/route.ts - POST handler
export async function POST(request: NextRequest, { params }) {
  const body = await request.json()
  const { type, connectionId, providerConfigKey } = body

  switch (type) {
    case 'auth':
      await handleConnectionEstablished(connectionId, providerConfigKey)
      break
    case 'refresh':
      await handleTokenRefresh(connectionId, providerConfigKey)
      break
    case 'delete':
      await handleConnectionDeleted(connectionId, providerConfigKey)
      break
  }

  return NextResponse.json({ success: true })
}
```

## Nango Configuration

### **Provider Configs**

Set up in Nango dashboard at `https://app.nango.dev/`:

**Gmail Configuration:**

- **Provider**: Google
- **Scopes**: `gmail.readonly`, `gmail.send`
- **Connection ID**: User's Clerk ID
- **Webhook URL**: `https://yourdomain.com/api/auth/oauth/callback/gmail`

**Asana Configuration:**

- **Provider**: Asana
- **Scopes**: `default`
- **Connection ID**: User's Clerk ID
- **Webhook URL**: `https://yourdomain.com/api/auth/oauth/callback/asana`

**Xero Configuration:**

- **Provider**: Xero
- **Scopes**: `accounting.transactions`, `accounting.contacts.read`
- **Connection ID**: User's Clerk ID
- **Webhook URL**: `https://yourdomain.com/api/auth/oauth/callback/xero`

### **Environment Setup**

```bash
# Nango Dashboard Keys
NANGO_SECRET_KEY="nango_sk_your_secret_key"
NEXT_PUBLIC_NANGO_PUBLIC_KEY="nango_pk_your_public_key"
NANGO_ENVIRONMENT="sandbox" # or "production"
```

## Benefits for Sylo V2

### **Security**

- **Zero Token Exposure**: Sylo never stores actual OAuth tokens
- **Enterprise Standards**: SOC2 compliance handled by Nango
- **Automatic Security**: Token rotation, refresh, and revocation managed
- **Audit Trails**: Complete logging of all OAuth activities

### **Scalability**

- **200+ Integrations**: Easy to add new services without OAuth implementation
- **Rate Limiting**: Built-in protection against API limits
- **Global Infrastructure**: Nango's cloud handles scaling
- **Webhook Reliability**: Guaranteed delivery with retry logic

### **Developer Experience**

- **Simplified Code**: No OAuth flow implementation needed
- **Type Safety**: Full TypeScript support for all integrations
- **Testing**: Sandbox environment for development
- **Monitoring**: Real-time connection status and health

### **Business Value**

- **Time to Market**: Skip months of OAuth development
- **Maintenance**: Zero ongoing OAuth maintenance burden
- **Compliance**: Enterprise security out of the box
- **Reliability**: Production-grade infrastructure

## Migration from Direct OAuth

If migrating from direct OAuth implementation:

1. **Update API Routes**: Replace direct OAuth with Nango calls
2. **Update Database**: Change token storage to connection tracking
3. **Update Frontend**: Replace custom OAuth UI with Nango Connect
4. **Update Services**: Use Nango proxy instead of direct API calls
5. **Update Environment**: Add Nango keys, remove individual OAuth credentials

## Development Workflow

1. **Setup Nango Account**: Create account at `https://app.nango.dev/`
2. **Configure Integrations**: Add Gmail, Asana, Xero in dashboard
3. **Set Environment Variables**: Add Nango keys to `.env.local`
4. **Test Connections**: Use sandbox mode for development
5. **Deploy to Production**: Switch to production environment

This Nango-first architecture ensures Sylo V2 is enterprise-ready, scalable, and maintainable while providing the best developer experience for OAuth integration management.
