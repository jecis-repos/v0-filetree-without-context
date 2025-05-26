import type { FileNode, PerformanceMetrics } from "../../types/filetree"
import type { RendererInterface } from "./renderer-interface"

export class HtmlRenderer implements RendererInterface {
  async render(tree: FileNode, container: HTMLElement): Promise<PerformanceMetrics> {
    const startTime = performance.now()

    this.clear(container)

    const treeElement = this.createTreeElement(tree)
    container.appendChild(treeElement)

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
    return true
  }

  private createTreeElement(node: FileNode, level = 0): HTMLElement {
    const element = document.createElement("div")
    element.className = "tree-node"
    element.style.marginLeft = `${level * 20}px`

    const icon = node.type === "directory" ? "📁" : "📄"
    const nodeElement = document.createElement("div")
    nodeElement.className = "tree-item"
    nodeElement.innerHTML = `
      <span class="tree-icon">${icon}</span>
      <span class="tree-name">${node.name}</span>
      ${node.size ? `<span class="tree-size">(${this.formatSize(node.size)})</span>` : ""}
    `

    if (node.type === "directory") {
      nodeElement.style.cursor = "pointer"
      nodeElement.addEventListener("click", () => {
        const childrenContainer = element.querySelector(".tree-children") as HTMLElement
        if (childrenContainer) {
          childrenContainer.style.display = childrenContainer.style.display === "none" ? "block" : "none"
        }
      })
    }

    element.appendChild(nodeElement)

    if (node.children && node.children.length > 0) {
      const childrenContainer = document.createElement("div")
      childrenContainer.className = "tree-children"

      node.children.forEach((child) => {
        childrenContainer.appendChild(this.createTreeElement(child, level + 1))
      })

      element.appendChild(childrenContainer)
    }

    return element
  }

  private formatSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"]
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
}
