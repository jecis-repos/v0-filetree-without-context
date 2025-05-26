"use client"

import { useState, useRef } from "react"
import type { FileNode, FileTreeConfig, PerformanceMetrics } from "../types/filetree"
import { FileTreeService } from "../lib/filetree-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, Folder, Settings, BarChart3 } from "lucide-react"
import TreeExportDialog from "./tree-export-dialog"
import FileContentPreview from "./file-content-preview"

interface LocalTreeExplorerProps {
  onTreeLoaded: (tree: FileNode) => void
}

export default function LocalTreeExplorer({ onTreeLoaded }: LocalTreeExplorerProps) {
  const [tree, setTree] = useState<FileNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<FileTreeConfig>({
    showHidden: false,
    sortBy: "name",
    sortOrder: "asc",
    maxDepth: 10,
    renderEngine: "html",
  })
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [projectPath, setProjectPath] = useState("my-project")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const treeContainerRef = useRef<HTMLDivElement>(null)
  const fileTreeService = useRef(new FileTreeService())

  const generateTree = async () => {
    if (!projectPath.trim()) return

    setLoading(true)
    try {
      const newTree = await fileTreeService.current.generateTree(projectPath, config)
      setTree(newTree)
      onTreeLoaded(newTree)

      if (treeContainerRef.current) {
        const renderMetrics = await fileTreeService.current.renderTree(
          newTree,
          treeContainerRef.current,
          config.renderEngine,
        )
        setMetrics(renderMetrics)

        // Add click event listeners to file items
        if (config.renderEngine === "php-wasm" || config.renderEngine === "html") {
          setTimeout(() => {
            const fileItems = treeContainerRef.current?.querySelectorAll('.tree-item[data-type="file"]')
            fileItems?.forEach((item) => {
              item.addEventListener("click", (e) => {
                e.stopPropagation()
                const path = item.getAttribute("data-path")
                if (path) {
                  setSelectedFile(path)
                }
              })
            })
          }, 100)
        }
      }

      const performanceStats = await fileTreeService.current.getPerformanceStats()
      setStats(performanceStats)
    } catch (error) {
      console.error("Error generating tree:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateRenderEngine = async (engine: string) => {
    setConfig((prev) => ({ ...prev, renderEngine: engine as any }))

    if (tree && treeContainerRef.current) {
      const renderMetrics = await fileTreeService.current.renderTree(tree, treeContainerRef.current, engine)
      setMetrics(renderMetrics)

      // Add click event listeners to file items
      if (engine === "php-wasm" || engine === "html") {
        setTimeout(() => {
          const fileItems = treeContainerRef.current?.querySelectorAll('.tree-item[data-type="file"]')
          fileItems?.forEach((item) => {
            item.addEventListener("click", (e) => {
              e.stopPropagation()
              const path = item.getAttribute("data-path")
              if (path) {
                setSelectedFile(path)
              }
            })
          })
        }, 100)
      }
    }
  }

  return (
    <>
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration
          </CardTitle>
          <CardDescription>Configure the file tree generation and rendering options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-path">Project Path</Label>
              <Input
                id="project-path"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="Enter project path..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="render-engine">Render Engine</Label>
              <Select value={config.renderEngine} onValueChange={updateRenderEngine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML (Interactive)</SelectItem>
                  <SelectItem value="canvas">Canvas (Fast)</SelectItem>
                  <SelectItem value="ascii">ASCII (Text)</SelectItem>
                  <SelectItem value="wasm">WebAssembly (Optimized)</SelectItem>
                  <SelectItem value="php-wasm">PHP-WASM (Server)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort-by">Sort By</Label>
              <Select
                value={config.sortBy}
                onValueChange={(value) => setConfig((prev) => ({ ...prev, sortBy: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                  <SelectItem value="modified">Modified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort-order">Sort Order</Label>
              <Select
                value={config.sortOrder}
                onValueChange={(value) => setConfig((prev) => ({ ...prev, sortOrder: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-hidden"
                checked={config.showHidden}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, showHidden: checked }))}
              />
              <Label htmlFor="show-hidden">Show Hidden Files</Label>
            </div>

            <Button onClick={generateTree} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Tree"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Tree Display */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  File Tree
                  {tree && <Badge variant="secondary">{config.renderEngine.toUpperCase()}</Badge>}
                </CardTitle>
                <CardDescription>Interactive file tree visualization</CardDescription>
              </div>
              {tree && treeContainerRef.current && <TreeExportDialog treeContainer={treeContainerRef.current} />}
            </CardHeader>
            <CardContent className="h-[500px] overflow-auto">
              <div ref={treeContainerRef} className="w-full h-full" style={{ minHeight: "400px" }} />
              {!tree && !loading && (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Click "Generate Tree" to visualize your project structure</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-6">
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Render Time:</span>
                  <Badge variant="outline">{metrics.renderTime.toFixed(2)}ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cache Hits:</span>
                  <Badge variant="outline">{metrics.cacheHits}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cache Misses:</span>
                  <Badge variant="outline">{metrics.cacheMisses}</Badge>
                </div>
                {metrics.wasmLoadTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">WASM Load:</span>
                    <Badge variant="outline">{metrics.wasmLoadTime.toFixed(2)}ms</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>System Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Cache ({stats.cache.type})</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Hits:</span>
                      <span>{stats.cache.hits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Misses:</span>
                      <span>{stats.cache.misses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{stats.cache.size}</span>
                    </div>
                  </div>
                </div>

                {stats.wasm && (
                  <div>
                    <h4 className="font-medium mb-2">WebAssembly</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Nodes:</span>
                        <span>{stats.wasm.nodes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Depth:</span>
                        <span>{stats.wasm.depth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{(stats.wasm.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {selectedFile && <FileContentPreview filePath={selectedFile} onClose={() => setSelectedFile(null)} />}
    </>
  )
}
