"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, Clock, RefreshCw, Activity } from "lucide-react"
import type { ApiVerificationReport } from "@/src/services/ApiVerificationService"

interface ApiVerificationDashboardProps {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ApiVerificationDashboard({
  autoRefresh = false,
  refreshInterval = 30000,
}: ApiVerificationDashboardProps) {
  const [report, setReport] = useState<ApiVerificationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchVerificationReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/verification/endpoints")
      const data = await response.json()

      if (data.success) {
        setReport(data.report)
        setLastUpdate(new Date())
      } else {
        setError(data.message || "Failed to fetch verification report")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVerificationReport()
  }, [])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchVerificationReport, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "timeout":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: "default",
      fail: "destructive",
      error: "destructive",
      timeout: "secondary",
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status.toUpperCase()}</Badge>
  }

  const getSuccessRate = () => {
    if (!report) return 0
    return Math.round((report.summary.passed / report.summary.total) * 100)
  }

  if (loading && !report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading API Verification...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error && !report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Verification Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchVerificationReport} className="mt-4">
            Retry Verification
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Endpoint Verification</h2>
          <p className="text-muted-foreground">Comprehensive testing of all API endpoints</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-sm text-muted-foreground">Last updated: {lastUpdate.toLocaleTimeString()}</span>
          )}
          <Button onClick={fetchVerificationReport} disabled={loading} size="sm">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{getSuccessRate()}%</div>
                <Progress value={getSuccessRate()} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.averageResponseTime}ms</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {report.summary.failed + report.summary.errors + report.summary.timeouts}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categories Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Categories Overview</CardTitle>
              <CardDescription>Endpoint status by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(report.categories).map(([category, stats]) => (
                  <div key={category} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">{category}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span>{stats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Passed:</span>
                        <span>{stats.passed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Failed:</span>
                        <span>{stats.failed}</span>
                      </div>
                    </div>
                    <Progress value={(stats.passed / stats.total) * 100} className="mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
              <CardDescription>Individual endpoint test results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="font-medium">
                          {result.method} {result.endpoint}
                        </div>
                        <div className="text-sm text-muted-foreground">{result.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{result.category}</Badge>
                      {getStatusBadge(result.status)}
                      <div className="text-sm text-muted-foreground">{result.responseTime}ms</div>
                      {result.actualStatus && <Badge variant="outline">{result.actualStatus}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Suggested actions based on test results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.recommendations.map((recommendation, index) => (
                    <Alert key={index}>
                      <Activity className="h-4 w-4" />
                      <AlertDescription>{recommendation}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
