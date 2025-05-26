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
import {
  safeString,
  safeNumber,
  safeArray,
  safeObject,
  isObject,
  isString,
  isNumber,
  isNullOrUndefined,
} from "../utils/type-guards"

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
    if (file && safeString(file.type) === "file") {
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
      const fileContent = await provider.getFileContent(safeString(file.path))

      if (fileContent) {
        if (isString(fileContent)) {
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
        metadata: { filePath: safeString(file?.path) },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const extractFilePathsFromNode = (node: FileNode): string[] => {
    const paths: string[] = []

    const traverse = (n: FileNode) => {
      try {
        const nodePath = safeString(n?.path)
        if (nodePath) {
          paths.push(nodePath)
        }

        const children = safeArray(n?.children)
        children.forEach((child) => {
          if (isObject(child)) {
            traverse(child as FileNode)
          }
        })
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
      const children = safeArray(directory?.children)
      if (children.length === 0) return null

      const filePaths = extractFilePathsFromNode(directory)
      const parsedStructure = FilePathParser.parseFilePaths(filePaths, visualizationOptions)

      const scaleValue = safeNumber(previewScale, 100)
      const fontSize = safeNumber((14 * scaleValue) / 100, 14)

      return (
        <div
          className="directory-preview"
          style={{
            backgroundColor: safeString(theme?.colors?.background),
            color: safeString(theme?.colors?.textPrimary),
            fontFamily: safeString(theme?.fonts?.primary),
            padding: safeString(theme?.spacing?.padding),
            borderRadius: "8px",
            border: `1px solid ${safeString(theme?.colors?.border)}`,
            fontSize: `${fontSize}px`,
            lineHeight: safeString(theme?.spacing?.lineHeight),
            transform: `scale(${scaleValue / 100})`,
            transformOrigin: "top left",
            width: `${(100 / scaleValue) * 100}%`,
            height: `${(100 / scaleValue) * 100}%`,
          }}
        >
          <div className="directory-header" style={{ marginBottom: safeNumber(theme?.spacing?.margin, 8) * 2 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "1.2em",
                fontWeight: "bold",
                color: safeString(theme?.colors?.primary),
                marginBottom: safeNumber(theme?.spacing?.margin, 8),
              }}
            >
              {theme?.layout?.showIcons && (
                <Folder
                  size={safeNumber(theme?.icons?.size, 16) + 4}
                  style={{
                    marginRight: safeNumber(theme?.spacing?.margin, 8),
                    color: safeString(theme?.colors?.directoryIcon),
                  }}
                />
              )}
              {safeString(directory?.name)}
            </div>

            {theme?.layout?.showFileSize && (
              <div
                style={{
                  fontSize: "0.85em",
                  color: safeString(theme?.colors?.textSecondary),
                  display: "flex",
                  gap: safeNumber(theme?.spacing?.margin, 8) * 2,
                }}
              >
                <span>{safeNumber(parsedStructure?.metadata?.totalFiles, 0)} files</span>
                <span>{safeNumber(parsedStructure?.metadata?.totalDirectories, 0)} directories</span>
                <span>Depth: {safeNumber(parsedStructure?.metadata?.maxDepth, 0)}</span>
              </div>
            )}
          </div>

          <div className="directory-content">{renderParsedNodes(safeArray(parsedStructure?.nodes), theme, 0)}</div>

          {isObject(parsedStructure?.metadata?.fileTypes) &&
            Object.keys(parsedStructure.metadata.fileTypes).length > 0 && (
              <div
                className="file-types-summary"
                style={{
                  marginTop: safeNumber(theme?.spacing?.margin, 8) * 2,
                  padding: safeNumber(theme?.spacing?.padding, 16) / 2,
                  backgroundColor: safeString(theme?.colors?.muted),
                  borderRadius: "4px",
                  fontSize: "0.8em",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: safeNumber(theme?.spacing?.margin, 8) / 2 }}>
                  File Types:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: safeNumber(theme?.spacing?.margin, 8) }}>
                  {Object.entries(safeObject(parsedStructure?.metadata?.fileTypes)).map(([type, count]) => (
                    <span
                      key={safeString(type)}
                      style={{
                        backgroundColor: safeString(theme?.colors?.background),
                        padding: "2px 6px",
                        borderRadius: "3px",
                        border: `1px solid ${safeString(theme?.colors?.border)}`,
                      }}
                    >
                      .{safeString(type)} ({safeNumber(count, 0)})
                    </span>
                  ))}
                </div>
              </div>
            )}
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
      const safeNodes = safeArray(nodes)
      if (safeNodes.length === 0) return null

      return safeNodes.map((node, index) => {
        if (!isObject(node)) return null

        const nodeId = safeString(node?.id) || `node-${safeNumber(index, 0)}`
        const nodeName = safeString(node?.name) || `Unknown ${safeNumber(index, 0)}`
        const nodeType = safeString(node?.type) || "unknown"
        const nodeSize = isNumber(node?.size) ? node.size : undefined

        return (
          <div
            key={nodeId}
            style={{
              display: "flex",
              alignItems: "center",
              padding: `${safeNumber(theme?.spacing?.padding, 16) / 4}px 0`,
              paddingLeft: safeNumber(depth, 0) * safeNumber(theme?.spacing?.indentation, 20),
              borderLeft:
                theme?.layout?.showLines && depth > 0 ? `1px solid ${safeString(theme?.colors?.border)}` : "none",
              marginLeft: theme?.layout?.showLines && depth > 0 ? safeNumber(theme?.spacing?.margin, 8) : 0,
            }}
            className="file-node-preview"
          >
            {theme?.layout?.showLines && depth > 0 && (
              <div
                style={{
                  width: safeNumber(theme?.spacing?.indentation, 20) / 2,
                  height: "1px",
                  backgroundColor: safeString(theme?.colors?.border),
                  marginRight: safeNumber(theme?.spacing?.margin, 8),
                }}
              />
            )}

            {theme?.layout?.showIcons && (
              <div style={{ marginRight: safeNumber(theme?.spacing?.margin, 8) }}>
                {nodeType === "directory" ? (
                  <Folder
                    size={safeNumber(theme?.icons?.size, 16)}
                    style={{ color: safeString(theme?.colors?.directoryIcon) }}
                    fill={theme?.icons?.style === "filled" ? "currentColor" : "none"}
                  />
                ) : (
                  <File
                    size={safeNumber(theme?.icons?.size, 16)}
                    style={{ color: safeString(theme?.colors?.fileIcon) }}
                    fill={theme?.icons?.style === "filled" ? "currentColor" : "none"}
                  />
                )}
              </div>
            )}

            <span
              style={{
                flexGrow: 1,
                color:
                  nodeType === "directory"
                    ? safeString(theme?.colors?.primary)
                    : safeString(theme?.colors?.textPrimary),
                fontWeight: nodeType === "directory" ? "bold" : "normal",
              }}
            >
              {nodeName}
            </span>

            {theme?.layout?.showFileSize && nodeSize !== undefined && (
              <span
                style={{
                  fontSize: "0.85em",
                  color: safeString(theme?.colors?.textSecondary),
                  marginLeft: safeNumber(theme?.spacing?.margin, 8),
                  fontFamily: safeString(theme?.fonts?.mono),
                }}
              >
                {formatBytes(nodeSize)}
              </span>
            )}

            {theme?.layout?.showLastModified && node?.lastModified && (
              <span
                style={{
                  fontSize: "0.8em",
                  color: safeString(theme?.colors?.textSecondary),
                  marginLeft: safeNumber(theme?.spacing?.margin, 8),
                }}
              >
                {node.lastModified instanceof Date
                  ? node.lastModified.toLocaleDateString()
                  : safeString(node.lastModified)}
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

      if (safeString(file.type) === "directory") {
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
          backgroundColor: safeString(theme?.colors?.background),
          textColor: safeString(theme?.colors?.textPrimary),
        })

        if (result && result.success) {
          await imageExportService.downloadImage(result, `${safeString(file.name)}-preview.png`)
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

  if (isNullOrUndefined(file)) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-6 text-gray-500 dark:text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a file or directory to preview</p>
        </CardContent>
      </Card>
    )
  }

  const fileMimeType = safeString(file?.mimeType)
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
              <span className="truncate">{safeString(file?.name)}</span>
              <Badge variant="outline" className="ml-2">
                {safeString(file?.type) === "directory" ? "Directory" : fileMimeType.split("/")[1] || "File"}
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
              defaultValue={safeString(file?.type) === "directory" ? "preview" : "details"}
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
                      <span className="font-medium">Path:</span> {safeString(file?.path)}
                    </p>
                    {file?.size && (
                      <p>
                        <span className="font-medium">Size:</span> {formatBytes(safeNumber(file.size, 0))}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Type:</span> {fileMimeType || safeString(file?.type)}
                    </p>
                    {file?.lastModified && (
                      <p>
                        <span className="font-medium">Last Modified:</span>{" "}
                        {file.lastModified instanceof Date
                          ? file.lastModified.toLocaleString()
                          : safeString(file.lastModified)}
                      </p>
                    )}
                    {safeString(file?.type) === "directory" && file?.children && (
                      <p>
                        <span className="font-medium">Items:</span> {safeArray(file.children).length}
                      </p>
                    )}
                  </div>

                  {file?.metadata &&
                    isObject(file.metadata) &&
                    Object.keys(file.metadata).filter((k) => k !== "_content").length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Metadata</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                          {Object.entries(safeObject(file.metadata))
                            .filter(([key]) => key !== "_content")
                            .map(([key, value]) => (
                              <div key={key} className="grid grid-cols-3 gap-2 mb-1">
                                <span className="font-mono text-xs">{safeString(key)}:</span>
                                <span className="col-span-2 font-mono text-xs truncate">
                                  {isObject(value) ? JSON.stringify(value) : safeString(value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
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
                          {availableThemes.map((theme) => (
                            <SelectItem key={safeString(theme?.id)} value={safeString(theme?.id)}>
                              {safeString(theme?.name)}
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
                        onValueChange={([value]) => setPreviewScale(safeNumber(value, 100))}
                        className="w-24"
                      />
                      <span className="text-sm w-12">{safeNumber(previewScale, 100)}%</span>
                    </div>

                    {safeString(file?.type) === "directory" && (
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
                    {safeString(file?.type) === "directory" ? (
                      renderDirectoryPreview(file)
                    ) : isImage ? (
                      <div className="p-4 flex items-center justify-center">
                        <img
                          src={safeString(file?.previewUrl) || safeString(file?.thumbnailUrl)}
                          alt={safeString(file?.name)}
                          className="max-w-full max-h-[400px] object-contain"
                          style={{
                            transform: `scale(${safeNumber(previewScale, 100) / 100})`,
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
                      src={safeString(file?.previewUrl) || safeString(file?.thumbnailUrl)}
                      alt={safeString(file?.name)}
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
  const safeBytes = safeNumber(bytes, 0)
  if (safeBytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(safeBytes) / Math.log(k))
  return Number.parseFloat((safeBytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
