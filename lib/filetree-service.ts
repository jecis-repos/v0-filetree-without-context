import type { FileNode, FileTreeConfig, PerformanceMetrics } from "../types/filetree"
import { CacheFactory } from "./cache/cache-factory"
import { WasmLoader } from "./wasm/wasm-loader"
import { HtmlRenderer } from "./renderers/html-renderer"
import { CanvasRenderer } from "./renderers/canvas-renderer"
import { AsciiRenderer } from "./renderers/ascii-renderer"
import type { RendererInterface } from "./renderers/renderer-interface"
import { WasmRenderer } from "./renderers/wasm-renderer"
import { PhpWasmRenderer } from "./renderers/php-wasm-renderer"

export class FileTreeService {
  private cache = CacheFactory.createBest()
  private wasmLoader = new WasmLoader()
  private renderers: Record<string, RendererInterface> = {
    html: new HtmlRenderer(),
    canvas: new CanvasRenderer(),
    ascii: new AsciiRenderer(),
    wasm: new WasmRenderer(),
    "php-wasm": new PhpWasmRenderer(),
  }

  async generateTree(path: string, config: FileTreeConfig): Promise<FileNode> {
    const cacheKey = `tree:${path}:${JSON.stringify(config)}`
    const cached = await (await this.cache).get<FileNode>(cacheKey)

    if (cached) {
      return cached
    }

    let tree: FileNode

    if (config.renderEngine === "wasm") {
      const wasmModule = await this.wasmLoader.loadModule()
      const treeJson = wasmModule.buildTree(path, JSON.stringify(config))
      tree = JSON.parse(treeJson)
    } else {
      // Fallback to JavaScript implementation
      tree = await this.generateTreeJS(path, config)
    }

    // Cache the result
    await (await this.cache).set(cacheKey, tree, 300000) // 5 minutes

    return tree
  }

  async renderTree(tree: FileNode, container: HTMLElement, engine: string): Promise<PerformanceMetrics> {
    const renderer = this.renderers[engine]
    if (!renderer) {
      throw new Error(`Unknown render engine: ${engine}`)
    }

    return await renderer.render(tree, container)
  }

  async getPerformanceStats(): Promise<any> {
    const cacheStats = await (await this.cache).getStats()

    if (this.wasmLoader) {
      try {
        const wasmModule = await this.wasmLoader.loadModule()
        const wasmStats = wasmModule.getTreeStats()
        return { cache: cacheStats, wasm: wasmStats }
      } catch {
        return { cache: cacheStats, wasm: null }
      }
    }

    return { cache: cacheStats }
  }

  private async generateTreeJS(path: string, config: FileTreeConfig): Promise<FileNode> {
    // Mock file system data - in real implementation this would read actual files
    const mockFiles = [
      { name: "README.md", type: "file" as const, size: 1024 },
      { name: "package.json", type: "file" as const, size: 512 },
      {
        name: "src",
        type: "directory" as const,
        children: [
          { name: "index.ts", type: "file" as const, size: 2048 },
          { name: "utils.ts", type: "file" as const, size: 1536 },
          {
            name: "components",
            type: "directory" as const,
            children: [
              { name: "Button.tsx", type: "file" as const, size: 3072 },
              { name: "Input.tsx", type: "file" as const, size: 2560 },
            ],
          },
        ],
      },
      {
        name: "docs",
        type: "directory" as const,
        children: [
          { name: "guide.md", type: "file" as const, size: 4096 },
          { name: "api.md", type: "file" as const, size: 2048 },
        ],
      },
      { name: ".gitignore", type: "file" as const, size: 256 },
      { name: "tsconfig.json", type: "file" as const, size: 384 },
    ]

    const buildNode = (item: any, parentPath: string): FileNode => {
      const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name

      const node: FileNode = {
        name: item.name,
        type: item.type,
        path: fullPath,
        size: item.size,
        modified: new Date(),
        expanded: true,
      }

      if (item.children) {
        node.children = item.children.map((child: any) => buildNode(child, fullPath))
      }

      return node
    }

    return {
      name: path || "project",
      type: "directory",
      path: path || "/",
      expanded: true,
      children: mockFiles.map((item) => buildNode(item, path || "")),
    }
  }
}
