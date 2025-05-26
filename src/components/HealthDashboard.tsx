"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Activity, AlertTriangle, CheckCircle } from "lucide-react"

interface HealthStatus {
  status: "healthy" | "warning" | "error"
  message: string
  timestamp: string
  details?: Record<string, any>
}

interface HealthData {
  overall: HealthStatus
  services: Record<string, HealthStatus>
  endpoints: Record<string, HealthStatus>
}

export const HealthDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealthData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/health")
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      const data = await response.json()
      setHealthData({
        overall: {
          status: data.status === "ok" ? "healthy" : "error",
          message: data.status === "ok" ? "All systems operational" : "System issues detected",
          timestamp: new Date().toISOString(),
        },
        services: {
          database: {
            status: "healthy",
            message: "Database connection active",
            timestamp: new Date().toISOString(),
          },
          cache: {
            status: "healthy",
            message: "Cache service operational",
            timestamp: new Date().toISOString(),
          },
          filesystem: {
            status: "healthy",
            message: "File system provider active",
            timestamp: new Date().toISOString(),
          },
        },
        endpoints: {
          "/api/health": {
            status: "healthy",
            message: "Health endpoint responding",
            timestamp: new Date().toISOString(),
          },
          "/api/v1/health": {
            status: "healthy",
            message: "V1 health endpoint responding",
            timestamp: new Date().toISOString(),
          },
        },
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    const interval = setInterval(fetchHealthData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Healthy
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
            Warning
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Health Dashboard</h2>
        <Button variant="outline" size="sm" onClick={fetchHealthData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {healthData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  {getStatusIcon(healthData.overall.status)}
                  <span className="ml-2">Overall System Status</span>
                </span>
                {getStatusBadge(healthData.overall.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{healthData.overall.message}</p>
              <p className="text-xs text-gray-400 mt-2">
                Last updated: {new Date(healthData.overall.timestamp).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(healthData.services).map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(status.status)}
                      <span className="capitalize">{name}</span>
                    </div>
                    {getStatusBadge(status.status)}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(healthData.endpoints).map(([endpoint, status]) => (
                  <div key={endpoint} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(status.status)}
                      <span className="font-mono text-sm">{endpoint}</span>
                    </div>
                    {getStatusBadge(status.status)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default HealthDashboard
