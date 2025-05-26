"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { DIContainer } from "../container/DIContainer"

interface FilePreviewProps {
  file: FileNode | null
  container: DIContainer
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, container }) => {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (file && file.type === "file") {
      loadFileContent()
    } else {
      setContent(null)
    }
  }, [file])

  const loadFileContent = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const provider = container.resolve("IFileSystemProvider")
      const fileContent = await provider.getFileContent(file.path)

      if (fileContent) {
        if (typeof fileContent === "string") {
          setContent(fileContent)
        } else {
          // Handle binary content
          setContent("[Binary content]")
        }
      } else {
        setContent(null)
      }
    } catch (err) {
      setError(err.message || "Failed to load file content")
    } finally {
      setIsLoading(false)
    }
  }

  if (!file) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-6 text-gray-500 dark:text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a file to preview</p>
        </CardContent>
      </Card>
    )
  }

  if (file.type === "directory") {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="truncate">{file.name}</span>
            <Badge variant="outline" className="ml-2">
              Directory
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Path:</span> {file.path}
            </p>
            <p>
              <span className="font-medium">Items:</span> {file.children?.length || 0}
            </p>
            {file.lastModified && (
              <p>
                <span className="font-medium">Last Modified:</span> {file.lastModified.toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isImage = file.mimeType?.startsWith("image/")
  const isText =
    file.mimeType?.startsWith("text/") ||
    file.mimeType === "application/json" ||
    file.mimeType === "application/javascript" ||
    file.mimeType === "application/xml"

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="truncate">{file.name}</span>
            <Badge variant="outline" className="ml-2">
              {file.mimeType?.split("/")[1] || "File"}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href={file.previewUrl || "#"} download={file.name} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 border rounded">
            <p className="font-medium">Error loading file:</p>
            <p>{error}</p>
          </div>
        ) : (
          <Tabs defaultValue={isImage ? "preview" : "details"} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              {isImage && <TabsTrigger value="preview">Preview</TabsTrigger>}
              {isText && <TabsTrigger value="content">Content</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="flex-grow">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Path:</span> {file.path}
                  </p>
                  <p>
                    <span className="font-medium">Size:</span> {formatBytes(file.size || 0)}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span> {file.mimeType || "Unknown"}
                  </p>
                  {file.lastModified && (
                    <p>
                      <span className="font-medium">Last Modified:</span> {file.lastModified.toLocaleString()}
                    </p>
                  )}
                </div>

                {file.metadata && Object.keys(file.metadata).filter((k) => k !== "_content").length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Metadata</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                      {Object.entries(file.metadata)
                        .filter(([key]) => key !== "_content")
                        .map(([key, value]) => (
                          <div key={key} className="grid grid-cols-3 gap-2 mb-1">
                            <span className="font-mono text-xs">{key}:</span>
                            <span className="col-span-2 font-mono text-xs truncate">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {isImage && (
              <TabsContent value="preview" className="flex-grow flex items-center justify-center p-4">
                <div className="image-preview max-w-full max-h-full">
                  <img
                    src={file.previewUrl || file.thumbnailUrl}
                    alt={file.name}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                </div>
              </TabsContent>
            )}

            {isText && (
              <TabsContent value="content" className="flex-grow">
                {content ? (
                  <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto text-sm h-full">
                    <code>{content}</code>
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No content available</p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
