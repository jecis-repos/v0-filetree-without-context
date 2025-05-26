/**
 * PHP-WASM Integration Service
 * Implements php-wasm following official documentation and Vercel best practices
 *
 * References:
 * - https://github.com/seanmorris/php-wasm
 * - https://vercel.com/docs/functions/serverless-functions
 */

import { config, clientEnv } from "./env-config"

interface PhpWasmConfig {
  phpVersion: string
  extensions: string[]
  memoryLimit: string
  enableCgi: boolean
  persistentStorage: boolean
}

interface PhpExecutionResult {
  success: boolean
  output?: string
  error?: string
  exitCode?: number
  executionTime: number
}

export class PhpWasmService {
  private php: any = null
  private initialized = false
  private config: PhpWasmConfig

  constructor(config: Partial<PhpWasmConfig> = {}) {
    this.config = {
      phpVersion: "8.3",
      extensions: ["gd", "sqlite", "pdo-sqlite", "json", "mbstring"],
      memoryLimit: "256MB",
      enableCgi: false,
      persistentStorage: true,
      ...config,
    }
  }

  /**
   * Initialize PHP-WASM following the documentation patterns
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Dynamic import to avoid SSR issues
      const { PhpWeb } = await import("php-wasm/PhpWeb.mjs")

      // Configure PHP with extensions and settings
      this.php = new PhpWeb({
        // INI configuration following documentation
        ini: `
          date.timezone=${Intl.DateTimeFormat().resolvedOptions().timeZone}
          memory_limit=${this.config.memoryLimit}
          max_execution_time=30
          expose_php=0
          display_errors=${config.isDevelopment ? "1" : "0"}
          log_errors=1
          error_reporting=${config.isDevelopment ? "E_ALL" : "E_ERROR"}
        `,

        // Load extensions dynamically as per documentation
        sharedLibs: this.config.extensions.map(
          (ext) => `${clientEnv.WASM_BASE_URL}/php${this.config.phpVersion}-${ext}.so`,
        ),

        // Persistent storage configuration
        ...(this.config.persistentStorage && {
          persist: { mountPath: "/persist" },
        }),

        // File location mapping for CDN support
        locateFile: (filename: string) => {
          if (clientEnv.CDN_URL) {
            return `${clientEnv.CDN_URL}/wasm/${filename}`
          }
          return `${clientEnv.WASM_BASE_URL}/${filename}`
        },
      })

      // Set up event listeners for output and errors
      this.php.addEventListener("output", (event: CustomEvent) => {
        if (config.features.debug) {
          console.log("[PHP Output]:", event.detail)
        }
      })

      this.php.addEventListener("error", (event: CustomEvent) => {
        console.error("[PHP Error]:", event.detail)
      })

      this.initialized = true

      if (config.features.debug) {
        console.log("PHP-WASM initialized successfully", {
          version: this.config.phpVersion,
          extensions: this.config.extensions,
          memoryLimit: this.config.memoryLimit,
        })
      }
    } catch (error) {
      console.error("Failed to initialize PHP-WASM:", error)
      throw new Error(`PHP-WASM initialization failed: ${error.message}`)
    }
  }

  /**
   * Execute PHP code securely
   */
  async executePhp(code: string, input?: string): Promise<PhpExecutionResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const startTime = performance.now()

    try {
      // Provide input if specified
      if (input) {
        this.php.inputString(input)
      }

      // Execute PHP code
      const exitCode = await this.php.run(code)
      const executionTime = performance.now() - startTime

      return {
        success: exitCode === 0,
        exitCode,
        executionTime,
      }
    } catch (error) {
      const executionTime = performance.now() - startTime

      return {
        success: false,
        error: error.message,
        executionTime,
      }
    }
  }

  /**
   * Generate file tree visualization using PHP
   */
  async generateFileTreeImage(
    fileTree: any[],
    options: {
      width: number
      height: number
      format: "png" | "jpg" | "svg"
      theme?: string
    },
  ): Promise<PhpExecutionResult & { imageData?: string }> {
    const phpCode = `
    <?php
    // File tree visualization generator
    $fileTree = json_decode('${JSON.stringify(fileTree)}', true);
    $options = json_decode('${JSON.stringify(options)}', true);
    
    // Create image using GD extension
    $width = $options['width'];
    $height = $options['height'];
    $image = imagecreatetruecolor($width, $height);
    
    // Set colors based on theme
    $bgColor = imagecolorallocate($image, 255, 255, 255);
    $textColor = imagecolorallocate($image, 0, 0, 0);
    $lineColor = imagecolorallocate($image, 128, 128, 128);
    
    imagefill($image, 0, 0, $bgColor);
    
    // Render file tree
    $y = 20;
    foreach ($fileTree as $item) {
        $text = $item['name'];
        $indent = $item['depth'] * 20;
        imagestring($image, 3, $indent + 10, $y, $text, $textColor);
        $y += 20;
    }
    
    // Output image
    ob_start();
    switch ($options['format']) {
        case 'png':
            imagepng($image);
            break;
        case 'jpg':
            imagejpeg($image, null, 90);
            break;
        default:
            imagepng($image);
    }
    $imageData = base64_encode(ob_get_contents());
    ob_end_clean();
    
    imagedestroy($image);
    
    echo json_encode([
        'success' => true,
        'imageData' => 'data:image/' . $options['format'] . ';base64,' . $imageData,
        'metadata' => [
            'width' => $width,
            'height' => $height,
            'format' => $options['format'],
            'fileCount' => count($fileTree)
        ]
    ]);
    ?>
    `

    const result = await this.executePhp(phpCode)

    if (result.success) {
      try {
        // Parse the JSON output from PHP
        const output = JSON.parse(result.output || "{}")
        return {
          ...result,
          imageData: output.imageData,
        }
      } catch (parseError) {
        return {
          ...result,
          success: false,
          error: "Failed to parse PHP output",
        }
      }
    }

    return result
  }

  /**
   * File system operations using PHP-WASM
   */
  async writeFile(path: string, content: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      await this.php.writeFile(path, content, { encoding: "utf8" })
      return true
    } catch (error) {
      console.error("Failed to write file:", error)
      return false
    }
  }

  async readFile(path: string): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const content = await this.php.readFile(path, { encoding: "utf8" })
      return content
    } catch (error) {
      console.error("Failed to read file:", error)
      return null
    }
  }

  async listDirectory(path: string): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const files = await this.php.readdir(path)
      return files
    } catch (error) {
      console.error("Failed to list directory:", error)
      return []
    }
  }

  /**
   * Health check for PHP-WASM service
   */
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy"
    details: Record<string, any>
  }> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      const testResult = await this.executePhp('<?php echo "OK"; ?>')

      return {
        status: testResult.success ? "healthy" : "unhealthy",
        details: {
          initialized: this.initialized,
          phpVersion: this.config.phpVersion,
          extensions: this.config.extensions,
          executionTime: testResult.executionTime,
          memoryLimit: this.config.memoryLimit,
        },
      }
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          error: error.message,
          initialized: this.initialized,
        },
      }
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.php) {
      // Cleanup if PHP-WASM provides cleanup methods
      this.php = null
    }
    this.initialized = false
  }
}

// Singleton instance for the application
export const phpWasmService = new PhpWasmService({
  phpVersion: "8.3",
  extensions: ["gd", "sqlite", "json", "mbstring"],
  memoryLimit: config.wasm.memoryLimit,
  persistentStorage: true,
})
