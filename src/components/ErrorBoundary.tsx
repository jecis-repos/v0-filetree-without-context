"use client"

import type React from "react"
import { Component, type ErrorInfo, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Send } from "lucide-react"
import { errorTracker } from "../services/ErrorTrackingService"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  component?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = errorTracker.captureError(error, {
      type: "runtime",
      severity: "high",
      component: this.props.component || "ErrorBoundary",
      action: "component_error",
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    })

    this.setState({
      errorId,
      errorInfo,
    })

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined, errorInfo: undefined })
  }

  handleDelegate = () => {
    if (this.state.errorId) {
      errorTracker.delegateError(this.state.errorId, "User requested delegation from error boundary", "high")
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="m-4 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-600">
              <p className="font-medium">Error Details:</p>
              <p className="mt-1 font-mono text-xs bg-red-100 p-2 rounded">
                {this.state.error?.message || "Unknown error occurred"}
              </p>
              {this.state.errorId && <p className="mt-2 text-xs text-gray-600">Error ID: {this.state.errorId}</p>}
            </div>

            <div className="flex gap-2">
              <Button onClick={this.handleRetry} variant="outline" size="sm" className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-1" />
                Try Again
              </Button>

              <Button onClick={this.handleDelegate} variant="outline" size="sm" className="flex items-center">
                <Send className="h-4 w-4 mr-1" />
                Report Issue
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-xs text-gray-600 cursor-pointer">Developer Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {this.state.error?.stack}
                  {"\n\nComponent Stack:"}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}
