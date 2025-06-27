# Environment Setup - Nango Integration

## Overview

Sylo V2 uses **Nango** for OAuth management, which significantly simplifies the environment setup by eliminating the need for individual service API keys and OAuth credentials.

## Required Environment Variables

### Core Application

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Nango OAuth Management
NANGO_SECRET_KEY=your_nango_secret_key_here
NEXT_PUBLIC_NANGO_PUBLIC_KEY=your_nango_public_key_here

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sylo_v2"

# Encryption (for sensitive data storage)
ENCRYPTION_KEY="your-32-character-encryption-key-here"

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Environment
NODE_ENV=development
```

### Optional (for advanced features)

```bash
# Redis (for session management and caching)
REDIS_URL="redis://localhost:6379"

# Webhook processing
WEBHOOK_SECRET=your_webhook_secret_here
```

## What You DON'T Need

Thanks to Nango, you **do not need** these environment variables:

❌ `GMAIL_CLIENT_ID`  
❌ `GMAIL_CLIENT_SECRET`  
❌ `ASANA_CLIENT_ID`  
❌ `ASANA_CLIENT_SECRET`  
❌ `XERO_CLIENT_ID`  
❌ `XERO_CLIENT_SECRET`  
❌ Individual OAuth redirect URIs  
❌ Service-specific API keys

## Nango Setup

### 1. Create Nango Account

1. Sign up at [nango.dev](https://nango.dev)
2. Create a new project
3. Get your public and secret keys from the dashboard

### 2. Configure Integrations in Nango

In your Nango dashboard, add these integrations:

#### Gmail Integration

- **Provider**: Google
- **Scopes**:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.send`

#### Asana Integration

- **Provider**: Asana
- **Scopes**: `default`

#### Xero Integration

- **Provider**: Xero
- **Scopes**:
  - `accounting.transactions`
  - `accounting.contacts.read`

### 3. Set Webhook URL

Configure your Nango webhook URL to:

```
https://your-domain.com/api/auth/oauth/callback/[service]
```

## Local Development

1. Copy the environment template:

```bash
cp .env.example .env.local
```

2. Fill in your actual values:

   - Get Clerk keys from [clerk.com](https://clerk.com)
   - Get Nango keys from [nango.dev](https://nango.dev)
   - Set up a local PostgreSQL database

3. Run database migrations:

```bash
npx prisma migrate dev
```

4. Start the development server:

```bash
npm run dev
```

## Production Deployment

### Environment Variables

Set all required environment variables in your hosting platform:

- Vercel: Project Settings → Environment Variables
- Railway: Variables tab
- Heroku: Config Vars

### Database

- Use a managed PostgreSQL service (Supabase, PlanetScale, etc.)
- Run migrations: `npx prisma migrate deploy`

### Nango Configuration

- Update webhook URLs to your production domain
- Verify OAuth redirect URIs match your production URLs
- Test all integrations in Nango dashboard

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use different Nango projects** for development and production
3. **Rotate keys regularly** in production
4. **Enable webhook signature verification** for production webhooks
5. **Use HTTPS** for all OAuth redirects and webhooks

## Troubleshooting

### OAuth Flow Issues

- Check Nango dashboard for connection logs
- Verify webhook URLs are accessible
- Ensure environment variables are set correctly

### Database Connection

- Verify DATABASE_URL format
- Check database permissions
- Run `npx prisma db push` to sync schema

### Clerk Authentication

- Verify publishable key matches your Clerk application
- Check that your domain is added to Clerk's allowed origins

## Benefits of Nango Integration

✅ **Simplified Setup**: No need to manage individual OAuth apps  
✅ **Automatic Token Refresh**: Nango handles token lifecycle  
✅ **Unified API**: Consistent interface across all services  
✅ **Built-in Security**: OAuth best practices implemented  
✅ **Monitoring**: Built-in analytics and error tracking  
✅ **Scalability**: Handle multiple users and connections easily

This approach significantly reduces the complexity of OAuth management while maintaining security and reliability.
