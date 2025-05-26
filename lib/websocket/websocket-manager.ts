import { WebSocketClient, type FileSystemEvent, type CollaborationEvent } from "./websocket-client"

export interface WebSocketState {
  connected: boolean
  clientId: string
  activeUsers: Array<{
    id: string
    name: string
    lastSeen: number
  }>
  watchedDirectories: Set<string>
  openFiles: Set<string>
}

export class WebSocketManager {
  private client: WebSocketClient
  private state: WebSocketState
  private callbacks: Map<string, Set<(data: any) => void>> = new Map()

  constructor() {
    this.client = new WebSocketClient()
    this.state = {
      connected: false,
      clientId: this.client.getClientId(),
      activeUsers: [],
      watchedDirectories: new Set(),
      openFiles: new Set(),
    }

    this.setupEventListeners()
  }

  async initialize(): Promise<void> {
    try {
      await this.client.connect()
      this.state.connected = true
      this.emit("state_changed", this.state)
    } catch (error) {
      console.error("Failed to initialize WebSocket connection:", error)
      throw error
    }
  }

  disconnect(): void {
    this.client.disconnect()
    this.state.connected = false
    this.state.activeUsers = []
    this.state.watchedDirectories.clear()
    this.state.openFiles.clear()
    this.emit("state_changed", this.state)
  }

  // File system monitoring
  watchDirectory(path: string): void {
    if (!this.state.watchedDirectories.has(path)) {
      this.client.watchDirectory(path)
      this.state.watchedDirectories.add(path)
      this.emit("directory_watched", { path })
    }
  }

  unwatchDirectory(path: string): void {
    if (this.state.watchedDirectories.has(path)) {
      this.client.unwatchDirectory(path)
      this.state.watchedDirectories.delete(path)
      this.emit("directory_unwatched", { path })
    }
  }

  // File operations
  openFile(filePath: string): void {
    if (!this.state.openFiles.has(filePath)) {
      this.client.openFile(filePath)
      this.state.openFiles.add(filePath)
      this.emit("file_opened", { filePath })
    }
  }

  closeFile(filePath: string): void {
    if (this.state.openFiles.has(filePath)) {
      this.client.closeFile(filePath)
      this.state.openFiles.delete(filePath)
      this.emit("file_closed", { filePath })
    }
  }

  // Collaboration
  joinRoom(roomId: string, userName?: string): void {
    this.client.joinRoom(roomId, userName)
  }

  leaveRoom(roomId: string): void {
    this.client.leaveRoom(roomId)
  }

  // Event subscription
  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, new Set())
    }
    this.callbacks.get(eventType)!.add(callback)

    return () => {
      const callbacks = this.callbacks.get(eventType)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.callbacks.delete(eventType)
        }
      }
    }
  }

  // State getters
  getState(): WebSocketState {
    return { ...this.state }
  }

  isConnected(): boolean {
    return this.state.connected
  }

  getActiveUsers(): Array<{ id: string; name: string; lastSeen: number }> {
    return [...this.state.activeUsers]
  }

  getWatchedDirectories(): string[] {
    return Array.from(this.state.watchedDirectories)
  }

  getOpenFiles(): string[] {
    return Array.from(this.state.openFiles)
  }

  private setupEventListeners(): void {
    // Connection state changes
    this.client.subscribe("connection_state_changed", (data) => {
      this.state.connected = data.state === "connected"
      this.emit("connection_changed", data)
      this.emit("state_changed", this.state)
    })

    // File system events
    this.client.subscribe("file_system_change", (event: FileSystemEvent) => {
      this.handleFileSystemEvent(event)
    })

    // Collaboration events
    this.client.subscribe("collaboration_update", (event: CollaborationEvent) => {
      this.handleCollaborationEvent(event)
    })

    // Server stats updates
    this.client.subscribe("server_stats_update", (stats) => {
      this.emit("server_stats", stats)
    })

    // Error handling
    this.client.subscribe("error", (error) => {
      this.emit("error", error)
    })
  }

  private handleFileSystemEvent(event: FileSystemEvent): void {
    console.log("File system event:", event)

    switch (event.type) {
      case "file_created":
      case "file_modified":
      case "file_deleted":
      case "directory_created":
      case "directory_deleted":
        this.emit("file_tree_changed", event)
        break
    }

    this.emit("file_system_event", event)
  }

  private handleCollaborationEvent(event: CollaborationEvent): void {
    console.log("Collaboration event:", event)

    switch (event.type) {
      case "user_joined":
        if (!this.state.activeUsers.find((u) => u.id === event.userId)) {
          this.state.activeUsers.push({
            id: event.userId,
            name: event.userName || "Anonymous",
            lastSeen: Date.now(),
          })
        }
        break
      case "user_left":
        this.state.activeUsers = this.state.activeUsers.filter((u) => u.id !== event.userId)
        break
    }

    this.emit("collaboration_event", event)
    this.emit("state_changed", this.state)
  }

  private emit(eventType: string, data: any): void {
    const callbacks = this.callbacks.get(eventType)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in WebSocket manager callback for ${eventType}:`, error)
        }
      })
    }
  }
}
