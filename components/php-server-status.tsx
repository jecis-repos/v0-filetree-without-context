"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Server, Activity, Database, HardDrive, RefreshCw } from "lucide-react"

interface ServerInfo {
  status: "online" | "offline" | "error"
  phpVersion?: string
  serverSoftware?: string
  documentRoot?: string
  serverTime?: string
  extensions?: string[]
  memory?: {
    used: number
    total: number
  }
}

export default function PhpServerStatus() {
  const [serverInfo, setServerInfo] = useState<ServerInfo>({ status: "offline" })
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    checkServerStatus()
    const interval = setInterval(checkServerStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const checkServerStatus = async () => {
    try {
      // Simulate server status check
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Mock server info
      setServerInfo({
        status: "online",
        phpVersion: "8.2.0",
        serverSoftware: "PHP Built-in Server",
        documentRoot: "/var/www/html",
        serverTime: new Date().toISOString(),
        extensions: ["pdo", "mysqli", "gd", "curl", "json", "mbstring"],
        memory: {
          used: 45,
          total: 128,
        },
      })
    } catch (error) {
      setServerInfo({ status: "error" })
    }
  }

  const refreshStatus = async () => {
    setIsRefreshing(true)
    await checkServerStatus()
    setIsRefreshing(false)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            PHP Server Status
          </div>
          <Button size="sm" variant="ghost" onClick={refreshStatus} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>Monitor PHP server health and configuration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-sm">Status:</span>
          <Badge variant={serverInfo.status === "online" ? "default" : "destructive"}>{serverInfo.status}</Badge>
        </div>

        {serverInfo.status === "online" && (
          <>
            {/* Server Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">PHP Version</span>
                <span className="font-mono">{serverInfo.phpVersion}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Server Software</span>
                <span className="font-mono text-xs">{serverInfo.serverSoftware}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Document Root</span>
                <span className="font-mono text-xs">{serverInfo.documentRoot}</span>
              </div>
            </div>

            {/* Memory Usage */}
            {serverInfo.memory && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-sm">Memory Usage</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(serverInfo.memory.used / serverInfo.memory.total) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{serverInfo.memory.used}MB used</span>
                  <span>{serverInfo.memory.total}MB total</span>
                </div>
              </div>
            )}

            {/* PHP Extensions */}
            {serverInfo.extensions && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">Loaded Extensions</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {serverInfo.extensions.map((ext) => (
                    <Badge key={ext} variant="secondary" className="text-xs">
                      {ext}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {serverInfo.status === "offline" && (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>PHP server is offline</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={refreshStatus}>
              Retry Connection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
