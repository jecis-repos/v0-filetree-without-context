"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, UserPlus, LogOut, MessageCircle } from "lucide-react"
import type { WebSocketManager, CollaborationEvent } from "@/lib/websocket/websocket-manager"

interface CollaborationPanelProps {
  wsManager: WebSocketManager
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
}

export default function CollaborationPanel({ wsManager }: CollaborationPanelProps) {
  const [roomId, setRoomId] = useState("filetree-room")
  const [userName, setUserName] = useState("")
  const [isInRoom, setIsInRoom] = useState(false)
  const [activeUsers, setActiveUsers] = useState(wsManager.getActiveUsers())
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")

  useEffect(() => {
    // Generate a random username if not set
    if (!userName) {
      setUserName(`User_${Math.random().toString(36).substr(2, 6)}`)
    }

    const unsubscribeState = wsManager.subscribe("state_changed", (state) => {
      setActiveUsers(state.activeUsers)
    })

    const unsubscribeCollaboration = wsManager.subscribe("collaboration_event", (event: CollaborationEvent) => {
      handleCollaborationEvent(event)
    })

    // Subscribe to chat messages
    const unsubscribeChat = wsManager.subscribe("chat_message", (data) => {
      const message: ChatMessage = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: data.userId,
        userName: data.userName,
        message: data.message,
        timestamp: Date.now(),
      }
      setChatMessages((prev) => [...prev, message].slice(-50)) // Keep last 50 messages
    })

    return () => {
      unsubscribeState()
      unsubscribeCollaboration()
      unsubscribeChat()
    }
  }, [wsManager, userName])

  const handleCollaborationEvent = (event: CollaborationEvent) => {
    switch (event.type) {
      case "user_joined":
        setChatMessages((prev) => [
          ...prev,
          {
            id: `system_${Date.now()}`,
            userId: "system",
            userName: "System",
            message: `${event.userName} joined the room`,
            timestamp: Date.now(),
          },
        ])
        break
      case "user_left":
        setChatMessages((prev) => [
          ...prev,
          {
            id: `system_${Date.now()}`,
            userId: "system",
            userName: "System",
            message: `${event.userName} left the room`,
            timestamp: Date.now(),
          },
        ])
        break
    }
  }

  const joinRoom = () => {
    if (wsManager.isConnected() && roomId && userName) {
      wsManager.joinRoom(roomId, userName)
      setIsInRoom(true)
    }
  }

  const leaveRoom = () => {
    if (isInRoom) {
      wsManager.leaveRoom(roomId)
      setIsInRoom(false)
      setChatMessages([])
    }
  }

  const sendMessage = () => {
    if (newMessage.trim() && isInRoom) {
      // Send chat message through WebSocket
      wsManager.subscribe("send_chat_message", () => {})() // Placeholder for actual implementation
      setNewMessage("")
    }
  }

  const getUserInitials = (name: string) => {
    return name.split("_")[1]?.slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase()
  }

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaboration
        </CardTitle>
        <CardDescription>Real-time collaboration and chat</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isInRoom ? (
          /* Join Room Form */
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Room ID</label>
              <Input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter room ID" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Enter your name" />
            </div>
            <Button
              onClick={joinRoom}
              disabled={!wsManager.isConnected() || !roomId || !userName}
              className="w-full gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Join Room
            </Button>
          </div>
        ) : (
          /* Room Interface */
          <div className="space-y-4">
            {/* Room Info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Room: {roomId}</p>
                <p className="text-xs text-muted-foreground">As: {userName}</p>
              </div>
              <Button size="sm" variant="outline" onClick={leaveRoom} className="gap-2">
                <LogOut className="w-4 h-4" />
                Leave
              </Button>
            </div>

            {/* Active Users */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Active Users ({activeUsers.length + 1})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Current user */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">{getUserInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{userName} (You)</span>
                </div>
                {/* Other users */}
                {activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">{getUserInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Chat</span>
              </div>

              {/* Messages */}
              <div className="h-32 overflow-y-auto border rounded-lg p-2 space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {message.userId === "system" ? (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          ) : (
                            message.userName
                          )}
                        </span>
                        <span className="text-muted-foreground">{formatMessageTime(message.timestamp)}</span>
                      </div>
                      <p className="mt-1">{message.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="text-sm"
                />
                <Button size="sm" onClick={sendMessage} disabled={!newMessage.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
