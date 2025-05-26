"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Folder, File, Activity, Database, Zap, BarChart3 } from "lucide-react"
import type { DIContainer } from "../container/DIContainer"
import type { FileNode, FileSystemStats } from "../interfaces/IFileSystemProvider"
import type { CacheStats } from "../interfaces/ICacheService"
import type { PerformanceMetric } from "../interfaces/IPerformanceMonitor"

interface FileTreeExplorerProps {
  container: DIContainer
}

export const FileTreeExplorer: React.FC<FileTreeExplorerProps> = ({ container }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [stats, setStats] = useState<FileSystemStats | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [currentProvider, setCurrentProvider] = useState("Memory")
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const loadFileTree = useCallback(async () => {
    setLoading(true)
    try {
      const fileSystemProvider = container.resolve("IFileSystemProvider")
      const cacheService = container.resolve("ICacheService")
      const performanceMonitor = container.resolve("IPerformanceMonitor")

      await fileSystemProvider.initialize()
      const tree = await fileSystemProvider.getFileTree()
      const fileStats = await fileSystemProvider.getStats()

      setFileTree(tree)
      setStats(fileStats)
      setCacheStats(cacheService.getStats())
      setPerformanceMetrics(performanceMonitor.getMetrics().slice(-10)) // Last 10 metrics
    } catch (error) {
      console.error("Failed to load file tree:", error)
    } finally {
      setLoading(false)
    }
  }, [container])

  useEffect(() => {
    loadFileTree()
  }, [loadFileTree])

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const switchProvider = async (providerType: string) => {
    setCurrentProvider(providerType)
    // In a real implementation, you would reconfigure the container here
    await loadFileTree()
  }

  const renderFileNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer rounded`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {node.type === "directory" ? (
            <Folder className="w-4 h-4 mr-2 text-blue-500" />
          ) : (
            <File className="w-4 h-4 mr-2 text-gray-500" />
          )}
          <span className="text-sm">{node.name}</span>
          {node.size && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {formatBytes(node.size)}
            </Badge>
          )}
        </div>
        {hasChildren && isExpanded && <div>{node.children!.map((child) => renderFileNode(child, depth + 1))}</div>}
      </div>
    )
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getAveragePerformance = (operation: string): number => {
    const operationMetrics = performanceMetrics.filter((m) => m.operation.includes(operation))
    if (operationMetrics.length === 0) return 0
    return operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Enterprise File Tree Explorer</h1>
        <div className="flex items-center space-x-4">
          <Select value={currentProvider} onValueChange={switchProvider}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Memory">Memory Provider</SelectItem>
              <SelectItem value="WASM">WASM Provider</SelectItem>
              <SelectItem value="IndexedDB">IndexedDB Provider</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadFileTree} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Tree */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              File System ({currentProvider})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border rounded">
                {fileTree.map((node) => renderFileNode(node))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                File System Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Files:</span>
                    <Badge>{stats.totalFiles}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Directories:</span>
                    <Badge>{stats.totalDirectories}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Size:</span>
                    <Badge>{formatBytes(stats.totalSize)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Depth:</span>
                    <Badge>{stats.maxDepth}</Badge>
                  </div>
                  {stats.largestFile && (
                    <div className="pt-2 border-t">
                      <div className="text-sm font-medium">Largest File:</div>
                      <div className="text-xs text-gray-600">{stats.largestFile.name}</div>
                      <div className="text-xs text-gray-600">{formatBytes(stats.largestFile.size || 0)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">No stats available</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Cache Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cacheStats ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <Badge variant={cacheStats.hitRate > 0.8 ? "default" : "secondary"}>
                      {(cacheStats.hitRate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Size:</span>
                    <Badge>{cacheStats.size}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Hits:</span>
                    <Badge variant="outline">{cacheStats.hits}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Misses:</span>
                    <Badge variant="outline">{cacheStats.misses}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Evictions:</span>
                    <Badge variant="outline">{cacheStats.evictions}</Badge>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">No cache stats available</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Avg Initialize:</span>
                  <Badge>{getAveragePerformance("initialize").toFixed(1)}ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Avg Get Tree:</span>
                  <Badge>{getAveragePerformance("get_file_tree").toFixed(1)}ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Avg Get Stats:</span>
                  <Badge>{getAveragePerformance("get_stats").toFixed(1)}ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Operations:</span>
                  <Badge variant="outline">{performanceMetrics.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
