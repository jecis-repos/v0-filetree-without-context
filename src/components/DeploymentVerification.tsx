"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield } from "lucide-react"
import type { IntegrityCheckResult } from "../services/IntegrityCheckService"

export const DeploymentVerification: React.FC = () => {
  const [checkResult, setCheckResult] = useState<IntegrityCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runIntegrityCheck = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/deployment/check")

      if (!response.ok) {
        throw new Error(`Integrity check failed with status: ${response.status}`)
      }

      const result = await response.json()
      setCheckResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run integrity check")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runIntegrityCheck()
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
      case "high":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
      case "medium":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "low":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "low":
        return <AlertTriangle className="h-5 w-5 text-blue-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />
    }
  }

  const getOverallStatus = () => {
    if (!checkResult) return null

    if (checkResult.passed) {
      return (
        <Alert className="bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-400">Deployment Verified</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-500">
            All integrity checks have passed. The application is ready for use.
          </AlertDescription>
        </Alert>
      )
    }

    const hasCritical = checkResult.issues.some((i) => i.severity === "critical")

    if (hasCritical) {
      return (
        <Alert className="bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-800 dark:text-red-400">Critical Issues Detected</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-500">
            Critical issues were found that must be resolved before using the application.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <Alert className="bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-400">Issues Detected</AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-500">
          Some issues were found but the application can still function.
        </AlertDescription>
      </Alert>
    )
  }

  const getIssueCount = () => {
    if (!checkResult) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 }

    return {
      critical: checkResult.issues.filter((i) => i.severity === "critical").length,
      high: checkResult.issues.filter((i) => i.severity === "high").length,
      medium: checkResult.issues.filter((i) => i.severity === "medium").length,
      low: checkResult.issues.filter((i) => i.severity === "low").length,
      total: checkResult.issues.length,
    }
  }

  const issueCount = getIssueCount()

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Deployment Verification
        </CardTitle>
        <Button variant="outline" size="sm" onClick={runIntegrityCheck} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Verify
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Running integrity checks...</span>
              <span>Please wait</span>
            </div>
            <Progress value={45} className="h-2" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            {getOverallStatus()}

            {checkResult && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800">
                    Total: {issueCount.total}
                  </Badge>
                  {issueCount.critical > 0 && (
                    <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      Critical: {issueCount.critical}
                    </Badge>
                  )}
                  {issueCount.high > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                    >
                      High: {issueCount.high}
                    </Badge>
                  )}
                  {issueCount.medium > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    >
                      Medium: {issueCount.medium}
                    </Badge>
                  )}
                  {issueCount.low > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      Low: {issueCount.low}
                    </Badge>
                  )}
                </div>

                {checkResult.issues.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h3 className="text-sm font-medium">Issues</h3>
                    <div className="space-y-2">
                      {checkResult.issues.map((issue, index) => (
                        <div key={index} className={`p-3 rounded-md ${getSeverityColor(issue.severity)}`}>
                          <div className="flex items-start">
                            <div className="mr-2 mt-0.5">{getSeverityIcon(issue.severity)}</div>
                            <div>
                              <div className="font-medium">{issue.component}</div>
                              <div>{issue.message}</div>
                              {issue.details && (
                                <div className="mt-1 text-xs font-mono bg-white/20 dark:bg-black/20 p-1 rounded">
                                  {typeof issue.details === "object"
                                    ? JSON.stringify(issue.details, null, 2)
                                    : String(issue.details)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2">
                  Last checked: {new Date(checkResult.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
