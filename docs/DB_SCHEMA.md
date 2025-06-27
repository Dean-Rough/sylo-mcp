# Database Schema

## Overview

Sylo V2 uses **PostgreSQL** as the primary database with **Prisma ORM** for type-safe database operations. The schema is designed for **security-first OAuth token management**, **comprehensive audit logging**, and **efficient MCP configuration generation**.

## Core Design Principles

- **Security**: All sensitive data encrypted at rest with AES-256-GCM
- **Audit Trail**: Complete logging of all user and agent actions
- **Scalability**: Optimized indexes and query patterns for performance
- **Compliance**: GDPR and SOC2 compliant data structures

## Database Schema (Prisma)

### User Management

```prisma
model User {
  id          String   @id @default(cuid())
  clerkId     String   @unique
  email       String   @unique
  firstName   String?
  lastName    String?
  plan        String   @default("free") // free, pro, enterprise
  status      String   @default("active") // active, suspended, deleted
  settings    Json?    // User preferences and configuration
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  connections   OAuthConnection[]
  mcpConfigs    MCPConfig[]
  auditLogs     AuditLog[]
  webhookEvents WebhookEvent[]
  usageMetrics  UsageMetric[]

  @@map("users")
}
```

**Purpose**: Central user management integrated with Clerk authentication
**Indexes**:

- `clerkId` (unique, primary lookup)
- `email` (unique, secondary lookup)
- `plan, status` (compound, for billing queries)

### OAuth Connection Management

```prisma
model OAuthConnection {
  id           String    @id @default(cuid())
  userId       String
  service      String    // gmail, asana, xero, drive, quickbooks

  // Encrypted token storage
  accessToken  String    @db.Text // AES-256-GCM encrypted
  refreshToken String?   @db.Text // AES-256-GCM encrypted
  tokenType    String    @default("Bearer")

  // OAuth metadata
  scopes       String[]  // Granted permissions
  expiresAt    DateTime?
  isActive     Boolean   @default(true)
  lastUsed     DateTime  @default(now())

  // Provider-specific data
  providerUserId String?  // External user ID from OAuth provider
  providerData   Json?    // Additional provider metadata

  // Audit fields
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, service])
  @@index([userId, isActive])
  @@index([service, expiresAt])
  @@map("oauth_connections")
}
```

**Purpose**: Secure OAuth token storage with automatic encryption
**Security**: All tokens encrypted before storage, never logged
**Indexes**:

- `userId, service` (unique, prevents duplicate connections)
- `userId, isActive` (for active connection queries)
- `service, expiresAt` (for token refresh operations)

### MCP Configuration Management

```prisma
model MCPConfig {
  id          String   @id @default(cuid())
  userId      String
  name        String   // User-defined configuration name
  description String?

  // Configuration data
  version     String   @default("1.0") // MCP protocol version
  config      Json     // Full MCP configuration object

  // Status and metadata
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false) // Primary config for user
  expiresAt   DateTime // Auto-regeneration trigger

  // Usage tracking
  lastGenerated DateTime @default(now())
  usageCount    Int      @default(0)

  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isActive])
  @@index([userId, isDefault])
  @@index([expiresAt])
  @@map("mcp_configs")
}
```

**Purpose**: Versioned MCP configuration storage with usage tracking
**Features**: Automatic expiration, usage analytics, multiple configs per user

### Comprehensive Audit Logging

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String

  // Action metadata
  service     String   // gmail, asana, xero, system
  action      String   // send_email, update_task, generate_config
  resource    String?  // Specific resource affected

  // Request/response data
  parameters  Json     // Input parameters (sanitized)
  result      Json?    // Action result (success/error data)

  // Status tracking
  status      String   // success, error, pending, cancelled
  errorCode   String?  // Specific error identifier
  errorMessage String? // Human-readable error description

  // Performance metrics
  executionTime Int?   // Milliseconds
  retryCount    Int    @default(0)

  // Security and compliance
  ipAddress     String?
  userAgent     String?
  requestId     String? // For request tracing

  // Timestamps
  executedAt    DateTime @default(now())
  completedAt   DateTime?

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, executedAt])
  @@index([service, action])
  @@index([status, executedAt])
  @@index([requestId])
  @@map("audit_logs")
}
```

**Purpose**: Complete audit trail for compliance and debugging
**Retention**: 7 years for compliance, automated archival
**Privacy**: Sensitive data sanitized before logging

### Webhook Event Processing

```prisma
model WebhookEvent {
  id         String   @id @default(cuid())
  userId     String

  // Event metadata
  eventType  String   // command, status_update, health_check
  source     String   // claude, gpt4, gemini, system

  // Webhook data
  headers    Json     // Request headers (sanitized)
  payload    Json     // Request payload
  signature  String   // HMAC signature for validation

  // Processing status
  status     String   // received, processing, completed, failed
  attempts   Int      @default(0)
  maxRetries Int      @default(3)

  // Response data
  response   Json?    // Response sent back to agent
  errorCode  String?  // Error code if processing failed

  // Performance tracking
  receivedAt  DateTime  @default(now())
  processedAt DateTime?
  responseTime Int?    // Processing time in milliseconds

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, receivedAt])
  @@index([status, receivedAt])
  @@index([source, eventType])
  @@map("webhook_events")
}
```

**Purpose**: Webhook processing with retry logic and performance tracking
**Security**: HMAC signature validation, sanitized header storage

### Usage Analytics

```prisma
model UsageMetric {
  id         String   @id @default(cuid())
  userId     String

  // Metric metadata
  metricType String   // api_calls, context_generations, webhook_commands
  service    String?  // Specific service if applicable

  // Usage data
  count      Int      @default(1)
  value      Float?   // For metrics with decimal values
  metadata   Json?    // Additional metric-specific data

  // Time tracking
  period     String   // hour, day, month (for aggregation)
  timestamp  DateTime @default(now())

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, metricType, timestamp])
  @@index([period, timestamp])
  @@map("usage_metrics")
}
```

**Purpose**: Usage tracking for billing and analytics
**Aggregation**: Hourly, daily, monthly rollups for performance

### System Configuration

```prisma
model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  description String?
  isEncrypted Boolean  @default(false)
  updatedBy   String?  // Admin user who made the change
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("system_config")
}
```

**Purpose**: System-wide configuration management
**Security**: Sensitive configs automatically encrypted

## Relationships Overview

```
User (1) ──────── (N) OAuthConnection
User (1) ──────── (N) MCPConfig
User (1) ──────── (N) AuditLog
User (1) ──────── (N) WebhookEvent
User (1) ──────── (N) UsageMetric
```

## Security Implementation

### Token Encryption

```typescript
// All sensitive fields encrypted before storage
const encryptedToken = encrypt(accessToken, process.env.ENCRYPTION_KEY)

// Prisma model stores only encrypted data
await prisma.oAuthConnection.create({
  data: {
    accessToken: encryptedToken, // Never store plaintext
    refreshToken: encryptedRefreshToken,
    // ... other fields
  },
})
```

### Audit Sanitization

```typescript
// Sensitive data removed before audit logging
const sanitizedParameters = {
  ...parameters,
  password: '[REDACTED]',
  token: '[REDACTED]',
  creditCard: '[REDACTED]',
}

await prisma.auditLog.create({
  data: {
    parameters: sanitizedParameters,
    // ... other fields
  },
})
```

## Performance Optimization

### Query Patterns

```sql
-- Optimized connection lookup
SELECT * FROM oauth_connections
WHERE user_id = ? AND service = ? AND is_active = true;

-- Efficient audit log queries with pagination
SELECT * FROM audit_logs
WHERE user_id = ? AND executed_at > ?
ORDER BY executed_at DESC
LIMIT 50;

-- Usage metrics aggregation
SELECT metric_type, service, SUM(count) as total
FROM usage_metrics
WHERE user_id = ? AND period = 'day' AND timestamp >= ?
GROUP BY metric_type, service;
```

### Database Indexes

```sql
-- Critical performance indexes
CREATE INDEX idx_oauth_connections_user_service ON oauth_connections(user_id, service);
CREATE INDEX idx_oauth_connections_expires ON oauth_connections(expires_at) WHERE is_active = true;
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, executed_at);
CREATE INDEX idx_webhook_events_status ON webhook_events(status, received_at);
CREATE INDEX idx_usage_metrics_aggregation ON usage_metrics(user_id, metric_type, period, timestamp);
```

## Migration Strategy

### Initial Setup

```bash
# Generate Prisma client
npx prisma generate

# Run initial migration
npx prisma migrate dev --name init

# Seed initial data
npx prisma db seed
```

### Schema Versioning

```typescript
// Migration tracking in system_config
const currentVersion = await prisma.systemConfig.findUnique({
  where: { key: 'schema_version' },
})

if (currentVersion.value < REQUIRED_VERSION) {
  await runMigration(currentVersion.value, REQUIRED_VERSION)
}
```

## Data Seeding

### Development Seed Data

```typescript
// seed.ts
const seedUsers = [
  {
    clerkId: 'user_dev_001',
    email: 'demo@sylo.dev',
    plan: 'pro',
    firstName: 'Demo',
    lastName: 'User',
  },
]

const seedConnections = [
  {
    service: 'gmail',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    isActive: true,
    // Encrypted demo tokens for development
  },
]
```

### Production Considerations

- **No seed data** in production
- **Backup strategy**: Daily automated backups
- **Retention policy**: 7-year audit log retention
- **GDPR compliance**: Right to erasure implementation

## Backup and Recovery

### Backup Strategy

```bash
# Daily production backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Encrypted backup storage
gpg --encrypt --recipient sylo-backup backup_*.sql
aws s3 cp backup_*.sql.gpg s3://sylo-backups/
```

### Data Recovery

```sql
-- Point-in-time recovery for specific user
SELECT * FROM audit_logs
WHERE user_id = ? AND executed_at <= ?
ORDER BY executed_at DESC;

-- Connection restoration
UPDATE oauth_connections
SET is_active = true
WHERE user_id = ? AND service = ?;
```

## Compliance and Privacy

### GDPR Implementation

```typescript
// Right to erasure
async function deleteUserData(userId: string) {
  await prisma.$transaction([
    prisma.oAuthConnection.deleteMany({ where: { userId } }),
    prisma.mcpConfig.deleteMany({ where: { userId } }),
    prisma.webhookEvent.deleteMany({ where: { userId } }),
    // Audit logs retained for legal compliance
    prisma.user.update({
      where: { id: userId },
      data: { status: 'deleted', email: '[DELETED]' },
    }),
  ])
}
```

### Data Retention

- **OAuth Tokens**: Deleted immediately upon revocation
- **MCP Configs**: 1 year after last use
- **Audit Logs**: 7 years (compliance requirement)
- **Usage Metrics**: 2 years for analytics
- **Webhook Events**: 90 days for debugging

This database schema provides a **secure, scalable foundation** for Sylo V2's OAuth management, MCP configuration generation, and comprehensive audit capabilities.
