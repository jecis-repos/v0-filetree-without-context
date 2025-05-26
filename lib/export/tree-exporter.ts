export interface ExportOptions {
  format: "png" | "jpeg" | "webp"
  quality?: number
  scale?: number
  backgroundColor?: string
  includeMetadata?: boolean
}

export class TreeExporter {
  async exportAsImage(container: HTMLElement, options: ExportOptions): Promise<string> {
    const { format = "png", quality = 0.9, scale = 2, backgroundColor = "#ffffff", includeMetadata = true } = options

    try {
      // Create a canvas element
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      // Set canvas dimensions
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * scale
      canvas.height = rect.height * scale
      ctx.scale(scale, scale)

      // Fill background
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Convert HTML to image
      await this.htmlToCanvas(container, ctx, rect.width, rect.height)

      // Add metadata if requested
      if (includeMetadata) {
        this.addMetadata(ctx, rect.width, rect.height)
      }

      // Convert canvas to data URL
      let mimeType: string
      let encoderOptions: number | undefined

      switch (format) {
        case "jpeg":
          mimeType = "image/jpeg"
          encoderOptions = quality
          break
        case "webp":
          mimeType = "image/webp"
          encoderOptions = quality
          break
        case "png":
        default:
          mimeType = "image/png"
          break
      }

      return canvas.toDataURL(mimeType, encoderOptions)
    } catch (error) {
      console.error("Error exporting tree as image:", error)
      throw error
    }
  }

  private async htmlToCanvas(
    container: HTMLElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous" // Prevent CORS issues

      // Convert the HTML to a data URL using SVG
      const data = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${container.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `

      const svg = new Blob([data], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(svg)

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        resolve()
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load image from SVG"))
      }

      img.src = url
    })
  }

  private addMetadata(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const date = new Date().toLocaleString()
    const text = `FileTree Explorer - Generated: ${date}`

    ctx.font = "10px Arial"
    ctx.fillStyle = "rgba(150, 150, 150, 0.7)"
    ctx.fillText(text, 10, height - 10)
  }
}
