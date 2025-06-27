import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock OAuth initiation
  http.get('/api/auth/oauth/initiate/:service', ({ params }) => {
    const { service } = params
    return HttpResponse.json({
      authUrl: `https://mock-${service}.com/oauth/authorize?client_id=test&redirect_uri=http://localhost:3000/api/auth/oauth/callback/${service}`,
      state: 'mock-state-123',
      codeVerifier: 'mock-code-verifier',
    })
  }),

  // Mock OAuth callback
  http.get('/api/auth/oauth/callback/:service', ({ params, request }) => {
    const { service } = params
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    if (!code) {
      return HttpResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    return HttpResponse.json({
      success: true,
      service,
      connectionId: 'mock-connection-123',
    })
  }),

  // Mock user profile
  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      plan: 'free',
      connections: [
        {
          id: 'mock-connection-123',
          service: 'gmail',
          isActive: true,
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          createdAt: new Date().toISOString(),
        },
      ],
    })
  }),

  // Mock MCP config generation
  http.post('/api/mcp/generate', async ({ request }) => {
    const body = (await request.json()) as { services: string[] }

    return HttpResponse.json({
      config: {
        mcpServers: body.services.reduce(
          (acc, service) => {
            acc[service] = {
              command: 'node',
              args: [`./servers/${service}/index.js`],
              env: {
                [`${service.toUpperCase()}_ACCESS_TOKEN`]: '{{ENCRYPTED_TOKEN}}',
              },
            }
            return acc
          },
          {} as Record<string, any>
        ),
      },
      downloadUrl: '/api/mcp/download/mock-config-id',
    })
  }),

  // Mock external API calls (Gmail, Asana, etc.)
  http.get('https://www.googleapis.com/gmail/v1/users/me/profile', () => {
    return HttpResponse.json({
      emailAddress: 'test@gmail.com',
      messagesTotal: 1234,
      threadsTotal: 567,
    })
  }),

  http.get('https://app.asana.com/api/1.0/users/me', () => {
    return HttpResponse.json({
      data: {
        gid: 'mock-asana-user-id',
        name: 'Test User',
        email: 'test@asana.com',
      },
    })
  }),
]
