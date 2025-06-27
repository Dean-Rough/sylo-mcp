'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react'

interface ServiceConnection {
  id: string
  service: string
  isActive: boolean
  lastUsed: Date
  scopes: string[]
}

const services = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    color: 'bg-red-500',
    description: 'Email management and automation',
  },
  {
    id: 'asana',
    name: 'Asana',
    icon: CheckCircle,
    color: 'bg-purple-500',
    description: 'Project and task management',
  },
  {
    id: 'xero',
    name: 'Xero',
    icon: AlertCircle,
    color: 'bg-blue-500',
    description: 'Financial and accounting data',
  },
]

export function ServiceConnectionPanel() {
  const { toast } = useToast()
  const [connections, setConnections] = useState<ServiceConnection[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/connections')
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (serviceId: string) => {
    setConnecting(serviceId)

    try {
      // Get session token from backend
      const response = await fetch(`/api/auth/oauth/initiate/${serviceId}`, {
        method: 'GET',
      })

      const data = await response.json()
      if (!data.sessionToken) {
        throw new Error(data.error || 'Failed to get session token')
      }

      // Use Nango Connect UI
      const Nango = (await import('@nangohq/frontend')).default
      const nango = new Nango()

      const connect = nango.openConnectUI({
        onEvent: (event: any) => {
          if (event.type === 'close') {
            setConnecting(null)
          } else if (event.type === 'connect') {
            toast({
              title: 'Connection Successful',
              description: `Successfully connected to ${serviceId}`,
            })
            setConnecting(null)
            fetchConnections()
          }
        },
      })

      connect.setSessionToken(data.sessionToken)
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to service',
        variant: 'destructive',
      })
      setConnecting(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Connections</CardTitle>
          <CardDescription>Loading connections...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Connections</CardTitle>
        <CardDescription>
          Connect your productivity tools to enable AI agent access with zero credential exposure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map(service => {
          const connection = connections.find(c => c.service === service.id)
          const isConnected = connection?.isActive
          const Icon = service.icon

          return (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-lg ${service.color} flex items-center justify-center text-white`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold">{service.name}</h4>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                  <div className="mt-1">
                    <Badge variant={isConnected ? 'default' : 'secondary'} className="font-mono">
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleConnect(service.id)}
                disabled={connecting === service.id}
                variant={isConnected ? 'outline' : 'default'}
                size="sm"
                className="font-mono"
              >
                {connecting === service.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : isConnected ? (
                  'Reconnect'
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
