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

      // Set text properties
      ctx.fillStyle = options.textColor || "#000000"
      ctx.font = `${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`

      // Draw title
      ctx.font = `bold ${(options.fontSize || 12) + 4}px ${options.fontFamily || "Arial, sans-serif"}`
      ctx.fillText("File Tree Visualization", 20, 30)

      // Draw file paths
      ctx.font = `${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`
      const lineHeight = (options.fontSize || 12) * 1.5
      let y = 60

      // Sort paths for better visualization
      const sortedPaths = [...filePaths].sort()

      // Draw file tree
      for (const path of sortedPaths) {
        if (y > canvas.height - lineHeight) break // Stop if we run out of space

        const parts = path.split("/").filter(Boolean)
        const indent = parts.length - 1
        const x = 20 + indent * 20
        const name = parts[parts.length - 1] || path

        // Draw connector lines
        if (indent > 0) {
          ctx.strokeStyle = "#aaaaaa"
          ctx.beginPath()
          ctx.moveTo(x - 10, y - lineHeight / 2)
          ctx.lineTo(x - 10, y)
          ctx.lineTo(x, y)
          ctx.stroke()
        }

        // Draw file/folder icon
        const isDirectory = !path.includes(".")
        if (isDirectory) {
          ctx.fillStyle = "#4a7ebb"
          ctx.fillRect(x, y - 8, 12, 10)
        } else {
          ctx.fillStyle = "#a0a0a0"
          ctx.fillRect(x, y - 8, 10, 12)
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(x + 2, y - 6, 6, 8)
        }

        // Draw file/folder name
        ctx.fillStyle = options.textColor || "#000000"
        ctx.fillText(name, x + 16, y)

        y += lineHeight
      }

      // Add metadata
      ctx.fillStyle = "#666666"
      ctx.font = `10px ${options.fontFamily || "Arial, sans-serif"}`
      ctx.fillText(`Total items: ${filePaths.length}`, 20, canvas.height - 20)
      ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 20, canvas.height - 10)

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
              generatedBy: "ClientSide",
            },
          })
        },
        `image/${options.format || "png"}`,
        options.quality ? options.quality / 100 : 0.9,
      )
    })
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

      // Set text properties
      ctx.fillStyle = options.textColor || "#000000"
      ctx.font = `${options.fontSize || 12}px ${options.fontFamily || "Arial, sans-serif"}`

      // Draw title
      ctx.font = `bold ${(options.fontSize || 12) + 4}px ${options.fontFamily || "Arial, sans-serif"}`
      ctx.fillText(`Directory Visualization (${options.visualizationType})`, 20, 30)

      // Different visualization types
      switch (options.visualizationType) {
        case "tree":
          this.drawTreeVisualization(ctx, filePaths, canvas.width, canvas.height, options)
          break
        case "sunburst":
          this.drawSunburstVisualization(ctx, filePaths, canvas.width, canvas.height, options)
          break
        case "treemap":
          this.drawTreemapVisualization(ctx, filePaths, canvas.width, canvas.height, options)
          break
      }

      // Add metadata
      ctx.fillStyle = "#666666"
      ctx.font = `10px ${options.fontFamily || "Arial, sans-serif"}`
      ctx.fillText(`Total items: ${filePaths.length}`, 20, canvas.height - 20)
      ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 20, canvas.height - 10)

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

  private drawTreeVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
  ) {
    // Parse paths into a tree structure
    const tree = this.parsePathsToTree(filePaths)
    const lineHeight = (options.fontSize || 12) * 1.5
    const startY = 60
    const startX = 20

    // Draw tree recursively
    const drawNode = (node: any, x: number, y: number, level: number): number => {
      if (y > height - 40) return y // Stop if we run out of space

      // Draw node
      ctx.fillStyle = node.isDirectory ? "#4a7ebb" : "#a0a0a0"
      ctx.fillRect(x, y - 8, node.isDirectory ? 12 : 10, node.isDirectory ? 10 : 12)

      // Draw name
      ctx.fillStyle = options.textColor || "#000000"
      ctx.fillText(node.name, x + 16, y)

      let newY = y + lineHeight

      // Draw children
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          // Draw connector line
          ctx.strokeStyle = "#aaaaaa"
          ctx.beginPath()
          ctx.moveTo(x + 6, y + 5)
          ctx.lineTo(x + 6, y + lineHeight / 2)
          ctx.lineTo(x + 20, y + lineHeight / 2)
          ctx.stroke()

          newY = drawNode(child, x + 30, newY, level + 1)
        }
      }

      return newY
    }

    // Start drawing from root
    drawNode(tree, startX, startY, 0)
  }

  private drawSunburstVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
  ) {
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 50

    // Parse paths into a tree structure
    const tree = this.parsePathsToTree(filePaths)

    // Count total nodes for angle calculation
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
    const anglePerNode = (2 * Math.PI) / totalNodes

    // Draw sunburst recursively
    const drawSunburst = (node: any, startAngle: number, endAngle: number, innerRadius: number, level: number) => {
      const outerRadius = innerRadius + 30

      // Draw arc
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle)
      ctx.arc(centerX, centerY, outerRadius, endAngle, startAngle, true)
      ctx.closePath()

      // Fill with color
      ctx.fillStyle = node.isDirectory ? `hsl(210, 50%, ${60 - level * 10}%)` : `hsl(0, 0%, ${70 - level * 5}%)`
      ctx.fill()

      ctx.strokeStyle = options.backgroundColor || "#ffffff"
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw label if segment is large enough
      const angle = (startAngle + endAngle) / 2
      const midRadius = (innerRadius + outerRadius) / 2
      const angleWidth = endAngle - startAngle

      if (angleWidth > 0.2 && outerRadius - innerRadius > 15) {
        ctx.save()
        ctx.translate(centerX + Math.cos(angle) * midRadius, centerY + Math.sin(angle) * midRadius)
        ctx.rotate(angle + Math.PI / 2)
        ctx.fillStyle = options.textColor || "#000000"
        ctx.font = `${Math.min(11, options.fontSize || 12)}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.textAlign = "center"
        ctx.fillText(node.name.substring(0, 15), 0, 0)
        ctx.restore()
      }

      // Draw children
      if (node.children && node.children.length > 0) {
        let currentAngle = startAngle
        for (const child of node.children) {
          const childNodeCount = countNodes(child)
          const childAngleWidth = childNodeCount * anglePerNode
          const childEndAngle = currentAngle + childAngleWidth

          drawSunburst(child, currentAngle, childEndAngle, outerRadius, level + 1)
          currentAngle = childEndAngle
        }
      }
    }

    // Start drawing from root
    drawSunburst(tree, 0, 2 * Math.PI, 50, 0)
  }

  private drawTreemapVisualization(
    ctx: CanvasRenderingContext2D,
    filePaths: string[],
    width: number,
    height: number,
    options: ImageGenerationOptions,
  ) {
    // Parse paths into a tree structure
    const tree = this.parsePathsToTree(filePaths)

    // Calculate weights for treemap
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

    // Draw treemap recursively
    const drawTreemap = (node: any, x: number, y: number, boxWidth: number, boxHeight: number, level: number) => {
      // Draw rectangle
      ctx.fillStyle = node.isDirectory ? `hsl(210, 50%, ${80 - level * 10}%)` : `hsl(0, 0%, ${85 - level * 5}%)`
      ctx.fillRect(x, y, boxWidth, boxHeight)
      ctx.strokeStyle = options.backgroundColor || "#ffffff"
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, boxWidth, boxHeight)

      // Draw label if box is large enough
      if (boxWidth > 40 && boxHeight > 15) {
        ctx.fillStyle = options.textColor || "#000000"
        ctx.font = `${Math.min(11, options.fontSize || 12)}px ${options.fontFamily || "Arial, sans-serif"}`
        ctx.textAlign = "left"
        ctx.fillText(node.name.substring(0, Math.floor(boxWidth / 7)), x + 5, y + (options.fontSize || 12) + 2)
      }

      // Draw children
      if (node.children && node.children.length > 0 && boxWidth > 10 && boxHeight > 10) {
        // Sort children by weight
        const sortedChildren = [...node.children].sort((a, b) => (b.weight || 1) - (a.weight || 1))

        // Decide layout direction (horizontal or vertical)
        const isHorizontal = boxWidth > boxHeight

        let currentPosition = 0
        const totalWeight = node.weight || sortedChildren.reduce((sum, child) => sum + (child.weight || 1), 0)

        for (const child of sortedChildren) {
          const childWeight = child.weight || 1
          const ratio = childWeight / totalWeight

          if (isHorizontal) {
            const childWidth = boxWidth * ratio
            drawTreemap(child, x + currentPosition, y + 20, childWidth, boxHeight - 20, level + 1)
            currentPosition += childWidth
          } else {
            const childHeight = boxHeight * ratio
            drawTreemap(child, x, y + currentPosition, boxWidth, childHeight, level + 1)
            currentPosition += childHeight
          }
        }
      }
    }

    // Start drawing from root
    drawTreemap(tree, 50, 50, width - 100, height - 100, 0)
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

        // Find existing child
        let childNode = currentNode.children.find((child) => child.name === part)

        // Create new child if not found
        if (!childNode) {
          childNode = {
            name: part,
            isDirectory,
            children: isDirectory ? [] : undefined,
          }
          currentNode.children.push(childNode)
        }

        // Update current node for next iteration
        if (!isLastPart) {
          currentNode = childNode
        }
      }
    }

    return root
  }
}
