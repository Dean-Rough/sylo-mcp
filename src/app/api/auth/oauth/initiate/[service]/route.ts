import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createConnectSession, SUPPORTED_INTEGRATIONS } from '@/lib/nango/client'

export async function GET(request: NextRequest, { params }: { params: { service: string } }) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = params.service.toLowerCase()

    // Validate service
    const supportedServices = Object.values(SUPPORTED_INTEGRATIONS)
    if (!supportedServices.includes(service as any)) {
      return NextResponse.json({ error: 'Unsupported service' }, { status: 400 })
    }

    // Create connect session for Nango
    const session = await createConnectSession(
      service as any,
      user.id,
      user.emailAddresses[0]?.emailAddress,
      `${user.firstName} ${user.lastName}`.trim()
    )

    return NextResponse.json({
      sessionToken: session.token,
      expiresAt: session.expires_at,
      service,
    })
  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 })
  }
}
