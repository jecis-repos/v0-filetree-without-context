"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Play, Pause, RotateCcw, Download } from "lucide-react"
import type { FileNode } from "@/types/filetree"

interface BenchmarkingPageProps {
  tree: FileNode | null
}

interface BenchmarkResult {
  engine: string
  renderTime: number
  memoryUsage: number
  nodeCount: number
  status: "pending" | "running" | "completed" | "failed"
}

export default function BenchmarkingPage({ tree }: BenchmarkingPageProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentEngine, setCurrentEngine] = useState("")
  const [iterations, setIterations] = useState("10")
  const [results, setResults] = useState<BenchmarkResult[]>([
    { engine: "HTML", renderTime: 0, memoryUsage: 0, nodeCount: 0, status: "pending" },
    { engine: "Canvas", renderTime: 0, memoryUsage: 0, nodeCount: 0, status: "pending" },
    { engine: "ASCII", renderTime: 0, memoryUsage: 0, nodeCount: 0, status: "pending" },
    { engine: "WebAssembly", renderTime: 0, memoryUsage: 0, nodeCount: 0, status: "pending" },
    { engine: "PHP-WASM", renderTime: 0, memoryUsage: 0, nodeCount: 0, status: "pending" },
  ])

  const runBenchmarks = async () => {
    if (!tree) {
      alert("Please generate a file tree first")
      return
    }

    setIsRunning(true)
    const engines = ["html", "canvas", "ascii", "wasm", "php-wasm"]

    for (let i = 0; i < engines.length; i++) {
      const engine = engines[i]
      setCurrentEngine(engine)

      // Update status to running
      setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "running" } : r)))

      // Simulate benchmark run
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate mock results
      const result = {
        engine: engine.toUpperCase(),
        renderTime: Math.random() * 100 + 20,
        memoryUsage: Math.random() * 50 + 10,
        nodeCount: Math.floor(Math.random() * 1000) + 100,
        status: "completed" as const,
      }

      setResults((prev) => prev.map((r, idx) => (idx === i ? result : r)))
    }

    setIsRunning(false)
    setCurrentEngine("")
  }

  const resetBenchmarks = () => {
    setResults(results.map((r) => ({ ...r, renderTime: 0, memoryUsage: 0, nodeCount: 0, status: "pending" })))
  }

  const exportResults = () => {
    const csv = [
      ["Engine", "Render Time (ms)", "Memory Usage (MB)", "Node Count"],
      ...results.map((r) => [r.engine, r.renderTime.toFixed(2), r.memoryUsage.toFixed(2), r.nodeCount]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "benchmark-results.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: BenchmarkResult["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "running":
        return <Badge variant="default">Running</Badge>
      case "completed":
        return <Badge variant="default">Completed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Benchmarking
          </CardTitle>
          <CardDescription>Compare rendering performance across different engines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center gap-4">
              <Select value={iterations} onValueChange={setIterations}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 iteration</SelectItem>
                  <SelectItem value="5">5 iterations</SelectItem>
                  <SelectItem value="10">10 iterations</SelectItem>
                  <SelectItem value="25">25 iterations</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={runBenchmarks} disabled={isRunning || !tree} className="gap-2">
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Benchmarks
                  </>
                )}
              </Button>

              <Button onClick={resetBenchmarks} variant="outline" disabled={isRunning} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>

              <Button
                onClick={exportResults}
                variant="outline"
                disabled={isRunning || results.every((r) => r.status === "pending")}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {/* Progress */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Testing {currentEngine}...</span>
                  <span>
                    {results.filter((r) => r.status === "completed").length} / {results.length}
                  </span>
                </div>
                <Progress value={(results.filter((r) => r.status === "completed").length / results.length) * 100} />
              </div>
            )}

            {/* Results Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4">Engine</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Render Time</th>
                    <th className="text-right p-4">Memory Usage</th>
                    <th className="text-right p-4">Node Count</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-4 font-medium">{result.engine}</td>
                      <td className="p-4">{getStatusBadge(result.status)}</td>
                      <td className="p-4 text-right">
                        {result.status === "completed" ? `${result.renderTime.toFixed(2)} ms` : "-"}
                      </td>
                      <td className="p-4 text-right">
                        {result.status === "completed" ? `${result.memoryUsage.toFixed(2)} MB` : "-"}
                      </td>
                      <td className="p-4 text-right">{result.status === "completed" ? result.nodeCount : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            {results.some((r) => r.status === "completed") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Fastest Engine</p>
                      <p className="font-semibold">
                        {results.filter((r) => r.status === "completed").sort((a, b) => a.renderTime - b.renderTime)[0]
                          ?.engine || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Most Memory Efficient</p>
                      <p className="font-semibold">
                        {results
                          .filter((r) => r.status === "completed")
                          .sort((a, b) => a.memoryUsage - b.memoryUsage)[0]?.engine || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Average Render Time</p>
                      <p className="font-semibold">
                        {results.filter((r) => r.status === "completed").length > 0
                          ? `${(
                              results
                                .filter((r) => r.status === "completed")
                                .reduce((sum, r) => sum + r.renderTime, 0) /
                                results.filter((r) => r.status === "completed").length
                            ).toFixed(2)} ms`
                          : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
