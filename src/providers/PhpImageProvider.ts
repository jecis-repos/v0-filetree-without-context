import type { ILoggingService } from "../services/LoggingService"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"

export interface ImageGenerationOptions {
  width: number
  height: number
  format: "jpeg" | "png" | "webp"
  quality?: number
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  fontFamily?: string
}

export interface ImageExportResult {
  success: boolean
  data?: Blob
  url?: string
  error?: string
  metadata?: {
    size: number
    format: string
    dimensions: { width: number; height: number }
  }
}

export class PhpImageProvider {
  private phpEndpoint: string

  constructor(
    private logger?: ILoggingService,
    private performanceMonitor?: IPerformanceMonitor,
    private config?: { phpEndpoint?: string; apiKey?: string },
  ) {
    this.phpEndpoint = config?.phpEndpoint || "/api/php/image-generator.php"
    this.logger?.info("PHP", "PhpImageProvider initialized", { endpoint: this.phpEndpoint })
  }

  async generateFileTreeImage(filePaths: string[], options: ImageGenerationOptions): Promise<ImageExportResult> {
    const timerId = this.performanceMonitor?.startTimer("php_generate_image")
    this.logger?.info("PHP", "Generating file tree image", {
      pathCount: filePaths.length,
      options,
    })

    try {
      const requestData = {
        action: "generate_file_tree",
        filePaths,
        options,
        timestamp: Date.now(),
      }

      this.logger?.debug("PHP", "Sending request to PHP endpoint", requestData)

      const response = await fetch(this.phpEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config?.apiKey && { "X-API-Key": this.config.apiKey }),
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error(`PHP endpoint error: ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")

      if (contentType?.startsWith("image/")) {
        // Direct image response
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        const result: ImageExportResult = {
          success: true,
          data: blob,
          url,
          metadata: {
            size: blob.size,
            format: options.format,
            dimensions: { width: options.width, height: options.height },
          },
        }

        this.logger?.info("PHP", "Image generated successfully", result.metadata)
        this.performanceMonitor?.endTimer(timerId!, true)
        return result
      } else {
        // JSON response with base64 data
        const jsonResponse = await response.json()

        if (!jsonResponse.success) {
          throw new Error(jsonResponse.error || "PHP image generation failed")
        }

        // Convert base64 to blob
        const base64Data = jsonResponse.data.replace(/^data:image\/[a-z]+;base64,/, "")
        const binaryData = atob(base64Data)
        const bytes = new Uint8Array(binaryData.length)

        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i)
        }

        const blob = new Blob([bytes], { type: `image/${options.format}` })
        const url = URL.createObjectURL(blob)

        const result: ImageExportResult = {
          success: true,
          data: blob,
          url,
          metadata: jsonResponse.metadata || {
            size: blob.size,
            format: options.format,
            dimensions: { width: options.width, height: options.height },
          },
        }

        this.logger?.info("PHP", "Image generated successfully", result.metadata)
        this.performanceMonitor?.endTimer(timerId!, true)
        return result
      }
    } catch (error) {
      this.logger?.error("PHP", "Failed to generate image", { error: error.message, options })
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async generateDirectoryVisualization(
    filePaths: string[],
    options: ImageGenerationOptions & { visualizationType: "tree" | "sunburst" | "treemap" },
  ): Promise<ImageExportResult> {
    const timerId = this.performanceMonitor?.startTimer("php_generate_visualization")
    this.logger?.info("PHP", "Generating directory visualization", {
      pathCount: filePaths.length,
      type: options.visualizationType,
    })

    try {
      const requestData = {
        action: "generate_visualization",
        filePaths,
        options,
        timestamp: Date.now(),
      }

      const response = await fetch(this.phpEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config?.apiKey && { "X-API-Key": this.config.apiKey }),
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error(`PHP endpoint error: ${response.statusText}`)
      }

      const jsonResponse = await response.json()

      if (!jsonResponse.success) {
        throw new Error(jsonResponse.error || "PHP visualization generation failed")
      }

      // Convert base64 to blob
      const base64Data = jsonResponse.data.replace(/^data:image\/[a-z]+;base64,/, "")
      const binaryData = atob(base64Data)
      const bytes = new Uint8Array(binaryData.length)

      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }

      const blob = new Blob([bytes], { type: `image/${options.format}` })
      const url = URL.createObjectURL(blob)

      const result: ImageExportResult = {
        success: true,
        data: blob,
        url,
        metadata: jsonResponse.metadata || {
          size: blob.size,
          format: options.format,
          dimensions: { width: options.width, height: options.height },
        },
      }

      this.logger?.info("PHP", "Visualization generated successfully", result.metadata)
      this.performanceMonitor?.endTimer(timerId!, true)
      return result
    } catch (error) {
      this.logger?.error("PHP", "Failed to generate visualization", { error: error.message, options })
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async optimizeImage(
    imageData: Blob,
    options: { format: "jpeg" | "png" | "webp"; quality?: number; maxWidth?: number; maxHeight?: number },
  ): Promise<ImageExportResult> {
    const timerId = this.performanceMonitor?.startTimer("php_optimize_image")
    this.logger?.info("PHP", "Optimizing image", { originalSize: imageData.size, options })

    try {
      const formData = new FormData()
      formData.append("action", "optimize_image")
      formData.append("image", imageData)
      formData.append("options", JSON.stringify(options))

      const response = await fetch(this.phpEndpoint, {
        method: "POST",
        headers: {
          ...(this.config?.apiKey && { "X-API-Key": this.config.apiKey }),
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`PHP endpoint error: ${response.statusText}`)
      }

      const jsonResponse = await response.json()

      if (!jsonResponse.success) {
        throw new Error(jsonResponse.error || "PHP image optimization failed")
      }

      // Convert base64 to blob
      const base64Data = jsonResponse.data.replace(/^data:image\/[a-z]+;base64,/, "")
      const binaryData = atob(base64Data)
      const bytes = new Uint8Array(binaryData.length)

      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }

      const blob = new Blob([bytes], { type: `image/${options.format}` })
      const url = URL.createObjectURL(blob)

      const result: ImageExportResult = {
        success: true,
        data: blob,
        url,
        metadata: jsonResponse.metadata,
      }

      this.logger?.info("PHP", "Image optimized successfully", {
        originalSize: imageData.size,
        optimizedSize: blob.size,
        compressionRatio: (((imageData.size - blob.size) / imageData.size) * 100).toFixed(2) + "%",
      })

      this.performanceMonitor?.endTimer(timerId!, true)
      return result
    } catch (error) {
      this.logger?.error("PHP", "Failed to optimize image", { error: error.message, options })
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  }
}
