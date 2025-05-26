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

  const theme = useMemo(() => getTheme(selectedTheme), [selectedTheme])
  const availableThemes = useMemo(() => getAvailableThemes(), [])

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

  const renderDirectoryPreview = (directory: FileNode) => {
    if (!directory.children) return null

    // Parse the directory structure for preview
    const filePaths = extractFilePathsFromNode(directory)
    const parsedStructure = FilePathParser.parseFilePaths(filePaths, visualizationOptions)

    return (
      <div
        className="directory-preview"
        style={{
          backgroundColor: theme.colors.background,
          color: theme.colors.textPrimary,
          fontFamily: theme.fonts.primary,
          padding: theme.spacing.padding,
          borderRadius: "8px",
          border: `1px solid ${theme.colors.border}`,
          fontSize: `${(14 * previewScale) / 100}px`,
          lineHeight: theme.spacing.lineHeight,
          transform: `scale(${previewScale / 100})`,
          transformOrigin: "top left",
          width: `${(100 / previewScale) * 100}%`,
          height: `${(100 / previewScale) * 100}%`,
        }}
      >
        <div className="directory-header" style={{ marginBottom: theme.spacing.margin * 2 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "1.2em",
              fontWeight: "bold",
              color: theme.colors.primary,
              marginBottom: theme.spacing.margin,
            }}
          >
            {theme.layout.showIcons && (
              <Folder
                size={theme.icons.size + 4}
                style={{
                  marginRight: theme.spacing.margin,
                  color: theme.colors.directoryIcon,
                }}
              />
            )}
            {directory.name}
          </div>

          {theme.layout.showFileSize && (
            <div
              style={{
                fontSize: "0.85em",
                color: theme.colors.textSecondary,
                display: "flex",
                gap: theme.spacing.margin * 2,
              }}
            >
              <span>{parsedStructure.metadata.totalFiles} files</span>
              <span>{parsedStructure.metadata.totalDirectories} directories</span>
              <span>Depth: {parsedStructure.metadata.maxDepth}</span>
            </div>
          )}
        </div>

        <div className="directory-content">{renderParsedNodes(parsedStructure.nodes, theme, 0)}</div>

        {Object.keys(parsedStructure.metadata.fileTypes).length > 0 && (
          <div
            className="file-types-summary"
            style={{
              marginTop: theme.spacing.margin * 2,
              padding: theme.spacing.padding / 2,
              backgroundColor: theme.colors.muted,
              borderRadius: "4px",
              fontSize: "0.8em",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: theme.spacing.margin / 2 }}>File Types:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.margin }}>
              {Object.entries(parsedStructure.metadata.fileTypes).map(([type, count]) => (
                <span
                  key={type}
                  style={{
                    backgroundColor: theme.colors.background,
                    padding: "2px 6px",
                    borderRadius: "3px",
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  .{type} ({count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderParsedNodes = (nodes: FileNode[], theme: PreviewTheme, depth = 0): React.ReactNode => {
    return nodes.map((node, index) => (
      <div
        key={node.id || index}
        style={{
          display: "flex",
          alignItems: "center",
          padding: `${theme.spacing.padding / 4}px 0`,
          paddingLeft: depth * theme.spacing.indentation,
          borderLeft: theme.layout.showLines && depth > 0 ? `1px solid ${theme.colors.border}` : "none",
          marginLeft: theme.layout.showLines && depth > 0 ? theme.spacing.margin : 0,
        }}
        className="file-node-preview"
      >
        {theme.layout.showLines && depth > 0 && (
          <div
            style={{
              width: theme.spacing.indentation / 2,
              height: "1px",
              backgroundColor: theme.colors.border,
              marginRight: theme.spacing.margin,
            }}
          />
        )}

        {theme.layout.showIcons && (
          <div style={{ marginRight: theme.spacing.margin }}>
            {node.type === "directory" ? (
              <Folder
                size={theme.icons.size}
                style={{ color: theme.colors.directoryIcon }}
                fill={theme.icons.style === "filled" ? "currentColor" : "none"}
              />
            ) : (
              <File
                size={theme.icons.size}
                style={{ color: theme.colors.fileIcon }}
                fill={theme.icons.style === "filled" ? "currentColor" : "none"}
              />
            )}
          </div>
        )}

        <span
          style={{
            flexGrow: 1,
            color: node.type === "directory" ? theme.colors.primary : theme.colors.textPrimary,
            fontWeight: node.type === "directory" ? "bold" : "normal",
          }}
        >
          {node.name}
        </span>

        {theme.layout.showFileSize && node.size && (
          <span
            style={{
              fontSize: "0.85em",
              color: theme.colors.textSecondary,
              marginLeft: theme.spacing.margin,
              fontFamily: theme.fonts.mono,
            }}
          >
            {formatBytes(node.size)}
          </span>
        )}

        {theme.layout.showLastModified && node.lastModified && (
          <span
            style={{
              fontSize: "0.8em",
              color: theme.colors.textSecondary,
              marginLeft: theme.spacing.margin,
            }}
          >
            {node.lastModified.toLocaleDateString()}
          </span>
        )}
      </div>
    ))
  }

  const extractFilePathsFromNode = (node: FileNode): string[] => {
    const paths: string[] = []

    const traverse = (n: FileNode) => {
      paths.push(n.path)
      if (n.children) {
        n.children.forEach(traverse)
      }
    }

    traverse(node)
    return paths
  }

  const exportPreview = async () => {
    if (!file) return

    try {
      const imageExportService = container.resolve("ImageExportService")

      if (file.type === "directory") {
        const filePaths = extractFilePathsFromNode(file)
        const result = await imageExportService.exportFileTreeAsImage([file], {
          width: 1200,
          height: 800,
          format: "png",
          theme: selectedTheme,
          backgroundColor: theme.colors.background,
          textColor: theme.colors.textPrimary,
        })

        if (result.success) {
          await imageExportService.downloadImage(result, `${file.name}-preview.png`)
        }
      }
    } catch (error) {
      console.error("Export failed:", error)
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
              {file.type === "directory" ? "Directory" : file.mimeType?.split("/")[1] || "File"}
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
          <Tabs defaultValue={file.type === "directory" ? "preview" : "details"} className="h-full flex flex-col">
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
                    <span className="font-medium">Path:</span> {file.path}
                  </p>
                  {file.size && (
                    <p>
                      <span className="font-medium">Size:</span> {formatBytes(file.size)}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Type:</span> {file.mimeType || file.type}
                  </p>
                  {file.lastModified && (
                    <p>
                      <span className="font-medium">Last Modified:</span> {file.lastModified.toLocaleString()}
                    </p>
                  )}
                  {file.type === "directory" && file.children && (
                    <p>
                      <span className="font-medium">Items:</span> {file.children.length}
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
                          <SelectItem key={theme.id} value={theme.id}>
                            {theme.name}
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
                      onValueChange={([value]) => setPreviewScale(value)}
                      className="w-24"
                    />
                    <span className="text-sm w-12">{previewScale}%</span>
                  </div>

                  {file.type === "directory" && (
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
                  {file.type === "directory" ? (
                    renderDirectoryPreview(file)
                  ) : isImage ? (
                    <div className="p-4 flex items-center justify-center">
                      <img
                        src={file.previewUrl || file.thumbnailUrl}
                        alt={file.name}
                        className="max-w-full max-h-[400px] object-contain"
                        style={{
                          transform: `scale(${previewScale / 100})`,
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
