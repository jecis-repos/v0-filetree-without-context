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

      // For now, we'll create a client-side generated image since PHP endpoint may not be available
      return this.generateClientSideImage(filePaths, mergedOptions)
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

      // For now, we'll create a client-side generated image
      return this.generateClientSideVisualization(filePaths, mergedOptions)
    } catch (error) {
      console.error("Error generating directory visualization:", error)
      return {
        success: false,
        error: error.message || "Failed to generate directory visualization",
      }
    }
  }

  private async generateClientSideImage(
    filePaths: string[],
    options: ImageGenerationOptions,
  ): Promise<ImageExportResult> {
    return new Promise((resolve) => {
      // Validate input
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        resolve({
          success: false,
          error: "No file paths provided for image generation",
        })
        return
      }

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
        // Fill background
        ctx.fillStyle = options.backgroundColor || "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Set text properties
        const fontSize = options.fontSize || 12
        const fontFamily = options.fontFamily || "Arial, sans-serif"
        ctx.fillStyle = options.textColor || "#000000"
        ctx.font = `${fontSize}px ${fontFamily}`

        // Draw header with better styling
        ctx.fillStyle = "#2563eb"
        ctx.fillRect(0, 0, canvas.width, 60)

        ctx.fillStyle = "#ffffff"
        ctx.font = `bold ${fontSize + 6}px ${fontFamily}`
        ctx.fillText("📁 File Tree Structure", 20, 35)

        // Draw file count info
        ctx.fillStyle = "#ffffff"
        ctx.font = `${fontSize - 2}px ${fontFamily}`
        ctx.fillText(`${filePaths.length} items`, canvas.width - 120, 35)

        // Reset for content area
        ctx.fillStyle = options.textColor || "#000000"
        ctx.font = `${fontSize}px ${fontFamily}`

        const lineHeight = fontSize * 1.8
        let y = 90
        const leftMargin = 30

        // Parse and organize file paths
        const organizedPaths = this.organizeFilePaths(filePaths)

        // Draw organized file tree
        for (const item of organizedPaths) {
          if (y > canvas.height - 60) break

          const x = leftMargin + item.depth * 25

          // Draw connection lines
          if (item.depth > 0) {
            ctx.strokeStyle = "#e5e7eb"
            ctx.lineWidth = 1
            ctx.beginPath()

            // Vertical line from parent
            ctx.moveTo(x - 25, y - lineHeight)
            ctx.lineTo(x - 25, y - 5)

            // Horizontal line to item
            ctx.moveTo(x - 25, y - 5)
            ctx.lineTo(x - 5, y - 5)

            ctx.stroke()
          }

          // Draw file/folder icon with better styling
          if (item.isDirectory) {
            // Folder icon
            ctx.fillStyle = "#3b82f6"
            ctx.fillRect(x, y - 12, 16, 12)
            ctx.fillStyle = "#60a5fa"
            ctx.fillRect(x + 2, y - 10, 12, 8)

            // Folder tab
            ctx.fillStyle = "#3b82f6"
            ctx.fillRect(x, y - 14, 6, 2)
          } else {
            // File icon with type-specific colors
            const ext = item.name.split(".").pop()?.toLowerCase() || ""
            ctx.fillStyle = this.getFileTypeColor(ext)
            ctx.fillRect(x, y - 12, 14, 16)

            // File content area
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(x + 2, y - 10, 10, 12)

            // File type indicator
            if (ext) {
              ctx.fillStyle = this.getFileTypeColor(ext)
              ctx.font = `bold ${fontSize - 4}px ${fontFamily}`
              ctx.fillText(ext.substring(0, 3).toUpperCase(), x + 3, y - 2)
              ctx.font = `${fontSize}px ${fontFamily}`
            }
          }

          // Draw file/folder name with truncation
          ctx.fillStyle = item.isDirectory ? "#1f2937" : "#374151"
          const maxNameLength = Math.floor((canvas.width - x - 40) / (fontSize * 0.6))
          const displayName =
            item.name.length > maxNameLength ? item.name.substring(0, maxNameLength - 3) + "..." : item.name

          ctx.fillText(displayName, x + 20, y)

          // Add file size for files
          if (!item.isDirectory && item.size) {
            ctx.fillStyle = "#9ca3af"
            ctx.font = `${fontSize - 2}px ${fontFamily}`
            const sizeText = this.formatFileSize(item.size)
            ctx.fillText(sizeText, canvas.width - 100, y)
            ctx.font = `${fontSize}px ${fontFamily}`
          }

          y += lineHeight
        }

        // Draw footer with metadata
        ctx.fillStyle = "#f3f4f6"
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50)

        ctx.fillStyle = "#6b7280"
        ctx.font = `${fontSize - 2}px ${fontFamily}`
        ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 20, canvas.height - 25)
        ctx.fillText(`Canvas: ${canvas.width}×${canvas.height}`, 20, canvas.height - 10)

        const stats = this.calculateStats(filePaths)
        ctx.fillText(`Files: ${stats.files} | Folders: ${stats.folders}`, canvas.width - 200, canvas.height - 25)
        ctx.fillText(`Types: ${stats.extensions.join(", ")}`, canvas.width - 200, canvas.height - 10)

        // Convert canvas to blob
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
                fileCount: filePaths.length,
                generatedBy: "ClientSide",
              },
            })
          },
          `image/${options.format || "png"}`,
          options.quality ? options.quality / 100 : 0.9,
        )
      } catch (error) {
        resolve({
          success: false,
          error: `Canvas rendering failed: ${error.message}`,
        })
      }
    })
  }

  private organizeFilePaths(filePaths: string[]): Array<{
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

    // Sort paths to ensure proper hierarchy
    const sortedPaths = [...filePaths].sort()

    for (const path of sortedPaths) {
      if (!path || typeof path !== "string") continue

      const parts = path.split("/").filter(Boolean)
      const name = parts[parts.length - 1] || path
      const depth = Math.max(0, parts.length - 1)
      const isDirectory = !name.includes(".") || path.endsWith("/")

      items.push({
        name,
        path,
        depth,
        isDirectory,
        size: isDirectory ? undefined : this.estimateFileSize(name),
      })
    }

    return items
  }

  private calculateStats(filePaths: string[]) {
    const stats = {
      files: 0,
      folders: 0,
      extensions: new Set<string>(),
    }

    for (const path of filePaths) {
      const name = path.split("/").pop() || ""
      const isDirectory = !name.includes(".") || path.endsWith("/")

      if (isDirectory) {
        stats.folders++
      } else {
        stats.files++
        const ext = name.split(".").pop()?.toLowerCase()
        if (ext) {
          stats.extensions.add(ext)
        }
      }
    }

    return {
      files: stats.files,
      folders: stats.folders,
      extensions: Array.from(stats.extensions).slice(0, 5), // Limit to 5 extensions
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
    return `${Math.round(bytes / (1024 * 1024))}MB`
  }

  private estimateFileSize(fileName: string): number {
    const extension = fileName.split(".").pop()?.toLowerCase()
    const sizeEstimates: Record<string, number> = {
      js: 3072,
      ts: 3584,
      jsx: 3200,
      tsx: 3800,
      json: 1536,
      html: 2048,
      css: 1536,
      scss: 1800,
      md: 2048,
      txt: 1024,
      png: 51200,
      jpg: 76800,
      jpeg: 76800,
      gif: 25600,
      svg: 2048,
      pdf: 204800,
      zip: 1048576,
      mp4: 10485760,
      mp3: 3145728,
    }
    return sizeEstimates[extension || ""] || 1024
  }

  private getFileTypeColor(extension: string): string {
    const colorMap: Record<string, string> = {
      js: "#f7df1e",
      jsx: "#61dafb",
      ts: "#3178c6",
      tsx: "#3178c6",
      html: "#e34f26",
      css: "#1572b6",
      scss: "#cf649a",
      json: "#000000",
      md: "#083fa1",
      png: "#ff6b6b",
      jpg: "#ff6b6b",
      jpeg: "#ff6b6b",
      gif: "#ff6b6b",
      pdf: "#ff0000",
      txt: "#6b7280",
      xml: "#ff6600",
      svg: "#ff9500",
      zip: "#9333ea",
      mp4: "#ef4444",
      mp3: "#10b981",
    }
    return colorMap[extension] || "#6b7280"
  }

  private async generateClientSideVisualization(
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

      // Fill background
      ctx.fillStyle = options.backgroundColor || "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw header
      ctx.fillStyle = "#2563eb"
      ctx.fillRect(0, 0, canvas.width, 60)

      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${(options.fontSize || 12) + 6}px ${options.fontFamily || "Arial, sans-serif"}`
      ctx.fillText(`📊 ${options.visualizationType.toUpperCase()} Visualization`, 20, 35)

      // Different visualization types
      switch (options.visualizationType) {
        case "tree":
          this.drawEnhancedTreeVisualization(ctx, filePaths, canvas.width, canvas.height - 60, options)
          break
        case "sunburst":
          this.drawEnhancedSunburstVisualization(ctx, filePaths, canvas.width, canvas.height - 60, options)
          break
        case "treemap":
          this.drawEnhancedTreemapVisualization(ctx, filePaths, canvas.width, canvas.height - 60, options)
          break
      }

      // Add metadata footer
      ctx.fillStyle = "#f3f4f6"
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40)

      ctx.fillStyle = "#6b7280"
      ctx.font = `${(options.fontSize || 12) - 2}px ${options.fontFamily || "Arial, sans-serif"}`
      ctx.fillText(`Items: ${filePaths.length} | Generated: ${new Date().toLocaleString()}`, 20, canvas.height - 15)

      // Convert canvas to blob
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
              generatedBy: "ClientSide",
            },
          })
        },
        `image/${options.format || "png"}`,
        options.quality ? options.quality / 100 : 0.9,
      )
    })
  }

  private drawEnhancedTreeVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
  ) {
    const tree = this.parsePathsToTree(filePaths)
    const lineHeight = (options.fontSize || 12) * 2
    const startY = 80
    const startX = 30

    const drawNode = (node: any, x: number, y: number, level: number): number => {
      if (y > height - 60) return y

      // Draw connection lines
      if (level > 0) {
        ctx.strokeStyle = "#d1d5db"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x - 20, y - lineHeight / 2)
        ctx.lineTo(x - 20, y)
        ctx.lineTo(x - 5, y)
        ctx.stroke()
      }

      // Draw node with enhanced styling
      if (node.isDirectory) {
        ctx.fillStyle = "#3b82f6"
        ctx.fillRect(x, y - 10, 16, 12)
        ctx.fillStyle = "#60a5fa"
        ctx.fillRect(x + 2, y - 8, 12, 8)
      } else {
        const ext = node.name.split(".").pop()?.toLowerCase() || ""
        ctx.fillStyle = this.getFileTypeColor(ext)
        ctx.fillRect(x, y - 10, 14, 14)
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(x + 2, y - 8, 10, 10)
      }

      // Draw name with better typography
      ctx.fillStyle = node.isDirectory ? "#1f2937" : "#374151"
      ctx.font = `${node.isDirectory ? "bold " : ""}${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`
      ctx.fillText(node.name, x + 20, y)

      let newY = y + lineHeight

      // Draw children
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          newY = drawNode(child, x + 30, newY, level + 1)
        }
      }

      return newY
    }

    drawNode(tree, startX, startY, 0)
  }

  private drawEnhancedSunburstVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
  ) {
    const centerX = width / 2
    const centerY = (height + 60) / 2
    const maxRadius = Math.min(width, height - 60) / 2 - 50

    const tree = this.parsePathsToTree(filePaths)
    const countNodes = (node: any): number => {
      let count = 1
      if (node.children) {
        for (const child of node.children) {
          count += countNodes(child)
        }
      }
      return count
    }

    const totalNodes = countNodes(tree)
    const anglePerNode = (2 * Math.PI) / Math.max(totalNodes, 1)

    const drawSunburst = (node: any, startAngle: number, endAngle: number, innerRadius: number, level: number) => {
      const outerRadius = Math.min(innerRadius + 40, maxRadius)

      // Draw arc with gradient effect
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle)
      ctx.arc(centerX, centerY, outerRadius, endAngle, startAngle, true)
      ctx.closePath()

      // Enhanced colors with gradients
      const hue = node.isDirectory ? 210 : (level * 60) % 360
      const saturation = node.isDirectory ? 70 : 50
      const lightness = Math.max(30, 80 - level * 15)

      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      ctx.fill()

      // Better borders
      ctx.strokeStyle = options.backgroundColor || "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Enhanced labels
      const angle = (startAngle + endAngle) / 2
      const midRadius = (innerRadius + outerRadius) / 2
      const angleWidth = endAngle - startAngle

      if (angleWidth > 0.3 && outerRadius - innerRadius > 20) {
        ctx.save()
        ctx.translate(centerX + Math.cos(angle) * midRadius, centerY + Math.sin(angle) * midRadius)
        ctx.rotate(angle > Math.PI / 2 && angle < (3 * Math.PI) / 2 ? angle + Math.PI : angle)

        ctx.fillStyle = lightness > 50 ? "#000000" : "#ffffff"
        ctx.font = `${Math.min(12, options.fontSize || 12)}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.textAlign = "center"

        const displayName = node.name.length > 12 ? node.name.substring(0, 12) + "..." : node.name
        ctx.fillText(displayName, 0, 4)
        ctx.restore()
      }

      // Draw children
      if (node.children && node.children.length > 0 && outerRadius < maxRadius) {
        let currentAngle = startAngle
        for (const child of node.children) {
          const childNodeCount = countNodes(child)
          const childAngleWidth = childNodeCount * anglePerNode
          const childEndAngle = Math.min(currentAngle + childAngleWidth, endAngle)

          drawSunburst(child, currentAngle, childEndAngle, outerRadius, level + 1)
          currentAngle = childEndAngle
        }
      }
    }

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
    ctx.fillStyle = "#1f2937"
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.font = `bold ${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`
    ctx.textAlign = "center"
    ctx.fillText("ROOT", centerX, centerY + 4)

    drawSunburst(tree, 0, 2 * Math.PI, 35, 0)
  }

  private drawEnhancedTreemapVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
  ) {
    const tree = this.parsePathsToTree(filePaths)

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
      if (boxWidth < 10 || boxHeight < 10) return

      // Enhanced colors
      const hue = node.isDirectory ? 210 : (level * 60 + 30) % 360
      const saturation = 60
      const lightness = Math.max(40, 85 - level * 10)

      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      ctx.fillRect(x, y, boxWidth, boxHeight)

      // Better borders
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, boxWidth, boxHeight)

      // Enhanced labels
      if (boxWidth > 60 && boxHeight > 30) {
        ctx.fillStyle = lightness > 60 ? "#000000" : "#ffffff"
        ctx.font = `${Math.min(14, options.fontSize || 12)}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.textAlign = "left"

        const maxChars = Math.floor(boxWidth / 8)
        const displayName = node.name.length > maxChars ? node.name.substring(0, maxChars - 3) + "..." : node.name
        ctx.fillText(displayName, x + 8, y + 20)

        // Add file count for directories
        if (node.isDirectory && node.children) {
          ctx.font = `${Math.min(10, options.fontSize || 12) - 2}px ${options.fontFamily || "Arial, sans-serif"}`
          ctx.fillText(`${node.children.length} items`, x + 8, y + 35)
        }
      }

      // Draw children with improved layout
      if (node.children && node.children.length > 0 && boxWidth > 20 && boxHeight > 20) {
        const sortedChildren = [...node.children].sort((a, b) => (b.weight || 1) - (a.weight || 1))
        const padding = 4
        const availableWidth = boxWidth - padding * 2
        const availableHeight = boxHeight - padding * 2 - (boxHeight > 30 ? 40 : 0)

        if (availableWidth > 0 && availableHeight > 0) {
          const isHorizontal = availableWidth > availableHeight
          let currentPosition = 0
          const totalWeight = node.weight || sortedChildren.reduce((sum, child) => sum + (child.weight || 1), 0)

          for (const child of sortedChildren) {
            const childWeight = child.weight || 1
            const ratio = childWeight / totalWeight

            if (isHorizontal) {
              const childWidth = availableWidth * ratio
              drawTreemap(
                child,
                x + padding + currentPosition,
                y + padding + (boxHeight > 30 ? 40 : 0),
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
                y + padding + (boxHeight > 30 ? 40 : 0) + currentPosition,
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

    drawTreemap(tree, 30, 80, width - 60, height - 140, 0)
  }

  private parsePathsToTree(filePaths: string[]) {
    const root = {
      name: "root",
      isDirectory: true,
      children: [],
    }

    for (const path of filePaths) {
      const parts = path.split("/").filter(Boolean)
      let currentNode = root

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isDirectory = i < parts.length - 1 || !part.includes(".")
        const isLastPart = i === parts.length - 1

        let childNode = currentNode.children.find((child) => child.name === part)

        if (!childNode) {
          childNode = {
            name: part,
            isDirectory,
            children: isDirectory ? [] : undefined,
          }
          currentNode.children.push(childNode)
        }

        if (!isLastPart) {
          currentNode = childNode
        }
      }
    }

    return root
  }
}
