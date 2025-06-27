# API Routes Specification

## Base Configuration

**Base URL**: `https://api.sylo.dev/v1`  
**Authentication**: JWT tokens via Clerk + HMAC signatures for webhooks  
**Rate Limiting**: 100 requests/minute per user, 1000/minute global  
**Content Type**: `application/json` unless specified

## Authentication Endpoints

### Start OAuth Flow (Nango)

```http
GET /auth/oauth/initiate/{service}
```

**Description**: Creates Nango connect session for service connection

**Path Parameters**:

- `service`: `gmail` | `asana` | `xero` | `drive` | `quickbooks`

**Headers**:

```
Authorization: Bearer {clerk_jwt_token}
Content-Type: application/json
```

**Request Body**:

```json
{
  "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
  "redirectUri": "https://app.sylo.dev/auth/callback/gmail"
}
```

**Success Response** (200):

```json
{
  "sessionToken": "nango_connect_session_4603dbca8a588315ba69b5bfddde52e72d312dc2d2870bd5e45da6357333601c",
  "expiresAt": "2024-09-27T19:49:51.449Z",
  "service": "gmail"
}
```

**Error Responses**:

```json
// 400 - Unsupported Service
{
  "error": {
    "code": "UNSUPPORTED_SERVICE",
    "message": "Service 'invalid' is not supported",
    "supportedServices": ["gmail", "asana", "xero", "drive", "quickbooks"]
  }
}

// 401 - Unauthorized
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired JWT token"
  }
}

// 429 - Rate Limited
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 60 seconds",
    "retryAfter": 60
  }
}
```

### Handle Nango Webhooks

```http
POST /auth/oauth/callback/{service}
```

**Description**: Processes Nango webhooks for connection events

**Path Parameters**:

- `service`: `gmail` | `asana` | `xero` | `drive` | `quickbooks`

**Query Parameters**:

- `code`: Authorization code from OAuth provider
- `state`: JWT state token for CSRF protection
- `error?`: Error code if authorization failed
- `error_description?`: Human-readable error description

**Success Response** (200):

```json
{
  "success": true,
  "connection": {
    "id": "conn_abc123",
    "service": "gmail",
    "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
    "isActive": true,
    "expiresAt": "2024-12-07T10:30:00Z",
    "connectedAt": "2024-12-06T10:30:00Z"
  },
  "mcpConfigUpdated": true
}
```

**Error Responses**:

```json
// 400 - OAuth Error
{
  "error": {
    "code": "OAUTH_ERROR",
    "message": "access_denied: User denied authorization",
    "provider": "gmail"
  }
}

// 400 - Invalid State
{
  "error": {
    "code": "INVALID_STATE",
    "message": "State token is invalid or expired"
  }
}

// 500 - Token Exchange Failed
{
  "error": {
    "code": "TOKEN_EXCHANGE_FAILED",
    "message": "Failed to exchange authorization code for tokens",
    "provider": "gmail"
  }
}
```

### Refresh OAuth Token

```http
POST /auth/oauth/refresh/{service}
```

**Description**: Refreshes expired OAuth access token

**Request Body**:

```json
{
  "connectionId": "conn_abc123"
}
```

**Success Response** (200):

```json
{
  "success": true,
  "connection": {
    "id": "conn_abc123",
    "service": "gmail",
    "expiresAt": "2024-12-07T11:30:00Z",
    "refreshedAt": "2024-12-06T10:30:00Z"
  }
}
```

### Revoke OAuth Access

```http
DELETE /auth/oauth/revoke/{service}
```

**Description**: Revokes OAuth access and deletes stored tokens

**Request Body**:

```json
{
  "connectionId": "conn_abc123"
}
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "Gmail connection revoked successfully",
  "mcpConfigUpdated": true
}
```

## Configuration Endpoints

### Generate MCP Configuration

```http
GET /config/mcp
```

**Description**: Generates Model Context Protocol configuration for connected services

**Query Parameters**:

- `format?`: `json` | `yaml` (default: `json`)
- `version?`: MCP version (default: `1.0`)
- `includeInactive?`: Include inactive connections (default: `false`)

**Success Response** (200):

```json
{
  "mcpVersion": "1.0",
  "generatedAt": "2024-12-06T10:30:00Z",
  "expiresAt": "2024-12-07T10:30:00Z",
  "agent": {
    "name": "Creative Studio Manager",
    "description": "Autonomous studio management for creative professionals",
    "userId": "user_abc123"
  },
  "services": [
    {
      "name": "gmail",
      "type": "email",
      "status": "active",
      "endpoints": {
        "read": "https://api.sylo.dev/v1/webhook/gmail/read",
        "send": "https://api.sylo.dev/v1/webhook/gmail/send",
        "search": "https://api.sylo.dev/v1/webhook/gmail/search"
      },
      "authentication": {
        "type": "hmac",
        "key": "{{SYLO_API_KEY}}",
        "algorithm": "sha256"
      },
      "capabilities": ["read_emails", "send_emails", "search_emails"],
      "scopes": ["https://www.googleapis.com/auth/gmail.readonly"]
    }
  ],
  "context": {
    "baseUrl": "https://context.sylo.dev/v1",
    "sources": {
      "projects": "/context/projects",
      "communications": "/context/communications",
      "tasks": "/context/tasks",
      "financials": "/context/financials"
    },
    "refreshInterval": 3600,
    "format": "markdown"
  },
  "webhooks": {
    "baseUrl": "https://api.sylo.dev/v1/webhook",
    "authentication": {
      "type": "hmac",
      "header": "X-Sylo-Signature",
      "algorithm": "sha256"
    },
    "timeout": 30000,
    "retries": 3
  }
}
```

**Error Responses**:

```json
// 400 - No Active Connections
{
  "error": {
    "code": "NO_ACTIVE_CONNECTIONS",
    "message": "No active service connections found. Connect at least one service to generate MCP config."
  }
}

// 500 - Generation Failed
{
  "error": {
    "code": "CONFIG_GENERATION_FAILED",
    "message": "Failed to generate MCP configuration due to internal error"
  }
}
```

### Validate MCP Configuration

```http
POST /config/validate
```

**Description**: Validates MCP configuration against specification

**Request Body**:

```json
{
  "config": {
    "mcpVersion": "1.0",
    "agent": { "name": "Test Agent" },
    "services": [...]
  }
}
```

**Success Response** (200):

```json
{
  "valid": true,
  "version": "1.0",
  "warnings": ["Service 'gmail' missing optional 'description' field"],
  "compatibility": {
    "claude": true,
    "gpt4": true,
    "gemini": true
  }
}
```

**Error Response** (400):

```json
{
  "valid": false,
  "errors": [
    {
      "field": "services[0].endpoints.read",
      "code": "INVALID_URL",
      "message": "Endpoint URL must be a valid HTTPS URL"
    }
  ]
}
```

## Context Endpoints

### Get Project Context

```http
GET /context/projects
```

**Description**: Returns compiled project status and information

**Query Parameters**:

- `format?`: `markdown` | `json` | `yaml` (default: `markdown`)
- `limit?`: Number of projects to include (default: 10)
- `status?`: Filter by status: `active` | `completed` | `on_hold`

**Success Response** (200):

```markdown
# Current Projects Status

## Active Projects (3)

### Meridian Restaurant Redesign

- **Status**: In Progress (65% complete)
- **Deadline**: 2024-02-15
- **Stakeholders**: client@meridian.com, contractor@build.co
- **Recent Activity**:
  - Client approved lighting concept (2024-01-10)
  - Contractor requested material specs (2024-01-12)
- **Next Actions**: Finalize material selection, schedule site visit

### Harmony Residential Complex

- **Status**: Planning Phase (20% complete)
- **Deadline**: 2024-06-30
- **Stakeholders**: harmony.dev@email.com, architect@firm.com
- **Recent Activity**:
  - Initial design concepts submitted (2024-01-08)
  - Waiting for client feedback on floor plans
- **Next Actions**: Client review meeting scheduled for 2024-01-15

## Priority Communications (5 unread)

- Meridian client requesting timeline update (urgent)
- Invoice #2024-001 overdue by 5 days
- New project inquiry from potential client
```

### Get Communications Context

```http
GET /context/communications
```

**Description**: Returns summary of emails, messages, and communications

**Success Response** (200):

```json
{
  "summary": {
    "unreadEmails": 12,
    "urgentItems": 3,
    "todayActivity": 8,
    "weeklyTrend": "+15%"
  },
  "priorityItems": [
    {
      "type": "email",
      "from": "client@meridian.com",
      "subject": "Timeline Update Request - Urgent",
      "receivedAt": "2024-12-06T09:30:00Z",
      "priority": "high",
      "project": "Meridian Restaurant Redesign"
    }
  ],
  "recentActivity": [
    {
      "type": "email_sent",
      "to": "contractor@build.co",
      "subject": "Material Specifications Required",
      "sentAt": "2024-12-06T08:15:00Z",
      "project": "Meridian Restaurant Redesign"
    }
  ]
}
```

### Get Tasks Context

```http
GET /context/tasks
```

**Description**: Returns current tasks and deadlines from connected project management tools

**Success Response** (200):

```yaml
# Active Tasks Summary

## Overdue Tasks (2)
- Material selection for Meridian project (due 2024-12-05)
- Client presentation for Harmony complex (due 2024-12-04)

## Due This Week (5)
- Site visit scheduling - Meridian (due 2024-12-08)
- Budget review - Harmony project (due 2024-12-10)
- Vendor quotes comparison (due 2024-12-12)

## In Progress (8)
- Design revisions for Meridian lighting
- Floor plan adjustments for Harmony
- Material sourcing research

## Upcoming Deadlines
- 2024-12-15: Client review meeting - Harmony
- 2024-12-20: Final designs submission - Meridian
- 2024-12-30: Project milestone - Harmony planning phase
```

### Get Financial Context

```http
GET /context/financials
```

**Description**: Returns financial summary from connected accounting systems

**Success Response** (200):

```json
{
  "summary": {
    "totalRevenue": 45000,
    "outstandingInvoices": 12500,
    "overdueAmount": 3200,
    "currentMonthRevenue": 8500,
    "currency": "USD"
  },
  "recentInvoices": [
    {
      "id": "INV-2024-001",
      "client": "Meridian Restaurant",
      "amount": 3200,
      "status": "overdue",
      "dueDate": "2024-12-01",
      "daysPastDue": 5
    }
  ],
  "upcomingPayments": [
    {
      "description": "Material deposit - Harmony project",
      "amount": 5000,
      "dueDate": "2024-12-15"
    }
  ]
}
```

## Webhook Endpoints

### Receive Agent Command

```http
POST /webhook/command
```

**Description**: Receives and processes commands from LLM agents

**Headers**:

```
X-Sylo-Signature: sha256=calculated_hmac_signature
X-Sylo-Timestamp: 1701864600
Content-Type: application/json
```

**Request Body**:

```json
{
  "agentId": "claude-3-5-sonnet",
  "userId": "user_abc123",
  "command": {
    "action": "send_email",
    "service": "gmail",
    "parameters": {
      "to": "client@meridian.com",
      "subject": "Project Timeline Update",
      "body": "Dear Client,\n\nI wanted to provide you with an update on the Meridian Restaurant project...",
      "priority": "high"
    }
  },
  "context": {
    "source": "project_timeline_request",
    "projectId": "meridian_restaurant_2024"
  },
  "timestamp": 1701864600
}
```

**Success Response** (200):

```json
{
  "success": true,
  "commandId": "cmd_xyz789",
  "status": "processing",
  "estimatedCompletion": "2024-12-06T10:35:00Z",
  "message": "Email command queued for processing"
}
```

**Error Responses**:

```json
// 400 - Invalid Command
{
  "error": {
    "code": "INVALID_COMMAND",
    "message": "Missing required parameter: 'to' for send_email action"
  }
}

// 401 - Invalid Signature
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "HMAC signature validation failed"
  }
}

// 403 - Insufficient Permissions
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Gmail connection does not have send_email scope"
  }
}

// 429 - Rate Limited
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Command rate limit exceeded. Try again in 60 seconds",
    "retryAfter": 60
  }
}
```

### Get Command Status

```http
GET /webhook/status/{commandId}
```

**Description**: Retrieves status of previously submitted command

**Success Response** (200):

```json
{
  "commandId": "cmd_xyz789",
  "status": "completed",
  "submittedAt": "2024-12-06T10:30:00Z",
  "completedAt": "2024-12-06T10:32:15Z",
  "result": {
    "success": true,
    "messageId": "msg_gmail_abc123",
    "deliveryStatus": "sent"
  },
  "executionTime": 2150
}
```

### System Health Check

```http
GET /webhook/health
```

**Description**: Returns system health status for monitoring

**Success Response** (200):

```json
{
  "status": "healthy",
  "timestamp": "2024-12-06T10:30:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2024-12-06T10:30:00Z"
    },
    "redis": {
      "status": "healthy",
      "responseTime": 12,
      "lastCheck": "2024-12-06T10:30:00Z"
    },
    "gmail": {
      "status": "healthy",
      "responseTime": 234,
      "lastCheck": "2024-12-06T10:29:45Z"
    },
    "asana": {
      "status": "degraded",
      "responseTime": 1250,
      "lastCheck": "2024-12-06T10:29:30Z",
      "message": "High response times detected"
    }
  },
  "metrics": {
    "activeUsers": 127,
    "activeConnections": 384,
    "dailyCommands": 1250,
    "errorRate": 0.02
  }
}
```

## User Management Endpoints

### List User Connections

```http
GET /connections
```

**Description**: Returns all OAuth connections for authenticated user

**Success Response** (200):

```json
{
  "connections": [
    {
      "id": "conn_abc123",
      "service": "gmail",
      "isActive": true,
      "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
      "connectedAt": "2024-12-01T10:30:00Z",
      "lastUsed": "2024-12-06T09:15:00Z",
      "expiresAt": "2024-12-07T10:30:00Z",
      "status": "healthy"
    }
  ],
  "summary": {
    "total": 3,
    "active": 2,
    "expired": 1
  }
}
```

### Update Connection Permissions

```http
PUT /connections/{connectionId}/permissions
```

**Description**: Updates OAuth scopes for existing connection

**Request Body**:

```json
{
  "scopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send"
  ]
}
```

**Success Response** (200):

```json
{
  "success": true,
  "connection": {
    "id": "conn_abc123",
    "service": "gmail",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send"
    ],
    "updatedAt": "2024-12-06T10:30:00Z"
  },
  "requiresReauthorization": false
}
```

## Rate Limiting & Error Handling

### Rate Limits

- **Per User**: 100 requests/minute
- **Global**: 1000 requests/minute
- **Webhook Commands**: 50 commands/hour per user
- **OAuth Operations**: 10 operations/hour per service per user

### Common Error Codes

- `INVALID_REQUEST`: Malformed request body or parameters
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Rate limit exceeded
- `SERVICE_UNAVAILABLE`: External service temporarily unavailable
- `INTERNAL_ERROR`: Unexpected server error

### Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {
      "field": "Specific field that caused error",
      "value": "Invalid value provided"
    },
    "timestamp": "2024-12-06T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

This API specification provides complete coverage for OAuth integration, MCP configuration generation, context compilation, and secure agent command processing.
