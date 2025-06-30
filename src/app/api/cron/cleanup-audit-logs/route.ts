import { NextRequest, NextResponse } from 'next/server'
import { auditService } from '@/lib/services/audit'

// This endpoint should be called by a cron job (e.g., Vercel Cron Jobs)
// Schedule: Daily at 2 AM UTC
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (in production)
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Clean up audit logs older than 90 days
    const deletedCount = await auditService.cleanupOldLogs(90)

    // Log the cleanup operation itself
    await auditService.logSuccess('system', 'system', 'audit_cleanup', {
      result: {
        deletedCount,
        retentionDays: 90,
      },
    })

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} audit logs older than 90 days`,
    })
  } catch (error) {
    console.error('Audit cleanup error:', error)
    
    await auditService.logError(
      'system',
      'system',
      'audit_cleanup',
      error instanceof Error ? error : 'Unknown error'
    )

    return NextResponse.json(
      { error: 'Failed to cleanup audit logs' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}