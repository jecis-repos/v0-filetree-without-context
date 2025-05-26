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
import { Folder, File, Search, Upload, Download, Plus, RefreshCw, ChevronRight, BarChart3 } from "lucide-react"
import { useTheme } from "../styles/ThemeProvider"
import { FileImportPanel } from "./FileImportPanel"
import { FilePreview } from "./FilePreview"
import { BenchmarkPanel } from "./BenchmarkPanel"
import type { DIContainer } from "../container/DIContainer"
import type { FileNode, FileSystemStats } from "../interfaces/IFileSystemProvider"

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

  const loadFileTree = useCallback(async () => {
    setLoading(true)
    try {
      const fileSystemProvider = container.resolve("IFileSystemProvider")
      await fileSystemProvider.initialize()
      const tree = await fileSystemProvider.getFileTree()
      const fileStats = await fileSystemProvider.getStats()

      setFileTree(tree)
      setStats(fileStats)
    } catch (error) {
      console.error("Failed to load file tree:", error)
    } finally {
      setLoading(false)
    }
  }, [container])

  useEffect(() => {
    loadFileTree()
  }, [loadFileTree, currentProvider])

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

    setIsSearching(true)
    try {
      const fileSystemProvider = container.resolve("IFileSystemProvider")
      const results = await fileSystemProvider.searchFiles({
        query: searchQuery,
        matchCase: false,
        includeContent: true,
      })
      setSearchResults(results)
      setActiveTab("search")
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleImport = async (nodes: FileNode[]) => {
    setLoading(true)
    try {
      const fileSystemProvider = container.resolve("IFileSystemProvider")
      await fileSystemProvider.importFileTree(nodes)
      await loadFileTree()
    } catch (error) {
      console.error("Import failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const switchProvider = async (providerType: string) => {
    setCurrentProvider(providerType)
    setSelectedNode(null)
    setExpandedNodes(new Set())
    setSearchResults([])
    setCurrentPath([])
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
          className={`file-tree-item ${isSelected ? "file-tree-item-selected" : ""}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          <div className="file-tree-item-icon">
            {node.type === "directory" ? (
              <Folder className="h-4 w-4 text-blue-500" />
            ) : node.mimeType?.startsWith("image/") ? (
              <div className="file-icon file-icon-image">
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
          <span className="file-tree-item-name">{node.name}</span>
          {node.size && <span className="file-tree-item-meta">{formatBytes(node.size)}</span>}
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
      <div className="breadcrumb">
        <button className="breadcrumb-item flex items-center" onClick={() => navigateToBreadcrumb(-1)}>
          <Folder className="h-3 w-3 mr-1" />
          root
        </button>

        {currentPath.map((part, index) => (
          <span key={index}>
            <span className="breadcrumb-separator">
              <ChevronRight className="h-3 w-3" />
            </span>
            <button className="breadcrumb-item" onClick={() => navigateToBreadcrumb(index)}>
              {part}
            </button>
          </span>
        ))}
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
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
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
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
