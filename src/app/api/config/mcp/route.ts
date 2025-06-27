import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { MCPGenerator, getUserMCPConfigs } from '@/lib/mcp/generator'
import { ConfigQuerySchema } from '@/lib/validations/schemas'
import yaml from 'js-yaml'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)

    // Validate query parameters with Zod
    const queryParams = ConfigQuerySchema.parse({
      format: url.searchParams.get('format'),
      refresh: url.searchParams.get('refresh'),
      validate: url.searchParams.get('validate'),
    })

    const { format, refresh: forceRefresh, validate } = queryParams

    let config

    if (forceRefresh) {
      // Generate fresh configuration
      const generator = new MCPGenerator(user.id)
      config = await generator.generateConfig()

      if (validate) {
        const validation = await generator.validateConfig(config)
        return NextResponse.json({
          config,
          validation,
        })
      }
    } else {
      // Try to get latest cached configuration
      const configs = await getUserMCPConfigs(user.id)
      if (configs.length > 0) {
        config = configs[0].config
      } else {
        // Generate new one if none exist
        const generator = new MCPGenerator(user.id)
        config = await generator.generateConfig()
      }
    }

    // Return in requested format
    if (format === 'yaml') {
      return new NextResponse(yaml.dump(config), {
        headers: {
          'Content-Type': 'application/x-yaml',
          'Content-Disposition': 'attachment; filename="sylo-mcp-config.yaml"',
        },
      })
    } else if (format === 'download') {
      return new NextResponse(JSON.stringify(config, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="sylo-mcp-config.json"',
        },
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('MCP config generation failed:', error)
    return NextResponse.json(
      {
        error: 'CONFIG_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const generator = new MCPGenerator(user.id)
    const config = await generator.generateConfig()

    return NextResponse.json({
      success: true,
      config,
      message: 'MCP configuration generated successfully',
    })
  } catch (error) {
    console.error('MCP config generation failed:', error)
    return NextResponse.json(
      {
        error: 'CONFIG_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const configId = url.searchParams.get('id')

    if (!configId) {
      return NextResponse.json({ error: 'Missing config ID' }, { status: 400 })
    }

    const { deactivateMCPConfig } = await import('@/lib/mcp/generator')
    await deactivateMCPConfig(configId, user.id)

    return NextResponse.json({
      success: true,
      message: 'MCP configuration deactivated',
    })
  } catch (error) {
    console.error('MCP config deactivation failed:', error)
    return NextResponse.json(
      {
        error: 'CONFIG_DEACTIVATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
