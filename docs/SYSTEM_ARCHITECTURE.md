# System Architecture

## Overview

Sylo V2 implements a **Nango-powered, headless, security-first architecture** designed for AI agent integration. The system leverages Nango's enterprise OAuth platform as a secure bridge between productivity tools and LLM agents, eliminating OAuth complexity while maintaining zero-credential exposure.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LLM Agents    │    │  Creative Users │    │ External APIs   │
│                 │    │                 │    │                 │
│ • Claude        │    │ • Studio Owners │    │ • Gmail API     │
│ • GPT-4         │    │ • Architects    │    │ • Asana API     │
│ • Gemini        │    │ • Designers     │    │ • Xero API      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ MCP Config           │ OAuth Setup          │ Service Calls
          │ + Webhooks           │ + Management         │ + Data Sync
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      SYLO V2 CORE        │
                    │  (Next.js + TypeScript)  │
                    └─────────────┬─────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                            │                            │
    ▼                            ▼                            ▼
┌─────────┐              ┌──────────────┐              ┌─────────┐
│Frontend │              │   Backend    │              │  Data   │
│         │              │              │              │         │
│• Dashboard│             │• API Routes  │              │• NeonDB │
│• OAuth UI │             │• Webhooks    │              │• Redis  │
│• Config   │             │• Context     │              │• Prisma │
│  Export   │             │  Compiler    │              │         │
└─────────┘              └──────────────┘              └─────────┘
```

## Component Architecture

### Frontend Layer (Next.js App Router)

#### Pages & Routing

```
app/
├── layout.tsx                 # Root layout with Clerk provider
├── page.tsx                   # Landing page
├── dashboard/
│   ├── page.tsx               # Main dashboard
│   ├── connections/
│   │   └── page.tsx           # OAuth connection management
│   ├── config/
│   │   └── page.tsx           # MCP config generation
│   └── logs/
│       └── page.tsx           # Audit log viewer
└── auth/
    ├── sign-in/
    │   └── page.tsx           # Clerk sign-in
    └── callback/
        └── [service]/
            └── page.tsx       # OAuth callback handler
```

#### Component Hierarchy

```
Dashboard
├── Navbar (user menu, notifications)
├── Sidebar (navigation, service status)
├── ServiceConnectionPanel
│   ├── ServiceCard (Gmail, Asana, Xero)
│   ├── OAuthFlow (PKCE implementation)
│   └── PermissionManager (scope selection)
├── MCPConfigPanel
│   ├── ConfigGenerator (real-time generation)
│   ├── ConfigValidator (LLM compatibility)
│   └── ConfigExporter (copy/download)
├── ContextViewer
│   ├── ProjectSummary (current projects)
│   ├── CommunicationSummary (emails, messages)
│   └── TaskSummary (active tasks)
└── AuditLogPanel
    ├── ActionHistory (agent commands)
    ├── StatusMonitor (service health)
    └── ErrorHandler (troubleshooting)
```

### Backend Layer (API Routes)

#### Authentication & OAuth

```
pages/api/
├── auth/
│   ├── oauth/
│   │   ├── initiate/[service].ts    # Create Nango connect session
│   │   ├── callback/[service].ts    # Handle Nango webhooks
│   │   ├── refresh/[service].ts     # Refresh expired tokens
│   │   └── revoke/[service].ts      # Revoke service access
│   └── validate.ts                  # JWT token validation
├── config/
│   ├── mcp.ts                       # Generate MCP configuration
│   ├── validate.ts                  # Validate MCP config
│   └── export.ts                    # Export config (JSON/YAML)
├── context/
│   ├── projects.ts                  # Project status compilation
│   ├── communications.ts            # Email/message summary
│   ├── tasks.ts                     # Task management data
│   └── financials.ts               # Accounting data summary
├── webhook/
│   ├── command.ts                   # Receive agent commands
│   ├── status.ts                    # Command status updates
│   └── health.ts                    # System health check
└── connections/
    ├── index.ts                     # List user connections
    ├── status.ts                    # Service connection health
    └── permissions.ts               # Manage OAuth scopes
```

#### Service Integration Layer

```
lib/
├── nango/
│   ├── client.ts                    # Nango server-side client
│   └── connections.ts               # Connection management utilities
├── services/
│   ├── gmail.ts                     # Gmail API service (via Nango)
│   ├── asana.ts                     # Asana API service (via Nango)
│   └── xero.ts                      # Xero API service (via Nango)
├── context/
│   ├── compiler.ts                  # Main context compilation
│   ├── cache.ts                     # Redis caching strategy
│   ├── formatters/
│   │   ├── markdown.ts              # Markdown output format
│   │   ├── json.ts                  # JSON output format
│   │   └── yaml.ts                  # YAML output format
│   └── sources/
│       ├── projects.ts              # Project data aggregation
│       ├── communications.ts        # Email/message processing
│       └── tasks.ts                 # Task data processing
├── mcp/
│   ├── generator.ts                 # MCP config generation
│   ├── validator.ts                 # MCP spec compliance
│   └── templates/                   # Service-specific templates
├── security/
│   ├── encryption.ts                # AES-256-GCM implementation
│   ├── hmac.ts                      # HMAC signature validation
│   ├── rate-limiting.ts             # API rate limiting
│   └── audit.ts                     # Action logging
└── webhooks/
    ├── router.ts                    # Command routing logic
    ├── n8n.ts                       # n8n workflow integration
    └── validator.ts                 # Webhook signature validation
```

### Data Layer

#### Database Schema (PostgreSQL + Prisma)

```
Users
├── id (String, @id)
├── clerkId (String, @unique)
├── email (String, @unique)
├── plan (String, default: "free")
├── createdAt (DateTime)
├── updatedAt (DateTime)
└── Relations:
    ├── connections: OAuthConnection[]
    ├── mcpConfigs: MCPConfig[]
    ├── auditLogs: AuditLog[]
    └── webhookEvents: WebhookEvent[]

OAuthConnection
├── id (String, @id)
├── userId (String, foreign key)
├── service (String, enum: gmail|asana|xero)
├── accessToken (String, @db.Text, encrypted)
├── refreshToken (String?, @db.Text, encrypted)
├── scopes (String[])
├── expiresAt (DateTime?)
├── isActive (Boolean, default: true)
├── lastUsed (DateTime)
├── createdAt (DateTime)
└── updatedAt (DateTime)

MCPConfig
├── id (String, @id)
├── userId (String, foreign key)
├── version (String, default: "1.0")
├── config (Json, full MCP configuration)
├── isActive (Boolean, default: true)
├── expiresAt (DateTime)
├── createdAt (DateTime)
└── updatedAt (DateTime)

AuditLog
├── id (String, @id)
├── userId (String, foreign key)
├── service (String)
├── action (String)
├── parameters (Json)
├── result (Json?)
├── status (String, enum: success|error|pending)
├── executedAt (DateTime)
└── ipAddress (String?)

WebhookEvent
├── id (String, @id)
├── userId (String, foreign key)
├── source (String, e.g., "claude", "gpt4")
├── command (Json)
├── signature (String, HMAC)
├── status (String, enum: received|processing|completed|failed)
├── response (Json?)
├── processedAt (DateTime?)
└── createdAt (DateTime)
```

#### Caching Layer (Redis)

```
nango:{userId}:{service}          # Nango connection metadata (TTL: 24h)
context:{userId}:{type}            # Compiled context data (TTL: 24h)
tokens:{userId}:{service}          # Token cache for fast access
rate_limit:{userId}:{endpoint}     # Rate limiting counters
session:{sessionId}                # User session data
health:{service}                   # Service status cache (TTL: 5min)
```

### Security Architecture

#### Nango OAuth Flow (Core Architecture)

```
User → Sylo → Nango Cloud → OAuth Provider
1. Sylo creates Nango connect session with user metadata
2. Nango handles complete PKCE OAuth flow (challenge + verifier)
3. Nango securely stores and manages all tokens
4. Sylo receives webhook confirmation of successful connection
5. Sylo stores connection metadata (NO TOKENS - managed by Nango)
6. Generate MCP configuration with Nango webhook endpoints
7. All API calls proxied through Nango's secure infrastructure
```

#### Token Security

```
Encryption: AES-256-GCM
Key Management: Environment variable rotation
Storage: PostgreSQL with encrypted fields
Access: Decryption only during API calls
Rotation: Automatic refresh before expiration
Revocation: Immediate invalidation on user request
```

#### Webhook Security

```
Authentication: HMAC-SHA256 signatures
Validation: Request payload + timestamp
Rate Limiting: 100 requests/minute per user
Replay Protection: Timestamp window validation
Audit Trail: All webhook events logged
```

### AI Integration Architecture

#### MCP (Model Context Protocol) Implementation

```
Configuration Structure:
├── Agent Metadata (name, description, version)
├── Service Endpoints (authenticated webhook URLs)
├── Context Sources (real-time data URLs)
├── Authentication (HMAC keys, signatures)
└── Capabilities (available actions per service)

Context Compilation:
├── Data Sources (Gmail, Asana, Xero APIs)
├── Real-time Processing (<500ms target)
├── Format Conversion (Markdown, JSON, YAML)
├── Caching Strategy (24h TTL with invalidation)
└── Access Control (user permissions respected)
```

#### Agent Command Processing

```
Webhook Request → Signature Validation → Command Parsing →
Service Routing → n8n Execution → Result Capture →
Audit Logging → Response Generation
```

### Scalability Considerations

#### Horizontal Scaling

- **API Services**: Stateless Next.js API routes with auto-scaling
- **Database**: Read replicas for query distribution
- **Cache**: Redis cluster for high availability
- **Background Jobs**: Queue-based processing with Bull/Redis

#### Performance Optimization

- **Context Compilation**: Smart caching with intelligent invalidation
- **OAuth Tokens**: Connection pooling and token reuse
- **API Responses**: CDN caching for static MCP configurations
- **Database Queries**: Optimized indexes and query patterns

#### Monitoring & Observability

- **APM**: DataDog integration for performance monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Health Checks**: Service status monitoring and failover
- **Audit Trails**: Complete action logging for compliance

### External Service Integration

#### Service Boundaries

```
Sylo Core ←→ Gmail API (OAuth 2.0, read/send emails)
Sylo Core ←→ Asana API (OAuth 2.0, project management)
Sylo Core ←→ Xero API (OAuth 2.0, accounting data)
Sylo Core ←→ n8n (Webhooks, workflow execution)
Sylo Core ←→ Google Veo 2 (API key, video generation)
Sylo Core ←→ Meta Graph (OAuth 2.0, social publishing)
```

#### Error Handling & Resilience

- **Circuit Breakers**: Automatic failover for service outages
- **Retry Logic**: Exponential backoff for transient failures
- **Graceful Degradation**: Partial functionality during outages
- **Status Pages**: Real-time service health communication

This architecture ensures **security, scalability, and maintainability** while providing the flexibility needed for AI agent integration and creative workflow automation.
