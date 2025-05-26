"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, CheckCircle, Send, Trash2, Filter } from "lucide-react"
import { errorTracker, type ErrorReport } from "../services/ErrorTrackingService"

export const ErrorDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [stats, setStats] = useState<any>({})
  const [filter, setFilter] = useState<{
    type?: string
    severity?: string
    resolved?: boolean
  }>({})

  useEffect(() => {
    const updateData = () => {
      setErrors(errorTracker.getErrors(filter))
      setStats(errorTracker.getStats())
    }

    updateData()
    const unsubscribe = errorTracker.onError(updateData)

    return unsubscribe
  }, [filter])

  const handleResolve = (errorId: string) => {
    errorTracker.resolveError(errorId)
  }

  const handleDelegate = (errorId: string) => {
    errorTracker.delegateError(errorId, "User requested delegation from dashboard")
  }

  const handleClearAll = () => {
    errorTracker.clearErrors()
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "runtime":
        return "⚡"
      case "validation":
        return "✓"
      case "network":
        return "🌐"
      case "user":
        return "👤"
      case "system":
        return "⚙️"
      default:
        return "❓"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Error Dashboard</h2>
        <Button onClick={handleClearAll} variant="outline" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold">{stats.total || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolved || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delegated</p>
                <p className="text-2xl font-bold">{stats.delegated || 0}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-bold">{stats.bySeverity?.critical || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select
              value={filter.type || "all"}
              onValueChange={(value) => setFilter((prev) => ({ ...prev, type: value === "all" ? undefined : value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="runtime">Runtime</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.severity || "all"}
              onValueChange={(value) =>
                setFilter((prev) => ({ ...prev, severity: value === "all" ? undefined : value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.resolved === undefined ? "all" : filter.resolved ? "resolved" : "unresolved"}
              onValueChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  resolved: value === "all" ? undefined : value === "resolved",
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors ({errors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {errors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No errors found</p>
              </div>
            ) : (
              errors.map((error) => (
                <div
                  key={error.id}
                  className={`border rounded-lg p-4 ${error.resolved ? "bg-green-50 border-green-200" : "bg-white"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getTypeIcon(error.type)}</span>
                        <Badge variant="outline" className={`${getSeverityColor(error.severity)} text-white`}>
                          {error.severity}
                        </Badge>
                        <Badge variant="outline">{error.type}</Badge>
                        {error.resolved && (
                          <Badge variant="outline" className="bg-green-500 text-white">
                            Resolved
                          </Badge>
                        )}
                        {error.delegated && (
                          <Badge variant="outline" className="bg-blue-500 text-white">
                            Delegated
                          </Badge>
                        )}
                      </div>

                      <h4 className="font-medium mb-1">{error.message}</h4>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Component: {error.context.component || "Unknown"}</p>
                        <p>Action: {error.context.action || "Unknown"}</p>
                        <p>Time: {error.context.timestamp.toLocaleString()}</p>
                        {error.context.metadata && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-600">View Details</summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(error.context.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {!error.resolved && (
                        <Button onClick={() => handleResolve(error.id)} variant="outline" size="sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}

                      {!error.delegated && (
                        <Button onClick={() => handleDelegate(error.id)} variant="outline" size="sm">
                          <Send className="h-4 w-4 mr-1" />
                          Delegate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
