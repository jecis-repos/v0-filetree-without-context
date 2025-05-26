import type { FileNode, PerformanceMetrics } from "../../types/filetree"
import type { RendererInterface } from "./renderer-interface"
import { PhpWasmLoader } from "../wasm/php-wasm-loader"

export class PhpWasmRenderer implements RendererInterface {
  private phpWasmLoader = new PhpWasmLoader()

  async render(tree: FileNode, container: HTMLElement): Promise<PerformanceMetrics> {
    const startTime = performance.now()

    this.clear(container)

    try {
      // Create loading indicator
      const loadingElement = document.createElement("div")
      loadingElement.className = "flex items-center justify-center p-4"
      loadingElement.innerHTML = `
        <div class="flex items-center space-x-2">
          <div class="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <span>Loading PHP-WASM...</span>
        </div>
      `
      container.appendChild(loadingElement)

      // Load PHP-WASM module
      const wasmLoadStartTime = performance.now()
      const phpModule = await this.phpWasmLoader.loadModule()
      const wasmLoadTime = performance.now() - wasmLoadStartTime

      // Remove loading indicator
      container.removeChild(loadingElement)

      // Create a styled container for the PHP-WASM output
      const outputElement = document.createElement("div")
      outputElement.className = "p-4 bg-white rounded-lg"
      outputElement.style.maxHeight = "100%"
      outputElement.style.overflow = "auto"

      // Convert tree to PHP-compatible format and render using PHP
      const treeJson = JSON.stringify(tree)

      // Create a PHP script to render the tree as HTML
      const escapedTreeJson = treeJson.replace(/'/g, "\\'")
      const phpCode = `
        $tree = json_decode('${escapedTreeJson}', true);
        echo renderTreeAsHtml($tree);
      `

      // Execute PHP code
      const htmlOutput = await phpModule.run(phpCode)
      outputElement.innerHTML = htmlOutput

      // Add event listeners for tree interaction
      this.addTreeInteraction(outputElement, tree, phpModule)

      container.appendChild(outputElement)

      const endTime = performance.now()

      return {
        renderTime: endTime - startTime,
        cacheHits: 0,
        cacheMisses: 0,
        wasmLoadTime,
      }
    } catch (error) {
      console.error("PHP-WASM rendering error:", error)

      // Fallback to simple text display
      const errorElement = document.createElement("div")
      errorElement.className = "p-4 text-red-500"
      errorElement.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>Error rendering with PHP-WASM: ${error instanceof Error ? error.message : String(error)}</span>
        </div>
      `
      container.appendChild(errorElement)

      const endTime = performance.now()

      return {
        renderTime: endTime - startTime,
        cacheHits: 0,
        cacheMisses: 0,
      }
    }
  }

  private addTreeInteraction(container: HTMLElement, tree: FileNode, phpModule: any): void {
    // Add click event listeners to directory items
    const directoryItems = container.querySelectorAll('.tree-item[data-type="directory"]')
    directoryItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation()
        const parent = item.parentElement
        const children = parent?.querySelector(".tree-children")
        if (children) {
          children.classList.toggle("hidden")
        }
      })
    })

    // Add click event listeners to file items
    const fileItems = container.querySelectorAll('.tree-item[data-type="file"]')
    fileItems.forEach((item) => {
      item.addEventListener("click", async (e) => {
        e.stopPropagation()
        const path = item.getAttribute("data-path")
        if (path) {
          try {
            const fileContent = await phpModule.getFileContents(path)
            if (fileContent) {
              // Display file content in a modal or panel
              console.log("File content:", fileContent)
              // This would be implemented in a file preview component
            }
          } catch (error) {
            console.error("Error getting file content:", error)
          }
        }
      })
    })
  }

  clear(container: HTMLElement): void {
    container.innerHTML = ""
  }

  supportsInteraction(): boolean {
    return true
  }
}
