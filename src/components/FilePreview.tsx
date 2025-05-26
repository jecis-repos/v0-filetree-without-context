"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Download, FileText, Folder, File, Eye, Palette, Settings } from "lucide-react"
import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { DIContainer } from "../container/DIContainer"
import { getTheme, getAvailableThemes, type PreviewTheme } from "../utils/PreviewThemes"
import { FilePathParser, type VisualizationOptions } from "../utils/FilePathParser"
import { ErrorBoundary } from "./ErrorBoundary"
import { errorTracker } from "../services/ErrorTrackingService"
import { safeToString, safeToNumber, safeToBoolean, safeGet, safeEquals } from "../utils/safe-conversions"

interface FilePreviewProps {
  file: FileNode | null
  container: DIContainer
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, container }) => {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<string>("modern")
  const [previewScale, setPreviewScale] = useState<number>(100)
  const [visualizationOptions, setVisualizationOptions] = useState<VisualizationOptions>({
    structure: "hierarchical",
    sortBy: "name",
    sortOrder: "asc",
    showHidden: false,
  })

  const theme = useMemo(() => {
    try {
      return getTheme(selectedTheme)
    } catch (err) {
      errorTracker.captureError(err, {
        type: "runtime",
        severity: "medium",
        component: "FilePreview",
        action: "get_theme",
      })
      return getTheme("modern") // fallback
    }
  }, [selectedTheme])

  const availableThemes = useMemo(() => {
    try {
      return getAvailableThemes()
    } catch (err) {
      errorTracker.captureError(err, {
        type: "runtime",
        severity: "low",
        component: "FilePreview",
        action: "get_available_themes",
      })
      return [{ id: "modern", name: "Modern" }] // fallback
    }
  }, [])

  useEffect(() => {
    if (file && safeEquals(safeGet(file, "type"), "file")) {
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
      const filePath = safeToString(safeGet(file, "path"))
      const fileContent = await provider.getFileContent(filePath)

      if (fileContent) {
        if (typeof fileContent === "string") {
          setContent(fileContent)
        } else {
          setContent("[Binary content]")
        }
      } else {
        setContent(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load file content"
      setError(errorMessage)
      errorTracker.captureError(err, {
        type: "system",
        severity: "medium",
        component: "FilePreview",
        action: "load_file_content",
        metadata: { filePath: safeToString(safeGet(file, "path")) },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const extractFilePathsFromNode = (node: FileNode): string[] => {
    const paths: string[] = []

    const traverse = (n: FileNode) => {
      try {
        const nodePath = safeToString(safeGet(n, "path"))
        if (nodePath) {
          paths.push(nodePath)
        }

        const children = safeGet(n, "children", [])
        if (Array.isArray(children)) {
          children.forEach((child) => {
            if (child && typeof child === "object") {
              traverse(child as FileNode)
            }
          })
        }
      } catch (err) {
        errorTracker.captureError(err, {
          type: "runtime",
          severity: "low",
          component: "FilePreview",
          action: "traverse_node",
        })
      }
    }

    traverse(node)
    return paths
  }

  const renderDirectoryPreview = (directory: FileNode) => {
    try {
      const children = safeGet(directory, "children", [])
      if (!Array.isArray(children) || children.length === 0) return null

      const filePaths = extractFilePathsFromNode(directory)
      const parsedStructure = FilePathParser.parseFilePaths(filePaths, visualizationOptions)

      const scaleValue = safeToNumber(previewScale, 100)
      const fontSize = safeToNumber((14 * scaleValue) / 100, 14)

      // Safe theme property access
      const backgroundColor = safeToString(safeGet(theme, "colors.background", "#ffffff"))
      const textColor = safeToString(safeGet(theme, "colors.textPrimary", "#000000"))
      const fontFamily = safeToString(safeGet(theme, "fonts.primary", "Arial, sans-serif"))
      const padding = safeToString(safeToNumber(safeGet(theme, "spacing.padding", 16)))
      const borderColor = safeToString(safeGet(theme, "colors.border", "#e5e5e5"))
      const lineHeight = safeToString(safeToNumber(safeGet(theme, "spacing.lineHeight", 1.5)))

      return (
        <div
          className="directory-preview"
          style={{
            backgroundColor,
            color: textColor,
            fontFamily,
            padding: `${padding}px`,
            borderRadius: "8px",
            border: `1px solid ${borderColor}`,
            fontSize: `${fontSize}px`,
            lineHeight,
            transform: `scale(${scaleValue / 100})`,
            transformOrigin: "top left",
            width: `${(100 / scaleValue) * 100}%`,
            height: `${(100 / scaleValue) * 100}%`,
          }}
        >
          <div
            className="directory-header"
            style={{ marginBottom: `${safeToNumber(safeGet(theme, "spacing.margin", 8)) * 2}px` }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "1.2em",
                fontWeight: "bold",
                color: safeToString(safeGet(theme, "colors.primary", "#0066cc")),
                marginBottom: `${safeToNumber(safeGet(theme, "spacing.margin", 8))}px`,
              }}
            >
              {safeToBoolean(safeGet(theme, "layout.showIcons")) && (
                <Folder
                  size={safeToNumber(safeGet(theme, "icons.size", 16)) + 4}
                  style={{
                    marginRight: `${safeToNumber(safeGet(theme, "spacing.margin", 8))}px`,
                    color: safeToString(safeGet(theme, "colors.directoryIcon", "#0066cc")),
                  }}
                />
              )}
              {safeToString(safeGet(directory, "name", "Unknown Directory"))}
            </div>

            {safeToBoolean(safeGet(theme, "layout.showFileSize")) && (
              <div
                style={{
                  fontSize: "0.85em",
                  color: safeToString(safeGet(theme, "colors.textSecondary", "#666666")),
                  display: "flex",
                  gap: `${safeToNumber(safeGet(theme, "spacing.margin", 8)) * 2}px`,
                }}
              >
                <span>{safeToNumber(safeGet(parsedStructure, "metadata.totalFiles", 0))} files</span>
                <span>{safeToNumber(safeGet(parsedStructure, "metadata.totalDirectories", 0))} directories</span>
                <span>Depth: {safeToNumber(safeGet(parsedStructure, "metadata.maxDepth", 0))}</span>
              </div>
            )}
          </div>

          <div className="directory-content">{renderParsedNodes(safeGet(parsedStructure, "nodes", []), theme, 0)}</div>

          {(() => {
            const fileTypes = safeGet(parsedStructure, "metadata.fileTypes", {})
            const hasFileTypes =
              typeof fileTypes === "object" && fileTypes !== null && Object.keys(fileTypes).length > 0

            if (!hasFileTypes) return null

            return (
              <div
                className="file-types-summary"
                style={{
                  marginTop: `${safeToNumber(safeGet(theme, "spacing.margin", 8)) * 2}px`,
                  padding: `${safeToNumber(safeGet(theme, "spacing.padding", 16)) / 2}px`,
                  backgroundColor: safeToString(safeGet(theme, "colors.muted", "#f5f5f5")),
                  borderRadius: "4px",
                  fontSize: "0.8em",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: `${safeToNumber(safeGet(theme, "spacing.margin", 8)) / 2}px`,
                  }}
                >
                  File Types:
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: `${safeToNumber(safeGet(theme, "spacing.margin", 8))}px`,
                  }}
                >
                  {Object.entries(fileTypes).map(([type, count]) => (
                    <span
                      key={safeToString(type)}
                      style={{
                        backgroundColor,
                        padding: "2px 6px",
                        borderRadius: "3px",
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      .{safeToString(type)} ({safeToNumber(count, 0)})
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )
    } catch (err) {
      errorTracker.captureError(err, {
        type: "runtime",
        severity: "medium",
        component: "FilePreview",
        action: "render_directory_preview",
      })
      return (
        <div className="p-4 text-center text-red-500">
          <p>Error rendering directory preview</p>
        </div>
      )
    }
  }

  const renderParsedNodes = (nodes: any[], theme: PreviewTheme, depth = 0): React.ReactNode => {
    try {
      if (!Array.isArray(nodes) || nodes.length === 0) return null

      return nodes.map((node, index) => {
        if (!node || typeof node !== "object") return null

        const nodeId = safeToString(safeGet(node, "id", `node-${index}`))
        const nodeName = safeToString(safeGet(node, "name", `Unknown ${index}`))
        const nodeType = safeToString(safeGet(node, "type", "unknown"))
        const nodeSize = safeGet(node, "size")
        const hasSize = typeof nodeSize === "number" && !isNaN(nodeSize)

        const paddingValue = safeToNumber(safeGet(theme, "spacing.padding", 16)) / 4
        const indentationValue = safeToNumber(safeGet(theme, "spacing.indentation", 20))
        const marginValue = safeToNumber(safeGet(theme, "spacing.margin", 8))
        const showLines = safeToBoolean(safeGet(theme, "layout.showLines"))
        const showIcons = safeToBoolean(safeGet(theme, "layout.showIcons"))
        const showFileSize = safeToBoolean(safeGet(theme, "layout.showFileSize"))
        const showLastModified = safeToBoolean(safeGet(theme, "layout.showLastModified"))

        return (
          <div
            key={nodeId}
            style={{
              display: "flex",
              alignItems: "center",
              padding: `${paddingValue}px 0`,
              paddingLeft: `${depth * indentationValue}px`,
              borderLeft:
                showLines && depth > 0
                  ? `1px solid ${safeToString(safeGet(theme, "colors.border", "#e5e5e5"))}`
                  : "none",
              marginLeft: showLines && depth > 0 ? `${marginValue}px` : "0",
            }}
            className="file-node-preview"
          >
            {showLines && depth > 0 && (
              <div
                style={{
                  width: `${indentationValue / 2}px`,
                  height: "1px",
                  backgroundColor: safeToString(safeGet(theme, "colors.border", "#e5e5e5")),
                  marginRight: `${marginValue}px`,
                }}
              />
            )}

            {showIcons && (
              <div style={{ marginRight: `${marginValue}px` }}>
                {safeEquals(nodeType, "directory") ? (
                  <Folder
                    size={safeToNumber(safeGet(theme, "icons.size", 16))}
                    style={{ color: safeToString(safeGet(theme, "colors.directoryIcon", "#0066cc")) }}
                    fill={safeEquals(safeGet(theme, "icons.style"), "filled") ? "currentColor" : "none"}
                  />
                ) : (
                  <File
                    size={safeToNumber(safeGet(theme, "icons.size", 16))}
                    style={{ color: safeToString(safeGet(theme, "colors.fileIcon", "#666666")) }}
                    fill={safeEquals(safeGet(theme, "icons.style"), "filled") ? "currentColor" : "none"}
                  />
                )}
              </div>
            )}

            <span
              style={{
                flexGrow: 1,
                color: safeEquals(nodeType, "directory")
                  ? safeToString(safeGet(theme, "colors.primary", "#0066cc"))
                  : safeToString(safeGet(theme, "colors.textPrimary", "#000000")),
                fontWeight: safeEquals(nodeType, "directory") ? "bold" : "normal",
              }}
            >
              {nodeName}
            </span>

            {showFileSize && hasSize && (
              <span
                style={{
                  fontSize: "0.85em",
                  color: safeToString(safeGet(theme, "colors.textSecondary", "#666666")),
                  marginLeft: `${marginValue}px`,
                  fontFamily: safeToString(safeGet(theme, "fonts.mono", "monospace")),
                }}
              >
                {formatBytes(safeToNumber(nodeSize))}
              </span>
            )}

            {showLastModified && safeGet(node, "lastModified") && (
              <span
                style={{
                  fontSize: "0.8em",
                  color: safeToString(safeGet(theme, "colors.textSecondary", "#666666")),
                  marginLeft: `${marginValue}px`,
                }}
              >
                {(() => {
                  const lastModified = safeGet(node, "lastModified")
                  if (lastModified instanceof Date) {
                    return lastModified.toLocaleDateString()
                  }
                  return safeToString(lastModified)
                })()}
              </span>
            )}
          </div>
        )
      })
    } catch (err) {
      errorTracker.captureError(err, {
        type: "runtime",
        severity: "medium",
        component: "FilePreview",
        action: "render_parsed_nodes",
      })
      return <div className="p-2 text-red-500 text-sm">Error rendering nodes</div>
    }
  }

  const exportPreview = async () => {
    try {
      if (!file) return

      const imageExportService = container.resolve("ImageExportService")
      const fileType = safeToString(safeGet(file, "type"))

      if (safeEquals(fileType, "directory")) {
        const filePaths = extractFilePathsFromNode(file)
        if (filePaths.length === 0) {
          errorTracker.captureUserError("export_preview", "No valid file paths found", "FilePreview")
          return
        }

        const result = await imageExportService.exportFileTreeAsImage([file], {
          width: 1200,
          height: 800,
          format: "png",
          theme: selectedTheme,
          backgroundColor: safeToString(safeGet(theme, "colors.background", "#ffffff")),
          textColor: safeToString(safeGet(theme, "colors.textPrimary", "#000000")),
        })

        if (result && result.success) {
          const fileName = `${safeToString(safeGet(file, "name", "preview"))}-preview.png`
          await imageExportService.downloadImage(result, fileName)
        }
      }
    } catch (err) {
      errorTracker.captureError(err, {
        type: "system",
        severity: "medium",
        component: "FilePreview",
        action: "export_preview",
      })
    }
  }

  if (!file) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-6 text-gray-500 dark:text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a file or directory to preview</p>
        </CardContent>
      </Card>
    )
  }

  const fileMimeType = safeToString(safeGet(file, "mimeType", ""))
  const fileName = safeToString(safeGet(file, "name", "Unknown"))
  const filePath = safeToString(safeGet(file, "path", ""))
  const fileType = safeToString(safeGet(file, "type", ""))
  const fileSize = safeGet(file, "size")
  const lastModified = safeGet(file, "lastModified")
  const children = safeGet(file, "children", [])
  const metadata = safeGet(file, "metadata", {})

  const isImage = fileMimeType.startsWith("image/")
  const isText =
    fileMimeType.startsWith("text/") ||
    fileMimeType === "application/json" ||
    fileMimeType === "application/javascript" ||
    fileMimeType === "application/xml"

  return (
    <ErrorBoundary component="FilePreview">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="truncate">{fileName}</span>
              <Badge variant="outline" className="ml-2">
                {safeEquals(fileType, "directory") ? "Directory" : fileMimeType.split("/")[1] || "File"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={exportPreview}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
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
            <Tabs
              defaultValue={safeEquals(fileType, "directory") ? "preview" : "details"}
              className="h-full flex flex-col"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </TabsTrigger>
                {isImage && <TabsTrigger value="image">Image</TabsTrigger>}
                {isText && <TabsTrigger value="content">Content</TabsTrigger>}
              </TabsList>

              <TabsContent value="details" className="flex-grow">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Path:</span> {filePath}
                    </p>
                    {typeof fileSize === "number" && !isNaN(fileSize) && (
                      <p>
                        <span className="font-medium">Size:</span> {formatBytes(fileSize)}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Type:</span> {fileMimeType || fileType}
                    </p>
                    {lastModified && (
                      <p>
                        <span className="font-medium">Last Modified:</span>{" "}
                        {lastModified instanceof Date ? lastModified.toLocaleString() : safeToString(lastModified)}
                      </p>
                    )}
                    {safeEquals(fileType, "directory") && Array.isArray(children) && (
                      <p>
                        <span className="font-medium">Items:</span> {children.length}
                      </p>
                    )}
                  </div>

                  {(() => {
                    if (!metadata || typeof metadata !== "object") return null
                    const filteredMetadata = Object.entries(metadata).filter(([key]) => key !== "_content")
                    if (filteredMetadata.length === 0) return null

                    return (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Metadata</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                          {filteredMetadata.map(([key, value]) => (
                            <div key={key} className="grid grid-cols-3 gap-2 mb-1">
                              <span className="font-mono text-xs">{safeToString(key)}:</span>
                              <span className="col-span-2 font-mono text-xs truncate">
                                {typeof value === "object" ? JSON.stringify(value) : safeToString(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-grow">
                <div className="space-y-4">
                  {/* Preview Controls */}
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      <Label>Theme:</Label>
                      <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableThemes.map((themeOption) => (
                            <SelectItem
                              key={safeToString(safeGet(themeOption, "id", ""))}
                              value={safeToString(safeGet(themeOption, "id", ""))}
                            >
                              {safeToString(safeGet(themeOption, "name", ""))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <Label>Scale:</Label>
                      <Slider
                        value={[previewScale]}
                        min={50}
                        max={150}
                        step={10}
                        onValueChange={([value]) => setPreviewScale(safeToNumber(value, 100))}
                        className="w-24"
                      />
                      <span className="text-sm w-12">{safeToNumber(previewScale, 100)}%</span>
                    </div>

                    {safeEquals(fileType, "directory") && (
                      <div className="flex items-center gap-2">
                        <Label>Structure:</Label>
                        <Select
                          value={visualizationOptions.structure}
                          onValueChange={(value) =>
                            setVisualizationOptions((prev) => ({
                              ...prev,
                              structure: value as any,
                            }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hierarchical">Hierarchical</SelectItem>
                            <SelectItem value="flat">Flat</SelectItem>
                            <SelectItem value="tree">Tree</SelectItem>
                            <SelectItem value="list">List</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Preview Content */}
                  <div className="border rounded overflow-auto" style={{ maxHeight: "500px" }}>
                    {safeEquals(fileType, "directory") ? (
                      renderDirectoryPreview(file)
                    ) : isImage ? (
                      <div className="p-4 flex items-center justify-center">
                        <img
                          src={
                            safeToString(safeGet(file, "previewUrl", safeGet(file, "thumbnailUrl", ""))) ||
                            "/placeholder.svg"
                          }
                          alt={fileName}
                          className="max-w-full max-h-[400px] object-contain"
                          style={{
                            transform: `scale(${safeToNumber(previewScale, 100) / 100})`,
                            transformOrigin: "center",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Preview not available for this file type</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {isImage && (
                <TabsContent value="image" className="flex-grow flex items-center justify-center p-4">
                  <div className="image-preview max-w-full max-h-full">
                    <img
                      src={
                        safeToString(safeGet(file, "previewUrl", safeGet(file, "thumbnailUrl", ""))) ||
                        "/placeholder.svg"
                      }
                      alt={fileName}
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
    </ErrorBoundary>
  )
}

function formatBytes(bytes: number): string {
  const safeBytes = safeToNumber(bytes, 0)
  if (safeBytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(safeBytes) / Math.log(k))
  return Number.parseFloat((safeBytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
