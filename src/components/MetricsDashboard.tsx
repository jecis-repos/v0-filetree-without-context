"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import {
  Activity,
  BarChart3,
  Play,
  Pause,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Globe,
  Code,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react"
import type { DIContainer } from "../container/DIContainer"
import type { FileNode } from "../interfaces/IFileSystemProvider"

interface BenchmarkScenario {
  id: string
  name: string
  description: string
  config: {
    outputPaths: string[]
    depth: number
    breadth: number
    fileTypes: string[]
    operations: string[]
    iterations: number
    providers: string[]
    exportFormats: string[]
  }
  collapsed: boolean
  enabled: boolean
  lastRun?: Date
  results?: BenchmarkResult[]
}

interface BenchmarkResult {
  scenarioId: string
  provider: string
  timestamp: Date
  duration: number
  success: boolean
  metrics: {
    totalFiles: number
    totalDirectories: number
    averageResponseTime: number
    memoryUsage: number
    errorRate: number
  }
  operations: {
    operation: string
    averageTime: number
    successRate: number
  }[]
}

interface HealthStatus {
  service: string
  status: "healthy" | "degraded" | "unhealthy" | "unknown"
  lastCheck: Date
  responseTime?: number
  error?: string
  details?: Record<string, any>
}

interface MetricsDashboardProps {
  container: DIContainer
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ container }) => {
  const [scenarios, setScenarios] = useState<BenchmarkScenario[]>([])
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "xml">("json")
  const [apiEndpoint, setApiEndpoint] = useState("/api/metrics")

  // Initialize default scenarios
  useEffect(() => {
    const defaultScenarios: BenchmarkScenario[] = [
      {
        id: "small-project",
        name: "Small Project",
        description: "Typical small web project structure",
        config: {
          outputPaths: ["/src/components", "/src/pages", "/src/utils", "/public", "/package.json", "/README.md"],
          depth: 3,
          breadth: 10,
          fileTypes: ["js", "ts", "jsx", "tsx", "css", "json", "md"],
          operations: ["read", "write", "search"],
          iterations: 5,
          providers: ["Memory", "WASM"],
          exportFormats: ["png", "json"],
        },
        collapsed: true,
        enabled: true,
      },
      {
        id: "large-enterprise",
        name: "Large Enterprise",
        description: "Complex enterprise application structure",
        config: {
          outputPaths: [
            "/apps/frontend/src",
            "/apps/backend/src",
            "/packages/shared",
            "/packages/ui",
            "/docs",
            "/tools",
            "/configs",
          ],
          depth: 6,
          breadth: 25,
          fileTypes: ["js", "ts", "jsx", "tsx", "css", "scss", "json", "md", "yml", "xml"],
          operations: ["read", "write", "delete", "search"],
          iterations: 10,
          providers: ["Memory", "WASM", "IndexedDB"],
          exportFormats: ["png", "svg", "json", "csv"],
        },
        collapsed: true,
        enabled: true,
      },
      {
        id: "deep-nested",
        name: "Deep Nested Structure",
        description: "Testing deep directory nesting performance",
        config: {
          outputPaths: [
            "/level1/level2/level3/level4/level5/level6/level7/level8",
            "/deep/nested/folder/structure/with/many/levels/here",
          ],
          depth: 10,
          breadth: 5,
          fileTypes: ["txt", "log", "json"],
          operations: ["read", "search"],
          iterations: 3,
          providers: ["Memory", "WASM"],
          exportFormats: ["json"],
        },
        collapsed: true,
        enabled: true,
      },
      {
        id: "mixed-content",
        name: "Mixed Content Types",
        description: "Various file types and sizes",
        config: {
          outputPaths: ["/images/photos", "/videos/clips", "/documents/pdfs", "/code/projects", "/data/exports"],
          depth: 4,
          breadth: 15,
          fileTypes: ["png", "jpg", "mp4", "pdf", "js", "ts", "json", "csv", "xml"],
          operations: ["read", "write", "search"],
          iterations: 7,
          providers: ["Memory", "WASM"],
          exportFormats: ["png", "webp", "json"],
        },
        collapsed: true,
        enabled: true,
      },
    ]

    setScenarios(defaultScenarios)
  }, [])

  // Health monitoring
  const checkHealth = useCallback(async () => {
    const services = [
      { name: "PHP-CGI WASM", endpoint: "/api/php/health" },
      { name: "WebAssembly", endpoint: "/api/wasm/health" },
      { name: "Node.js Backend", endpoint: "/api/health" },
      { name: "File System Provider", endpoint: "/api/filesystem/health" },
      { name: "Image Export Service", endpoint: "/api/export/health" },
    ]

    const statuses: HealthStatus[] = []

    for (const service of services) {
      const startTime = performance.now()
      try {
        const response = await fetch(service.endpoint, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        const endTime = performance.now()
        const responseTime = endTime - startTime

        if (response.ok) {
          const data = await response.json()
          statuses.push({
            service: service.name,
            status: data.status || "healthy",
            lastCheck: new Date(),
            responseTime,
            details: data.details,
          })
        } else {
          statuses.push({
            service: service.name,
            status: "unhealthy",
            lastCheck: new Date(),
            responseTime,
            error: `HTTP ${response.status}: ${response.statusText}`,
          })
        }
      } catch (error) {
        statuses.push({
          service: service.name,
          status: "unhealthy",
          lastCheck: new Date(),
          error: error.message,
        })
      }
    }

    setHealthStatuses(statuses)
  }, [])

  // Auto-refresh health checks
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(checkHealth, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, checkHealth])

  // Initial health check
  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  const runBenchmarkScenario = async (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId)
    if (!scenario) return

    setIsRunning(true)
    const logger = container.resolve("ILoggingService")

    try {
      logger.info("Metrics", "Running benchmark scenario", { scenarioId, scenario: scenario.name })

      const benchmarkService = container.resolve("EnhancedBenchmarkService")
      const scenarioResults: BenchmarkResult[] = []

      for (const providerName of scenario.config.providers) {
        // Switch to the provider
        let provider
        if (providerName === "WASM") {
          provider = container.resolve("WasmFileSystemProvider")
        } else {
          provider = container.resolve("IFileSystemProvider")
        }

        // Generate test file tree based on scenario
        const testTree = generateTestFileTree(scenario.config)

        // Run benchmark
        const result = await benchmarkService.runEnhancedBenchmark(provider, {
          breadth: scenario.config.breadth,
          depth: scenario.config.depth,
          fileSize: 1024,
          operations: scenario.config.operations as any,
          iterations: scenario.config.iterations,
          useOptimizedProviders: providerName === "WASM",
          compareProviders: false,
        })

        const benchmarkResult: BenchmarkResult = {
          scenarioId,
          provider: providerName,
          timestamp: new Date(),
          duration: result.totalTime,
          success: true,
          metrics: {
            totalFiles: result.treeStats.totalFiles,
            totalDirectories: result.treeStats.totalDirectories,
            averageResponseTime:
              result.operationResults.reduce((sum, op) => sum + op.averageTime, 0) / result.operationResults.length,
            memoryUsage: result.memoryUsage?.peak || 0,
            errorRate:
              1 - result.operationResults.reduce((sum, op) => sum + op.successRate, 0) / result.operationResults.length,
          },
          operations: result.operationResults,
        }

        scenarioResults.push(benchmarkResult)
      }

      setResults((prev) => [...prev, ...scenarioResults])

      // Update scenario last run
      setScenarios((prev) =>
        prev.map((s) => (s.id === scenarioId ? { ...s, lastRun: new Date(), results: scenarioResults } : s)),
      )

      logger.info("Metrics", "Benchmark scenario completed", {
        scenarioId,
        resultsCount: scenarioResults.length,
      })
    } catch (error) {
      logger.error("Metrics", "Benchmark scenario failed", { scenarioId, error: error.message })
    } finally {
      setIsRunning(false)
    }
  }

  const generateTestFileTree = (config: BenchmarkScenario["config"]): FileNode[] => {
    const nodes: FileNode[] = []

    config.outputPaths.forEach((path, index) => {
      const pathParts = path.split("/").filter(Boolean)
      const name = pathParts[pathParts.length - 1]
      const isFile = config.fileTypes.some((ext) => name.includes(`.${ext}`))

      nodes.push({
        id: `test-${index}`,
        name,
        type: isFile ? "file" : "directory",
        path,
        size: isFile ? Math.floor(Math.random() * 10000) + 1000 : undefined,
        lastModified: new Date(),
        children: isFile ? undefined : [],
      })
    })

    return nodes
  }

  const toggleScenarioCollapse = (scenarioId: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, collapsed: !s.collapsed } : s)))
  }

  const toggleScenarioEnabled = (scenarioId: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, enabled: !s.enabled } : s)))
  }

  const exportResults = () => {
    const data = {
      scenarios,
      results,
      healthStatuses,
      exportedAt: new Date().toISOString(),
      metadata: {
        totalScenarios: scenarios.length,
        enabledScenarios: scenarios.filter((s) => s.enabled).length,
        totalResults: results.length,
        healthyServices: healthStatuses.filter((h) => h.status === "healthy").length,
      },
    }

    let content: string
    let mimeType: string
    let filename: string

    switch (exportFormat) {
      case "csv":
        content = convertToCSV(results)
        mimeType = "text/csv"
        filename = `metrics-${Date.now()}.csv`
        break
      case "xml":
        content = convertToXML(data)
        mimeType = "application/xml"
        filename = `metrics-${Date.now()}.xml`
        break
      default:
        content = JSON.stringify(data, null, 2)
        mimeType = "application/json"
        filename = `metrics-${Date.now()}.json`
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const convertToCSV = (results: BenchmarkResult[]): string => {
    const headers = [
      "Scenario ID",
      "Provider",
      "Timestamp",
      "Duration",
      "Success",
      "Total Files",
      "Total Directories",
      "Average Response Time",
      "Memory Usage",
      "Error Rate",
    ]

    const rows = results.map((result) => [
      result.scenarioId,
      result.provider,
      result.timestamp.toISOString(),
      result.duration,
      result.success,
      result.metrics.totalFiles,
      result.metrics.totalDirectories,
      result.metrics.averageResponseTime,
      result.metrics.memoryUsage,
      result.metrics.errorRate,
    ])

    return [headers, ...rows].map((row) => row.join(",")).join("\n")
  }

  const convertToXML = (data: any): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<metrics>
  <exportedAt>${data.exportedAt}</exportedAt>
  <metadata>
    <totalScenarios>${data.metadata.totalScenarios}</totalScenarios>
    <enabledScenarios>${data.metadata.enabledScenarios}</enabledScenarios>
    <totalResults>${data.metadata.totalResults}</totalResults>
    <healthyServices>${data.metadata.healthyServices}</healthyServices>
  </metadata>
  <scenarios>
    ${data.scenarios
      .map(
        (s: BenchmarkScenario) => `
    <scenario id="${s.id}">
      <name>${s.name}</name>
      <description>${s.description}</description>
      <enabled>${s.enabled}</enabled>
      <lastRun>${s.lastRun?.toISOString() || ""}</lastRun>
    </scenario>`,
      )
      .join("")}
  </scenarios>
  <results>
    ${data.results
      .map(
        (r: BenchmarkResult) => `
    <result>
      <scenarioId>${r.scenarioId}</scenarioId>
      <provider>${r.provider}</provider>
      <timestamp>${r.timestamp.toISOString()}</timestamp>
      <duration>${r.duration}</duration>
      <success>${r.success}</success>
      <metrics>
        <totalFiles>${r.metrics.totalFiles}</totalFiles>
        <totalDirectories>${r.metrics.totalDirectories}</totalDirectories>
        <averageResponseTime>${r.metrics.averageResponseTime}</averageResponseTime>
        <memoryUsage>${r.metrics.memoryUsage}</memoryUsage>
        <errorRate>${r.metrics.errorRate}</errorRate>
      </metrics>
    </result>`,
      )
      .join("")}
  </results>
</metrics>`
  }

  const getStatusIcon = (status: HealthStatus["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "unhealthy":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: HealthStatus["status"]) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "degraded":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "unhealthy":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Activity className="mr-2 h-6 w-6" />
          Metrics Dashboard
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label>Auto-refresh</Label>
            <Input
              type="number"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="w-16"
              min={5}
              max={300}
            />
            <span className="text-sm text-gray-500">sec</span>
          </div>

          <Button variant="outline" onClick={checkHealth}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>

          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xml">XML</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportResults}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="scenarios">Benchmark Scenarios</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="api">API Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthStatuses.map((status) => (
              <Card key={status.service}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center">
                      {getStatusIcon(status.status)}
                      <span className="ml-2">{status.service}</span>
                    </span>
                    <Badge className={getStatusColor(status.status)}>{status.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Check:</span>
                      <span>{status.lastCheck.toLocaleTimeString()}</span>
                    </div>
                    {status.responseTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Response Time:</span>
                        <span>{status.responseTime.toFixed(2)}ms</span>
                      </div>
                    )}
                    {status.error && <div className="text-red-500 text-xs">{status.error}</div>}
                    {status.details && (
                      <div className="text-xs text-gray-500">
                        <details>
                          <summary>Details</summary>
                          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                            {JSON.stringify(status.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Benchmark Scenarios</h3>
            <Button
              onClick={() => scenarios.filter((s) => s.enabled).forEach((s) => runBenchmarkScenario(s.id))}
              disabled={isRunning}
            >
              {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isRunning ? "Running..." : "Run All Enabled"}
            </Button>
          </div>

          <div className="space-y-4">
            {scenarios.map((scenario) => (
              <Card key={scenario.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleScenarioCollapse(scenario.id)}>
                        {scenario.collapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                      <Switch checked={scenario.enabled} onCheckedChange={() => toggleScenarioEnabled(scenario.id)} />
                    </div>
                    <div className="flex items-center space-x-2">
                      {scenario.lastRun && (
                        <Badge variant="outline">Last run: {scenario.lastRun.toLocaleString()}</Badge>
                      )}
                      <Button
                        size="sm"
                        onClick={() => runBenchmarkScenario(scenario.id)}
                        disabled={isRunning || !scenario.enabled}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Run
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{scenario.description}</p>
                </CardHeader>

                {!scenario.collapsed && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Configuration</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Depth:</span> {scenario.config.depth}
                          </div>
                          <div>
                            <span className="font-medium">Breadth:</span> {scenario.config.breadth}
                          </div>
                          <div>
                            <span className="font-medium">Iterations:</span> {scenario.config.iterations}
                          </div>
                          <div>
                            <span className="font-medium">Providers:</span> {scenario.config.providers.join(", ")}
                          </div>
                          <div>
                            <span className="font-medium">Operations:</span> {scenario.config.operations.join(", ")}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Output Paths</h4>
                        <div className="max-h-32 overflow-y-auto">
                          <ul className="text-sm space-y-1">
                            {scenario.config.outputPaths.map((path, index) => (
                              <li
                                key={index}
                                className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                              >
                                {path}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {scenario.results && scenario.results.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Latest Results</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {scenario.results.map((result, index) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                              <div className="font-medium">{result.provider}</div>
                              <div>Duration: {result.duration.toFixed(2)}ms</div>
                              <div>Files: {result.metrics.totalFiles}</div>
                              <div>Success: {result.success ? "✓" : "✗"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Benchmark Results</h3>
            <div className="flex items-center space-x-2">
              <Select value={selectedScenario || "all"} onValueChange={setSelectedScenario}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by scenario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scenarios</SelectItem>
                  {scenarios.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">{results.length} results</Badge>
            </div>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No benchmark results yet</p>
                <p className="text-sm text-gray-400 mt-1">Run some scenarios to see results here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results
                .filter(
                  (result) => !selectedScenario || selectedScenario === "all" || result.scenarioId === selectedScenario,
                )
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((result, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {scenarios.find((s) => s.id === result.scenarioId)?.name || result.scenarioId}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{result.provider}</Badge>
                          <Badge className={result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                          <span className="text-sm text-gray-500">{result.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{result.duration.toFixed(2)}ms</div>
                          <div className="text-sm text-gray-500">Duration</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{result.metrics.totalFiles}</div>
                          <div className="text-sm text-gray-500">Files</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{result.metrics.averageResponseTime.toFixed(2)}ms</div>
                          <div className="text-sm text-gray-500">Avg Response</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{(result.metrics.errorRate * 100).toFixed(1)}%</div>
                          <div className="text-sm text-gray-500">Error Rate</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Operation Performance</h4>
                        <div className="space-y-2">
                          {result.operations.map((op, opIndex) => (
                            <div
                              key={opIndex}
                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                            >
                              <span className="font-medium capitalize">{op.operation}</span>
                              <div className="flex items-center space-x-4">
                                <span className="text-sm">{op.averageTime.toFixed(2)}ms</span>
                                <div className="w-24">
                                  <Progress value={op.successRate * 100} className="h-2" />
                                </div>
                                <span className="text-sm">{(op.successRate * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                Public API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>API Endpoint</Label>
                <Input
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="/api/metrics"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Available Endpoints</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">GET {apiEndpoint}/health</div>
                    <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      GET {apiEndpoint}/scenarios
                    </div>
                    <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      POST {apiEndpoint}/scenarios/run
                    </div>
                    <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">GET {apiEndpoint}/results</div>
                    <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">GET {apiEndpoint}/export</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Documentation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="h-4 w-4 mr-1" />
                      Generate OpenAPI Spec
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <Code className="h-4 w-4 mr-1" />
                      View Examples
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-1" />
                      Export Documentation
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>API Status</AlertTitle>
                <AlertDescription>
                  The public API is currently in development. Health checks and basic endpoints are available. Full REST
                  API with PHP-CGI WASM integration coming soon.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
