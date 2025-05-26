import { generateImage } from "../../app/actions/php-api"
import type { ILoggingService } from "../interfaces/ILoggingService"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"
import type { FileNode } from "../types/FileNode"

export class PhpImageProvider {
  constructor(
    private logger: ILoggingService,
    private performanceMonitor: IPerformanceMonitor,
    private config: {
      phpEndpoint: string
      // Remove apiKey from config
    },
  ) {
    this.logger.info("PhpImageProvider", "PHP Image Provider initialized", {
      endpoint: config.phpEndpoint,
    })
  }

  async generateImage(
    fileTree: FileNode[],
    options: {
      width: number
      height: number
      format: "png" | "jpg" | "webp" | "svg"
      theme?: string
      quality?: number
    },
  ): Promise<{ success: boolean; imageData?: string; error?: string }> {
    const timerId = this.performanceMonitor.startTimer("php_image_generation")

    try {
      this.logger.info("PhpImageProvider", "Generating image via PHP", {
        fileCount: fileTree.length,
        format: options.format,
        dimensions: `${options.width}x${options.height}`,
      })

      // Use server action instead of direct fetch
      const result = await generateImage({
        fileTree,
        width: options.width,
        height: options.height,
        format: options.format,
        theme: options.theme,
      })

      if (result.success && result.data) {
        this.performanceMonitor.endTimer(timerId, true)
        this.logger.info("PhpImageProvider", "Image generated successfully", {
          format: options.format,
          size: result.data.imageData?.length || 0,
        })

        return {
          success: true,
          imageData: result.data.imageData,
        }
      } else {
        this.performanceMonitor.endTimer(timerId, false, { error: result.error })
        this.logger.error("PhpImageProvider", "Image generation failed", { error: result.error })

        return {
          success: false,
          error: result.error || "Unknown error",
        }
      }
    } catch (error) {
      this.performanceMonitor.endTimer(timerId, false, { error: error.message })
      this.logger.error("PhpImageProvider", "Image generation error", { error: error.message })

      return {
        success: false,
        error: error.message,
      }
    }
  }
}
