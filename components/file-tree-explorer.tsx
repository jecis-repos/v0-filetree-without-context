"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Folder, BarChart3, Server, TestTube, Palette, Activity, Cpu, HardDrive, Network } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import LocalTreeExplorer from "./local-tree-explorer"
import ServerDirectoryReader from "./server-directory-reader"
import BenchmarkingPage from "./benchmarking-page"
import TestingDashboard from "./testing-dashboard"
import PhpServerStatus from "./php-server-status"
import SystemMetrics from "./system-metrics"
import type { FileNode } from "@/types/filetree"
import { WebSocketManager } from "@/lib/websocket/websocket-manager"
import WebSocketStatus from "./websocket-status"
import RealTimeFileMonitor from "./real-time-file-monitor"
import CollaborationPanel from "./collaboration-panel"

export default function FileTreeExplorer() {
  const [activeTab, setActiveTab] = useState("local")
  const [tree, setTree] = useState<FileNode | null>(null)
  const [systemStatus, setSystemStatus] = useState({
    phpServer: "offline",
    nodeFs: "online",
    wasmEngine: "loading",
    phpWasm: "loading",
  })
  const [wsManager] = useState(() => new WebSocketManager())
  const [wsInitialized, setWsInitialized] = useState(false)

  useEffect(() => {
    // Initialize system status checks
    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        await wsManager.initialize()
        setWsInitialized(true)
      } catch (error) {
        console.error("Failed to initialize WebSocket:", error)
      }
    }

    initializeWebSocket()

    return () => {
      wsManager.disconnect()
    }
  }, [wsManager])

  const checkSystemStatus = async () => {
    try {
      // Check PHP server
      const phpResponse = await fetch("/api/php-server/status").catch(() => null)
      const phpStatus = phpResponse?.ok ? "online" : "offline"

      // Check Node.js FS access
      const fsResponse = await fetch("/api/fs/status").catch(() => null)
      const fsStatus = fsResponse?.ok ? "online" : "offline"

      setSystemStatus((prev) => ({
        ...prev,
        phpServer: phpStatus,
        nodeFs: fsStatus,
        wasmEngine: "online", // Will be updated by WASM loader
        phpWasm: "online", // Will be updated by PHP-WASM loader
      }))
    } catch (error) {
      console.error("Error checking system status:", error)
    }
  }

  const handleTreeLoaded = (newTree: FileNode) => {
    setTree(newTree)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">FileTree Explorer</h1>
            <p className="text-lg text-muted-foreground">
              Advanced file tree visualization with WebAssembly, PHP-WASM, and comprehensive testing
            </p>
          </div>
          <div className="flex items-center gap-4">
            <SystemMetrics />
            <ThemeToggle />
          </div>
        </div>

        {/* System Status Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                <span className="text-sm">PHP Server:</span>
                <Badge variant={systemStatus.phpServer === "online" ? "default" : "destructive"} className="text-xs">
                  {systemStatus.phpServer}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-sm">Node.js FS:</span>
                <Badge variant={systemStatus.nodeFs === "online" ? "default" : "destructive"} className="text-xs">
                  {systemStatus.nodeFs}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span className="text-sm">WASM Engine:</span>
                <Badge variant={systemStatus.wasmEngine === "online" ? "default" : "secondary"} className="text-xs">
                  {systemStatus.wasmEngine}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                <span className="text-sm">PHP-WASM:</span>
                <Badge variant={systemStatus.phpWasm === "online" ? "default" : "secondary"} className="text-xs">
                  {systemStatus.phpWasm}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="local" className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Local Explorer
            </TabsTrigger>
            <TabsTrigger value="server" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              PHP Server
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Benchmarking
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="themes" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="websocket" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Real-time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="space-y-6">
            <LocalTreeExplorer onTreeLoaded={handleTreeLoaded} />
          </TabsContent>

          <TabsContent value="server" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ServerDirectoryReader onDirectoryLoaded={handleTreeLoaded} />
              </div>
              <div>
                <PhpServerStatus />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="benchmark" className="space-y-6">
            <BenchmarkingPage tree={tree} />
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <TestingDashboard />
          </TabsContent>

          <TabsContent value="themes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Theme Configuration
                </CardTitle>
                <CardDescription>Customize the appearance and behavior of the FileTree Explorer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Color Themes</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button variant="outline" className="h-20 flex flex-col gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded"></div>
                        <span className="text-sm">Default</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded"></div>
                        <span className="text-sm">Forest</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col gap-2">
                        <div className="w-8 h-8 bg-purple-500 rounded"></div>
                        <span className="text-sm">Purple</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col gap-2">
                        <div className="w-8 h-8 bg-orange-500 rounded"></div>
                        <span className="text-sm">Sunset</span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Tree Visualization</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Show file icons</span>
                        <Button variant="outline" size="sm">
                          Toggle
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Compact mode</span>
                        <Button variant="outline" size="sm">
                          Toggle
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Show file sizes</span>
                        <Button variant="outline" size="sm">
                          Toggle
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="websocket" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <WebSocketStatus wsManager={wsManager} />
              </div>
              <div>
                <RealTimeFileMonitor
                  wsManager={wsManager}
                  onFileTreeUpdate={(event) => {
                    console.log("File tree update:", event)
                    // Optionally refresh the tree here
                  }}
                />
              </div>
              <div>
                <CollaborationPanel wsManager={wsManager} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
