"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"
import { HealthMonitoringService } from "@/src/services/HealthMonitoringService"

interface HealthStatus {
  name: string
  status: "healthy" | "unhealthy" | "unknown"
  responseTime: number
  error?: string
  timestamp: number
}

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy"
  services: number
  healthy: number
  unhealthy: number
  details: HealthStatus[]
}

// Add named export to fix deployment error
export function HealthDashboard() {
  const [healthService] = useState(() => new HealthMonitoringService())
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const updateHealthStatus = () => {
    const health = healthService.getSystemHealth()
    setSystemHealth(health)
    setLastUpdated(new Date())
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Force refresh all health checks
    setTimeout(() => {
      updateHealthStatus()
      setIsRefreshing(false)
    }, 1000)
  }

  useEffect(() => {
    // Initial load
    updateHealthStatus()

    // Set up periodic updates
    const interval = setInterval(updateHealthStatus, 10000) // Update every 10 seconds

    return () => {
      clearInterval(interval)
      healthService.destroy()
    }
  }, [healthService])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-200"
      case "degraded":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "unhealthy":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${time}ms`
    return `${(time / 1000).toFixed(2)}s`
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (!systemHealth) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading health status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">System Health</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <Badge className={getStatusColor(systemHealth.status)}>{systemHealth.status.toUpperCase()}</Badge>
            <span className="text-sm text-gray-600">
              {systemHealth.healthy}/{systemHealth.services} services healthy
            </span>
            {lastUpdated && (
              <span className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemHealth.healthy}</div>
              <div className="text-sm text-gray-600">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {systemHealth.services - systemHealth.healthy - systemHealth.unhealthy}
              </div>
              <div className="text-sm text-gray-600">Unknown</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{systemHealth.unhealthy}</div>
              <div className="text-sm text-gray-600">Unhealthy</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Details */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {systemHealth.details.map((service) => (
          <Card key={service.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">{service.name.replace("-", " ")}</CardTitle>
              {getStatusIcon(service.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge className={getStatusColor(service.status)}>{service.status}</Badge>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Response Time:</span>
                    <span className="font-mono">{formatResponseTime(service.responseTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Check:</span>
                    <span className="font-mono">{formatTimestamp(service.timestamp)}</span>
                  </div>
                </div>

                {service.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <div className="flex items-start space-x-1">
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{service.error}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health Alerts */}
      {systemHealth.unhealthy > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Health Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemHealth.details
                .filter((service) => service.status === "unhealthy")
                .map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="font-medium capitalize">{service.name.replace("-", " ")}</span>
                    <span className="text-sm text-red-600">{service.error || "Service unavailable"}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Keep default export for backward compatibility
export default function HealthDashboardComponent() {
  return <HealthDashboard />
}
