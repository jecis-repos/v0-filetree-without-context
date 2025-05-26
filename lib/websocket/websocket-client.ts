export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
  clientId?: string
}

export interface FileSystemEvent {
  type: "file_created" | "file_modified" | "file_deleted" | "directory_created" | "directory_deleted"
  path: string
  metadata?: {
    size?: number
    modified?: string
    isDirectory?: boolean
  }
}

export interface CollaborationEvent {
  type: "user_joined" | "user_left" | "file_opened" | "file_closed" | "cursor_moved"
  userId: string
  userName?: string
  filePath?: string
  position?: { line: number; column: number }
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private clientId: string
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private connectionState: "connecting" | "connected" | "disconnected" | "error" = "disconnected"

  constructor() {
    this.clientId = this.generateClientId()
  }

  connect(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = url || this.getWebSocketUrl()
        this.ws = new WebSocket(wsUrl)
        this.connectionState = "connecting"

        this.ws.onopen = () => {
          console.log("WebSocket connected")
          this.connectionState = "connected"
          this.reconnectAttempts = 0

          // Send initial handshake
          this.send("client_handshake", {
            clientId: this.clientId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
          })

          this.emit("connection_state_changed", { state: "connected" })
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error("Error parsing WebSocket message:", error)
          }
        }

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason)
          this.connectionState = "disconnected"
          this.emit("connection_state_changed", { state: "disconnected" })

          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error)
          this.connectionState = "error"
          this.emit("connection_state_changed", { state: "error" })
          reject(error)
        }
      } catch (error) {
        this.connectionState = "error"
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Client disconnect")
      this.ws = null
    }
    this.connectionState = "disconnected"
  }

  send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: Date.now(),
        clientId: this.clientId,
      }
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("WebSocket not connected, message not sent:", type)
    }
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(eventType)
        }
      }
    }
  }

  getConnectionState(): string {
    return this.connectionState
  }

  getClientId(): string {
    return this.clientId
  }

  // File system monitoring methods
  watchDirectory(path: string): void {
    this.send("watch_directory", { path })
  }

  unwatchDirectory(path: string): void {
    this.send("unwatch_directory", { path })
  }

  // Collaboration methods
  joinRoom(roomId: string, userName?: string): void {
    this.send("join_room", { roomId, userName })
  }

  leaveRoom(roomId: string): void {
    this.send("leave_room", { roomId })
  }

  openFile(filePath: string): void {
    this.send("file_opened", { filePath })
  }

  closeFile(filePath: string): void {
    this.send("file_closed", { filePath })
  }

  private handleMessage(message: WebSocketMessage): void {
    const { type, payload } = message

    switch (type) {
      case "file_system_event":
        this.emit("file_system_change", payload as FileSystemEvent)
        break
      case "collaboration_event":
        this.emit("collaboration_update", payload as CollaborationEvent)
        break
      case "server_stats":
        this.emit("server_stats_update", payload)
        break
      case "error":
        this.emit("error", payload)
        break
      default:
        this.emit(type, payload)
        break
    }
  }

  private emit(eventType: string, data: any): void {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${eventType}:`, error)
        }
      })
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)

    setTimeout(() => {
      if (this.connectionState !== "connected") {
        this.connect().catch((error) => {
          console.error("Reconnect failed:", error)
        })
      }
    }, delay)
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    return `${protocol}//${host}/ws`
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateMockTree(basePath: string, depth: number): any[] {
    if (depth <= 0) return []

    const items = [
      { name: "README.md", type: "file", path: `${basePath}/README.md`, size: 1024 },
      { name: "package.json", type: "file", path: `${basePath}/package.json`, size: 512 },
      {
        name: "src",
        type: "directory",
        path: `${basePath}/src`,
        children: depth > 1 ? this.generateMockTree(`${basePath}/src`, depth - 1) : [],
      },
      {
        name: "docs",
        type: "directory",
        path: `${basePath}/docs`,
        children: depth > 1 ? [{ name: "guide.md", type: "file", path: `${basePath}/docs/guide.md`, size: 2048 }] : [],
      },
    ]

    return items
  }
}
