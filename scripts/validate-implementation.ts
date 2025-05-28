#!/usr/bin/env node

import { DIContainer } from "../src/container/DIContainer"
import { ServiceLayer } from "../src/services/ServiceLayer"

interface ValidationResult {
  success: boolean
  message: string
  details?: any
}

class ImplementationValidator {
  private container: DIContainer
  private serviceLayer: ServiceLayer
  private results: ValidationResult[] = []

  constructor() {
    this.container = new DIContainer()
    this.serviceLayer = new ServiceLayer(this.container)
  }

  async validateAll(): Promise<void> {
    console.log("🔍 Starting implementation validation...")

    try {
      await this.validateServiceLayer()
      await this.validateDIContainer()
      await this.validateImageExport()
      await this.validateBenchmarkService()
      await this.validateHealthChecks()
      await this.validateErrorHandling()

      this.printResults()
    } catch (error) {
      console.error("❌ Validation failed:", error)
      process.exit(1)
    }
  }

  private async validateServiceLayer(): Promise<void> {
    console.log("\n📋 Validating Service Layer...")

    try {
      await this.serviceLayer.initialize()
      this.addResult(true, "Service layer initialized successfully")

      const healthCheck = await this.serviceLayer.healthCheck()
      this.addResult(healthCheck.status !== "unhealthy", `Service health check: ${healthCheck.status}`, healthCheck)
    } catch (error) {
      this.addResult(false, "Service layer initialization failed", error)
    }
  }

  private async validateDIContainer(): Promise<void> {
    console.log("\n🏗️ Validating DI Container...")

    try {
      const services = this.container.getRegisteredServices()
      this.addResult(services.length > 0, `DI Container has ${services.length} registered services`, services)

      // Test service resolution
      const requiredServices = [
        "IFileSystemProvider",
        "IPerformanceMonitor",
        "ICacheService",
        "ILoggingService",
        "IBenchmarkService",
        "IImageExportService",
      ]

      for (const serviceName of requiredServices) {
        try {
          const service = this.container.resolve(serviceName)
          this.addResult(service !== null && service !== undefined, `✅ ${serviceName} resolved successfully`)
        } catch (error) {
          this.addResult(false, `❌ ${serviceName} resolution failed`, error)
        }
      }
    } catch (error) {
      this.addResult(false, "DI Container validation failed", error)
    }
  }

  private async validateImageExport(): Promise<void> {
    console.log("\n🖼️ Validating Image Export...")

    try {
      const imageExportService = this.serviceLayer.getImageExportService()
      const fileSystemProvider = this.serviceLayer.getFileSystemProvider()

      // Get real file tree data
      const fileTree = await fileSystemProvider.getFileTree()
      this.addResult(fileTree.length > 0, `File tree loaded with ${fileTree.length} root nodes`)

      // Test image export
      const exportResult = await imageExportService.exportFileTreeAsImage(fileTree, {
        width: 800,
        height: 600,
        format: "png",
      })

      this.addResult(exportResult.success, "Image export completed successfully", {
        size: exportResult.data?.size,
        format: exportResult.metadata?.format,
        generatedBy: exportResult.metadata?.generatedBy,
      })

      // Test visualization export
      const vizResult = await imageExportService.exportDirectoryVisualization(fileTree, {
        width: 800,
        height: 600,
        format: "png",
        visualizationType: "tree",
      })

      this.addResult(vizResult.success, "Visualization export completed successfully", {
        type: vizResult.metadata?.visualizationType,
        size: vizResult.data?.size,
      })
    } catch (error) {
      this.addResult(false, "Image export validation failed", error)
    }
  }

  private async validateBenchmarkService(): Promise<void> {
    console.log("\n⚡ Validating Benchmark Service...")

    try {
      const benchmarkService = this.serviceLayer.getBenchmarkService()
      const fileSystemProvider = this.serviceLayer.getFileSystemProvider()

      const benchmarkResult = await benchmarkService.runBenchmark(fileSystemProvider, {
        breadth: 3,
        depth: 2,
        fileSize: 1024,
        operations: ["read", "write"],
        iterations: 2,
      })

      this.addResult(benchmarkResult.totalTime > 0, "Benchmark completed successfully", {
        provider: benchmarkResult.providerName,
        totalTime: benchmarkResult.totalTime,
        operations: benchmarkResult.operationResults.length,
        treeStats: benchmarkResult.treeStats,
      })
    } catch (error) {
      this.addResult(false, "Benchmark service validation failed", error)
    }
  }

  private async validateHealthChecks(): Promise<void> {
    console.log("\n🏥 Validating Health Checks...")

    try {
      const healthService = this.serviceLayer.getHealthService()

      const healthStatus = await healthService.checkHealth()
      this.addResult(healthStatus.status !== "unhealthy", `System health status: ${healthStatus.status}`, {
        checks: healthStatus.checks.length,
        timestamp: healthStatus.timestamp,
      })
    } catch (error) {
      this.addResult(false, "Health check validation failed", error)
    }
  }

  private async validateErrorHandling(): Promise<void> {
    console.log("\n🚨 Validating Error Handling...")

    try {
      // Test graceful error handling
      const fileSystemProvider = this.serviceLayer.getFileSystemProvider()

      // Test non-existent path
      const result = await fileSystemProvider.getNode("/non-existent-path")
      this.addResult(result === null, "Non-existent path handled gracefully")

      // Test invalid operations
      const deleteResult = await fileSystemProvider.deleteNode("/invalid/path")
      this.addResult(!deleteResult.success, "Invalid delete operation handled gracefully")

      // Test service continues to work after errors
      const fileTree = await fileSystemProvider.getFileTree()
      this.addResult(fileTree.length >= 0, "Service continues to work after errors")
    } catch (error) {
      this.addResult(false, "Error handling validation failed", error)
    }
  }

  private addResult(success: boolean, message: string, details?: any): void {
    this.results.push({ success, message, details })
    const icon = success ? "✅" : "❌"
    console.log(`  ${icon} ${message}`)
    if (details && !success) {
      console.log(`     Details:`, details)
    }
  }

  private printResults(): void {
    const successCount = this.results.filter((r) => r.success).length
    const totalCount = this.results.length
    const successRate = (successCount / totalCount) * 100

    console.log("\n" + "=".repeat(60))
    console.log("📊 VALIDATION SUMMARY")
    console.log("=".repeat(60))
    console.log(`Total Tests: ${totalCount}`)
    console.log(`Passed: ${successCount}`)
    console.log(`Failed: ${totalCount - successCount}`)
    console.log(`Success Rate: ${successRate.toFixed(1)}%`)

    if (successRate === 100) {
      console.log("\n🎉 All validations passed! Implementation is ready.")
    } else if (successRate >= 80) {
      console.log("\n⚠️ Most validations passed. Review failed tests.")
    } else {
      console.log("\n❌ Multiple validations failed. Implementation needs fixes.")
      process.exit(1)
    }

    // Print failed tests
    const failedTests = this.results.filter((r) => !r.success)
    if (failedTests.length > 0) {
      console.log("\n❌ FAILED TESTS:")
      failedTests.forEach((test) => {
        console.log(`  • ${test.message}`)
        if (test.details) {
          console.log(`    ${JSON.stringify(test.details, null, 2)}`)
        }
      })
    }
  }

  async dispose(): Promise<void> {
    this.serviceLayer.dispose()
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new ImplementationValidator()
  validator
    .validateAll()
    .then(() => validator.dispose())
    .catch((error) => {
      console.error("Validation script failed:", error)
      process.exit(1)
    })
}

export { ImplementationValidator }
