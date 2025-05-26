"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, FileText, FolderPlus, Trash2, Edit, Plus } from "lucide-react"
import type { WebSocketManager, FileSystemEvent } from "@/lib/websocket/websocket-manager"

interface FileEvent {
  id: string
  type: FileSystemEvent["type"]
  path: string
  timestamp: number
  metadata?: FileSystemEvent["metadata"]
}

interface RealTimeFileMonitorProps {
  wsManager: WebSocketManager
  onFileTreeUpdate?: (event: FileSystemEvent) => void
}

export default function RealTimeFileMonitor({ wsManager, onFileTreeUpdate }: RealTimeFileMonitorProps) {
  const [events, setEvents] = useState<FileEvent[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [watchedPath, setWatchedPath] = useState("/")

  useEffect(() => {
    const unsubscribeFileSystem = wsManager.subscribe("file_system_event", (event: FileSystemEvent) => {
      const fileEvent: FileEvent = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: event.type,
        path: event.path,
        timestamp: Date.now(),
        metadata: event.metadata,
      }

      setEvents((prev) => [fileEvent, ...prev.slice(0, 49)]) // Keep last 50 events

      if (onFileTreeUpdate) {
        onFileTreeUpdate(event)
      }
    })

    const unsubscribeTreeChanged = wsManager.subscribe("file_tree_changed", (event: FileSystemEvent) => {
      console.log("File tree changed:", event)
      // This could trigger a tree refresh in the parent component
    })

    return () => {
      unsubscribeFileSystem()
      unsubscribeTreeChanged()
    }
  }, [wsManager, onFileTreeUpdate])

  const startMonitoring = () => {
    if (wsManager.isConnected()) {
      wsManager.watchDirectory(watchedPath)
      setIsMonitoring(true)
    }
  }

  const stopMonitoring = () => {
    wsManager.unwatchDirectory(watchedPath)
    setIsMonitoring(false)
  }

  const clearEvents = () => {
    setEvents([])
  }

  const getEventIcon = (type: FileSystemEvent["type"]) => {
    switch (type) {
      case "file_created":
        return <Plus className="w-4 h-4 text-green-500" />
      case "file_modified":
        return <Edit className="w-4 h-4 text-blue-500" />
      case "file_deleted":
        return <Trash2 className="w-4 h-4 text-red-500" />
      case "directory_created":
        return <FolderPlus className="w-4 h-4 text-green-500" />
      case "directory_deleted":
        return <Trash2 className="w-4 h-4 text-red-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getEventBadge = (type: FileSystemEvent["type"]) => {
    const variants = {
      file_created: "default",
      file_modified: "secondary",
      file_deleted: "destructive",
      directory_created: "default",
      directory_deleted: "destructive",
    } as const

    return (
      <Badge variant={variants[type] || "outline"} className="text-xs">
        {type.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) {
      return `${Math.floor(diff / 1000)}s ago`
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`
    } else {
      return new Date(timestamp).toLocaleTimeString()
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Real-time File Monitor
        </CardTitle>
        <CardDescription>Monitor file system changes in real-time via WebSocket</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            disabled={!wsManager.isConnected()}
            variant={isMonitoring ? "destructive" : "default"}
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          <Button size="sm" variant="outline" onClick={clearEvents}>
            Clear Events
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status:</span>
          <Badge variant={isMonitoring ? "default" : "secondary"}>{isMonitoring ? "Monitoring" : "Stopped"}</Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Watching:</span>
          <span className="font-mono text-xs">{watchedPath}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Events:</span>
          <span>{events.length}</span>
        </div>

        {/* Events List */}
        <ScrollArea className="h-64 w-full">
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No file system events yet</p>
                {!isMonitoring && <p className="text-xs">Start monitoring to see real-time changes</p>}
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">{getEventIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getEventBadge(event.type)}
                      <span className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                    </div>
                    <p className="text-sm font-mono truncate" title={event.path}>
                      {event.path}
                    </p>
                    {event.metadata && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {event.metadata.size && <span>Size: {(event.metadata.size / 1024).toFixed(1)} KB</span>}
                        {event.metadata.modified && (
                          <span className="ml-2">
                            Modified: {new Date(event.metadata.modified).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
