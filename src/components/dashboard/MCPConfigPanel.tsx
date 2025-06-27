'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Download, RefreshCw, FileCode, Copy } from 'lucide-react'

export function MCPConfigPanel() {
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)

  const generateConfig = async () => {
    setGenerating(true)

    try {
      const response = await fetch('/api/config/mcp')
      const data = await response.json()

      if (response.ok) {
        setConfig(data)
        setLastGenerated(new Date())
        toast({
          title: 'Configuration Generated',
          description: 'MCP configuration has been successfully generated.',
        })
      } else {
        throw new Error(data.error || 'Failed to generate configuration')
      }
    } catch (error: any) {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate MCP configuration',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const downloadConfig = (format: 'json' | 'yaml') => {
    if (!config) return

    const content =
      format === 'json' ? JSON.stringify(config, null, 2) : 'YAML export not implemented yet' // TODO: Add YAML conversion

    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sylo-mcp-config.${format}`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Config Downloaded',
      description: `Configuration downloaded as ${format.toUpperCase()}`,
    })
  }

  const copyToClipboard = () => {
    if (!config) return

    const content = JSON.stringify(config, null, 2)
    navigator.clipboard.writeText(content)

    toast({
      title: 'Copied to Clipboard',
      description: 'MCP configuration copied to clipboard',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          MCP Configuration
        </CardTitle>
        <CardDescription>
          Generate Model Context Protocol configs for your AI agents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Current Configuration</h4>
            <p className="text-sm text-muted-foreground">
              {config ? (
                <>
                  Generated {lastGenerated?.toLocaleString()} •
                  <Badge variant="outline" className="ml-2">
                    {config.services?.length || 0} services
                  </Badge>
                </>
              ) : (
                'No configuration generated yet'
              )}
            </p>
          </div>
          <Button onClick={generateConfig} disabled={generating} size="sm" className="font-mono">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>

        {config && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">Export Options</h4>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => downloadConfig('json')} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button onClick={() => downloadConfig('yaml')} variant="outline" size="sm" disabled>
                <Download className="mr-2 h-4 w-4" />
                YAML
              </Button>
              <Button onClick={copyToClipboard} variant="outline" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        )}

        {config && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Configuration Preview</h4>
            <div className="bg-muted p-3 rounded text-sm font-mono max-h-32 overflow-y-auto">
              <pre>{JSON.stringify(config, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
