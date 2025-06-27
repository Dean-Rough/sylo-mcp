'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ errorInfo })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service (Sentry, etc.)
      this.logErrorToService(error, errorInfo)
    }
  }

  private logErrorToService(error: Error, errorInfo: any) {
    // This would integrate with your error tracking service
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(err => console.error('Failed to log error:', err))
    } catch (logError) {
      console.error('Failed to log error to service:', logError)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-lg">Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We&apos;ve encountered an unexpected error. Our team has been notified and is
                working on a fix.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted p-3 rounded-md text-sm font-mono">
                  <div className="text-destructive font-medium mb-1">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {this.state.error.stack?.split('\n').slice(0, 3).join('\n')}
                  </div>
                </div>
              )}
              <div className="flex space-x-2">
                <Button onClick={this.handleRetry} variant="default" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Simplified hook-based error boundary for specific components
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    console.error('Error handled:', error, errorInfo)

    if (process.env.NODE_ENV === 'production') {
      // Log to error service
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(err => console.error('Failed to log error:', err))
    }
  }
}
