import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getConnection, INTEGRATION_CONFIGS } from '@/lib/nango/client'
import { prisma } from '@/lib/prisma'
import { validateHMACSignature } from '@/lib/security/hmac'

export async function GET(request: NextRequest, { params }: { params: { service: string } }) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.redirect('/sign-in')
    }

    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connection_id') || user.id
    const service = params.service.toLowerCase()

    // Check if connection was successful via Nango
    const connection = await getConnection(service as any, connectionId)

    if (!connection) {
      // Redirect to dashboard with error
      return NextResponse.redirect(`/dashboard?error=oauth_failed&service=${service}`)
    }

    // Extract connection metadata
    const connectionMetadata = {
      provider: connection.provider_config_key,
      providerId: connection.provider,
      createdAt: connection.created_at,
      updatedAt: connection.updated_at,
      lastFetchedAt: connection.last_fetched_at,
      ...(connection.metadata && { metadata: connection.metadata }),
    }

    // Get the expected scopes for this service from our config
    const expectedScopes = (INTEGRATION_CONFIGS as any)[service]?.scopes || []

    // Store connection info in database
    await prisma.oAuthConnection.upsert({
      where: {
        userId_service: {
          userId: user.id,
          service: service,
        },
      },
      update: {
        isActive: true,
        lastUsed: new Date(),
        updatedAt: new Date(),
        providerData: connectionMetadata as any,
      },
      create: {
        userId: user.id,
        service: service,
        connectionId: connectionId, // Nango connection ID
        isActive: true,
        scopes: expectedScopes, // Store expected scopes since Nango handles actual OAuth scopes internally
        providerData: connectionMetadata as any,
      },
    })

    // Log successful connection for audit trail
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        service: service,
        action: 'oauth_connection_established',
        status: 'success',
        parameters: {
          connectionId: connectionId,
          service: service,
        },
        result: {
          scopes: expectedScopes,
        },
      },
    })

    // Redirect to dashboard with success
    return NextResponse.redirect(`/dashboard?success=oauth_connected&service=${service}`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(`/dashboard?error=oauth_callback_failed&service=${params.service}`)
  }
}

// Handle Nango webhooks for connection updates
export async function POST(request: NextRequest, { params }: { params: { service: string } }) {
  try {
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)
    const { type, connectionId, providerConfigKey } = body

    // Verify webhook signature for production environments
    if (process.env.NODE_ENV === 'production' && process.env.NANGO_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-nango-signature')
      if (!signature || !validateHMACSignature(rawBody, signature, process.env.NANGO_WEBHOOK_SECRET)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    switch (type) {
      case 'auth':
        // Connection established
        await handleConnectionEstablished(connectionId, providerConfigKey)
        break

      case 'refresh':
        // Token refreshed
        await handleTokenRefresh(connectionId, providerConfigKey)
        break

      case 'delete':
        // Connection deleted
        await handleConnectionDeleted(connectionId, providerConfigKey)
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Nango webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleConnectionEstablished(connectionId: string, service: string) {
  // Update database to mark connection as active
  const result = await prisma.oAuthConnection.updateMany({
    where: {
      userId: connectionId,
      service,
    },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  })

  // Audit log the connection establishment
  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        userId: connectionId,
        service: service,
        action: 'oauth_connection_webhook_established',
        status: 'success',
        parameters: {
          connectionId,
          service,
        },
      },
    })
  }
}

async function handleTokenRefresh(connectionId: string, service: string) {
  // Update last refresh timestamp
  const result = await prisma.oAuthConnection.updateMany({
    where: {
      userId: connectionId,
      service,
    },
    data: {
      updatedAt: new Date(),
    },
  })

  // Audit log the token refresh
  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        userId: connectionId,
        service: service,
        action: 'oauth_token_refreshed',
        status: 'success',
        parameters: {
          connectionId,
          service,
        },
      },
    })
  }
}

async function handleConnectionDeleted(connectionId: string, service: string) {
  // Mark connection as inactive
  const result = await prisma.oAuthConnection.updateMany({
    where: {
      userId: connectionId,
      service,
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  })

  // Audit log the connection deletion
  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        userId: connectionId,
        service: service,
        action: 'oauth_connection_deleted',
        status: 'success',
        parameters: {
          connectionId,
          service,
        },
      },
    })
  }
}
