"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Folder, File, HardDrive, Database, Zap, BarChart3 } from "lucide-react"
import { useFileSystem } from "../hooks/useFileSystem"
import type { FileEntry } from "../types/interfaces"

export default function FileTreeExplorer() {
  const {
    files,
    currentPath,
    loading,
    error,
    currentProvider,
    loadDirectory,
    switchProvider,
    calculateDirectorySize,
    getPerformanceMetrics,
    getCacheStats,
  } = useFileSystem()

  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [directorySize, setDirectorySize] = useState<number | null>(null)
  const [showMetrics, setShowMetrics] = useState(false)

  const handleFileClick = async (file: FileEntry) => {
    setSelectedFile(file)

    if (file.type === "directory") {
      await loadDirectory(file.path)
      const size = await calculateDirectorySize(file.path)
      setDirectorySize(size)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  const performanceMetrics = getPerformanceMetrics()
  const cacheStats = getCacheStats()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-6 w-6" />
                Enterprise File System Explorer
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {currentProvider === "wasmProvider" ? "WASM" : "Memory"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setShowMetrics(!showMetrics)}>
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Metrics
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Provider:</span>
              <Button
                variant={currentProvider === "wasmProvider" ? "default" : "outline"}
                size="sm"
                onClick={() => switchProvider("wasmProvider")}
                disabled={loading}
              >
                WASM
              </Button>
              <Button
                variant={currentProvider === "memoryProvider" ? "default" : "outline"}
                size="sm"
                onClick={() => switchProvider("memoryProvider")}
                disabled={loading}
              >
                Memory
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              Current Path: <code className="bg-gray-100 px-2 py-1 rounded">{currentPath}</code>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Panel */}
        {showMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Operations:</span>
                    <span>{performanceMetrics.totalOperations}</span>
                  </div>
                  {Object.entries(performanceMetrics.averages).map(([operation, avg]) => (
                    <div key={operation} className="flex justify-between">
                      <span>{operation} (avg):</span>
                      <span>{avg.toFixed(2)}ms</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cache Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cache Hits:</span>
                    <span>{cacheStats.hits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Misses:</span>
                    <span>{cacheStats.misses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <span>
                      {cacheStats.hits + cacheStats.misses > 0
                        ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Size:</span>
                    <span>
                      {cacheStats.size} / {cacheStats.maxSize}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Evictions:</span>
                    <span>{cacheStats.evictions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Tree */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>File Tree</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {error && <div className="text-red-600 text-center py-8">Error: {error}</div>}

              {!loading && !error && (
                <div className="space-y-1">
                  {currentPath !== "/" && (
                    <div
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => {
                        const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/"
                        loadDirectory(parentPath)
                      }}
                    >
                      <Folder className="h-4 w-4 text-blue-600" />
                      <span>..</span>
                    </div>
                  )}

                  {files.map((file) => (
                    <div
                      key={file.path}
                      className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer ${
                        selectedFile?.path === file.path ? "bg-blue-50 border border-blue-200" : ""
                      }`}
                      onClick={() => handleFileClick(file)}
                    >
                      {file.type === "directory" ? (
                        <Folder className="h-4 w-4 text-blue-600" />
                      ) : (
                        <File className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="flex-1">{file.name}</span>
                      <span className="text-sm text-gray-500">{formatBytes(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Details */}
          <Card>
            <CardHeader>
              <CardTitle>File Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFile ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {selectedFile.type === "directory" ? (
                        <Folder className="h-4 w-4 text-blue-600" />
                      ) : (
                        <File className="h-4 w-4 text-gray-600" />
                      )}
                      {selectedFile.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedFile.path}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <Badge variant="outline">{selectedFile.type}</Badge>
                    </div>

                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{formatBytes(selectedFile.size)}</span>
                    </div>

                    {directorySize !== null && selectedFile.type === "directory" && (
                      <div className="flex justify-between">
                        <span>Total Size:</span>
                        <span>{formatBytes(directorySize)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Modified:</span>
                      <span className="text-sm">{formatDate(selectedFile.lastModified)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Select a file or directory to view details</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
