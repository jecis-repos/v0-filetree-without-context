"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Zap } from "lucide-react"
import type { DIContainer } from "../container/DIContainer"
import type { BenchmarkOptions, BenchmarkResult } from "../services/BenchmarkService"

interface BenchmarkPanelProps {
  container: DIContainer
}

export const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({ container }) => {
  const [options, setOptions] = useState<BenchmarkOptions>({
    breadth: 10,
    depth: 3,
    fileSize: 1024,
    operations: ["read", "write", "search"],
    iterations: 5,
  })

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<BenchmarkResult | null>(null)

  const handleOptionChange = (key: keyof BenchmarkOptions, value: any) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  const handleOperationToggle = (operation: "read" | "write" | "delete" | "search") => {
    setOptions((prev) => {
      const operations = [...prev.operations]
      const index = operations.indexOf(operation)

      if (index === -1) {
        operations.push(operation)
      } else {
        operations.splice(index, 1)
      }

      return { ...prev, operations }
    })
  }

  const runBenchmark = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults(null)

    try {
      const benchmarkService = container.resolve("BenchmarkService")
      const provider = container.resolve("IFileSystemProvider")

      // Update progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 5
          return newProgress > 95 ? 95 : newProgress
        })
      }, 200)

      const result = await benchmarkService.runBenchmark(provider, options)

      clearInterval(progressInterval)
      setProgress(100)
      setResults(result)
    } catch (error) {
      console.error("Benchmark failed:", error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="mr-2 h-5 w-5" />
          File System Benchmark
        </CardTitle>
        <CardDescription>Test the performance of the file system provider with various operations</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="results" disabled={!results}>
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tree Breadth (files per directory)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[options.breadth]}
                    min={1}
                    max={1000}
                    step={1}
                    onValueChange={([value]) => handleOptionChange("breadth", value)}
                    disabled={isRunning}
                    className="flex-grow"
                  />
                  <Input
                    type="number"
                    value={options.breadth}
                    onChange={(e) => handleOptionChange("breadth", Number.parseInt(e.target.value) || 1)}
                    className="w-20"
                    min={1}
                    max={1000}
                    disabled={isRunning}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tree Depth (levels)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[options.depth]}
                    min={1}
                    max={12}
                    step={1}
                    onValueChange={([value]) => handleOptionChange("depth", value)}
                    disabled={isRunning}
                    className="flex-grow"
                  />
                  <Input
                    type="number"
                    value={options.depth}
                    onChange={(e) => handleOptionChange("depth", Number.parseInt(e.target.value) || 1)}
                    className="w-20"
                    min={1}
                    max={12}
                    disabled={isRunning}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>File Size (bytes)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[options.fileSize]}
                    min={1}
                    max={1048576}
                    step={1024}
                    onValueChange={([value]) => handleOptionChange("fileSize", value)}
                    disabled={isRunning}
                    className="flex-grow"
                  />
                  <Input
                    type="number"
                    value={options.fileSize}
                    onChange={(e) => handleOptionChange("fileSize", Number.parseInt(e.target.value) || 1)}
                    className="w-20"
                    min={1}
                    disabled={isRunning}
                  />
                </div>
                <p className="text-xs text-gray-500">{formatBytes(options.fileSize)}</p>
              </div>

              <div className="space-y-2">
                <Label>Iterations</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[options.iterations]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={([value]) => handleOptionChange("iterations", value)}
                    disabled={isRunning}
                    className="flex-grow"
                  />
                  <Input
                    type="number"
                    value={options.iterations}
                    onChange={(e) => handleOptionChange("iterations", Number.parseInt(e.target.value) || 1)}
                    className="w-20"
                    min={1}
                    max={50}
                    disabled={isRunning}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Operations</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="read"
                      checked={options.operations.includes("read")}
                      onCheckedChange={() => handleOperationToggle("read")}
                      disabled={isRunning}
                    />
                    <label htmlFor="read" className="text-sm">
                      Read
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="write"
                      checked={options.operations.includes("write")}
                      onCheckedChange={() => handleOperationToggle("write")}
                      disabled={isRunning}
                    />
                    <label htmlFor="write" className="text-sm">
                      Write
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="delete"
                      checked={options.operations.includes("delete")}
                      onCheckedChange={() => handleOperationToggle("delete")}
                      disabled={isRunning}
                    />
                    <label htmlFor="delete" className="text-sm">
                      Delete
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="search"
                      checked={options.operations.includes("search")}
                      onCheckedChange={() => handleOperationToggle("search")}
                      disabled={isRunning}
                    />
                    <label htmlFor="search" className="text-sm">
                      Search
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              {isRunning ? (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-center text-sm text-gray-500">Running benchmark... {progress}%</p>
                </div>
              ) : (
                <Button onClick={runBenchmark} className="w-full" disabled={options.operations.length === 0}>
                  <Zap className="mr-2 h-4 w-4" />
                  Run Benchmark
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="results" className="py-4">
            {results && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{results.providerName}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{results.totalTime.toFixed(2)} ms</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Operation Results</h3>
                  <div className="space-y-4">
                    {results.operationResults.map((op) => (
                      <Card key={op.operation}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm capitalize">{op.operation}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <span className="text-gray-500">Average Time:</span>
                            <span className="font-medium">{op.averageTime.toFixed(2)} ms</span>
                            <span className="text-gray-500">Min Time:</span>
                            <span className="font-medium">{op.minTime.toFixed(2)} ms</span>
                            <span className="text-gray-500">Max Time:</span>
                            <span className="font-medium">{op.maxTime.toFixed(2)} ms</span>
                            <span className="text-gray-500">Success Rate:</span>
                            <span className="font-medium">{(op.successRate * 100).toFixed(1)}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Tree Statistics</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-gray-500">Total Nodes:</span>
                        <span className="font-medium">{results.treeStats.totalNodes.toLocaleString()}</span>
                        <span className="text-gray-500">Files:</span>
                        <span className="font-medium">{results.treeStats.totalFiles.toLocaleString()}</span>
                        <span className="text-gray-500">Directories:</span>
                        <span className="font-medium">{results.treeStats.totalDirectories.toLocaleString()}</span>
                        <span className="text-gray-500">Max Depth:</span>
                        <span className="font-medium">{results.treeStats.maxDepth}</span>
                        <span className="text-gray-500">Total Size:</span>
                        <span className="font-medium">{formatBytes(results.treeStats.totalSize)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
