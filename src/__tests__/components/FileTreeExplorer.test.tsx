"use client"

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { DIContainer } from "../../container/DIContainer"
import { MemoryFileSystemProvider } from "../../providers/MemoryFileSystemProvider"
import { CacheService } from "../../services/CacheService"
import { FileSystemCalculator } from "../../services/FileSystemCalculator"
import { PerformanceMonitor } from "../../services/PerformanceMonitor"

// Mock the FileTreeExplorer component
const FileTreeExplorer: React.FC<{ container: DIContainer }> = ({ container }) => {
  const [provider, setProvider] = React.useState("Memory")
  const [fileTree, setFileTree] = React.useState<any[]>([])
  const [stats, setStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    loadFileTree()
  }, [provider])

  const loadFileTree = async () => {
    setLoading(true)
    try {
      const fileSystemProvider = container.resolve("IFileSystemProvider")
      await fileSystemProvider.initialize()
      const tree = await fileSystemProvider.getFileTree()
      const fileStats = await fileSystemProvider.getStats()

      setFileTree(tree)
      setStats(fileStats)
    } catch (error) {
      console.error("Failed to load file tree:", error)
    } finally {
      setLoading(false)
    }
  }

  const switchProvider = (newProvider: string) => {
    setProvider(newProvider)
    // In real implementation, would reconfigure container
  }

  return (
    <div data-testid="file-tree-explorer">
      <div data-testid="provider-selector">
        <select value={provider} onChange={(e) => switchProvider(e.target.value)} data-testid="provider-select">
          <option value="Memory">Memory</option>
          <option value="WASM">WASM</option>
        </select>
      </div>

      {loading && <div data-testid="loading">Loading...</div>}

      {stats && (
        <div data-testid="stats">
          <div>Files: {stats.totalFiles}</div>
          <div>Directories: {stats.totalDirectories}</div>
          <div>Total Size: {stats.totalSize}</div>
        </div>
      )}

      <div data-testid="file-tree">
        {fileTree.map((node) => (
          <div key={node.id} data-testid={`node-${node.id}`}>
            {node.name} ({node.type})
          </div>
        ))}
      </div>
    </div>
  )
}

describe("FileTreeExplorer Component Integration", () => {
  let container: DIContainer

  beforeEach(() => {
    container = new DIContainer()

    // Register services
    container.registerFactory("ICacheService", () => new CacheService(100, 5000), "singleton")
    container.registerFactory("IPerformanceMonitor", () => new PerformanceMonitor(100), "singleton")
    container.registerFactory(
      "IFileSystemCalculator",
      () => {
        const cache = container.resolve("ICacheService")
        return new FileSystemCalculator(cache)
      },
      "singleton",
    )
    container.registerFactory(
      "IFileSystemProvider",
      () => {
        const monitor = container.resolve("IPerformanceMonitor")
        return new MemoryFileSystemProvider(monitor)
      },
      "singleton",
    )
  })

  afterEach(() => {
    container.dispose()
  })

  test("should render file tree explorer with initial state", async () => {
    render(<FileTreeExplorer container={container} />)

    expect(screen.getByTestId("file-tree-explorer")).toBeInTheDocument()
    expect(screen.getByTestId("provider-selector")).toBeInTheDocument()
    expect(screen.getByTestId("provider-select")).toHaveValue("Memory")
  })

  test("should load and display file tree", async () => {
    render(<FileTreeExplorer container={container} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
    })

    // Check if file tree is displayed
    expect(screen.getByTestId("file-tree")).toBeInTheDocument()

    // Check if stats are displayed
    const stats = screen.getByTestId("stats")
    expect(stats).toBeInTheDocument()
    expect(stats).toHaveTextContent("Files:")
    expect(stats).toHaveTextContent("Directories:")
  })

  test("should show loading state during file tree load", async () => {
    render(<FileTreeExplorer container={container} />)

    // Should show loading initially
    expect(screen.getByTestId("loading")).toBeInTheDocument()

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
    })
  })

  test("should allow provider switching", async () => {
    render(<FileTreeExplorer container={container} />)

    const providerSelect = screen.getByTestId("provider-select")

    // Switch to WASM provider
    fireEvent.change(providerSelect, { target: { value: "WASM" } })
    expect(providerSelect).toHaveValue("WASM")
  })

  test("should display file nodes correctly", async () => {
    render(<FileTreeExplorer container={container} />)

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
    })

    // Check for specific file nodes from the default memory provider
    const fileTree = screen.getByTestId("file-tree")
    expect(fileTree).toBeInTheDocument()

    // Should have nodes from the default file tree
    expect(screen.getByTestId("node-1")).toHaveTextContent("documents (directory)")
  })

  test("should handle service dependencies correctly", async () => {
    render(<FileTreeExplorer container={container} />)

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
    })

    // Verify that all services are working together
    const stats = screen.getByTestId("stats")
    expect(stats).toHaveTextContent("Files: 2") // From default memory provider
    expect(stats).toHaveTextContent("Directories: 2")
  })

  test("should handle errors gracefully", async () => {
    // Create a container with a failing provider
    const failingContainer = new DIContainer()
    failingContainer.registerFactory("IFileSystemProvider", () => {
      return {
        initialize: () => Promise.reject(new Error("Provider failed")),
        getFileTree: () => Promise.reject(new Error("Provider failed")),
        getStats: () => Promise.reject(new Error("Provider failed")),
      }
    })

    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    render(<FileTreeExplorer container={failingContainer} />)

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith("Failed to load file tree:", expect.any(Error))

    consoleSpy.mockRestore()
  })
})
