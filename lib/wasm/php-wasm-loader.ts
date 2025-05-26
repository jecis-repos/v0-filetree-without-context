export interface PhpWasmModule {
  run(code: string): Promise<string>
  callFunction(functionName: string, args: any[]): Promise<any>
  mountFile(path: string, content: string): Promise<void>
  readDirectory(path: string): Promise<string[]>
  getFileContents(path: string): Promise<string | null>
  isReady(): boolean
}

export class PhpWasmLoader {
  private module: any = null
  private phpInstance: any = null
  private loading = false
  private bootstrapCode = `
    <?php
    function scanDirectory($dir) {
      $result = [];
      if (is_dir($dir)) {
        $files = scandir($dir);
        foreach ($files as $file) {
          if ($file != '.' && $file != '..') {
            $path = $dir . '/' . $file;
            $type = is_dir($path) ? 'directory' : 'file';
            $size = is_file($path) ? filesize($path) : 0;
            $item = [
              'name' => $file,
              'type' => $type,
              'path' => $path,
              'size' => $size,
              'modified' => filemtime($path)
            ];
            
            if ($type === 'directory') {
              $item['children'] = scanDirectory($path);
            }
            
            $result[] = $item;
          }
        }
      }
      return $result;
    }

    function renderTreeAsHtml($tree, $indent = 0) {
      $result = '';
      $icon = $tree['type'] === 'directory' ? '📁' : '📄';
      $padding = $indent * 20;
      
      $result .= "<div class='tree-node' style='margin-left: {$padding}px;'>";
      $result .= "<div class='tree-item' data-path='{$tree['path']}' data-type='{$tree['type']}'>";
      $result .= "<span class='tree-icon'>{$icon}</span>";
      $result .= "<span class='tree-name'>{$tree['name']}</span>";
      
      if (isset($tree['size'])) {
        $size = $tree['size'];
        $unit = 'B';
        if ($size > 1024) {
          $size = round($size / 1024, 1);
          $unit = 'KB';
        }
        if ($size > 1024) {
          $size = round($size / 1024, 1);
          $unit = 'MB';
        }
        $result .= "<span class='tree-size'>{$size} {$unit}</span>";
      }
      
      $result .= "</div>";
      
      if (isset($tree['children']) && count($tree['children']) > 0) {
        $result .= "<div class='tree-children'>";
        foreach ($tree['children'] as $child) {
          $result .= renderTreeAsHtml($child, $indent + 1);
        }
        $result .= "</div>";
      }
      
      $result .= "</div>";
      return $result;
    }

    function getFileContents($path) {
      if (file_exists($path) && is_file($path)) {
        return file_get_contents($path);
      }
      return null;
    }

    function getFileType($path) {
      $extension = pathinfo($path, PATHINFO_EXTENSION);
      switch (strtolower($extension)) {
        case 'php':
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
        case 'css':
        case 'html':
        case 'json':
        case 'md':
          return 'text';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'svg':
          return 'image';
        default:
          return 'binary';
      }
    }
    ?>
  `

  async loadModule(): Promise<PhpWasmModule> {
    if (this.module) return this.module
    if (this.loading) {
      // Wait for loading to complete
      while (this.loading) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return this.module!
    }

    this.loading = true

    try {
      // Load PHP-WASM from a bundled script
      await this.loadPhpWasmScript()

      // Initialize PHP instance
      // @ts-ignore - PHP is loaded globally
      this.phpInstance = new window.PhpWeb({
        // Configure PHP with appropriate settings
        ini: `
          display_errors=1
          error_reporting=E_ALL
          date.timezone=UTC
        `,
        // Set up persistent storage
        persist: {
          mountPath: "/persist",
        },
      })

      // Wait for PHP to be ready
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (this.phpInstance.isRunning) {
            resolve()
          } else {
            setTimeout(checkReady, 100)
          }
        }
        checkReady()
      })

      // Initialize PHP environment with bootstrap code
      let output = ""
      const outputHandler = (event: any) => {
        output += event.detail
      }

      this.phpInstance.addEventListener("output", outputHandler)
      await this.phpInstance.run(this.bootstrapCode)
      this.phpInstance.removeEventListener("output", outputHandler)

      // Create our module interface
      this.module = {
        async run(code: string): Promise<string> {
          let output = ""
          const outputHandler = (event: any) => {
            output += event.detail
          }

          this.phpInstance.addEventListener("output", outputHandler)
          try {
            await this.phpInstance.run(code)
            return output
          } finally {
            this.phpInstance.removeEventListener("output", outputHandler)
          }\
        }.bind(this),

        async callFunction(functionName: string, args: any[]): Promise<any> {
          // Convert args to PHP-compatible format
          const phpArgs = args.map((arg: any) => {
            if (typeof arg === "object") {
              return JSON.stringify(arg)
            }
            return arg
          })

          // Create a PHP script to call the function with the arguments
          const code = `<?php
            $result = ${functionName}(${phpArgs
              .map((arg, i) => (typeof args[i] === "object" ? `json_decode('${arg.replace(/'/g, "\\'")}', true)` : `'${arg.replace(/'/g, "\\'")}'`))
              .join(", ")});
            echo json_encode($result);
          ?>`

          // Run the code and parse the result
          const output = await this.run(code)
          try {
            return JSON.parse(output)
          } catch (e) {
            return output
          }
        }.bind(this),

        async mountFile(path: string, content: string): Promise<void> {
          // Create a PHP script to write the file
          const code = `<?php
            $path = '${path.replace(/'/g, "\\'")}';
            $content = ${JSON.stringify(content)};
            $dir = dirname($path);
            
            if (!is_dir($dir)) {
              mkdir($dir, 0777, true);
            }
            
            file_put_contents($path, $content);
            echo "File mounted at $path";
          ?>`

          await this.run(code)
        }.bind(this),

        async readDirectory(path: string): Promise<string[]> {
          // Create a PHP script to read the directory
          const code = `<?php
            $path = '${path.replace(/'/g, "\\'")}';
            if (is_dir($path)) {
              $files = scandir($path);
              echo json_encode($files);
            } else {
              echo json_encode([]);
            }
          ?>`

          const output = await this.run(code)
          try {
            return JSON.parse(output)
          } catch (e) {
            return []
          }
        }.bind(this),

        async getFileContents(path: string): Promise<string | null> {
          // Create a PHP script to read the file
          const code = `<?php
            $path = '${path.replace(/'/g, "\\'")}';
            $content = getFileContents($path);
            if ($content !== null) {
              echo json_encode(['content' => $content, 'type' => getFileType($path)]);
            } else {
              echo json_encode(null);
            }
          ?>`

          const output = await this.run(code)
          try {
            const result = JSON.parse(output)
            return result ? result : null
          } catch (e) {
            return null
          }
        }.bind(this),

        isReady(): boolean {
          return this.phpInstance && this.phpInstance.isRunning
        }.bind(this),
      }

      return this.module
    } catch (error) {
      console.error("Error loading PHP-WASM:", error)
      throw error
    } finally {
      this.loading = false
    }
  }

  private async loadPhpWasmScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if PHP-WASM is already loaded
      if (typeof window !== "undefined" && window.PhpWeb) {
        resolve()
        return
      }

      // Create a script element to load PHP-WASM
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/php-wasm@0.0.9-alpha/php-web.mjs"
      script.type = "module"
      script.onload = () => resolve()
      script.onerror = (e) => {
        console.error("Failed to load PHP-WASM script:", e)
        reject(new Error("Failed to load PHP-WASM script"))
      }

      // Add the script to the document
      document.head.appendChild(script)
    })
  }
}
