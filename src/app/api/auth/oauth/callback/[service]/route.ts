import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getConnection } from '@/lib/nango/client'
import { prisma } from '@/lib/prisma'

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
      },
      create: {
        userId: user.id,
        service: service,
        connectionId: connectionId, // Nango connection ID
        isActive: true,
        scopes: [], // Will be populated from Nango metadata
        providerData: {},
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
    const body = await request.json()
    const { type, connectionId, providerConfigKey } = body

    // Verify webhook signature (implement based on Nango docs)
    // const signature = request.headers.get('x-nango-signature')
    // if (!verifyNangoSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

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
  await prisma.oAuthConnection.updateMany({
    where: {
      userId: connectionId,
      service,
    },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  })
}

async function handleTokenRefresh(connectionId: string, service: string) {
  // Update last refresh timestamp
  await prisma.oAuthConnection.updateMany({
    where: {
      userId: connectionId,
      service,
    },
    data: {
      updatedAt: new Date(),
    },
  })
}

async function handleConnectionDeleted(connectionId: string, service: string) {
  // Mark connection as inactive
  await prisma.oAuthConnection.updateMany({
    where: {
      userId: connectionId,
      service,
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  })
}
