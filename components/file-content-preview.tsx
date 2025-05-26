"use client"

import { useState, useEffect } from "react"
import { PhpWasmLoader } from "../lib/wasm/php-wasm-loader"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, FileText, ImageIcon } from "lucide-react"

interface FileContentPreviewProps {
  filePath: string | null
  onClose: () => void
}

export default function FileContentPreview({ filePath, onClose }: FileContentPreviewProps) {
  const [content, setContent] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) return

    const loadFileContent = async () => {
      setLoading(true)
      setError(null)

      try {
        const phpLoader = new PhpWasmLoader()
        const phpModule = await phpLoader.loadModule()
        const fileContent = await phpModule.getFileContents(filePath)

        if (fileContent) {
          setContent(fileContent)
        } else {
          setError(`Could not read file: ${filePath}`)
        }
      } catch (err) {
        console.error("Error reading file:", err)
        setError(`Error reading file: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    loadFileContent()
  }, [filePath])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-4 text-red-500">
          <p>{error}</p>
        </div>
      )
    }

    if (!content) {
      return (
        <div className="p-4 text-gray-500">
          <p>No content available</p>
        </div>
      )
    }

    if (content.type === "image") {
      return (
        <div className="flex items-center justify-center p-4">
          <img
            src={`data:image/png;base64,${btoa(content.content)}`}
            alt={filePath || ""}
            className="max-w-full max-h-[500px] object-contain"
          />
        </div>
      )
    }

    return (
      <Tabs defaultValue="preview">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="p-4">
          <div className="bg-white rounded-md p-4 border">
            <div dangerouslySetInnerHTML={{ __html: formatContent(content.content, getFileExtension(filePath)) }} />
          </div>
        </TabsContent>
        <TabsContent value="raw" className="p-4">
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[500px]">{content.content}</pre>
        </TabsContent>
      </Tabs>
    )
  }

  return (
    <Dialog open={!!filePath} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {content?.type === "image" ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {filePath ? filePath.split("/").pop() : "File Preview"}
          </DialogTitle>
          <DialogDescription>{filePath}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  )
}

function getFileExtension(filePath: string | null): string {
  if (!filePath) return ""
  const parts = filePath.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
}

function formatContent(content: string, extension: string): string {
  switch (extension) {
    case "html":
      return content
    case "md":
      return markdownToHtml(content)
    case "php":
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
    case "css":
    case "json":
      return `<pre class="bg-gray-100 p-4 rounded-md overflow-auto">${highlightCode(content, extension)}</pre>`
    default:
      return `<pre>${content}</pre>`
  }
}

function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  const html = markdown
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>")

  return html
}

function highlightCode(code: string, language: string): string {
  // Simple syntax highlighting
  // In a real implementation, you would use a library like Prism.js or highlight.js
  const escapedCode = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

  // Add some basic highlighting for keywords
  let highlighted = escapedCode

  if (language === "php") {
    highlighted = highlighted
      .replace(
        /\b(function|class|if|else|while|for|foreach|return|echo|print|include|require)\b/g,
        '<span style="color: #007acc;">$1</span>',
      )
      .replace(/\$\w+/g, '<span style="color: #e06c75;">$&</span>')
  } else if (language === "js" || language === "ts" || language === "jsx" || language === "tsx") {
    highlighted = highlighted
      .replace(
        /\b(function|class|if|else|while|for|return|const|let|var|import|export|from)\b/g,
        '<span style="color: #007acc;">$1</span>',
      )
      .replace(/\b(true|false|null|undefined)\b/g, '<span style="color: #d19a66;">$1</span>')
  }

  return highlighted
}
