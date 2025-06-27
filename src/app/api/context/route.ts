import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { ContextCompiler } from '@/lib/context/compiler'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    const type = url.searchParams.get('type') || 'full'

    const compiler = new ContextCompiler(user.id)

    let data
    switch (type) {
      case 'markdown':
        data = await compiler.generateMarkdown()
        return new NextResponse(data, {
          headers: { 'Content-Type': 'text/markdown' },
        })
      case 'full':
      default:
        data = await compiler.compileProjectContext()
        break
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Context compilation failed:', error)
    return NextResponse.json(
      {
        error: 'CONTEXT_COMPILATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
