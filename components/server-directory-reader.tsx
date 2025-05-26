"use client"

import { useState } from "react"
import { PhpWasmLoader } from "../lib/wasm/php-wasm-loader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, FolderOpen, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import FileContentPreview from "./file-content-preview"

interface ServerDirectoryReaderProps {
  onDirectoryLoaded: (tree: any) => void
}

export default function ServerDirectoryReader({ onDirectoryLoaded }: ServerDirectoryReaderProps) {
  const [path, setPath] = useState("/")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const readDirectory = async () => {
    setLoading(true)
    setError(null)

    try {
      const phpLoader = new PhpWasmLoader()
      const phpModule = await phpLoader.loadModule()

      // Create sample directory structure if it doesn't exist
      await phpModule.run(`<?php
      // Create sample directories and files if they don't exist
      $baseDir = '${path.replace(/'/g, "\\'")}';
      
      if (!is_dir($baseDir)) {
        mkdir($baseDir, 0777, true);
      }
      
      // Sample project structure
      $sampleFiles = [
        ['path' => $baseDir . '/README.md', 'content' => "# FileTree Explorer\\n\\nA WebAssembly-powered file tree visualization tool.\\n\\n## Features\\n\\n- Multiple rendering engines\\n- PHP-WASM integration\\n- File export capabilities"],
        ['path' => $baseDir . '/package.json', 'content' => '{"name":"filetree-explorer","version":"1.0.0","description":"WebAssembly-powered file tree visualization"}'],
        ['path' => $baseDir . '/index.php', 'content' => '<?php\\n\\necho "Hello, World!";\\n\\nphpinfo();'],
      ];
      
      // Create src directory
      $srcDir = $baseDir . '/src';
      if (!is_dir($srcDir)) {
        mkdir($srcDir, 0777, true);
      }
      
      // Create files in src directory
      $srcFiles = [
        ['path' => $srcDir . '/index.ts', 'content' => 'export function main() {\\n  console.log("FileTree Explorer initialized");\\n}'],
        ['path' => $srcDir . '/utils.ts', 'content' => 'export function formatSize(bytes: number): string {\\n  const units = ["B", "KB", "MB", "GB"];\\n  let size = bytes;\\n  let unitIndex = 0;\\n  \\n  while (size >= 1024 && unitIndex < units.length - 1) {\\n    size /= 1024;\\n    unitIndex++;\\n  }\\n  \\n  return \`$\{size.toFixed(1)\} $\{units[unitIndex]\}\`;\\n}'],
      ];
      
      // Create public directory
      $publicDir = $baseDir . '/public';
      if (!is_dir($publicDir)) {
        mkdir($publicDir, 0777, true);
      }
      
      // Create files in public directory
      $publicFiles = [
        ['path' => $publicDir . '/index.html', 'content' => '<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>FileTree Explorer</title>\\n</head>\\n<body>\\n  <h1>FileTree Explorer</h1>\\n  <div id="app"></div>\\n</body>\\n</html>'],
        ['path' => $publicDir . '/style.css', 'content' => 'body {\\n  font-family: sans-serif;\\n  margin: 0;\\n  padding: 20px;\\n}\\n\\nh1 {\\n  color: #333;\\n}'],
      ];
      
      // Write all files
      foreach (array_merge($sampleFiles, $srcFiles, $publicFiles) as $file) {
        if (!file_exists($file['path'])) {
          file_put_contents($file['path'], $file['content']);
        }
      }
      
      echo "Sample directory structure created at $baseDir";
    `)

      // Call the PHP scanDirectory function
      const result = await phpModule.callFunction("scanDirectory", [path])

      if (result) {
        // Convert the PHP result to a FileNode structure
        const tree = {
          name: path.split("/").pop() || path,
          type: "directory",
          path: path,
          children: result,
        }

        onDirectoryLoaded(tree)
      } else {
        setError(`Could not read directory: ${path}`)
      }
    } catch (err) {
      console.error("Error reading directory:", err)
      setError(`Error reading directory: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Server Directory Reader
          </CardTitle>
          <CardDescription>Read and display the server's file system using PHP-WASM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="Enter directory path..."
              disabled={loading}
            />
            <Button onClick={readDirectory} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderOpen className="w-4 h-4 mr-2" />}
              {loading ? "Reading..." : "Read"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-blue-500" />
            <span>PHP-WASM will create a sample directory structure if the path doesn't exist.</span>
          </div>
        </CardFooter>
      </Card>

      {selectedFile && <FileContentPreview filePath={selectedFile} onClose={() => setSelectedFile(null)} />}
    </>
  )
}
