"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, BarChart3, Clock, Cpu, HardDrive } from "lucide-react"

interface MetricsData {
  performance: {
    responseTime: number
    throughput: number
    errorRate: number
  }
  system: {
    memoryUsage: number
    cpuUsage: number
    diskUsage: number
  }
  cache: {
    hitRate: number
    missRate: number
    size: number
  }
}

export const MetricsDashboard: React.FC = () => {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate metrics data for now
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setMetricsData({
        performance: {
          responseTime: Math.random() * 100 + 50,
          throughput: Math.random() * 1000 + 500,
          errorRate: Math.random() * 5,
        },
        system: {
          memoryUsage: Math.random() * 80 + 10,
          cpuUsage: Math.random() * 60 + 20,
          diskUsage: Math.random() * 70 + 15,
        },
        cache: {
          hitRate: Math.random() * 30 + 70,
          missRate: Math.random() * 30 + 5,
          size: Math.random() * 100 + 50,
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
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const formatNumber = (num: number, decimals = 1) => {
    return num.toFixed(decimals)
  }

  const getPerformanceBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Good
        </Badge>
      )
    } else if (value <= thresholds.warning) {
      return (
        <Badge variant="default" className="bg-yellow-100 text-yellow-800">
          Warning
        </Badge>
      )
    } else {
      return <Badge variant="destructive">Critical</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance Metrics</h2>
        <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {metricsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Response Time</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.performance.responseTime)}ms</span>
                  {getPerformanceBadge(metricsData.performance.responseTime, { good: 100, warning: 200 })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Throughput</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.performance.throughput, 0)}/s</span>
                  {getPerformanceBadge(1000 - metricsData.performance.throughput, { good: 200, warning: 400 })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Error Rate</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.performance.errorRate)}%</span>
                  {getPerformanceBadge(metricsData.performance.errorRate, { good: 1, warning: 5 })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="mr-2 h-5 w-5" />
                System Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Memory Usage</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.system.memoryUsage)}%</span>
                  {getPerformanceBadge(metricsData.system.memoryUsage, { good: 70, warning: 85 })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>CPU Usage</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.system.cpuUsage)}%</span>
                  {getPerformanceBadge(metricsData.system.cpuUsage, { good: 60, warning: 80 })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Disk Usage</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.system.diskUsage)}%</span>
                  {getPerformanceBadge(metricsData.system.diskUsage, { good: 70, warning: 85 })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="mr-2 h-5 w-5" />
                Cache Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Hit Rate</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.cache.hitRate)}%</span>
                  {getPerformanceBadge(100 - metricsData.cache.hitRate, { good: 20, warning: 40 })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Miss Rate</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.cache.missRate)}%</span>
                  {getPerformanceBadge(metricsData.cache.missRate, { good: 20, warning: 40 })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Cache Size</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatNumber(metricsData.cache.size)}MB</span>
                  <Badge variant="outline">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default MetricsDashboard
