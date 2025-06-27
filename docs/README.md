# Sylo V2 - Headless Agent Configuration Engine

## Quick Start

**Enterprise AI agent configuration platform powered by Nango's OAuth infrastructure - eliminating OAuth complexity while maintaining zero credential exposure.**

### Prerequisites

- Node.js 18+
- PostgreSQL (NeonDB recommended)
- Redis
- Clerk account
- **Nango account** (get started at https://app.nango.dev/)

### 5-Minute Setup

⚠️ **IMPORTANT**: Complete Nango setup first - see `docs/NANGO_SETUP_GUIDE.md`

```bash
# Clone and install
git clone git@github.com:Dean-Rough/sylo-mcp.git
cd sylo-mcp
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Nango keys and other credentials

# Setup database
npm run db:push
npm run db:generate

# Start development
npm run dev
```

## Core Value: Nango-First OAuth Simplification

- **🔥 Nango Platform**: Enterprise OAuth management for 200+ integrations - **this is our core differentiator**
- **🛡️ Zero-Credential Exposure**: AI agents never see OAuth tokens thanks to Nango's secure proxy
- **🤖 MCP Standard**: Generate Model Context Protocol configs with Nango-powered webhooks
- **🔗 Multi-Service**: Gmail, Asana, Xero unified through Nango's single interface
- **🏢 Enterprise Security**: SOC2 compliance built-in via Nango + additional AES-256 encryption

## Tech Stack

**Frontend**: Next.js 14 + TypeScript + TailwindCSS + Clerk  
**Backend**: Next.js API Routes + Prisma + NeonDB + Redis  
**OAuth Platform**: Nango (enterprise OAuth management) - **core architecture component**  
**Security**: OAuth 2.1 + PKCE, AES-256-GCM, HMAC-SHA256  
**AI Integration**: MCP Protocol + Google Veo 2 + n8n workflows

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run start           # Production server

# Database
npm run db:push         # Push schema changes
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run migrations
npm run db:studio       # Database GUI

# Testing
npm run test            # Unit tests
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Coverage report

# Code Quality
npm run lint            # ESLint
npm run type-check      # TypeScript check
```

## Project Structure

```
src/
├── app/                # Next.js App Router pages
├── components/         # React components
├── lib/               # Utilities and services
├── types/             # TypeScript definitions
└── middleware.ts      # Clerk authentication

docs/                  # Complete technical documentation
tests/                 # Unit, integration, E2E tests
prisma/               # Database schema and migrations
```

## Environment Variables

Required variables in `.env.local`:

```bash
# Database & Cache
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Nango OAuth Platform
NANGO_SECRET_KEY="nango_sk_..."
NEXT_PUBLIC_NANGO_PUBLIC_KEY="nango_pk_..."

# Security Keys (32 chars each)
ENCRYPTION_KEY="..."
WEBHOOK_SECRET="..."
JWT_SECRET="..."
```

## Core Workflows

1. **Nango OAuth Setup**: User connects services via Nango's enterprise OAuth platform
2. **Context Compilation**: Real-time data aggregation from Nango-managed services
3. **MCP Generation**: Standards-compliant agent configuration with Nango webhooks
4. **Agent Commands**: Secure webhook processing with HMAC validation

## Security Features

- **Nango Platform**: Enterprise OAuth with SOC2 compliance and token management
- **Token Security**: Nango handles token storage, refresh, and rotation
- **PKCE OAuth**: Proof Key for Code Exchange prevents attacks
- **HMAC Validation**: Webhook signature verification
- **Audit Logging**: Complete action trail for compliance
- **Rate Limiting**: API abuse prevention

## Quick Validation

```bash
# Verify setup
npm run test            # All tests pass
npm run type-check      # No TypeScript errors
npm run lint            # Code quality check

# Database health
npm run db:studio       # Opens Prisma Studio

# Nango connection validation
# 1. Visit https://app.nango.dev/ and verify integrations are configured
# 2. Test OAuth flow in development environment
# 3. Check webhook endpoints are receiving Nango events
```

## Production Deployment

See `docs/DEPLOYMENT.md` for complete production setup including:

- Vercel deployment
- Environment configuration
- OAuth provider setup
- Monitoring and observability

## Documentation

- `docs/PRD.md` - Product requirements and specifications
- `docs/SYSTEM_ARCHITECTURE.md` - Technical architecture design
- **`docs/NANGO_SETUP_GUIDE.md` - Essential Nango configuration (start here!)**
- `docs/NANGO_INTEGRATION.md` - Nango OAuth platform integration guide
- `docs/API_ROUTES.md` - Complete API specification
- `docs/DB_SCHEMA.md` - Database design and security
- `docs/COMPONENTS.md` - Frontend component breakdown
- `docs/UI_DESIGN_SYSTEM.md` - Complete UI design system and branding
- `docs/ROADMAP.md` - AI agent implementation plan
- `docs/DEPLOYMENT.md` - Production deployment guide

## Support

- Issues: [GitHub Issues](https://github.com/Dean-Rough/sylo-mcp/issues)
- Discussions: [GitHub Discussions](https://github.com/Dean-Rough/sylo-mcp/discussions)
- Security: security@sylo.dev

---

**Security is our foundation. Simplicity is our interface. Autonomy is our outcome.**
