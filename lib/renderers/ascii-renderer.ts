import type { FileNode, PerformanceMetrics } from "../../types/filetree"
import type { RendererInterface } from "./renderer-interface"

export class AsciiRenderer implements RendererInterface {
  async render(tree: FileNode, container: HTMLElement): Promise<PerformanceMetrics> {
    const startTime = performance.now()

    this.clear(container)

    const asciiTree = this.generateAsciiTree(tree)
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
    }
  }

  clear(container: HTMLElement): void {
    container.innerHTML = ""
  }

  supportsInteraction(): boolean {
    return false
  }

  private generateAsciiTree(node: FileNode, prefix = "", isLast = true): string {
    const icon = node.type === "directory" ? "📁" : "📄"
    const connector = isLast ? "└── " : "├── "
    let result = prefix + connector + icon + " " + node.name + "\n"

    if (node.children && node.children.length > 0) {
      const newPrefix = prefix + (isLast ? "    " : "│   ")

      node.children.forEach((child, index) => {
        const isChildLast = index === node.children!.length - 1
        result += this.generateAsciiTree(child, newPrefix, isChildLast)
      })
    }

    return result
  }
}
