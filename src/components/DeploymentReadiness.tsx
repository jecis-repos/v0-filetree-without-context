"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Rocket, Monitor, Shield, Globe, Activity } from "lucide-react"

interface DeploymentReadinessReport {
  timestamp: string
  deploymentReady: boolean
  overallStatus: "ready" | "warning" | "not-ready"
  checklist: {
    environmentVariables: { status: "pass" | "fail"; details: string[] }
    urlConfiguration: { status: "pass" | "fail"; baseUrl: string; apiBaseUrl: string; method: string }
    securityValidation: { status: "pass" | "fail"; issues: string[]; warnings: string[] }
    healthEndpoints: { status: "pass" | "fail"; workingEndpoints: number; totalEndpoints: number }
    performanceOptimization: { status: "pass" | "warning"; recommendations: string[] }
  }
  deploymentInstructions: string[]
  postDeploymentSteps: string[]
  monitoringRecommendations: string[]
}

export function DeploymentReadiness() {
  const [report, setReport] = useState<DeploymentReadinessReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runFinalCheck = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/deployment/final-check")
      const data = await response.json()

      if (response.ok) {
        setReport(data)
      } else {
        setError(data.message || "Final check failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run final check")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runFinalCheck()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
      case "ready":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "fail":
      case "not-ready":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variant =
      status === "pass" || status === "ready" ? "default" : status === "warning" ? "secondary" : "destructive"
    return (
      <Badge variant={variant} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center">
            <Rocket className="h-8 w-8 mr-3" />
            Deployment Readiness
          </h2>
          <p className="text-gray-600 mt-1">Final check before production deployment</p>
        </div>
        <Button onClick={runFinalCheck} disabled={loading} size="lg">
          {loading ? "Checking..." : "Run Final Check"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 font-medium">Check Failed</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Overall Status */}
          <Card
            className={`border-2 ${report.deploymentReady ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(report.overallStatus)}
                  <span className="ml-2">Deployment Status</span>
                  {getStatusBadge(report.overallStatus)}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {report.deploymentReady ? "🚀 READY TO DEPLOY" : "⚠️ NOT READY"}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Last checked: {new Date(report.timestamp).toLocaleString()}</div>
            </CardContent>
          </Card>

          {/* Deployment Checklist */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Environment & URLs
                  {getStatusBadge(
                    report.checklist.environmentVariables.status === "pass" &&
                      report.checklist.urlConfiguration.status === "pass"
                      ? "pass"
                      : "fail",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong>Environment Variables:</strong> {getStatusIcon(report.checklist.environmentVariables.status)}
                </div>
                <div>
                  <strong>URL Configuration:</strong> {getStatusIcon(report.checklist.urlConfiguration.status)}
                  <div className="text-xs text-gray-600 mt-1">Method: {report.checklist.urlConfiguration.method}</div>
                </div>
                {report.checklist.environmentVariables.details.map((detail, index) => (
                  <div key={index} className="text-xs">
                    {detail}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security & Health
                  {getStatusBadge(
                    report.checklist.securityValidation.status === "pass" &&
                      report.checklist.healthEndpoints.status === "pass"
                      ? "pass"
                      : "fail",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong>Security Validation:</strong> {getStatusIcon(report.checklist.securityValidation.status)}
                </div>
                <div>
                  <strong>Health Endpoints:</strong> {getStatusIcon(report.checklist.healthEndpoints.status)}
                  <div className="text-xs text-gray-600 mt-1">
                    {report.checklist.healthEndpoints.workingEndpoints}/
                    {report.checklist.healthEndpoints.totalEndpoints} endpoints working
                  </div>
                </div>
                {report.checklist.securityValidation.issues.map((issue, index) => (
                  <div key={index} className="text-xs text-red-600">
                    ❌ {issue}
                  </div>
                ))}
                {report.checklist.securityValidation.warnings.map((warning, index) => (
                  <div key={index} className="text-xs text-yellow-600">
                    ⚠️ {warning}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deployment Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {report.deploymentInstructions.map((instruction, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Post-Deployment Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {report.postDeploymentSteps.map((step, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monitoring Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {report.monitoringRecommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Monitor className="h-3 w-3 mt-2 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Deploy Button */}
          {report.deploymentReady && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6 text-center">
                <div className="space-y-4">
                  <div className="text-2xl font-bold text-green-800">🎉 Ready for Production!</div>
                  <p className="text-green-700">
                    Your application has passed all deployment checks and is ready to go live.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button size="lg" className="bg-green-600 hover:bg-green-700">
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy to Production
                    </Button>
                    <Button variant="outline" size="lg">
                      <Activity className="h-4 w-4 mr-2" />
                      Monitor Health
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
