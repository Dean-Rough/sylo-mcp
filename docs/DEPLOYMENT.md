# Deployment Guide - Sylo V2

## Production Domain
**Live URL**: `https://sylo.design`

## Environment Configuration

### Production Environment Variables
Create a `.env.production` file with these values:

```bash
# =============================================================================
# PRODUCTION ENVIRONMENT - SYLO.DESIGN
# =============================================================================

# =============================================================================
# AUTHENTICATION (CLERK) - PRODUCTION
# =============================================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_your_production_clerk_key"
CLERK_SECRET_KEY="sk_live_your_production_clerk_secret"
CLERK_WEBHOOK_SECRET="whsec_your_production_webhook_secret"

# =============================================================================
# DATABASE & STORAGE - PRODUCTION
# =============================================================================
DATABASE_URL="postgresql://user:password@your-prod-db:5432/sylo_prod"
REDIS_URL="redis://your-prod-redis:6379"

# =============================================================================
# NANGO OAUTH PLATFORM - PRODUCTION
# =============================================================================
# Use "prod" environment in Nango dashboard
NANGO_SECRET_KEY_PROD="your_production_nango_secret_key"
NEXT_PUBLIC_NANGO_PUBLIC_KEY="your_production_nango_public_key"
NANGO_ENVIRONMENT="prod"

# =============================================================================
# SECURITY KEYS - PRODUCTION
# =============================================================================
ENCRYPTION_KEY="your-32-character-production-encryption-key"
WEBHOOK_SECRET="your-32-character-production-webhook-key"
JWT_SECRET="your-32-character-production-jwt-signing-key"

# =============================================================================
# PRODUCTION SETTINGS
# =============================================================================
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://sylo.design"

# =============================================================================
# OPENAI API - PRODUCTION
# =============================================================================
OPENAI_API_KEY="sk-proj-your_production_openai_key"
```

## Nango Production Setup

### 1. Create Production Environment
In your Nango dashboard:
1. Create a new environment called "prod"
2. This will generate `NANGO_SECRET_KEY_PROD` variable name
3. Copy the secret key to your production environment

### 2. Update Webhook URLs
In Nango dashboard → Notification Settings:
- **Primary URL**: `https://sylo.design/api/webhooks/nango`
- **Secondary URL**: `https://sylo.design/api/webhooks/nango-backup`

### 3. Configure Callback URL
- **Callback URL**: `https://api.nango.dev/oauth/callback` (default, no change needed)

## Deployment Checklist

### Pre-Deployment
- [ ] Create production Nango environment
- [ ] Generate production Clerk keys
- [ ] Set up production database
- [ ] Configure production Redis instance
- [ ] Generate secure encryption keys
- [ ] Update webhook URLs in all services

### Domain Setup
- [ ] Configure DNS for `sylo.design`
- [ ] Set up SSL certificate
- [ ] Configure CDN if needed
- [ ] Test domain resolution

### Security
- [ ] Rotate all development keys
- [ ] Enable HTTPS redirect
- [ ] Configure CORS properly
- [ ] Set up monitoring and alerts
- [ ] Enable rate limiting

### Post-Deployment Testing
- [ ] Test OAuth flows (Gmail, Asana, Xero)
- [ ] Verify webhook endpoints
- [ ] Test user authentication
- [ ] Check database connections
- [ ] Validate API endpoints

## Environment Management

### Development
- Domain: `http://localhost:3000`
- Nango Environment: `dev`
- Variable: `NANGO_SECRET_KEY_DEV`

### Production
- Domain: `https://sylo.design`
- Nango Environment: `prod`
- Variable: `NANGO_SECRET_KEY_PROD`

## Webhook Endpoints

The following webhook endpoints need to be accessible:

```bash
# Nango OAuth webhooks
POST https://sylo.design/api/webhooks/nango

# Clerk authentication webhooks
POST https://sylo.design/api/webhooks/clerk

# Integration-specific webhooks
POST https://sylo.design/api/webhooks/gmail
POST https://sylo.design/api/webhooks/asana
POST https://sylo.design/api/webhooks/xero
```

## Monitoring

### Health Checks
- [ ] `/api/health` endpoint
- [ ] Database connectivity
- [ ] Redis connectivity
- [ ] External API status

### Logging
- [ ] Application logs
- [ ] Error tracking (Sentry recommended)
- [ ] Performance monitoring
- [ ] OAuth flow tracking

## Rollback Plan

1. Keep previous deployment ready
2. Database migration rollback scripts
3. DNS failover configuration
4. Environment variable backup

## Support

For deployment issues:
- Check logs at `/var/log/sylo/`
- Monitor webhook delivery in Nango dashboard
- Verify SSL certificate status
- Test OAuth flows manually
