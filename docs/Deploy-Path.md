CRITICAL PATH (Must have - can deploy today)

1. Domain Name
    - Buy domain (£10-15/year)
    - Point to Vercel for hosting

2. Vercel Deployment
    - Connect GitHub repo to Vercel
    - Deploy automatically builds from main branch
    - Free tier supports this perfectly

3. NeonDB Production Database
    - Create NeonDB account (free tier: 0.5GB)
    - Get production DATABASE_URL
    - Run npx prisma db push to create tables

4. Clerk Authentication
    - Set up production Clerk app
    - Add your domain to allowed origins
    - Get CLERK_SECRET_KEY + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

5. Security Keys

# Generate these:

openssl rand -hex 32 # ENCRYPTION_KEY
openssl rand -hex 32 # WEBHOOK_SECRET  
openssl rand -hex 32 # JWT_SECRET

PHASE 2 (OAuth Integration - 1-2 days)

6. Nango Platform Setup
    - Create Nango account
    - Add your domain as allowed origin
    - Configure OAuth providers (Gmail, Asana, Xero)
    - Get NANGO_SECRET_KEY + NEXT_PUBLIC_NANGO_PUBLIC_KEY

7. OAuth App Registrations
    - Gmail: Google Cloud Console → OAuth consent screen
    - Asana: Asana Developer Console → New app
    - Xero: Xero Developer Portal → OAuth 2.0 app
    - All need your domain's callback URLs

PHASE 3 (Advanced Features - optional)

8. External APIs
    - Google Veo 2 API key
    - Meta Graph API for Instagram
    - n8n instance for workflows

💰 Costs Breakdown
- Domain: £10-15/year
- Infrastructure: £0 (free tiers)
- Total to get live: Under £20

⚡ Quick Start (2-hour deployment)

1. Buy domain
2. Deploy to Vercel
3. Create NeonDB + run migrations
4. Set up Clerk auth
5. Generate security keys
6. Test core functionality

OAuth integrations can be added incrementally after core deployment.
