import type { FileNode, PerformanceMetrics } from "../../types/filetree"
import type { RendererInterface } from "./renderer-interface"
import { WasmLoader } from "../wasm/wasm-loader"

export class WasmRenderer implements RendererInterface {
  private wasmLoader = new WasmLoader()

  async render(tree: FileNode, container: HTMLElement): Promise<PerformanceMetrics> {
    const startTime = performance.now()

    this.clear(container)

    try {
      // Load WASM module
      const wasmLoadStartTime = performance.now()
      const wasmModule = await this.wasmLoader.loadModule()
      const wasmLoadTime = performance.now() - wasmLoadStartTime

      // Use WASM to render the tree as text
      const asciiTree = wasmModule.renderTreeText(tree.name)

      // Create a pre element to display the ASCII tree
      const preElement = document.createElement("pre")
      preElement.style.fontFamily = "monospace"
      preElement.style.fontSize = "14px"
      preElement.style.lineHeight = "1.4"
      preElement.textContent = asciiTree

      container.appendChild(preElement)

      const endTime = performance.now()

      return {
        renderTime: endTime - startTime,
        cacheHits: 0,
        cacheMisses: 0,
        wasmLoadTime,
      }
    } catch (error) {
      console.error("WASM rendering error:", error)

      // Fallback to simple text display
      const errorElement = document.createElement("div")
      errorElement.className = "p-4 text-red-500"
      errorElement.textContent = "Error rendering with WebAssembly. See console for details."
      container.appendChild(errorElement)

      const endTime = performance.now()

      return {
        renderTime: endTime - startTime,
        cacheHits: 0,
        cacheMisses: 0,
      }
    }
  }

  clear(container: HTMLElement): void {
    container.innerHTML = ""
  }

  supportsInteraction(): boolean {
    return false
  }
}
