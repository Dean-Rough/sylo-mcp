import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { auditService } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    const days = parseInt(searchParams.get('days') || '30')

    if (!service) {
      return NextResponse.json(
        { error: 'Missing required parameter: service' },
        { status: 400 }
      )
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const stats = await auditService.getServiceStats(service, startDate, endDate)

    return NextResponse.json({
      service,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      stats,
    })
  } catch (error) {
    console.error('Audit stats error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve audit statistics' },
      { status: 500 }
    )
  }
}