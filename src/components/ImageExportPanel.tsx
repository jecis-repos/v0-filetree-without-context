"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, ImageIcon, Palette } from "lucide-react"
import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { DIContainer } from "../container/DIContainer"
import type { ExportOptions } from "../services/ImageExportService"

interface ImageExportPanelProps {
  fileTree: FileNode[]
  container: DIContainer
}

export const ImageExportPanel: React.FC<ImageExportPanelProps> = ({ fileTree, container }) => {
  const [options, setOptions] = useState<ExportOptions>({
    width: 1200,
    height: 800,
    format: "png",
    quality: 90,
    backgroundColor: "#ffffff",
    textColor: "#000000",
    fontSize: 12,
    includeStats: true,
    showFileTypes: true,
    visualizationType: "tree",
    theme: "light",
  })

  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  const exportImage = async (format: "jpeg" | "png" | "webp") => {
    if (!fileTree || fileTree.length === 0) {
      setError("No file tree data available to export. Please load some files first.")
      return
    }

    setIsExporting(true)
    setError(null)
    setExportResult(null)

    try {
      console.log("Exporting image with fileTree:", fileTree)

      const imageExportService = container.resolve("ImageExportService")
      const exportOptions = { ...options, format }

      console.log("Export options:", exportOptions)

      const result = await imageExportService.exportFileTreeAsImage(fileTree, exportOptions)

      console.log("Export result:", result)

      if (result.success) {
        setExportResult(result)
        // Auto-download the image
        await imageExportService.downloadImage(result, `file-tree-export.${format}`)
      } else {
        setError(result.error || "Export failed - please check the console for details")
      }
    } catch (err) {
      console.error("Export error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred during export")
    } finally {
      setIsExporting(false)
    }
  }

  const exportVisualization = async (type: "tree" | "sunburst" | "treemap") => {
    if (!fileTree || fileTree.length === 0) {
      setError("No file tree data available to export. Please load some files first.")
      return
    }

    setIsExporting(true)
    setError(null)
    setExportResult(null)

    try {
      console.log("Exporting visualization with fileTree:", fileTree)

      const imageExportService = container.resolve("ImageExportService")
      const exportOptions = { ...options, visualizationType: type }

      console.log("Visualization export options:", exportOptions)

      const result = await imageExportService.exportDirectoryVisualization(fileTree, exportOptions)

      console.log("Visualization export result:", result)

      if (result.success) {
        setExportResult(result)
        await imageExportService.downloadImage(result, `file-tree-${type}.${options.format}`)
      } else {
        setError(result.error || "Visualization export failed - please check the console for details")
      }
    } catch (err) {
      console.error("Visualization export error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred during visualization export")
    } finally {
      setIsExporting(false)
    }
  }

  const nodeCount = fileTree.reduce((count, node) => {
    const traverse = (n: FileNode): number => {
      let c = 1
      if (n.children) {
        c += n.children.reduce((acc, child) => acc + traverse(child), 0)
      }
      return c
    }
    return count + traverse(node)
  }, 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ImageIcon className="mr-2 h-5 w-5" />
          Image Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Options */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Width</Label>
              <Input
                type="number"
                value={options.width}
                onChange={(e) => handleOptionChange("width", Number.parseInt(e.target.value) || 1200)}
                min={400}
                max={4000}
              />
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <Input
                type="number"
                value={options.height}
                onChange={(e) => handleOptionChange("height", Number.parseInt(e.target.value) || 800)}
                min={300}
                max={3000}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quality ({options.quality}%)</Label>
            <Slider
              value={[options.quality || 90]}
              min={10}
              max={100}
              step={5}
              onValueChange={([value]) => handleOptionChange("quality", value)}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={options.backgroundColor}
                  onChange={(e) => handleOptionChange("backgroundColor", e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={options.backgroundColor}
                  onChange={(e) => handleOptionChange("backgroundColor", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={options.textColor}
                  onChange={(e) => handleOptionChange("textColor", e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={options.textColor}
                  onChange={(e) => handleOptionChange("textColor", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Font Size</Label>
            <Slider
              value={[options.fontSize || 12]}
              min={8}
              max={24}
              step={1}
              onValueChange={([value]) => handleOptionChange("fontSize", value)}
              className="w-full"
            />
            <div className="text-sm text-gray-500">{options.fontSize}px</div>
          </div>

          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={options.theme} onValueChange={(value) => handleOptionChange("theme", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Include Statistics</Label>
              <Switch
                checked={options.includeStats}
                onCheckedChange={(checked) => handleOptionChange("includeStats", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show File Types</Label>
              <Switch
                checked={options.showFileTypes}
                onCheckedChange={(checked) => handleOptionChange("showFileTypes", checked)}
              />
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Standard Export</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => exportImage("jpeg")}
                disabled={isExporting}
                variant="outline"
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                JPEG
              </Button>
              <Button
                onClick={() => exportImage("png")}
                disabled={isExporting}
                variant="outline"
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                PNG
              </Button>
              <Button
                onClick={() => exportImage("webp")}
                disabled={isExporting}
                variant="outline"
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                WebP
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Visualization Export</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => exportVisualization("tree")}
                disabled={isExporting}
                variant="outline"
                className="flex items-center"
              >
                <Palette className="h-4 w-4 mr-1" />
                Tree
              </Button>
              <Button
                onClick={() => exportVisualization("sunburst")}
                disabled={isExporting}
                variant="outline"
                className="flex items-center"
              >
                <Palette className="h-4 w-4 mr-1" />
                Sunburst
              </Button>
              <Button
                onClick={() => exportVisualization("treemap")}
                disabled={isExporting}
                variant="outline"
                className="flex items-center"
              >
                <Palette className="h-4 w-4 mr-1" />
                Treemap
              </Button>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">File Tree Nodes:</span>
            <Badge variant="outline">{nodeCount}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Estimated Size:</span>
            <Badge variant="outline">{Math.round((options.width * options.height * 3) / 1024)} KB</Badge>
          </div>
        </div>

        {/* Results */}
        {isExporting && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
            <span>Generating image...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {exportResult && (
          <Alert>
            <AlertDescription>
              Image exported successfully! Size: {Math.round((exportResult.metadata?.size || 0) / 1024)} KB
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
