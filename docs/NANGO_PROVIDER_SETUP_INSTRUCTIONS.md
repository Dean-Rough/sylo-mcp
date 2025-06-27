# Nango Provider Configuration Setup Instructions

This guide walks you through obtaining OAuth credentials for Gmail, Asana, and Xero to configure in your Nango dashboard.

## Prerequisites
- Access to Nango dashboard: https://app.nango.dev
- Your Nango account credentials
- Admin access to create OAuth apps in Google, Asana, and Xero

## Step 1: Access Nango Dashboard

1. Go to https://app.nango.dev
2. Sign in with your Nango account
3. Navigate to **Integrations** → **Configured Integrations**
4. You'll add each provider here using the credentials gathered below

## Step 2: Gmail (Google) OAuth Setup

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Name it "Sylo V2" and create
4. Wait for project creation to complete

### 2.2 Enable Gmail API
1. In your project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on Gmail API and press **Enable**

### 2.3 Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure OAuth consent screen first:
   - Choose **External** user type
   - Fill required fields:
     - App name: "Sylo V2"
     - User support email: your email
     - Developer contact: your email
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.compose`
   - Add test users (your email)
   - Save and continue

4. Back to creating OAuth client ID:
   - Application type: **Web application**
   - Name: "Sylo V2 Nango"
   - Authorized redirect URIs, add:
     ```
     https://api.nango.dev/oauth/callback
     ```
   - Click **Create**

5. **Save these credentials:**
   - Client ID: `[YOUR_GOOGLE_CLIENT_ID]`
   - Client Secret: `[YOUR_GOOGLE_CLIENT_SECRET]`

## Step 3: Asana OAuth Setup

### 3.1 Create Asana App
1. Go to [Asana Developer Console](https://app.asana.com/0/my-apps)
2. Click **Create new app**
3. Fill in:
   - App name: "Sylo V2"
   - Authentication method: **OAuth**
   - Redirect URLs: 
     ```
     https://api.nango.dev/oauth/callback
     ```
4. Click **Create app**

### 3.2 Configure App Settings
1. In your app settings, note down:
   - **Client ID**: `[YOUR_ASANA_CLIENT_ID]`
   - **Client Secret**: `[YOUR_ASANA_CLIENT_SECRET]`

2. Under OAuth settings:
   - Ensure redirect URL is correctly set
   - Default OAuth scope should be sufficient

## Step 4: Xero OAuth Setup

### 4.1 Create Xero App
1. Go to [Xero Developer Portal](https://developer.xero.com/myapps)
2. Click **New app**
3. Fill in:
   - App name: "Sylo V2"
   - Company URL: Your company website
   - Privacy policy URL: Your privacy policy
   - Redirect URI:
     ```
     https://api.nango.dev/oauth/callback
     ```

### 4.2 Configure OAuth 2.0
1. Choose **Web app** as integration type
2. Select the required scopes:
   - `accounting.transactions.read`
   - `accounting.contacts.read`
   - `accounting.reports.read`

### 4.3 Get Credentials
1. After creation, go to your app's configuration
2. **Save these credentials:**
   - Client ID: `[YOUR_XERO_CLIENT_ID]`
   - Client Secret: `[YOUR_XERO_CLIENT_SECRET]`

## Step 5: Configure Providers in Nango

### 5.1 Add Gmail Provider
1. In Nango dashboard, go to **Integrations** → **Configured Integrations**
2. Click **Configure New Integration**
3. Search and select **Gmail** (or **Google**)
4. Fill in:
   - Integration ID: `gmail`
   - Client ID: `[YOUR_GOOGLE_CLIENT_ID]`
   - Client Secret: `[YOUR_GOOGLE_CLIENT_SECRET]`
   - Scopes: 
     ```
     https://www.googleapis.com/auth/gmail.readonly
     https://www.googleapis.com/auth/gmail.send
     https://www.googleapis.com/auth/gmail.compose
     ```
5. Save configuration

### 5.2 Add Asana Provider
1. Click **Configure New Integration**
2. Search and select **Asana**
3. Fill in:
   - Integration ID: `asana`
   - Client ID: `[YOUR_ASANA_CLIENT_ID]`
   - Client Secret: `[YOUR_ASANA_CLIENT_SECRET]`
   - Scopes: Leave default or empty
4. Save configuration

### 5.3 Add Xero Provider
1. Click **Configure New Integration**
2. Search and select **Xero**
3. Fill in:
   - Integration ID: `xero`
   - Client ID: `[YOUR_XERO_CLIENT_ID]`
   - Client Secret: `[YOUR_XERO_CLIENT_SECRET]`
   - Scopes:
     ```
     accounting.transactions.read
     accounting.contacts.read
     accounting.reports.read
     ```
4. Save configuration

## Step 6: Update Environment Variables

After gathering all credentials, update your `.env.local` file:

```env
# Nango Configuration
NANGO_SECRET_KEY="your-nango-secret-key"
NEXT_PUBLIC_NANGO_PUBLIC_KEY="your-nango-public-key"

# These are now managed by Nango, but keep for reference:
# GMAIL_CLIENT_ID="[YOUR_GOOGLE_CLIENT_ID]"
# GMAIL_CLIENT_SECRET="[YOUR_GOOGLE_CLIENT_SECRET]"
# ASANA_CLIENT_ID="[YOUR_ASANA_CLIENT_ID]"
# ASANA_CLIENT_SECRET="[YOUR_ASANA_CLIENT_SECRET]"
# XERO_CLIENT_ID="[YOUR_XERO_CLIENT_ID]"
# XERO_CLIENT_SECRET="[YOUR_XERO_CLIENT_SECRET]"
```

## Step 7: Deploy Integrations

Once all providers are configured in Nango:

```bash
cd /Users/deannewton/Documents/Sylo-MCP
export NANGO_SECRET_KEY_PROD="your-nango-secret-key"
nango deploy prod --auto-confirm
```

## Troubleshooting

### Common Issues:

1. **"Unknown provider config" error**
   - Ensure the Integration ID in Nango matches exactly (e.g., `gmail`, `asana`, `xero`)
   - Check that you've saved the configuration in Nango dashboard

2. **OAuth redirect mismatch**
   - Verify redirect URI is exactly: `https://api.nango.dev/oauth/callback`
   - No trailing slashes or extra parameters

3. **Scope errors**
   - Google requires exact scope strings
   - Xero scopes must match their documentation
   - Asana typically works with default scopes

### Testing Connections

After setup, test each integration:

1. In Nango dashboard, go to **Connections**
2. Click **Create Connection**
3. Select your integration
4. Enter a connection ID (e.g., `test-gmail`)
5. Complete OAuth flow
6. Verify connection is established

## Security Notes

- Never commit OAuth credentials to version control
- Store all secrets in environment variables
- Rotate secrets periodically
- Use separate apps for development/production
- Limit scopes to minimum required

## Summary: Where Everything Goes

### In Nango Dashboard (https://app.nango.dev):
1. **Gmail Provider Config**
   - Integration ID: `gmail`
   - Client ID & Secret from Google Cloud Console
   
2. **Asana Provider Config**
   - Integration ID: `asana`
   - Client ID & Secret from Asana Developer Console
   
3. **Xero Provider Config**
   - Integration ID: `xero`
   - Client ID & Secret from Xero Developer Portal

### In Your Project Files:

1. **`.env.local`** (already exists)
   ```env
   # Update these values:
   NANGO_SECRET_KEY="get-from-nango-dashboard-environment-settings"
   NEXT_PUBLIC_NANGO_PUBLIC_KEY="get-from-nango-dashboard-environment-settings"
   ```

2. **`/nango-integrations/.env`** (already exists)
   ```env
   # Already configured:
   NANGO_SECRET_KEY_PROD="your-nango-secret-key"
   ```

3. **OAuth Redirect URLs** (set in each provider's dashboard):
   - Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs
   - Asana Developer Console → App Settings → Redirect URLs  
   - Xero Developer Portal → App Settings → OAuth redirect URI
   - All use: `https://api.nango.dev/oauth/callback`

### Quick Reference - Provider Dashboards:
- **Google**: https://console.cloud.google.com → APIs & Services → Credentials
- **Asana**: https://app.asana.com/0/my-apps → Your App → OAuth
- **Xero**: https://developer.xero.com/myapps → Your App → Configuration
- **Nango**: https://app.nango.dev → Integrations → Configured Integrations

## Next Steps

1. Complete provider setup for all three services
2. Deploy your integrations using Nango CLI
3. Test OAuth flows for each service
4. Implement actual sync logic in your TypeScript files
5. Set up webhook endpoints for command routing

## Additional Resources

- [Nango Documentation](https://docs.nango.dev)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Asana OAuth Guide](https://developers.asana.com/docs/oauth)
- [Xero OAuth 2.0 Guide](https://developer.xero.com/documentation/guides/oauth2/overview)