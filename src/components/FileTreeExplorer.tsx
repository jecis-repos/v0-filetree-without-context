"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Folder,
  File,
  Search,
  Upload,
  Download,
  Plus,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Terminal,
} from "lucide-react"
import { useTheme } from "../styles/ThemeProvider"
import { FileImportPanel } from "./FileImportPanel"
import { FilePreview } from "./FilePreview"
import { BenchmarkPanel } from "./BenchmarkPanel"
import { ImageExportPanel } from "./ImageExportPanel"
import type { DIContainer } from "../container/DIContainer"
import type { FileNode, FileSystemStats } from "../interfaces/IFileSystemProvider"
import type { LogEntry } from "../services/LoggingService"

interface FileTreeExplorerProps {
  container: DIContainer
}

export const FileTreeExplorer: React.FC<FileTreeExplorerProps> = ({ container }) => {
  const { colorScheme, setColorScheme, mode, setMode } = useTheme()
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [stats, setStats] = useState<FileSystemStats | null>(null)
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<FileNode[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [currentProvider, setCurrentProvider] = useState("Memory")
  const [activeTab, setActiveTab] = useState("explorer")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logFilter, setLogFilter] = useState<string>("all")

  const loadFileTree = useCallback(async () => {
    setLoading(true)
    const logger = container.resolve("ILoggingService")

    try {
      logger.info("UI", "Loading file tree", { provider: currentProvider })

      const fileSystemProvider = container.resolve("IFileSystemProvider")
      await fileSystemProvider.initialize()
      const tree = await fileSystemProvider.getFileTree()
      const fileStats = await fileSystemProvider.getStats()

      setFileTree(tree)
      setStats(fileStats)

      logger.info("UI", "File tree loaded successfully", {
        nodeCount: tree.length,
        totalFiles: fileStats.totalFiles,
        totalDirectories: fileStats.totalDirectories,
      })
    } catch (error) {
      logger.error("UI", "Failed to load file tree", { error: error.message })
      console.error("Failed to load file tree:", error)
    } finally {
      setLoading(false)
    }
  }, [container, currentProvider])

  const refreshLogs = useCallback(() => {
    try {
      const logger = container.resolve("ILoggingService")
      const allLogs = logger.getLogs()

      let filteredLogs = allLogs
      if (logFilter !== "all") {
        filteredLogs = logger.getLogs(logFilter as any)
      }

      setLogs(filteredLogs.slice(-100)) // Show last 100 logs
    } catch (error) {
      console.error("Failed to refresh logs:", error)
    }
  }, [container, logFilter])

  useEffect(() => {
    loadFileTree()
  }, [loadFileTree, currentProvider])

  useEffect(() => {
    refreshLogs()
    const interval = setInterval(refreshLogs, 2000) // Refresh logs every 2 seconds
    return () => clearInterval(interval)
  }, [refreshLogs])

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleNodeClick = (node: FileNode) => {
    const logger = container.resolve("ILoggingService")
    logger.debug("UI", "Node clicked", { path: node.path, type: node.type })

    setSelectedNode(node)

    if (node.type === "directory") {
      toggleNode(node.id)
    }

    // Update current path
    const pathParts = node.path.split("/").filter(Boolean)
    setCurrentPath(pathParts)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const logger = container.resolve("ILoggingService")
    setIsSearching(true)

    try {
      logger.info("UI", "Starting search", { query: searchQuery })

      const fileSystemProvider = container.resolve("IFileSystemProvider")
      const results = await fileSystemProvider.searchFiles({
        query: searchQuery,
        matchCase: false,
        includeContent: true,
      })

      setSearchResults(results)
      setActiveTab("search")

      logger.info("UI", "Search completed", {
        query: searchQuery,
        resultCount: results.length,
      })
    } catch (error) {
      logger.error("UI", "Search failed", { query: searchQuery, error: error.message })
      console.error("Search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleImport = async (nodes: FileNode[]) => {
    const logger = container.resolve("ILoggingService")
    setLoading(true)

    try {
      logger.info("UI", "Starting file tree import", { nodeCount: nodes.length })

      const fileSystemProvider = container.resolve("IFileSystemProvider")
      await fileSystemProvider.importFileTree(nodes)
      await loadFileTree()

      logger.info("UI", "File tree import completed successfully")
    } catch (error) {
      logger.error("UI", "File tree import failed", { error: error.message })
      console.error("Import failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const switchProvider = async (providerType: string) => {
    const logger = container.resolve("ILoggingService")
    logger.info("UI", "Switching provider", { from: currentProvider, to: providerType })

    setCurrentProvider(providerType)
    setSelectedNode(null)
    setExpandedNodes(new Set())
    setSearchResults([])
    setCurrentPath([])

    // Update the DI container to use the new provider
    try {
      if (providerType === "WASM") {
        // Check if WasmFileSystemProvider is available
        if (!container.hasService("WasmFileSystemProvider")) {
          // If not available, dynamically import and register it
          try {
            const { WasmFileSystemProvider } = await import("../providers/WasmFileSystemProvider")
            const performanceMonitor = container.resolve("IPerformanceMonitor")
            const wasmProvider = new WasmFileSystemProvider(performanceMonitor)
            container.registerInstance("WasmFileSystemProvider", wasmProvider)
          } catch (importError) {
            logger.error("UI", "Failed to import WasmFileSystemProvider", { error: importError.message })
            throw new Error(`Failed to import WasmFileSystemProvider: ${importError.message}`)
          }
        }

        // Now try to resolve it
        try {
          const wasmProvider = container.resolve("WasmFileSystemProvider")
          container.registerInstance("IFileSystemProvider", wasmProvider)
          logger.info("UI", "Switched to WASM provider successfully")
        } catch (resolveError) {
          logger.error("UI", "Failed to resolve WasmFileSystemProvider", { error: resolveError.message })
          // Fallback to Memory provider
          switchToMemoryProvider(logger)
        }
      } else if (providerType === "IndexedDB") {
        // Similar pattern for IndexedDB provider
        logger.warn("UI", "IndexedDB provider not fully implemented, falling back to Memory provider")
        switchToMemoryProvider(logger)
      } else {
        // Default to Memory provider
        switchToMemoryProvider(logger)
      }
    } catch (error) {
      logger.error("UI", "Failed to switch provider", { provider: providerType, error: error.message })
      // Always fallback to memory provider on error
      switchToMemoryProvider(logger)
    }
  }

  // Helper function to switch to memory provider
  const switchToMemoryProvider = async (logger) => {
    try {
      // Check if MemoryFileSystemProvider is available
      if (!container.hasService("MemoryFileSystemProvider")) {
        // If not available, dynamically import and register it
        try {
          const { MemoryFileSystemProvider } = await import("../providers/MemoryFileSystemProvider")
          const performanceMonitor = container.resolve("IPerformanceMonitor")
          const memoryProvider = new MemoryFileSystemProvider(performanceMonitor)
          container.registerInstance("MemoryFileSystemProvider", memoryProvider)
        } catch (importError) {
          logger.error("UI", "Failed to import MemoryFileSystemProvider", { error: importError.message })
          throw new Error(`Failed to import MemoryFileSystemProvider: ${importError.message}`)
        }
      }

      // Now try to resolve it
      const memoryProvider = container.resolve("MemoryFileSystemProvider")
      container.registerInstance("IFileSystemProvider", memoryProvider)
      setCurrentProvider("Memory")
      logger.info("UI", "Switched to Memory provider successfully")
    } catch (error) {
      logger.error("UI", "Failed to switch to Memory provider", { error: error.message })
      // At this point, we're out of options
    }
  }

  const clearLogs = () => {
    try {
      const logger = container.resolve("ILoggingService")
      logger.clearLogs()
      setLogs([])
    } catch (error) {
      console.error("Failed to clear logs:", error)
    }
  }

  const exportLogs = () => {
    try {
      const logger = container.resolve("ILoggingService")
      const logsJson = logger.exportLogs()
      const blob = new Blob([logsJson], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `file-explorer-logs-${new Date().toISOString().slice(0, 19)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export logs:", error)
    }
  }

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      setCurrentPath([])
      setSelectedNode(null)
      return
    }

    const newPath = currentPath.slice(0, index + 1)
    setCurrentPath(newPath)

    // Find the node corresponding to this path
    const path = "/" + newPath.join("/")
    const findNode = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node
        if (node.children) {
          const found = findNode(node.children)
          if (found) return found
        }
      }
      return null
    }

    const node = findNode(fileTree)
    if (node) {
      setSelectedNode(node)
      setExpandedNodes(new Set([...expandedNodes, node.id]))
    }
  }

  const renderFileNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 rounded cursor-pointer transition-colors ${
            isSelected
              ? "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/30"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          <div className="mr-2 flex-shrink-0">
            {node.type === "directory" ? (
              <Folder className="h-4 w-4 text-blue-500" />
            ) : node.mimeType?.startsWith("image/") ? (
              <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <img
                  src={node.thumbnailUrl || "/placeholder.svg?height=24&width=24&query=image"}
                  alt=""
                  className="h-4 w-4 object-cover rounded-sm"
                />
              </div>
            ) : (
              <File className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <span className="truncate flex-grow">{node.name}</span>
          {node.size && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{formatBytes(node.size)}</span>}
        </div>
        {node.type === "directory" && hasChildren && isExpanded && (
          <div className="animate-fade-in">{node.children!.map((child) => renderFileNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  const renderSearchResults = () => {
    if (searchResults.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          {isSearching ? "Searching..." : searchQuery ? "No results found" : "Enter a search query"}
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {searchResults.map((node) => (
          <div key={node.id} className="file-tree-item" onClick={() => handleNodeClick(node)}>
            <div className="file-tree-item-icon">
              {node.type === "directory" ? (
                <Folder className="h-4 w-4 text-blue-500" />
              ) : (
                <File className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="file-tree-item-name">{node.name}</span>
              <span className="text-xs text-gray-500">{node.path}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderBreadcrumbs = () => {
    return (
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        <button
          className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          onClick={() => navigateToBreadcrumb(-1)}
        >
          <Folder className="h-3 w-3 mr-1" />
          root
        </button>

        {currentPath.map((part, index) => (
          <span key={index}>
            <span className="mx-2 text-gray-400 dark:text-gray-600">
              <ChevronRight className="h-3 w-3" />
            </span>
            <button
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              onClick={() => navigateToBreadcrumb(index)}
            >
              {part}
            </button>
          </span>
        ))}
      </div>
    )
  }

  const renderLogs = () => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Logs</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warn">Warnings</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{logs.length} entries</Badge>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px] border rounded p-2">
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded font-mono ${
                  log.level === "error"
                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    : log.level === "warn"
                      ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                      : log.level === "info"
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    [{log.category}] {log.message}
                  </span>
                  <span className="text-xs opacity-70">{log.timestamp.toLocaleTimeString()}</span>
                </div>
                {log.data && (
                  <div className="mt-1 text-xs opacity-80">
                    {typeof log.data === "object" ? JSON.stringify(log.data, null, 2) : log.data}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Enterprise File Explorer</h1>

        <div className="flex flex-wrap items-center gap-2">
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

          <Select value={colorScheme} onValueChange={setColorScheme}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blue">Blue Theme</SelectItem>
              <SelectItem value="purple">Purple Theme</SelectItem>
              <SelectItem value="green">Green Theme</SelectItem>
              <SelectItem value="orange">Orange Theme</SelectItem>
              <SelectItem value="neutral">Neutral Theme</SelectItem>
            </SelectContent>
          </Select>

          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light Mode</SelectItem>
              <SelectItem value="dark">Dark Mode</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={loadFileTree} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>File Explorer</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button variant="outline" size="icon" onClick={handleSearch} disabled={isSearching}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mx-4">
                <TabsTrigger value="explorer">Explorer</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
              </TabsList>

              <CardContent className="p-0">
                <div className="px-2 py-1">{renderBreadcrumbs()}</div>

                <Separator />

                <div className="h-[400px] overflow-y-auto p-2">
                  <TabsContent value="explorer" className="m-0">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="spinner h-8 w-8"></div>
                      </div>
                    ) : fileTree.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Folder className="h-12 w-12 text-gray-300 mb-2" />
                        <p className="text-gray-500">No files found</p>
                        <p className="text-xs text-gray-400 mt-1">Import files or create a new directory</p>
                      </div>
                    ) : (
                      <div className="file-tree">{fileTree.map((node) => renderFileNode(node))}</div>
                    )}
                  </TabsContent>

                  <TabsContent value="search" className="m-0">
                    {renderSearchResults()}
                  </TabsContent>
                </div>
              </CardContent>
            </Tabs>
          </Card>

          <FileImportPanel container={container} onImportComplete={handleImport} />
        </div>

        <div className="md:col-span-2 space-y-6">
          <FilePreview file={selectedNode} container={container} />

          <Tabs defaultValue="stats">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="stats">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    File System Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Files:</span>
                          <Badge variant="outline">{stats.totalFiles}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Directories:</span>
                          <Badge variant="outline">{stats.totalDirectories}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Size:</span>
                          <Badge variant="outline">{formatBytes(stats.totalSize)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Max Depth:</span>
                          <Badge variant="outline">{stats.maxDepth}</Badge>
                        </div>
                        {stats.averageFileSize !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Average File Size:</span>
                            <Badge variant="outline">{formatBytes(stats.averageFileSize)}</Badge>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {stats.fileTypes && Object.keys(stats.fileTypes).length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium">File Types</h3>
                            <div className="space-y-1">
                              {Object.entries(stats.fileTypes)
                                .sort(([, a], [, b]) => b - a)
                                .map(([type, count]) => (
                                  <div key={type} className="flex justify-between items-center">
                                    <span className="text-xs uppercase">{type || "unknown"}</span>
                                    <Badge variant="secondary">{count}</Badge>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {stats.largestFile && (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium">Largest File</h3>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                              <p className="font-medium text-sm">{stats.largestFile.name}</p>
                              <p className="text-xs text-gray-500">{stats.largestFile.path}</p>
                              <p className="text-xs text-gray-500">{formatBytes(stats.largestFile.size || 0)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">No statistics available</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="benchmark">
              <BenchmarkPanel container={container} />
            </TabsContent>

            <TabsContent value="export">
              <ImageExportPanel fileTree={fileTree} container={container} />
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="mr-2 h-5 w-5" />
                    System Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderLogs()}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
