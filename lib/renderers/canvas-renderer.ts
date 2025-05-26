import type { FileNode, PerformanceMetrics } from "../../types/filetree"
import type { RendererInterface } from "./renderer-interface"

export class CanvasRenderer implements RendererInterface {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  async render(tree: FileNode, container: HTMLElement): Promise<PerformanceMetrics> {
    const startTime = performance.now()

    this.clear(container)
    this.setupCanvas(container)

    if (this.ctx) {
      this.drawTree(tree, 10, 30, 0)
    }

    const endTime = performance.now()

    return {
      renderTime: endTime - startTime,
      cacheHits: 0,
      cacheMisses: 0,
    }
  }

  clear(container: HTMLElement): void {
    container.innerHTML = ""
    this.canvas = null
    this.ctx = null
  }

  supportsInteraction(): boolean {
    return false
  }

  private setupCanvas(container: HTMLElement): void {
    this.canvas = document.createElement("canvas")
    this.canvas.width = container.clientWidth || 800
    this.canvas.height = container.clientHeight || 600
    this.canvas.style.border = "1px solid #ccc"

    this.ctx = this.canvas.getContext("2d")
    if (this.ctx) {
      this.ctx.font = "14px monospace"
      this.ctx.fillStyle = "#333"
    }

    container.appendChild(this.canvas)
  }

  private drawTree(node: FileNode, x: number, y: number, level: number): number {
    if (!this.ctx) return y

    const indent = level * 20
    const icon = node.type === "directory" ? "📁" : "📄"

    this.ctx.fillText(`${icon} ${node.name}`, x + indent, y)

    let currentY = y + 20

    if (node.children) {
      for (const child of node.children) {
        currentY = this.drawTree(child, x, currentY, level + 1)
      }
    }

    return currentY
  }
}
