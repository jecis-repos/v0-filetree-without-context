"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Link, FileJson, FolderOpen } from "lucide-react"
import type { DIContainer } from "../container/DIContainer"
import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { ImportResult } from "../interfaces/IFileImporter"

interface FileImportPanelProps {
  container: DIContainer
  onImportComplete?: (nodes: FileNode[]) => void
}

export const FileImportPanel: React.FC<FileImportPanelProps> = ({ container, onImportComplete }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [importUrl, setImportUrl] = useState("")
  const [jsonContent, setJsonContent] = useState("")
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsLoading(true)
    setError(null)
    setImportResult(null)

    try {
      const fileImporter = container.resolve("IFileImporter")
      const result = await fileImporter.importFromFiles(files)

      setImportResult(result)

      if (result.success && onImportComplete) {
        onImportComplete(result.nodes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import files")
    } finally {
      setIsLoading(false)
      // Reset the input value so the same file can be selected again
      event.target.value = ""
    }
  }

  const handleDirectoryUpload = async () => {
    try {
      // @ts-ignore - showDirectoryPicker is not in the TypeScript types yet
      const directoryHandle = await window.showDirectoryPicker()

      setIsLoading(true)
      setError(null)
      setImportResult(null)

      const fileImporter = container.resolve("IFileImporter")
      const result = await fileImporter.importFromDirectory(directoryHandle)

      setImportResult(result)

      if (result.success && onImportComplete) {
        onImportComplete(result.nodes)
      }
    } catch (err) {
      // User cancelled or API not supported
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleUrlImport = async () => {
    if (!importUrl.trim()) {
      setError("Please enter a URL")
      return
    }

    setIsLoading(true)
    setError(null)
    setImportResult(null)

    try {
      const fileImporter = container.resolve("IFileImporter")
      const result = await fileImporter.importFromUrl(importUrl)

      setImportResult(result)

      if (result.success && onImportComplete) {
        onImportComplete(result.nodes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import from URL")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJsonImport = async () => {
    if (!jsonContent.trim()) {
      setError("Please enter JSON content")
      return
    }

    setIsLoading(true)
    setError(null)
    setImportResult(null)

    try {
      const fileImporter = container.resolve("IFileImporter")
      const result = await fileImporter.importFromJSON(jsonContent)

      setImportResult(result)

      if (result.success && onImportComplete) {
        onImportComplete(result.nodes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import JSON")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="mr-2 h-5 w-5" />
          Import Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="file">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload Files</Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={isLoading}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">Select one or more files to import</p>
            </div>
          </TabsContent>

          <TabsContent value="directory" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Directory</Label>
              <Button onClick={handleDirectoryUpload} disabled={isLoading} className="w-full">
                <FolderOpen className="mr-2 h-4 w-4" />
                Select Directory
              </Button>
              <p className="text-xs text-gray-500">
                Select a directory to import its structure (requires modern browser)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-url">Import from URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="import-url"
                  type="url"
                  placeholder="https://example.com/file-tree.json"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  disabled={isLoading}
                />
                <Button onClick={handleUrlImport} disabled={isLoading}>
                  <Link className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
              <p className="text-xs text-gray-500">Enter a URL to a JSON file containing file tree structure</p>
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="json-content">JSON Content</Label>
              <textarea
                id="json-content"
                className="w-full h-32 p-2 border rounded-md resize-none"
                placeholder='{"name": "root", "type": "directory", "children": [...]}'
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                disabled={isLoading}
              />
              <Button onClick={handleJsonImport} disabled={isLoading} className="w-full">
                <FileJson className="mr-2 h-4 w-4" />
                Import JSON
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
            <span>Importing...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {importResult && (
          <Alert className={importResult.success ? "mt-4 bg-green-50" : "mt-4 bg-yellow-50"}>
            <AlertDescription>
              {importResult.success
                ? `Successfully imported ${importResult.importedFiles} files`
                : `Import completed with issues: ${importResult.errors.join(", ")}`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
