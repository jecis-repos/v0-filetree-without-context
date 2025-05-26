// Mock WebSocket server for development and testing
export class MockWebSocketServer {
  private clients: Set<WebSocket> = new Set()
  private fileWatchers: Map<string, Set<WebSocket>> = new Map()
  private rooms: Map<string, Set<{ ws: WebSocket; userId: string; userName: string }>> = new Map()

  constructor() {
    this.startMockFileSystemEvents()
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws)

    ws.addEventListener("close", () => {
      this.clients.delete(ws)
      this.removeClientFromWatchers(ws)
      this.removeClientFromRooms(ws)
    })

    ws.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(ws, message)
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    })
  }

  private handleMessage(ws: WebSocket, message: any): void {
    const { type, payload, clientId } = message

    switch (type) {
      case "client_handshake":
        this.send(ws, "handshake_ack", {
          clientId,
          serverTime: Date.now(),
          features: ["file_monitoring", "collaboration", "real_time_updates"],
        })
        break

      case "watch_directory":
        this.addDirectoryWatcher(ws, payload.path)
        this.send(ws, "directory_watch_started", {
          path: payload.path,
          watchId: `watch_${Date.now()}`,
        })
        break

      case "unwatch_directory":
        this.removeDirectoryWatcher(ws, payload.path)
        this.send(ws, "directory_watch_stopped", {
          path: payload.path,
        })
        break

      case "join_room":
        this.addClientToRoom(ws, payload.roomId, clientId, payload.userName)
        break

      case "leave_room":
        this.removeClientFromRoom(ws, payload.roomId)
        break

      case "file_opened":
        this.broadcast("collaboration_event", {
          type: "file_opened",
          userId: clientId,
          filePath: payload.filePath,
        })
        break

      case "file_closed":
        this.broadcast("collaboration_event", {
          type: "file_closed",
          userId: clientId,
          filePath: payload.filePath,
        })
        break
    }
  }

  private addDirectoryWatcher(ws: WebSocket, path: string): void {
    if (!this.fileWatchers.has(path)) {
      this.fileWatchers.set(path, new Set())
    }
    this.fileWatchers.get(path)!.add(ws)
  }

  private removeDirectoryWatcher(ws: WebSocket, path: string): void {
    const watchers = this.fileWatchers.get(path)
    if (watchers) {
      watchers.delete(ws)
      if (watchers.size === 0) {
        this.fileWatchers.delete(path)
      }
    }
  }

  private removeClientFromWatchers(ws: WebSocket): void {
    for (const [path, watchers] of this.fileWatchers.entries()) {
      watchers.delete(ws)
      if (watchers.size === 0) {
        this.fileWatchers.delete(path)
      }
    }
  }

  private addClientToRoom(ws: WebSocket, roomId: string, userId: string, userName: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set())
    }

    const room = this.rooms.get(roomId)!
    room.add({ ws, userId, userName })

    // Notify room members
    this.broadcastToRoom(roomId, "collaboration_event", {
      type: "user_joined",
      userId,
      userName,
    })

    // Send current room state to new user
    const activeUsers = Array.from(room).map((client) => ({
      id: client.userId,
      name: client.userName,
      lastSeen: Date.now(),
    }))

    this.send(ws, "room_joined", {
      roomId,
      activeUsers: activeUsers.filter((user) => user.id !== userId),
    })
  }

  private removeClientFromRoom(ws: WebSocket, roomId: string): void {
    const room = this.rooms.get(roomId)
    if (room) {
      const client = Array.from(room).find((c) => c.ws === ws)
      if (client) {
        room.delete(client)
        this.broadcastToRoom(roomId, "collaboration_event", {
          type: "user_left",
          userId: client.userId,
          userName: client.userName,
        })
      }
    }
  }

  private removeClientFromRooms(ws: WebSocket): void {
    for (const [roomId, room] of this.rooms.entries()) {
      const client = Array.from(room).find((c) => c.ws === ws)
      if (client) {
        room.delete(client)
        this.broadcastToRoom(roomId, "collaboration_event", {
          type: "user_left",
          userId: client.userId,
          userName: client.userName,
        })
      }
    }
  }

  private send(ws: WebSocket, type: string, payload: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type,
          payload,
          timestamp: Date.now(),
        }),
      )
    }
  }

  private broadcast(type: string, payload: any): void {
    const message = JSON.stringify({
      type,
      payload,
      timestamp: Date.now(),
    })

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    })
  }

  private broadcastToRoom(roomId: string, type: string, payload: any): void {
    const room = this.rooms.get(roomId)
    if (room) {
      const message = JSON.stringify({
        type,
        payload,
        timestamp: Date.now(),
      })

      room.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(message)
        }
      })
    }
  }

  private startMockFileSystemEvents(): void {
    // Simulate random file system events
    setInterval(() => {
      if (this.fileWatchers.size > 0) {
        const events = [
          { type: "file_created", path: "/project/new-file.txt" },
          { type: "file_modified", path: "/project/src/index.ts" },
          { type: "file_deleted", path: "/project/temp.log" },
          { type: "directory_created", path: "/project/new-folder" },
        ]

        const randomEvent = events[Math.floor(Math.random() * events.length)]

        // Broadcast to all watchers
        this.fileWatchers.forEach((watchers, watchedPath) => {
          if (randomEvent.path.startsWith(watchedPath)) {
            watchers.forEach((ws) => {
              this.send(ws, "file_system_event", {
                ...randomEvent,
                metadata: {
                  size: Math.floor(Math.random() * 10000),
                  modified: new Date().toISOString(),
                },
              })
            })
          }
        })
      }
    }, 5000) // Every 5 seconds
  }
}
