import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connections = await prisma.oAuthConnection.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        service: true,
        isActive: true,
        lastUsed: true,
        scopes: true,
      },
    })

    return NextResponse.json({
      connections: connections.map(conn => ({
        id: conn.id,
        service: conn.service,
        isActive: conn.isActive,
        lastUsed: conn.lastUsed,
        scopes: conn.scopes,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch connections:', error)
    return NextResponse.json(
      {
        error: 'FETCH_CONNECTIONS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
