"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Link, AlertCircle, Check, Info } from "lucide-react"
import type { DIContainer } from "../container/DIContainer"
import type { FileNode } from "../interfaces/IFileSystemProvider"

interface FileImportPanelProps {
  container: DIContainer
  onImportComplete: (nodes: FileNode[]) => void
}

export const FileImportPanel: React.FC<FileImportPanelProps> = ({ container, onImportComplete }) => {
  const [urlInput, setUrlInput] = useState("https://ab-file-explorer.athleticnext.workers.dev/?file=regular")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importStats, setImportStats] = useState<{ files: number; directories: number } | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setImportStats(null)

    try {
      const fileImporter = container.resolve("IFileImporter")
      const result = await fileImporter.importFromLocalFile(files[0])

      if (result.success && result.data) {
        const stats = calculateImportStats(result.data)
        setImportStats(stats)
        setSuccess(`Successfully imported ${files[0].name} - ${stats.files} files, ${stats.directories} directories`)
        onImportComplete(result.data)
      } else {
        setError(result.error || "Failed to import file")
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
      // Reset file input
      event.target.value = ""
    }
  }

  const handleUrlImport = async () => {
    if (!urlInput.trim()) {
      setError("Please enter a URL")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setImportStats(null)

    try {
      const fileImporter = container.resolve("IFileImporter")
      const result = await fileImporter.importFromUrl(urlInput)

      if (result.success && result.data) {
        const stats = calculateImportStats(result.data)
        setImportStats(stats)
        setSuccess(`Successfully imported data from URL - ${stats.files} files, ${stats.directories} directories`)
        onImportComplete(result.data)
      } else {
        setError(result.error || "Failed to import from URL")
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateImportStats = (nodes: FileNode[]): { files: number; directories: number } => {
    let files = 0
    let directories = 0

    const traverse = (node: FileNode) => {
      if (node.type === "file") {
        files++
      } else {
        directories++
      }

      if (node.children) {
        node.children.forEach(traverse)
      }
    }

    nodes.forEach(traverse)
    return { files, directories }
  }

  const loadExampleUrl = () => {
    setUrlInput("https://ab-file-explorer.athleticnext.workers.dev/?file=regular")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Files</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="url">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">Import from URL</TabsTrigger>
            <TabsTrigger value="file">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 pt-4">
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="url-input" className="text-sm font-medium">
                Enter URL
              </label>
              <div className="flex w-full items-center space-x-2">
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/file-tree.json"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isLoading}
                />
                <Button onClick={handleUrlImport} disabled={isLoading || !urlInput.trim()}>
                  <Link className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">Import file tree from a JSON endpoint</p>
                <Button variant="ghost" size="sm" onClick={loadExampleUrl}>
                  Load Example
                </Button>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Supported Formats</AlertTitle>
              <AlertDescription className="space-y-2">
                <div>
                  <strong>Flat file paths:</strong>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                    {`{
  "name": "Project Name",
  "filepaths": [
    "src/index.ts",
    "package.json",
    "README.md"
  ]
}`}
                  </pre>
                </div>
                <div>
                  <strong>Hierarchical structure:</strong> Standard file tree with nested objects
                </div>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 pt-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label htmlFor="file-upload" className="text-sm font-medium">
                Select JSON file
              </label>
              <Input id="file-upload" type="file" accept=".json" onChange={handleFileUpload} disabled={isLoading} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload a JSON file containing file tree structure
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>File Format Examples</AlertTitle>
              <AlertDescription>
                <p className="text-xs">
                  Your JSON file can contain either a flat array of file paths or a hierarchical file tree structure.
                  Both formats will be automatically converted to a browsable file tree.
                </p>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {importStats && (
          <div className="mt-4 flex gap-2">
            <Badge variant="outline">{importStats.files} files</Badge>
            <Badge variant="outline">{importStats.directories} directories</Badge>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
