# Nango Setup Guide - Essential for Sylo V2

## ⚠️ Critical: Nango is Required

**Sylo V2 cannot function without Nango.** This is not an optional integration - Nango IS our OAuth platform. Before running Sylo V2, you must complete this Nango setup.

## Step 1: Create Nango Account

1. Visit https://app.nango.dev/
2. Sign up for a free account
3. Verify your email address
4. Create your first project

## Step 2: Configure Required Integrations

### Gmail Integration

1. In Nango dashboard, click "Add Integration"
2. Search for "Google" and select it
3. Configure:
   - **Provider Config Key**: `gmail`
   - **Scopes**: `gmail.readonly`, `gmail.send`
   - **Webhook URL**: `https://yourdomain.com/api/auth/oauth/callback/gmail`

### Asana Integration

1. Click "Add Integration" again
2. Search for "Asana" and select it
3. Configure:
   - **Provider Config Key**: `asana`
   - **Scopes**: `default`
   - **Webhook URL**: `https://yourdomain.com/api/auth/oauth/callback/asana`

### Xero Integration

1. Click "Add Integration" again
2. Search for "Xero" and select it
3. Configure:
   - **Provider Config Key**: `xero`
   - **Scopes**: `accounting.transactions`, `accounting.contacts.read`
   - **Webhook URL**: `https://yourdomain.com/api/auth/oauth/callback/xero`

## Step 3: Get Your Nango Keys

1. In Nango dashboard, go to "Settings" → "API Keys"
2. Copy your **Secret Key** (starts with `nango_sk_`)
3. Copy your **Public Key** (starts with `nango_pk_`)

## Step 4: Update Environment Variables

Add to your `.env.local`:

```bash
# Nango OAuth Platform (REQUIRED)
NANGO_SECRET_KEY="nango_sk_your_actual_secret_key_here"
NEXT_PUBLIC_NANGO_PUBLIC_KEY="nango_pk_your_actual_public_key_here"
NANGO_ENVIRONMENT="sandbox"  # Use "production" for live deployment
```

## Step 5: Test Your Setup

1. Start your Sylo V2 development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/dashboard`

3. Try connecting a service (Gmail recommended for testing)

4. Verify the OAuth flow completes successfully

## Step 6: Production Setup

When deploying to production:

1. Switch to production environment in Nango dashboard
2. Update webhook URLs to your production domain
3. Change `NANGO_ENVIRONMENT="production"` in your production environment
4. Test all integrations in production environment

## Troubleshooting

### "Nango connection failed"

- Verify your API keys are correct
- Check that integrations are properly configured in Nango dashboard
- Ensure webhook URLs match your deployment URLs

### "Integration not found"

- Confirm the provider config key matches exactly (case-sensitive)
- Verify the integration is enabled in your Nango project

### "Webhook not receiving events"

- Check your webhook URL is publicly accessible
- Verify HTTPS is enabled (required for production)
- Test webhook endpoint manually

## Why Nango?

**Enterprise OAuth Management**: Nango handles OAuth complexity so we don't have to
**200+ Integrations**: Add new services without implementing OAuth flows
**SOC2 Compliance**: Enterprise security standards built-in
**Zero Token Exposure**: Sylo never sees or stores actual OAuth tokens
**Automatic Refresh**: Token rotation and refresh handled automatically

## Getting Help

- Nango Documentation: https://docs.nango.dev/
- Nango Community: https://nango.dev/slack
- Sylo Issues: https://github.com/Dean-Rough/sylo-mcp/issues

---

**Remember: Nango is not optional - it's the foundation of Sylo V2's OAuth architecture.**
