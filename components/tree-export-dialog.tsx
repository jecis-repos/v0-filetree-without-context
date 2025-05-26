"use client"

import { useState } from "react"
import { TreeExporter, type ExportOptions } from "../lib/export/tree-exporter"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Download, ImageIcon, Loader2 } from "lucide-react"

interface TreeExportDialogProps {
  treeContainer: HTMLElement | null
}

export default function TreeExportDialog({ treeContainer }: TreeExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: "png",
    quality: 0.9,
    scale: 2,
    backgroundColor: "#ffffff",
    includeMetadata: true,
  })
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const handleExport = async () => {
    if (!treeContainer) return

    setLoading(true)
    try {
      const exporter = new TreeExporter()
      const dataUrl = await exporter.exportAsImage(treeContainer, options)
      setPreview(dataUrl)

      // Trigger download
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `filetree-export.${options.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ImageIcon className="h-4 w-4" />
          Export as Image
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export File Tree as Image</DialogTitle>
          <DialogDescription>Configure export options and download the file tree as an image.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select
              value={options.format}
              onValueChange={(value: "png" | "jpeg" | "webp") => setOptions((prev) => ({ ...prev, format: value }))}
            >
              <SelectTrigger id="format" className="col-span-3">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(options.format === "jpeg" || options.format === "webp") && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quality" className="text-right">
                Quality
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Slider
                  id="quality"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={[options.quality || 0.9]}
                  onValueChange={(value) => setOptions((prev) => ({ ...prev, quality: value[0] }))}
                  className="flex-1"
                />
                <span className="w-12 text-sm">{Math.round((options.quality || 0.9) * 100)}%</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scale" className="text-right">
              Scale
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Slider
                id="scale"
                min={1}
                max={4}
                step={0.5}
                value={[options.scale || 2]}
                onValueChange={(value) => setOptions((prev) => ({ ...prev, scale: value[0] }))}
                className="flex-1"
              />
              <span className="w-12 text-sm">{options.scale || 2}x</span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bg-color" className="text-right">
              Background
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="bg-color"
                type="color"
                value={options.backgroundColor || "#ffffff"}
                onChange={(e) => setOptions((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-12 h-8 p-0 border-0"
              />
              <Input
                value={options.backgroundColor || "#ffffff"}
                onChange={(e) => setOptions((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="metadata" className="text-right">
              Include Metadata
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="metadata"
                checked={options.includeMetadata}
                onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, includeMetadata: checked }))}
              />
              <Label htmlFor="metadata">Add timestamp and source info</Label>
            </div>
          </div>
        </div>

        {preview && (
          <div className="mt-2 border rounded-md p-2 overflow-hidden">
            <img
              src={preview || "/placeholder.svg"}
              alt="Export Preview"
              className="max-w-full h-auto"
              style={{ maxHeight: "200px" }}
            />
          </div>
        )}

        <DialogFooter>
          <Button type="submit" onClick={handleExport} disabled={loading || !treeContainer}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export & Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
