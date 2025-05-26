"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface EnvironmentTestResult {
  status: string
  timestamp: string
  urls: {
    baseUrl: string
    apiBaseUrl: string
    constructionSuccess: boolean
  }
  environment: {
    validation: {
      errors: string[]
      warnings: string[]
    }
    variables: Record<string, string>
    config: Record<string, any>
  }
  security: {
    isSecure: boolean
    issues: string[]
    warnings: string[]
  }
  deployment: {
    ready: boolean
    issues: string[]
    warnings: string[]
  }
}

export function EnvironmentTestDashboard() {
  const [testResult, setTestResult] = useState<EnvironmentTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runEnvironmentTest = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/environment/test")
      const data = await response.json()

      if (response.ok) {
        setTestResult(data)
      } else {
        setError(data.message || "Environment test failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run environment test")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runEnvironmentTest()
  }, [])

  const getStatusIcon = (isOk: boolean) => {
    return isOk ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusBadge = (isOk: boolean, label: string) => {
    return (
      <Badge variant={isOk ? "default" : "destructive"} className="ml-2">
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Environment Test Dashboard</h2>
        <Button onClick={runEnvironmentTest} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "Testing..." : "Run Test"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {testResult && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* URL Construction Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {getStatusIcon(testResult.urls.constructionSuccess)}
                <span className="ml-2">URL Construction</span>
                {getStatusBadge(
                  testResult.urls.constructionSuccess,
                  testResult.urls.constructionSuccess ? "PASS" : "FAIL",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Base URL:</strong> {testResult.urls.baseUrl}
                </div>
                <div>
                  <strong>API Base URL:</strong> {testResult.urls.apiBaseUrl}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Validation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {getStatusIcon(testResult.environment.validation.errors.length === 0)}
                <span className="ml-2">Environment Validation</span>
                {getStatusBadge(
                  testResult.environment.validation.errors.length === 0,
                  testResult.environment.validation.errors.length === 0 ? "PASS" : "FAIL",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResult.environment.validation.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-red-600 mb-2">Errors:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {testResult.environment.validation.errors.map((error, index) => (
                      <li key={index} className="text-red-600">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {testResult.environment.validation.warnings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-600 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {testResult.environment.validation.warnings.map((warning, index) => (
                      <li key={index} className="text-yellow-600">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {testResult.environment.validation.errors.length === 0 &&
                testResult.environment.validation.warnings.length === 0 && (
                  <p className="text-green-600 text-sm">All environment variables are properly configured.</p>
                )}
            </CardContent>
          </Card>

          {/* Security Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {getStatusIcon(testResult.security.isSecure)}
                <span className="ml-2">Security Check</span>
                {getStatusBadge(testResult.security.isSecure, testResult.security.isSecure ? "SECURE" : "ISSUES")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResult.security.issues.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-red-600 mb-2">Security Issues:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {testResult.security.issues.map((issue, index) => (
                      <li key={index} className="text-red-600">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {testResult.security.warnings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-600 mb-2">Security Warnings:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {testResult.security.warnings.map((warning, index) => (
                      <li key={index} className="text-yellow-600">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {testResult.security.isSecure && testResult.security.warnings.length === 0 && (
                <p className="text-green-600 text-sm">No security issues detected.</p>
              )}
            </CardContent>
          </Card>

          {/* Deployment Readiness */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {getStatusIcon(testResult.deployment.ready)}
                <span className="ml-2">Deployment Readiness</span>
                {getStatusBadge(testResult.deployment.ready, testResult.deployment.ready ? "READY" : "NOT READY")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResult.deployment.issues.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-red-600 mb-2">Deployment Issues:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {testResult.deployment.issues.map((issue, index) => (
                      <li key={index} className="text-red-600">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {testResult.deployment.warnings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-600 mb-2">Deployment Warnings:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {testResult.deployment.warnings.map((warning, index) => (
                      <li key={index} className="text-yellow-600">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {testResult.deployment.ready && testResult.deployment.warnings.length === 0 && (
                <p className="text-green-600 text-sm">Application is ready for deployment.</p>
              )}
            </CardContent>
          </Card>

          {/* Environment Variables Status */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Environment Variables Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {Object.entries(testResult.environment.variables).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="font-mono">{key}:</span>
                    <Badge variant={value === "SET" ? "default" : value === "NOT_SET" ? "destructive" : "secondary"}>
                      {value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>Test completed at: {new Date(testResult.timestamp).toLocaleString()}</p>
              <p>Status: {testResult.status}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
