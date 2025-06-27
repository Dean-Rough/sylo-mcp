# Nango OAuth Setup Guide

## Overview
Sylo V2 uses Nango to hyper-simplify OAuth management across all integrations (Gmail, Asana, Xero). This eliminates the need for individual OAuth app credentials.

## Environment Configuration

### 1. Update Your .env.local File

Based on your Nango dashboard settings, update these variables:

```bash
# =============================================================================
# NANGO OAUTH PLATFORM
# =============================================================================
# Environment: dev (update variable name if you rename the environment)
NANGO_SECRET_KEY_DEV="your_actual_secret_key_from_dashboard"
NEXT_PUBLIC_NANGO_PUBLIC_KEY="your_actual_public_key_from_dashboard"
NANGO_ENVIRONMENT="dev"
```

### 2. Get Your Keys from Nango Dashboard

1. **Secret Key**: Copy from "Backend Settings" → "Secret Key" (the hidden value)
2. **Public Key**: This should be available in your dashboard's frontend settings
3. **Environment Name**: Currently set to "dev" - if you change this, update the variable name accordingly

## Webhook Configuration

### Current Settings (from your dashboard):
- **Primary URL**: `https://example.com/webhooks_from_nango`
- **Secondary URL**: `https://example.com/webhooks_from_nango`

### For Development:
Update these to point to your local development server or use a tunneling service like ngrok:

```bash
# For local development with ngrok
https://your-ngrok-url.ngrok.io/api/webhooks/nango

# For production
https://sylo.design/api/webhooks/nango
```

## Integration Setup

### Supported Integrations:
- **Gmail**: Email access and sending
- **Asana**: Task and project management  
- **Xero**: Accounting and financial data

### Required Nango Integrations:
Make sure these integrations are configured in your Nango dashboard:
1. `gmail` - Google Gmail API
2. `asana` - Asana API
3. `xero` - Xero Accounting API

## Troubleshooting

### 401 Unauthorized Error
- ✅ **Fixed**: Updated environment variable from `NANGO_SECRET_KEY` to `NANGO_SECRET_KEY_DEV`
- ✅ **Action Required**: Replace placeholder values with actual keys from dashboard

### Environment Variable Naming
- Environment name "dev" requires `NANGO_SECRET_KEY_DEV`
- If you rename environment to "prod", use `NANGO_SECRET_KEY_PROD`
- If you rename environment to "staging", use `NANGO_SECRET_KEY_STAGING`

### Testing the Connection
After updating your keys, test the OAuth flow:
1. Start your dev server: `npm run dev`
2. Navigate to an integration page
3. Click "Connect" for any service
4. Should redirect to Nango's OAuth flow

## Security Notes

- **Never commit real keys to git**
- Use different environments for dev/staging/prod
- Rotate keys regularly
- Monitor webhook endpoints for security

## Next Steps

1. **Replace placeholder keys** in `.env.local` with real values from your Nango dashboard
2. **Update webhook URLs** to point to your actual endpoints
3. **Test OAuth flow** with a supported integration
4. **Configure production environment** when ready to deploy 