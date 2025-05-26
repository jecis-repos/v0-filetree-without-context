"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Globe, Shield, Activity, Settings } from "lucide-react"

interface SystemValidationResult {
  timestamp: string
  status: "healthy" | "warning" | "error"
  summary: {
    urlConstruction: boolean
    environmentValidation: boolean
    securityCheck: boolean
    healthEndpoints: boolean
    deploymentReady: boolean
  }
  details: {
    urls: {
      baseUrl: string
      apiBaseUrl: string
      constructionMethod: string
    }
    environment: {
      nodeEnv: string
      hasRequiredVars: boolean
      errors: string[]
      warnings: string[]
    }
    security: {
      isSecure: boolean
      issues: string[]
      warnings: string[]
    }
    healthChecks: {
      simple: boolean
      main: boolean
      filesystem: boolean
      deployment: boolean
    }
  }
  recommendations: string[]
}

export function SystemStatusDashboard() {
  const [validationResult, setValidationResult] = useState<SystemValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSystemValidation = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/system/validate")
      const data = await response.json()

      if (response.ok || data.status) {
        setValidationResult(data)
      } else {
        setError(data.message || "System validation failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run system validation")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSystemValidation()
  }, [])

  const getStatusIcon = (status: boolean | string) => {
    if (typeof status === "boolean") {
      return status ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
    }

    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: boolean | string, trueLabel = "PASS", falseLabel = "FAIL") => {
    if (typeof status === "boolean") {
      return (
        <Badge variant={status ? "default" : "destructive"} className="ml-2">
          {status ? trueLabel : falseLabel}
        </Badge>
      )
    }

    const variant = status === "healthy" ? "default" : status === "warning" ? "secondary" : "destructive"
    return (
      <Badge variant={variant} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    )
  }

  const calculateOverallProgress = () => {
    if (!validationResult) return 0

    const checks = [
      validationResult.summary.urlConstruction,
      validationResult.summary.environmentValidation,
      validationResult.summary.securityCheck,
      validationResult.summary.healthEndpoints,
    ]

    const passedChecks = checks.filter(Boolean).length
    return (passedChecks / checks.length) * 100
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">System Status Dashboard</h2>
          <p className="text-gray-600 mt-1">Comprehensive system validation and deployment readiness check</p>
        </div>
        <Button onClick={runSystemValidation} disabled={loading} size="lg">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "Validating..." : "Run Validation"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 font-medium">Validation Error</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {validationResult && (
        <>
          {/* Overall Status */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(validationResult.status)}
                  <span className="ml-2">Overall System Status</span>
                  {getStatusBadge(validationResult.status)}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Deployment Ready</div>
                  <div className="text-lg font-bold">
                    {validationResult.summary.deploymentReady ? "✅ YES" : "❌ NO"}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>System Health</span>
                    <span>{Math.round(calculateOverallProgress())}%</span>
                  </div>
                  <Progress value={calculateOverallProgress()} className="h-2" />
                </div>
                <div className="text-sm text-gray-600">
                  Last checked: {new Date(validationResult.timestamp).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Checks */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* URL Construction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  URL Construction
                  {getStatusBadge(validationResult.summary.urlConstruction)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Base URL:</strong>
                    <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                      {validationResult.details.urls.baseUrl}
                    </div>
                  </div>
                  <div>
                    <strong>API Base URL:</strong>
                    <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                      {validationResult.details.urls.apiBaseUrl}
                    </div>
                  </div>
                  <div>
                    <strong>Construction Method:</strong> {validationResult.details.urls.constructionMethod}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Environment Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Environment
                  {getStatusBadge(validationResult.summary.environmentValidation)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Node Environment:</strong> {validationResult.details.environment.nodeEnv}
                  </div>
                  {validationResult.details.environment.errors.length > 0 && (
                    <div>
                      <strong className="text-red-600">Errors:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {validationResult.details.environment.errors.map((error, index) => (
                          <li key={index} className="text-red-600 text-xs">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.details.environment.warnings.length > 0 && (
                    <div>
                      <strong className="text-yellow-600">Warnings:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {validationResult.details.environment.warnings.map((warning, index) => (
                          <li key={index} className="text-yellow-600 text-xs">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.details.environment.errors.length === 0 &&
                    validationResult.details.environment.warnings.length === 0 && (
                      <p className="text-green-600">All environment variables properly configured</p>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Security Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security
                  {getStatusBadge(validationResult.summary.securityCheck, "SECURE", "ISSUES")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {validationResult.details.security.issues.length > 0 && (
                    <div>
                      <strong className="text-red-600">Security Issues:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {validationResult.details.security.issues.map((issue, index) => (
                          <li key={index} className="text-red-600 text-xs">
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.details.security.warnings.length > 0 && (
                    <div>
                      <strong className="text-yellow-600">Security Warnings:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {validationResult.details.security.warnings.map((warning, index) => (
                          <li key={index} className="text-yellow-600 text-xs">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.details.security.isSecure &&
                    validationResult.details.security.warnings.length === 0 && (
                      <p className="text-green-600">No security issues detected</p>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Health Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Health Endpoints
                  {getStatusBadge(validationResult.summary.healthEndpoints)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {Object.entries(validationResult.details.healthChecks).map(([endpoint, status]) => (
                    <div key={endpoint} className="flex items-center justify-between">
                      <span className="capitalize">{endpoint}:</span>
                      <div className="flex items-center">
                        {getStatusIcon(status)}
                        <span className="ml-2 text-xs">{status ? "OK" : "FAIL"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {validationResult.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {validationResult.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
