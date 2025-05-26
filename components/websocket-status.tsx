"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, Users, Eye, Folder, RefreshCw } from "lucide-react"
import type { WebSocketManager } from "@/lib/websocket/websocket-manager"

interface WebSocketStatusProps {
  wsManager: WebSocketManager
}

export default function WebSocketStatus({ wsManager }: WebSocketStatusProps) {
  const [state, setState] = useState(wsManager.getState())
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const unsubscribe = wsManager.subscribe("state_changed", (newState) => {
      setState(newState)
    })

    const unsubscribeConnection = wsManager.subscribe("connection_changed", (data) => {
      if (data.state === "connecting") {
        setIsReconnecting(true)
      } else {
        setIsReconnecting(false)
      }
    })

    return () => {
      unsubscribe()
      unsubscribeConnection()
    }
  }, [wsManager])

  const handleReconnect = async () => {
    setIsReconnecting(true)
    try {
      await wsManager.initialize()
    } catch (error) {
      console.error("Reconnection failed:", error)
    } finally {
      setIsReconnecting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {state.connected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            WebSocket Status
          </div>
          {!state.connected && (
            <Button size="sm" variant="outline" onClick={handleReconnect} disabled={isReconnecting} className="gap-2">
              {isReconnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isReconnecting ? "Connecting..." : "Reconnect"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Connection:</span>
          <Badge variant={state.connected ? "default" : "destructive"}>
            {state.connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {/* Client ID */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Client ID:</span>
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{state.clientId.slice(-8)}</span>
        </div>

        {/* Active Users */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">Active Users ({state.activeUsers.length})</span>
          </div>
          {state.activeUsers.length > 0 ? (
            <div className="space-y-1">
              {state.activeUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between text-xs">
                  <span>{user.name}</span>
                  <span className="text-muted-foreground">{Math.floor((Date.now() - user.lastSeen) / 1000)}s ago</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No other users online</p>
          )}
        </div>

        {/* Watched Directories */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">Watched Directories ({state.watchedDirectories.size})</span>
          </div>
          {state.watchedDirectories.size > 0 ? (
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {Array.from(state.watchedDirectories).map((dir) => (
                <div key={dir} className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {dir}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No directories being watched</p>
          )}
        </div>

        {/* Open Files */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">Open Files ({state.openFiles.size})</span>
          </div>
          {state.openFiles.size > 0 ? (
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {Array.from(state.openFiles).map((file) => (
                <div key={file} className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {file.split("/").pop()}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No files currently open</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
