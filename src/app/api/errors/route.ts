import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ErrorLogSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  timestamp: z.string(),
  userAgent: z.string().optional(),
  url: z.string().optional(),
  context: z.any().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    const body = await request.json()

    // Validate the error data
    const errorData = ErrorLogSchema.parse(body)

    // Store error log in database
    await prisma.errorLog.create({
      data: {
        message: errorData.message,
        stack: errorData.stack,
        componentStack: errorData.componentStack,
        url: errorData.url,
        userAgent: errorData.userAgent,
        context: errorData.context || {},
        userId: user?.id || null,
        timestamp: new Date(errorData.timestamp),
        environment: process.env.NODE_ENV || 'unknown',
        resolved: false,
      },
    })

    // In production, you might want to send to external error tracking
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry, DataDog, or other error tracking service
      console.error('Production Error Logged:', {
        message: errorData.message,
        url: errorData.url,
        userId: user?.id,
        timestamp: errorData.timestamp,
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Failed to log error:', error)

    // Don't throw here as it could cause infinite loop
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const resolved = url.searchParams.get('resolved')

    const where: any = {}
    if (resolved !== null) {
      where.resolved = resolved === 'true'
    }

    const errors = await prisma.errorLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        message: true,
        url: true,
        timestamp: true,
        environment: true,
        resolved: true,
        userId: true,
      },
    })

    const total = await prisma.errorLog.count({ where })

    return NextResponse.json({
      errors,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Failed to fetch errors:', error)
    return NextResponse.json({ error: 'Failed to fetch errors' }, { status: 500 })
  }
}
