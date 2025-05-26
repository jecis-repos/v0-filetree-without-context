"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Link, AlertCircle, Check } from "lucide-react"
import type { DIContainer } from "../container/DIContainer"
import type { FileNode } from "../interfaces/IFileSystemProvider"

interface FileImportPanelProps {
  container: DIContainer
  onImportComplete: (nodes: FileNode[]) => void
}

export const FileImportPanel: React.FC<FileImportPanelProps> = ({ container, onImportComplete }) => {
  const [urlInput, setUrlInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const fileImporter = container.resolve("IFileImporter")
      const result = await fileImporter.importFromLocalFile(files[0])

      if (result.success && result.data) {
        setSuccess(`Successfully imported ${files[0].name}`)
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

    try {
      const fileImporter = container.resolve("IFileImporter")
      const result = await fileImporter.importFromUrl(urlInput)

      if (result.success && result.data) {
        setSuccess(`Successfully imported data from ${urlInput}`)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Files</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="file">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="url">Import from URL</TabsTrigger>
          </TabsList>

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
          </TabsContent>

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
              <p className="text-xs text-gray-500 dark:text-gray-400">Import file tree from a JSON endpoint</p>
            </div>
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

        {isLoading && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
