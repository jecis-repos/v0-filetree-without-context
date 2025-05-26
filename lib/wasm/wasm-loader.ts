export interface WasmModule {
  buildTree(path: string, config: string): string
  renderTreeText(projectName: string): string
  getTreeStats(): { nodes: number; depth: number; size: number }
  clearCache(): void
}

export class WasmLoader {
  private module: WasmModule | null = null
  private loading = false

  async loadModule(): Promise<WasmModule> {
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
      // Simulate WASM module loading
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock WASM module
      this.module = {
        buildTree: (path: string, config: string) => {
          const configObj = JSON.parse(config)
          return JSON.stringify({
            name: path,
            type: "directory",
            path: path,
            children: this.generateMockTree(path, 3),
          })
        },

        renderTreeText: (projectName: string) => {
          return `📁 ${projectName}\n├── 📄 README.md\n├── 📁 src\n│   ├── 📄 index.ts\n│   └── 📄 utils.ts\n└── 📄 package.json`
        },

        getTreeStats: () => ({
          nodes: 42,
          depth: 5,
          size: 1024 * 1024,
        }),

        clearCache: () => {
          console.log("WASM cache cleared")
        },
      }

      return this.module
    } finally {
      this.loading = false
    }
  }

  private generateMockTree(basePath: string, depth: number): any[] {
    if (depth <= 0) return []

    const items = [
      { name: "README.md", type: "file", path: `${basePath}/README.md`, size: 1024 },
      { name: "package.json", type: "file", path: `${basePath}/package.json`, size: 512 },
      {
        name: "src",
        type: "directory",
        path: `${basePath}/src`,
        children: depth > 1 ? this.generateMockTree(`${basePath}/src`, depth - 1) : [],
      },
      {
        name: "docs",
        type: "directory",
        path: `${basePath}/docs`,
        children: depth > 1 ? [{ name: "guide.md", type: "file", path: `${basePath}/docs/guide.md`, size: 2048 }] : [],
      },
    ]

    return items
  }
}
