"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TestTube, Play, CheckCircle, XCircle, AlertCircle, FileCode, Zap, Shield } from "lucide-react"

interface TestResult {
  name: string
  status: "pending" | "running" | "passed" | "failed" | "skipped"
  duration?: number
  error?: string
}

interface TestSuite {
  name: string
  tests: TestResult[]
}

export default function TestingDashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    {
      name: "Unit Tests",
      tests: [
        { name: "FileTreeService.generateTree", status: "pending" },
        { name: "CacheFactory.createCache", status: "pending" },
        { name: "HTMLRenderer.render", status: "pending" },
        { name: "WASMLoader.initialize", status: "pending" },
      ],
    },
    {
      name: "Integration Tests",
      tests: [
        { name: "File tree generation with caching", status: "pending" },
        { name: "Renderer switching", status: "pending" },
        { name: "PHP-WASM integration", status: "pending" },
        { name: "Export functionality", status: "pending" },
      ],
    },
    {
      name: "E2E Tests",
      tests: [
        { name: "Complete file tree workflow", status: "pending" },
        { name: "Server directory reading", status: "pending" },
        { name: "Performance benchmarking", status: "pending" },
      ],
    },
  ])

  const runTests = async () => {
    setIsRunning(true)

    for (let suiteIdx = 0; suiteIdx < testSuites.length; suiteIdx++) {
      const suite = testSuites[suiteIdx]

      for (let testIdx = 0; testIdx < suite.tests.length; testIdx++) {
        // Update test status to running
        setTestSuites((prev) => {
          const newSuites = [...prev]
          newSuites[suiteIdx].tests[testIdx].status = "running"
          return newSuites
        })

        // Simulate test execution
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500))

        // Random test result
        const passed = Math.random() > 0.2
        const duration = Math.random() * 100 + 50

        setTestSuites((prev) => {
          const newSuites = [...prev]
          newSuites[suiteIdx].tests[testIdx] = {
            ...newSuites[suiteIdx].tests[testIdx],
            status: passed ? "passed" : "failed",
            duration,
            error: passed ? undefined : "Assertion failed: expected true to be false",
          }
          return newSuites
        })
      }
    }

    setIsRunning(false)
  }

  const getTestStats = () => {
    const allTests = testSuites.flatMap((suite) => suite.tests)
    return {
      total: allTests.length,
      passed: allTests.filter((t) => t.status === "passed").length,
      failed: allTests.filter((t) => t.status === "failed").length,
      pending: allTests.filter((t) => t.status === "pending").length,
      running: allTests.filter((t) => t.status === "running").length,
    }
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "running":
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case "skipped":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
    }
  }

  const stats = getTestStats()
  const progress = ((stats.passed + stats.failed) / stats.total) * 100

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Testing Dashboard
          </CardTitle>
          <CardDescription>Run and monitor unit, integration, and E2E tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Controls and Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button onClick={runTests} disabled={isRunning} className="gap-2">
                  <Play className="w-4 h-4" />
                  {isRunning ? "Running Tests..." : "Run All Tests"}
                </Button>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{stats.passed}</p>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>

            {/* Progress */}
            {(isRunning || progress > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Test Progress</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Test Suites */}
            <Tabs defaultValue="unit" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="unit" className="gap-2">
                  <FileCode className="w-4 h-4" />
                  Unit Tests
                </TabsTrigger>
                <TabsTrigger value="integration" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Integration
                </TabsTrigger>
                <TabsTrigger value="e2e" className="gap-2">
                  <Shield className="w-4 h-4" />
                  E2E Tests
                </TabsTrigger>
              </TabsList>

              {testSuites.map((suite, idx) => (
                <TabsContent
                  key={idx}
                  value={idx === 0 ? "unit" : idx === 1 ? "integration" : "e2e"}
                  className="space-y-4"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{suite.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {suite.tests.map((test, testIdx) => (
                          <div key={testIdx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(test.status)}
                              <span className="font-mono text-sm">{test.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {test.duration && (
                                <span className="text-sm text-muted-foreground">{test.duration.toFixed(0)}ms</span>
                              )}
                              {test.error && (
                                <Badge variant="destructive" className="text-xs">
                                  Error
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
