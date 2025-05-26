import { FileSystemCalculator } from "../../services/FileSystemCalculator"
import { CacheService } from "../../services/CacheService"
import type { FileNode } from "../../interfaces/IFileSystemProvider"

describe("FileSystemCalculator", () => {
  let calculator: FileSystemCalculator
  let cacheService: CacheService
  let mockFileTree: FileNode[]

  beforeEach(() => {
    cacheService = new CacheService()
    calculator = new FileSystemCalculator(cacheService)

    mockFileTree = [
      {
        id: "1",
        name: "root",
        type: "directory",
        path: "/root",
        children: [
          {
            id: "2",
            name: "file1.txt",
            type: "file",
            path: "/root/file1.txt",
            size: 1024,
          },
          {
            id: "3",
            name: "subdir",
            type: "directory",
            path: "/root/subdir",
            children: [
              {
                id: "4",
                name: "file2.txt",
                type: "file",
                path: "/root/subdir/file2.txt",
                size: 2048,
              },
              {
                id: "5",
                name: "file3.txt",
                type: "file",
                path: "/root/subdir/file3.txt",
                size: 512,
              },
            ],
          },
        ],
      },
    ]
  })

  describe("calculateStats", () => {
    test("should calculate correct file system statistics", () => {
      const stats = calculator.calculateStats(mockFileTree)

      expect(stats.totalFiles).toBe(3)
      expect(stats.totalDirectories).toBe(2)
      expect(stats.totalSize).toBe(3584) // 1024 + 2048 + 512
      expect(stats.maxDepth).toBe(2)
      expect(stats.largestFile?.size).toBe(2048)
      expect(stats.largestFile?.name).toBe("file2.txt")
    })

    test("should handle empty file tree", () => {
      const stats = calculator.calculateStats([])

      expect(stats.totalFiles).toBe(0)
      expect(stats.totalDirectories).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.maxDepth).toBe(0)
      expect(stats.largestFile).toBeUndefined()
    })

    test("should cache results", () => {
      const spy = jest.spyOn(cacheService, "set")

      calculator.calculateStats(mockFileTree)
      calculator.calculateStats(mockFileTree)

      expect(spy).toHaveBeenCalledTimes(1)
    })
  })

  describe("calculateDirectorySize", () => {
    test("should calculate directory size recursively", () => {
      const rootDir = mockFileTree[0]
      const size = calculator.calculateDirectorySize(rootDir)

      expect(size).toBe(3584) // Sum of all files
    })

    test("should return file size for files", () => {
      const file = mockFileTree[0].children![0]
      const size = calculator.calculateDirectorySize(file)

      expect(size).toBe(1024)
    })

    test("should handle directories without children", () => {
      const emptyDir: FileNode = {
        id: "6",
        name: "empty",
        type: "directory",
        path: "/empty",
      }

      const size = calculator.calculateDirectorySize(emptyDir)
      expect(size).toBe(0)
    })
  })

  describe("findLargestFiles", () => {
    test("should find largest files in order", () => {
      const largest = calculator.findLargestFiles(mockFileTree, 2)

      expect(largest).toHaveLength(2)
      expect(largest[0].size).toBe(2048)
      expect(largest[1].size).toBe(1024)
    })

    test("should handle request for more files than exist", () => {
      const largest = calculator.findLargestFiles(mockFileTree, 10)

      expect(largest).toHaveLength(3) // Only 3 files exist
    })

    test("should return empty array for empty tree", () => {
      const largest = calculator.findLargestFiles([], 5)

      expect(largest).toHaveLength(0)
    })
  })

  describe("calculateDepth", () => {
    test("should calculate maximum depth correctly", () => {
      const depth = calculator.calculateDepth(mockFileTree)
      expect(depth).toBe(2)
    })

    test("should return 0 for empty tree", () => {
      const depth = calculator.calculateDepth([])
      expect(depth).toBe(0)
    })

    test("should handle single level tree", () => {
      const singleLevel: FileNode[] = [
        {
          id: "1",
          name: "file.txt",
          type: "file",
          path: "/file.txt",
          size: 100,
        },
      ]

      const depth = calculator.calculateDepth(singleLevel)
      expect(depth).toBe(0)
    })
  })

  describe("filterByType", () => {
    test("should filter files correctly", () => {
      const files = calculator.filterByType(mockFileTree, "file")

      expect(files).toHaveLength(3)
      expect(files.every((f) => f.type === "file")).toBe(true)
    })

    test("should filter directories correctly", () => {
      const directories = calculator.filterByType(mockFileTree, "directory")

      expect(directories).toHaveLength(2)
      expect(directories.every((d) => d.type === "directory")).toBe(true)
    })
  })

  describe("searchNodes", () => {
    test("should find nodes by name (case insensitive)", () => {
      const results = calculator.searchNodes(mockFileTree, "FILE")

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.name.toLowerCase().includes("file"))).toBe(true)
    })

    test("should return empty array when no matches", () => {
      const results = calculator.searchNodes(mockFileTree, "nonexistent")

      expect(results).toHaveLength(0)
    })

    test("should find partial matches", () => {
      const results = calculator.searchNodes(mockFileTree, "sub")

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe("subdir")
    })
  })
})
