'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, Eye, Code, FileText } from 'lucide-react'

interface ContextData {
  timestamp: string
  services: Array<{
    name: string
    status: 'active' | 'inactive' | 'error'
    lastSync: string
    itemCount: number
  }>
  summary: {
    totalItems: number
    urgentItems: number
    recentActivity: number
  }
  markdown?: string
}

export function ContextViewer() {
  const { toast } = useToast()
  const [context, setContext] = useState<ContextData | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'summary' | 'markdown' | 'json'>('summary')

  const fetchContext = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/context', {
        cache: 'no-cache',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch context')
      }

      const contextData = await response.json()

      // Convert to our ContextData format
      const formattedContext: ContextData = {
        timestamp: contextData.timestamp,
        services: contextData.services.map((service: any) => ({
          name: service.name,
          status: service.status,
          lastSync: new Date(service.lastSync).toLocaleString(),
          itemCount: service.itemCount,
        })),
        summary: contextData.summary,
        markdown: undefined, // Will be fetched separately if needed
      }

      // Fetch markdown version if needed
      if (viewMode === 'markdown') {
        const markdownResponse = await fetch('/api/context?format=markdown')
        if (markdownResponse.ok) {
          formattedContext.markdown = await markdownResponse.text()
        }
      }

      setContext(formattedContext)
      toast({
        title: 'Context Refreshed',
        description: 'Latest context data has been compiled',
      })
    } catch (error: any) {
      // Fallback to mock data for development
      const mockContext: ContextData = {
        timestamp: new Date().toISOString(),
        services: [
          { name: 'Gmail', status: 'inactive', lastSync: 'Never', itemCount: 0 },
          { name: 'Asana', status: 'inactive', lastSync: 'Never', itemCount: 0 },
          { name: 'Xero', status: 'inactive', lastSync: 'Never', itemCount: 0 },
        ],
        summary: {
          totalItems: 0,
          urgentItems: 0,
          recentActivity: 0,
        },
        markdown: `# Studio Status - ${new Date().toLocaleString()}

## 🚨 Immediate Attention Required
No urgent items

## 📋 Active Projects  
No services connected yet

## 📧 Communications Summary
- 0 unread emails
- 0 urgent items requiring response

*Connect your first service to see real-time context compilation.*`,
      }

      setContext(mockContext)
      toast({
        title: 'Using Demo Data',
        description: 'Connect services to see real context data',
        variant: 'default',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContext()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'error':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Context Viewer
            </CardTitle>
            <CardDescription>
              Real-time aggregated context from your connected services
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'summary' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('summary')}
              >
                Summary
              </Button>
              <Button
                variant={viewMode === 'markdown' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('markdown')}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'json' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('json')}
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={fetchContext} disabled={loading} size="sm" variant="outline">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!context ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading context...
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'summary' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">{context.summary.totalItems}</div>
                    <div className="text-sm text-muted-foreground">Total Items</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {context.summary.urgentItems}
                    </div>
                    <div className="text-sm text-muted-foreground">Urgent</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {context.summary.recentActivity}
                    </div>
                    <div className="text-sm text-muted-foreground">Recent</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Service Status</h4>
                  {context.services.map(service => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                        <span className="font-medium">{service.name}</span>
                        <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {service.itemCount} items • Last sync: {service.lastSync}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {viewMode === 'markdown' && (
              <div className="bg-muted p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{context.markdown}</pre>
              </div>
            )}

            {viewMode === 'json' && (
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{JSON.stringify(context, null, 2)}</pre>
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Last updated: {new Date(context.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
