export interface ImageGenerationOptions {
  width?: number
  height?: number
  format?: "jpeg" | "png" | "webp"
  quality?: number
  backgroundColor?: string
  textColor?: string
  fontFamily?: string
  fontSize?: number
  themeData?: any
  metadata?: any
}

export interface ImageExportResult {
  success: boolean
  data?: Blob
  url?: string
  metadata?: {
    format?: string
    size?: number
    width?: number
    height?: number
    [key: string]: any
  }
  error?: string
}

export class PhpImageProvider {
  private apiEndpoint: string

  constructor(endpoint?: string) {
    this.apiEndpoint = endpoint || process.env.PHP_ENDPOINT || "/api/php/image"
  }

  async generateFileTreeImage(filePaths: string[], options: ImageGenerationOptions = {}): Promise<ImageExportResult> {
    try {
      // Validate inputs
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        return {
          success: false,
          error: "No file paths provided",
        }
      }

      console.log("Generating file tree image with paths:", filePaths.slice(0, 10))

      // Set default options
      const defaultOptions: ImageGenerationOptions = {
        width: 1200,
        height: 800,
        format: "png",
        quality: 90,
        backgroundColor: "#ffffff",
        textColor: "#000000",
        fontSize: 12,
      }

      const mergedOptions = { ...defaultOptions, ...options }

      // Generate real image with actual file data
      return this.generateRealFileTreeImage(filePaths, mergedOptions)
    } catch (error) {
      console.error("Error generating file tree image:", error)
      return {
        success: false,
        error: error.message || "Failed to generate file tree image",
      }
    }
  }

  async generateDirectoryVisualization(
    filePaths: string[],
    options: ImageGenerationOptions & { visualizationType: "tree" | "sunburst" | "treemap" },
  ): Promise<ImageExportResult> {
    try {
      // Validate inputs
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        return {
          success: false,
          error: "No file paths provided",
        }
      }

      console.log("Generating directory visualization:", options.visualizationType)

      // Set default options
      const defaultOptions = {
        width: 1200,
        height: 800,
        format: "png",
        quality: 90,
        backgroundColor: "#ffffff",
        textColor: "#000000",
        fontSize: 12,
        visualizationType: "tree" as const,
      }

      const mergedOptions = { ...defaultOptions, ...options }

      // Generate real visualization with actual data
      return this.generateRealVisualization(filePaths, mergedOptions)
    } catch (error) {
      console.error("Error generating directory visualization:", error)
      return {
        success: false,
        error: error.message || "Failed to generate directory visualization",
      }
    }
  }

  private async generateRealFileTreeImage(
    filePaths: string[],
    options: ImageGenerationOptions,
  ): Promise<ImageExportResult> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      canvas.width = options.width || 1200
      canvas.height = options.height || 800
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve({
          success: false,
          error: "Could not create canvas context",
        })
        return
      }

      try {
        // Apply theme-based styling
        const isDark =
          options.backgroundColor === "#000000" ||
          options.backgroundColor?.includes("222.2") ||
          options.themeData?.colors?.background?.includes("222.2")

        const bgColor = isDark ? "#0f172a" : options.backgroundColor || "#ffffff"
        const textColor = isDark ? "#f8fafc" : options.textColor || "#000000"
        const headerColor = isDark ? "#1e293b" : "#2563eb"
        const headerTextColor = "#ffffff"
        const lineColor = isDark ? "#334155" : "#e5e7eb"
        const folderColor = isDark ? "#3b82f6" : "#2563eb"
        const fileColor = isDark ? "#64748b" : "#374151"

        // Fill background
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw enhanced header
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 60)
        gradient.addColorStop(0, headerColor)
        gradient.addColorStop(1, isDark ? "#334155" : "#1d4ed8")

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, 80)

        // Header shadow
        ctx.fillStyle = isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.1)"
        ctx.fillRect(0, 80, canvas.width, 4)

        // Header text
        ctx.fillStyle = headerTextColor
        ctx.font = `bold ${(options.fontSize || 12) + 8}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.fillText("📁 File Tree Structure", 30, 35)

        // File count and stats
        const stats = this.calculateRealStats(filePaths)
        ctx.font = `${(options.fontSize || 12) - 1}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.fillText(`${stats.files} files, ${stats.folders} folders`, 30, 60)
        ctx.fillText(`${stats.extensions.length} file types`, canvas.width - 200, 35)
        ctx.fillText(`Generated: ${new Date().toLocaleString()}`, canvas.width - 200, 60)

        // Content area
        ctx.fillStyle = textColor
        ctx.font = `${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`

        const lineHeight = (options.fontSize || 12) * 2.2
        let y = 110
        const leftMargin = 30

        // Parse and organize file paths with real structure
        const organizedPaths = this.organizeRealFilePaths(filePaths)
        console.log("Organized paths for rendering:", organizedPaths.length)

        // Draw file tree with enhanced styling
        for (let i = 0; i < organizedPaths.length && y < canvas.height - 100; i++) {
          const item = organizedPaths[i]
          const x = leftMargin + item.depth * 30

          // Draw connection lines with better styling
          if (item.depth > 0) {
            ctx.strokeStyle = lineColor
            ctx.lineWidth = 1.5
            ctx.setLineDash([2, 2])
            ctx.beginPath()

            // Vertical line from parent
            ctx.moveTo(x - 30, y - lineHeight)
            ctx.lineTo(x - 30, y - 8)

            // Horizontal line to item
            ctx.moveTo(x - 30, y - 8)
            ctx.lineTo(x - 8, y - 8)

            ctx.stroke()
            ctx.setLineDash([])
          }

          // Draw enhanced icons
          if (item.isDirectory) {
            // Folder icon with gradient
            const folderGradient = ctx.createLinearGradient(x, y - 14, x + 18, y + 2)
            folderGradient.addColorStop(0, folderColor)
            folderGradient.addColorStop(1, isDark ? "#1e40af" : "#1d4ed8")

            ctx.fillStyle = folderGradient
            ctx.fillRect(x, y - 14, 18, 14)

            // Folder tab
            ctx.fillStyle = folderColor
            ctx.fillRect(x, y - 16, 8, 2)

            // Folder highlight
            ctx.fillStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.3)"
            ctx.fillRect(x + 1, y - 13, 16, 2)
          } else {
            // File icon with type-specific styling
            const ext = item.name.split(".").pop()?.toLowerCase() || ""
            const typeColor = this.getEnhancedFileTypeColor(ext, isDark)

            // File background
            ctx.fillStyle = typeColor
            ctx.fillRect(x, y - 14, 16, 18)

            // File content area
            ctx.fillStyle = isDark ? "#1e293b" : "#ffffff"
            ctx.fillRect(x + 2, y - 12, 12, 14)

            // File type badge
            if (ext && ext.length <= 4) {
              ctx.fillStyle = typeColor
              ctx.font = `bold ${(options.fontSize || 12) - 4}px ${options.fontFamily || "Arial, sans-serif"}`
              const extText = ext.substring(0, 3).toUpperCase()
              const textWidth = ctx.measureText(extText).width
              ctx.fillText(extText, x + 8 - textWidth / 2, y - 2)
              ctx.font = `${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`
            }
          }

          // Draw file/folder name with proper truncation
          ctx.fillStyle = item.isDirectory ? (isDark ? "#e2e8f0" : "#1f2937") : isDark ? "#cbd5e1" : "#374151"

          const maxNameLength = Math.floor((canvas.width - x - 150) / ((options.fontSize || 12) * 0.6))
          const displayName =
            item.name.length > maxNameLength ? item.name.substring(0, maxNameLength - 3) + "..." : item.name

          ctx.fillText(displayName, x + 25, y)

          // Add file size and metadata
          if (!item.isDirectory) {
            ctx.fillStyle = isDark ? "#64748b" : "#9ca3af"
            ctx.font = `${(options.fontSize || 12) - 2}px ${options.fontFamily || "Arial, sans-serif"}`

            const sizeText = this.formatFileSize(item.size || this.estimateRealFileSize(item.name))
            const sizeWidth = ctx.measureText(sizeText).width
            ctx.fillText(sizeText, canvas.width - 120, y)

            // File extension badge
            const ext = item.name.split(".").pop()?.toLowerCase()
            if (ext) {
              ctx.fillStyle = this.getEnhancedFileTypeColor(ext, isDark)
              ctx.fillText(`.${ext}`, canvas.width - 120 - sizeWidth - 30, y)
            }

            ctx.font = `${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`
          }

          y += lineHeight
        }

        // Draw enhanced footer
        const footerGradient = ctx.createLinearGradient(0, canvas.height - 60, 0, canvas.height)
        footerGradient.addColorStop(0, isDark ? "#1e293b" : "#f8fafc")
        footerGradient.addColorStop(1, isDark ? "#0f172a" : "#f1f5f9")

        ctx.fillStyle = footerGradient
        ctx.fillRect(0, canvas.height - 60, canvas.width, 60)

        // Footer border
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, canvas.height - 60)
        ctx.lineTo(canvas.width, canvas.height - 60)
        ctx.stroke()

        // Footer content
        ctx.fillStyle = isDark ? "#94a3b8" : "#6b7280"
        ctx.font = `${(options.fontSize || 12) - 1}px ${options.fontFamily || "Arial, sans-serif"}`

        // Left side stats
        ctx.fillText(`Total Items: ${filePaths.length}`, 30, canvas.height - 35)
        ctx.fillText(`Canvas: ${canvas.width}×${canvas.height}px`, 30, canvas.height - 15)

        // Right side stats
        ctx.fillText(`Files: ${stats.files} | Folders: ${stats.folders}`, canvas.width - 250, canvas.height - 35)
        ctx.fillText(
          `Types: ${stats.extensions.slice(0, 3).join(", ")}${stats.extensions.length > 3 ? "..." : ""}`,
          canvas.width - 250,
          canvas.height - 15,
        )

        // Convert canvas to blob with proper quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                success: false,
                error: "Failed to convert canvas to blob",
              })
              return
            }

            const url = URL.createObjectURL(blob)
            console.log("Generated real file tree image:", {
              size: blob.size,
              width: canvas.width,
              height: canvas.height,
              fileCount: filePaths.length,
            })

            resolve({
              success: true,
              data: blob,
              url,
              metadata: {
                format: options.format || "png",
                size: blob.size,
                width: canvas.width,
                height: canvas.height,
                fileCount: filePaths.length,
                stats: stats,
                generatedBy: "RealPhpImageProvider",
                theme: isDark ? "dark" : "light",
              },
            })
          },
          `image/${options.format || "png"}`,
          options.quality ? options.quality / 100 : 0.9,
        )
      } catch (error) {
        console.error("Canvas rendering error:", error)
        resolve({
          success: false,
          error: `Canvas rendering failed: ${error.message}`,
        })
      }
    })
  }

  private organizeRealFilePaths(filePaths: string[]): Array<{
    name: string
    path: string
    depth: number
    isDirectory: boolean
    size?: number
  }> {
    const items: Array<{
      name: string
      path: string
      depth: number
      isDirectory: boolean
      size?: number
    }> = []

    // Create a set to track unique paths and avoid duplicates
    const processedPaths = new Set<string>()

    // Sort paths to ensure proper hierarchy
    const sortedPaths = [...filePaths]
      .filter((path) => path && typeof path === "string" && path.trim().length > 0)
      .sort((a, b) => {
        const aDepth = a.split("/").length
        const bDepth = b.split("/").length
        if (aDepth !== bDepth) return aDepth - bDepth
        return a.localeCompare(b)
      })

    console.log("Processing sorted paths:", sortedPaths.length)

    for (const path of sortedPaths) {
      if (processedPaths.has(path)) continue
      processedPaths.add(path)

      const cleanPath = path.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/")
      if (!cleanPath) continue

      const parts = cleanPath.split("/").filter(Boolean)
      const name = parts[parts.length - 1] || cleanPath
      const depth = Math.max(0, parts.length - 1)

      // Better directory detection
      const isDirectory = !name.includes(".") || path.endsWith("/") || sortedPaths.some((p) => p.startsWith(path + "/"))

      items.push({
        name,
        path: cleanPath,
        depth,
        isDirectory,
        size: isDirectory ? undefined : this.estimateRealFileSize(name),
      })

      // Add parent directories if they don't exist
      let currentPath = ""
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
        if (!processedPaths.has(currentPath)) {
          processedPaths.add(currentPath)
          items.push({
            name: parts[i],
            path: currentPath,
            depth: i,
            isDirectory: true,
          })
        }
      }
    }

    // Sort by depth then by name for proper tree structure
    return items.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  private calculateRealStats(filePaths: string[]) {
    const stats = {
      files: 0,
      folders: 0,
      extensions: new Set<string>(),
      totalSize: 0,
    }

    const processedPaths = new Set<string>()

    for (const path of filePaths) {
      if (!path || processedPaths.has(path)) continue
      processedPaths.add(path)

      const name = path.split("/").pop() || ""
      const isDirectory = !name.includes(".") || path.endsWith("/") || filePaths.some((p) => p.startsWith(path + "/"))

      if (isDirectory) {
        stats.folders++
      } else {
        stats.files++
        const ext = name.split(".").pop()?.toLowerCase()
        if (ext && ext.length <= 5) {
          stats.extensions.add(ext)
        }
        stats.totalSize += this.estimateRealFileSize(name)
      }
    }

    return {
      files: stats.files,
      folders: stats.folders,
      extensions: Array.from(stats.extensions).sort(),
      totalSize: stats.totalSize,
    }
  }

  private estimateRealFileSize(fileName: string): number {
    const extension = fileName.split(".").pop()?.toLowerCase()
    const sizeEstimates: Record<string, number> = {
      // Code files
      js: 4096,
      jsx: 4608,
      ts: 5120,
      tsx: 5632,
      vue: 3584,
      svelte: 3072,

      // Styles
      css: 2048,
      scss: 2560,
      sass: 2560,
      less: 2304,

      // Markup
      html: 3072,
      xml: 2048,
      svg: 1536,

      // Data
      json: 1024,
      yaml: 768,
      yml: 768,
      toml: 512,

      // Documentation
      md: 2048,
      txt: 1024,
      rst: 1536,

      // Images
      png: 65536,
      jpg: 98304,
      jpeg: 98304,
      gif: 32768,
      webp: 45056,
      ico: 4096,
      bmp: 131072,

      // Documents
      pdf: 524288,
      doc: 262144,
      docx: 131072,

      // Archives
      zip: 2097152,
      tar: 1048576,
      gz: 524288,

      // Media
      mp4: 20971520,
      mp3: 5242880,
      wav: 10485760,

      // Fonts
      ttf: 131072,
      otf: 131072,
      woff: 65536,
      woff2: 32768,
    }

    return sizeEstimates[extension || ""] || 2048
  }

  private getEnhancedFileTypeColor(extension: string, isDark: boolean): string {
    const lightColors: Record<string, string> = {
      js: "#f7df1e",
      jsx: "#61dafb",
      ts: "#3178c6",
      tsx: "#3178c6",
      vue: "#4fc08d",
      svelte: "#ff3e00",
      html: "#e34f26",
      css: "#1572b6",
      scss: "#cf649a",
      json: "#000000",
      xml: "#ff6600",
      svg: "#ff9500",
      md: "#083fa1",
      txt: "#6b7280",
      png: "#ff6b6b",
      jpg: "#ff6b6b",
      jpeg: "#ff6b6b",
      gif: "#ff6b6b",
      pdf: "#ff0000",
      zip: "#9333ea",
      mp4: "#ef4444",
      mp3: "#10b981",
    }

    const darkColors: Record<string, string> = {
      js: "#fbbf24",
      jsx: "#38bdf8",
      ts: "#60a5fa",
      tsx: "#60a5fa",
      vue: "#34d399",
      svelte: "#f87171",
      html: "#fb7185",
      css: "#38bdf8",
      scss: "#ec4899",
      json: "#f3f4f6",
      xml: "#fb923c",
      svg: "#fbbf24",
      md: "#60a5fa",
      txt: "#94a3b8",
      png: "#f87171",
      jpg: "#f87171",
      jpeg: "#f87171",
      gif: "#f87171",
      pdf: "#f87171",
      zip: "#a78bfa",
      mp4: "#f87171",
      mp3: "#34d399",
    }

    const colors = isDark ? darkColors : lightColors
    return colors[extension] || (isDark ? "#94a3b8" : "#6b7280")
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
    if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`
    return `${Math.round(bytes / (1024 * 1024 * 1024))}GB`
  }

  private async generateRealVisualization(
    filePaths: string[],
    options: ImageGenerationOptions & { visualizationType: "tree" | "sunburst" | "treemap" },
  ): Promise<ImageExportResult> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      canvas.width = options.width || 1200
      canvas.height = options.height || 800
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve({
          success: false,
          error: "Could not create canvas context",
        })
        return
      }

      try {
        const isDark =
          options.backgroundColor === "#000000" ||
          options.backgroundColor?.includes("222.2") ||
          options.themeData?.colors?.background?.includes("222.2")

        const bgColor = isDark ? "#0f172a" : options.backgroundColor || "#ffffff"
        const headerColor = isDark ? "#1e293b" : "#2563eb"

        // Fill background
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw header
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 80)
        gradient.addColorStop(0, headerColor)
        gradient.addColorStop(1, isDark ? "#334155" : "#1d4ed8")

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, 80)

        ctx.fillStyle = "#ffffff"
        ctx.font = `bold ${(options.fontSize || 12) + 8}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.fillText(`📊 ${options.visualizationType.toUpperCase()} Visualization`, 30, 35)

        ctx.font = `${(options.fontSize || 12) - 1}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.fillText(`${filePaths.length} items`, 30, 60)

        // Generate visualization based on type
        switch (options.visualizationType) {
          case "tree":
            this.drawRealTreeVisualization(ctx, filePaths, canvas.width, canvas.height - 80, options, isDark)
            break
          case "sunburst":
            this.drawRealSunburstVisualization(ctx, filePaths, canvas.width, canvas.height - 80, options, isDark)
            break
          case "treemap":
            this.drawRealTreemapVisualization(ctx, filePaths, canvas.width, canvas.height - 80, options, isDark)
            break
        }

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                success: false,
                error: "Failed to convert canvas to blob",
              })
              return
            }

            const url = URL.createObjectURL(blob)
            resolve({
              success: true,
              data: blob,
              url,
              metadata: {
                format: options.format || "png",
                size: blob.size,
                width: canvas.width,
                height: canvas.height,
                visualizationType: options.visualizationType,
                fileCount: filePaths.length,
                generatedBy: "RealPhpImageProvider",
                theme: isDark ? "dark" : "light",
              },
            })
          },
          `image/${options.format || "png"}`,
          options.quality ? options.quality / 100 : 0.9,
        )
      } catch (error) {
        resolve({
          success: false,
          error: `Visualization generation failed: ${error.message}`,
        })
      }
    })
  }

  private drawRealTreeVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
    isDark: boolean,
  ) {
    const tree = this.parsePathsToRealTree(filePaths)
    const lineHeight = (options.fontSize || 12) * 2.5
    const startY = 100
    const startX = 40

    const textColor = isDark ? "#e2e8f0" : "#1f2937"
    const lineColor = isDark ? "#475569" : "#d1d5db"
    const folderColor = isDark ? "#3b82f6" : "#2563eb"

    const drawNode = (node: any, x: number, y: number, level: number): number => {
      if (y > height - 40) return y

      // Draw connection lines
      if (level > 0) {
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(x - 25, y - lineHeight / 2)
        ctx.lineTo(x - 25, y - 5)
        ctx.lineTo(x - 5, y - 5)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw enhanced node icons
      if (node.isDirectory) {
        ctx.fillStyle = folderColor
        ctx.fillRect(x, y - 12, 18, 14)
        ctx.fillStyle = isDark ? "#60a5fa" : "#93c5fd"
        ctx.fillRect(x + 2, y - 10, 14, 10)
      } else {
        const ext = node.name.split(".").pop()?.toLowerCase() || ""
        ctx.fillStyle = this.getEnhancedFileTypeColor(ext, isDark)
        ctx.fillRect(x, y - 12, 16, 16)
        ctx.fillStyle = isDark ? "#1e293b" : "#ffffff"
        ctx.fillRect(x + 2, y - 10, 12, 12)
      }

      // Draw name
      ctx.fillStyle = node.isDirectory ? textColor : isDark ? "#cbd5e1" : "#374151"
      ctx.font = `${node.isDirectory ? "bold " : ""}${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`

      const maxWidth = width - x - 100
      const displayName = this.truncateText(ctx, node.name, maxWidth)
      ctx.fillText(displayName, x + 25, y)

      let newY = y + lineHeight

      // Draw children
      if (node.children && node.children.length > 0) {
        for (const child of node.children.slice(0, 50)) {
          // Limit for performance
          newY = drawNode(child, x + 35, newY, level + 1)
        }
      }

      return newY
    }

    if (tree.children && tree.children.length > 0) {
      for (const child of tree.children) {
        drawNode(child, startX, startY, 0)
      }
    }
  }

  private drawRealSunburstVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
    isDark: boolean,
  ) {
    const centerX = width / 2
    const centerY = (height + 80) / 2
    const maxRadius = Math.min(width, height - 80) / 2 - 60

    const tree = this.parsePathsToRealTree(filePaths)

    const drawSunburst = (node: any, startAngle: number, endAngle: number, innerRadius: number, level: number) => {
      const outerRadius = Math.min(innerRadius + 50, maxRadius)

      // Calculate colors
      const hue = node.isDirectory ? 210 + level * 30 : 60 + (node.name.charCodeAt(0) % 300)
      const saturation = isDark ? 70 : 60
      const lightness = isDark ? Math.max(40, 70 - level * 10) : Math.max(30, 80 - level * 15)

      // Draw arc
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle)
      ctx.arc(centerX, centerY, outerRadius, endAngle, startAngle, true)
      ctx.closePath()

      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      ctx.fill()

      ctx.strokeStyle = isDark ? "#1e293b" : "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw labels for larger segments
      const angleWidth = endAngle - startAngle
      if (angleWidth > 0.2 && outerRadius - innerRadius > 25) {
        const angle = (startAngle + endAngle) / 2
        const midRadius = (innerRadius + outerRadius) / 2

        ctx.save()
        ctx.translate(centerX + Math.cos(angle) * midRadius, centerY + Math.sin(angle) * midRadius)
        ctx.rotate(angle > Math.PI / 2 && angle < (3 * Math.PI) / 2 ? angle + Math.PI : angle)

        ctx.fillStyle = lightness > 50 ? "#000000" : "#ffffff"
        ctx.font = `${Math.min(14, options.fontSize || 12)}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.textAlign = "center"

        const displayName = node.name.length > 15 ? node.name.substring(0, 15) + "..." : node.name
        ctx.fillText(displayName, 0, 4)
        ctx.restore()
      }

      // Draw children
      if (node.children && node.children.length > 0 && outerRadius < maxRadius) {
        const totalChildren = node.children.length
        let currentAngle = startAngle

        for (let i = 0; i < Math.min(totalChildren, 20); i++) {
          // Limit for performance
          const child = node.children[i]
          const childAngleWidth = (endAngle - startAngle) / totalChildren
          const childEndAngle = currentAngle + childAngleWidth

          drawSunburst(child, currentAngle, childEndAngle, outerRadius, level + 1)
          currentAngle = childEndAngle
        }
      }
    }

    // Draw center
    ctx.beginPath()
    ctx.arc(centerX, centerY, 35, 0, 2 * Math.PI)
    ctx.fillStyle = isDark ? "#1e293b" : "#1f2937"
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.font = `bold ${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`
    ctx.textAlign = "center"
    ctx.fillText("ROOT", centerX, centerY + 4)

    if (tree.children && tree.children.length > 0) {
      const anglePerChild = (2 * Math.PI) / tree.children.length
      let currentAngle = 0

      for (const child of tree.children) {
        drawSunburst(child, currentAngle, currentAngle + anglePerChild, 40, 0)
        currentAngle += anglePerChild
      }
    }
  }

  private drawRealTreemapVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
    isDark: boolean,
  ) {
    const tree = this.parsePathsToRealTree(filePaths)

    // Calculate weights based on file count
    const calculateWeight = (node: any): number => {
      if (!node.children || node.children.length === 0) {
        return 1
      }
      let weight = 0
      for (const child of node.children) {
        weight += calculateWeight(child)
      }
      node.weight = weight
      return weight
    }

    calculateWeight(tree)

    const drawTreemap = (node: any, x: number, y: number, boxWidth: number, boxHeight: number, level: number) => {
      if (boxWidth < 15 || boxHeight < 15) return

      // Calculate colors
      const hue = node.isDirectory ? 210 + level * 40 : 60 + (node.name.charCodeAt(0) % 300)
      const saturation = isDark ? 60 : 70
      const lightness = isDark ? Math.max(35, 75 - level * 12) : Math.max(40, 85 - level * 10)

      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      ctx.fillRect(x, y, boxWidth, boxHeight)

      ctx.strokeStyle = isDark ? "#0f172a" : "#ffffff"
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, boxWidth, boxHeight)

      // Draw labels
      if (boxWidth > 80 && boxHeight > 40) {
        ctx.fillStyle = lightness > 60 ? "#000000" : "#ffffff"
        ctx.font = `bold ${Math.min(16, options.fontSize || 12)}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.textAlign = "left"

        const maxChars = Math.floor(boxWidth / 10)
        const displayName = node.name.length > maxChars ? node.name.substring(0, maxChars - 3) + "..." : node.name
        ctx.fillText(displayName, x + 10, y + 25)

        if (node.isDirectory && node.children) {
          ctx.font = `${Math.min(12, options.fontSize || 12) - 2}px ${options.fontFamily || "Arial, sans-serif"}`
          ctx.fillText(`${node.children.length} items`, x + 10, y + 45)
        }
      }

      // Draw children
      if (node.children && node.children.length > 0 && boxWidth > 30 && boxHeight > 30) {
        const sortedChildren = [...node.children].sort((a, b) => (b.weight || 1) - (a.weight || 1)).slice(0, 15) // Limit for performance

        const padding = 6
        const availableWidth = boxWidth - padding * 2
        const availableHeight = boxHeight - padding * 2 - (boxHeight > 50 ? 50 : 0)

        if (availableWidth > 0 && availableHeight > 0) {
          const isHorizontal = availableWidth > availableHeight
          let currentPosition = 0
          const totalWeight = sortedChildren.reduce((sum, child) => sum + (child.weight || 1), 0)

          for (const child of sortedChildren) {
            const childWeight = child.weight || 1
            const ratio = childWeight / totalWeight

            if (isHorizontal) {
              const childWidth = availableWidth * ratio
              drawTreemap(
                child,
                x + padding + currentPosition,
                y + padding + (boxHeight > 50 ? 50 : 0),
                childWidth,
                availableHeight,
                level + 1,
              )
              currentPosition += childWidth
            } else {
              const childHeight = availableHeight * ratio
              drawTreemap(
                child,
                x + padding,
                y + padding + (boxHeight > 50 ? 50 : 0) + currentPosition,
                availableWidth,
                childHeight,
                level + 1,
              )
              currentPosition += childHeight
            }
          }
        }
      }
    }

    drawTreemap(tree, 40, 100, width - 80, height - 140, 0)
  }

  private parsePathsToRealTree(filePaths: string[]) {
    const root = {
      name: "root",
      isDirectory: true,
      children: [],
      weight: 0,
    }

    const pathMap = new Map()
    pathMap.set("", root)

    // Sort paths for proper hierarchy
    const sortedPaths = [...filePaths].filter((path) => path && typeof path === "string").sort()

    for (const path of sortedPaths) {
      const cleanPath = path.replace(/^\/+|\/+$/g, "")
      if (!cleanPath) continue

      const parts = cleanPath.split("/").filter(Boolean)
      let currentPath = ""
      let currentNode = root

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isLast = i === parts.length - 1
        const isDirectory = !isLast || !part.includes(".")

        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (!pathMap.has(currentPath)) {
          const newNode = {
            name: part,
            isDirectory,
            children: isDirectory ? [] : undefined,
            weight: 0,
          }

          currentNode.children.push(newNode)
          pathMap.set(currentPath, newNode)
        }

        if (!isLast) {
          currentNode = pathMap.get(currentPath)
        }
      }
    }

    return root
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text)
    if (metrics.width <= maxWidth) return text

    let truncated = text
    while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + "..."
  }
}
