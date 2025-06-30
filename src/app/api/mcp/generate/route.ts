import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { MCPGenerator } from '@/lib/mcp/generator'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { auditService } from '@/lib/services/audit'
import { prisma } from '@/lib/prisma'

async function postHandler(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, includeServices } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    // Generate MCP configuration
    const generator = new MCPGenerator(user.id)
    const config = await generator.generateConfig()
    
    // Store the configuration in the database
    const savedConfig = await prisma.mCPConfig.create({
      data: {
        userId: user.id,
        name,
        description,
        config: config as any,
        expiresAt: new Date(config.expiresAt),
      },
    })

    const executionTime = Date.now() - startTime

    // Audit log the generation
    await auditService.logSuccess(user.id, 'mcp', 'generate_config', {
      parameters: { name, description, includeServices },
      result: { configId: savedConfig.id },
      executionTime,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({
      success: true,
      config: savedConfig,
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    
    // Audit log the error
    const user = await currentUser()
    if (user) {
      await auditService.logError(
        user.id,
        'mcp',
        'generate_config',
        error instanceof Error ? error : 'Unknown error',
        {
          executionTime,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
        }
      )
    }

    console.error('MCP generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate MCP configuration' },
      { status: 500 }
    )
  }
}

// Export with rate limiting
export const POST = withRateLimit(postHandler, {
  requests: RATE_LIMIT_CONFIGS.api.mcp.requests,
  window: RATE_LIMIT_CONFIGS.api.mcp.window,
})

async function getHandler(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configs = await prisma.mCPConfig.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      configs,
      count: configs.length,
    })
  } catch (error) {
    console.error('MCP retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve MCP configurations' },
      { status: 500 }
    )
  }
}

// Export GET with rate limiting
export const GET = withRateLimit(getHandler, {
  requests: 200, // Higher limit for read operations
  window: '1h',
})