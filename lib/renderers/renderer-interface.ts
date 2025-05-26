import type { FileNode, PerformanceMetrics } from "../../types/filetree"

export interface RendererInterface {
  render(tree: FileNode, container: HTMLElement): Promise<PerformanceMetrics>
  clear(container: HTMLElement): void
  supportsInteraction(): boolean
}
