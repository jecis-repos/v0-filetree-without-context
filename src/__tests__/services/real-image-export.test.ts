import { PhpImageProvider } from "../../providers/PhpImageProvider"
import { ImageExportService } from "../../services/ImageExportService"
import { LoggingService } from "../../services/LoggingService"
import { PerformanceMonitor } from "../../services/PerformanceMonitor"

describe("Real Image Export", () => {
  let phpProvider: PhpImageProvider
  let imageExportService: ImageExportService
  let logger: LoggingService
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    phpProvider = new PhpImageProvider()
    logger = new LoggingService(100)
    performanceMonitor = new PerformanceMonitor(100)
    imageExportService = new ImageExportService(phpProvider, logger, performanceMonitor)
  })

  describe("File Tree Export", () => {
    test("should export real file tree data", async () => {
      const realFilePaths = [
        "src/components/FileExplorer.tsx",
        "src/components/ImageExportPanel.tsx",
        "src/services/ImageExportService.ts",
        "src/providers/PhpImageProvider.ts",
        "app/page.tsx",
        "package.json",
        "README.md",
      ]

      const result = await phpProvider.generateFileTreeImage(realFilePaths, {
        width: 1200,
        height: 800,
        format: "png",
        backgroundColor: "#ffffff",
        textColor: "#000000",
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeInstanceOf(Blob)
      expect(result.url).toMatch(/^data:image\/png;base64,/)
      expect(result.metadata?.fileCount).toBe(realFilePaths.length)
      expect(result.metadata?.generatedBy).toBe("RealPhpImageProvider")
    })

    test("should export with dark theme", async () => {
      const realFilePaths = ["src/components/FileExplorer.tsx", "src/services/ImageExportService.ts"]

      const result = await phpProvider.generateFileTreeImage(realFilePaths, {
        width: 800,
        height: 600,
        format: "png",
        backgroundColor: "#0f172a",
        textColor: "#f8fafc",
        themeData: {
          colors: {
            background: "hsl(222.2 84% 4.9%)",
          },
        },
      })

      expect(result.success).toBe(true)
      expect(result.metadata?.theme).toBe("dark")
    })

    test("should handle empty file paths gracefully", async () => {
      const result = await phpProvider.generateFileTreeImage([], {
        width: 800,
        height: 600,
        format: "png",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("No file paths provided")
    })
  })

  describe("Directory Visualization", () => {
    test("should generate tree visualization", async () => {
      const realFilePaths = [
        "src/components/FileExplorer.tsx",
        "src/components/ImageExportPanel.tsx",
        "src/services/ImageExportService.ts",
        "src/providers/PhpImageProvider.ts",
        "src/utils/FilePathParser.ts",
      ]

      const result = await phpProvider.generateDirectoryVisualization(realFilePaths, {
        width: 1000,
        height: 800,
        format: "png",
        visualizationType: "tree",
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeInstanceOf(Blob)
      expect(result.metadata?.visualizationType).toBe("tree")
    })

    test("should generate sunburst visualization", async () => {
      const realFilePaths = ["src/components/FileExplorer.tsx", "src/services/ImageExportService.ts", "app/page.tsx"]

      const result = await phpProvider.generateDirectoryVisualization(realFilePaths, {
        width: 800,
        height: 800,
        format: "png",
        visualizationType: "sunburst",
      })

      expect(result.success).toBe(true)
      expect(result.metadata?.visualizationType).toBe("sunburst")
    })

    test("should generate treemap visualization", async () => {
      const realFilePaths = [
        "src/components/FileExplorer.tsx",
        "src/services/ImageExportService.ts",
        "src/providers/PhpImageProvider.ts",
      ]

      const result = await phpProvider.generateDirectoryVisualization(realFilePaths, {
        width: 1200,
        height: 600,
        format: "png",
        visualizationType: "treemap",
      })

      expect(result.success).toBe(true)
      expect(result.metadata?.visualizationType).toBe("treemap")
    })
  })

  describe("Performance", () => {
    test("should track performance metrics", async () => {
      const realFilePaths = Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`)

      const initialMetrics = performanceMonitor.getMetrics().length

      const result = await imageExportService.exportFileTreeAsImage(
        realFilePaths.map((path) => ({
          id: path,
          name: path.split("/").pop() || "",
          type: "file" as const,
          path,
          size: 1024,
        })),
        {
          width: 1200,
          height: 800,
          format: "png",
        },
      )

      expect(result.success).toBe(true)

      const finalMetrics = performanceMonitor.getMetrics().length
      expect(finalMetrics).toBeGreaterThan(initialMetrics)
    })
  })
})
