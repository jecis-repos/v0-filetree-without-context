/**
 * Full System Integration Tests
 * Verifies all components work together correctly
 */

import { createStore } from "../../store/createStore"
import { healthStore, healthActions } from "../../store/healthStore"
import { fileSystemStore, fileSystemActions } from "../../store/fileSystemStore"
import { schemaManager } from "../../utils/schema-versioning"
import { migrationService } from "../../services/MigrationService"
import { initializeSchemaRegistry } from "../../schemas/schema-registry"
import { clientConfig, validateClientConfig } from "../../config/client-config"

describe("Full System Integration", () => {
  beforeAll(() => {
    // Initialize the schema registry
    initializeSchemaRegistry()
  })

  beforeEach(() => {
    // Reset stores
    healthActions.reset()
    fileSystemActions.reset()

    // Clear migration history
    migrationService.clearMigrationHistory()
    schemaManager.clearCache()
  })

  describe("Configuration and Initialization", () => {
    test("should validate client configuration", () => {
      const errors = validateClientConfig()
      expect(Array.isArray(errors)).toBe(true)

      // Should have valid configuration
      expect(clientConfig.apiBaseUrl).toBeTruthy()
      expect(clientConfig.environment).toBeTruthy()
      expect(typeof clientConfig.features).toBe("object")
    })

    test("should initialize schema registry correctly", () => {
      const fileNodeVersions = schemaManager.getVersions("FileNode")
      const fileSystemStatsVersions = schemaManager.getVersions("FileSystemStats")

      expect(fileNodeVersions.length).toBeGreaterThan(0)
      expect(fileSystemStatsVersions.length).toBeGreaterThan(0)

      // Should have current versions
      expect(schemaManager.getCurrentVersion("FileNode")).toBeTruthy()
      expect(schemaManager.getCurrentVersion("FileSystemStats")).toBeTruthy()
    })
  })

  describe("Store and Migration Integration", () => {
    test("should handle file system data with migrations", async () => {
      // Create old format file node
      const oldFileNode = {
        id: "file1",
        name: "test.txt",
        type: "file",
        path: "/test.txt",
        size: 100,
        lastModified: "2024-01-01T00:00:00Z",
      }

      // Migrate to latest version
      const migrationResult = await migrationService.processData("FileNode", oldFileNode, {
        currentVersion: "1.0.0",
      })

      expect(migrationResult.success).toBe(true)
      expect(migrationResult.data).toBeTruthy()

      // Store in file system store
      fileSystemActions.setFileTree([migrationResult.data])

      const state = fileSystemStore.getState()
      expect(state.fileTree).toHaveLength(1)
      expect(state.fileTree[0].mimeType).toBeDefined()
      expect(state.fileTree[0].permissions).toBeDefined()
    })

    test("should handle health data updates", () => {
      const systemHealth = {
        status: "healthy" as const,
        services: 3,
        healthy: 3,
        unhealthy: 0,
        details: [
          {
            service: "api",
            status: "healthy" as const,
            lastCheck: "2024-01-01T00:00:00Z",
            responseTime: 100,
          },
          {
            service: "database",
            status: "healthy" as const,
            lastCheck: "2024-01-01T00:00:00Z",
            responseTime: 50,
          },
          {
            service: "cache",
            status: "healthy" as const,
            lastCheck: "2024-01-01T00:00:00Z",
            responseTime: 25,
          },
        ],
      }

      // Validate against schema
      const validation = schemaManager.validateVersion("SystemHealth", systemHealth)
      expect(validation.isValid).toBe(true)

      // Store in health store
      healthActions.setSystemHealth(systemHealth)

      const state = healthStore.getState()
      expect(state.systemHealth).toEqual(systemHealth)
      expect(state.error).toBeNull()
    })

    test("should handle batch file operations", async () => {
      const fileNodes = [
        { id: "1", name: "file1.txt", type: "file", path: "/file1.txt", size: 100 },
        { id: "2", name: "file2.txt", type: "file", path: "/file2.txt", size: 200 },
        { id: "3", name: "folder", type: "directory", path: "/folder" },
      ]

      // Batch migrate all files
      const batchResult = await migrationService.batchProcess("FileNode", fileNodes, {
        currentVersion: "1.0.0",
        continueOnError: true,
      })

      expect(batchResult.success).toBe(true)
      expect(batchResult.successCount).toBe(3)
      expect(batchResult.errorCount).toBe(0)

      // Store all migrated files
      fileSystemActions.setFileTree(batchResult.results)

      const state = fileSystemStore.getState()
      expect(state.fileTree).toHaveLength(3)

      // All files should have new fields
      state.fileTree.forEach((file) => {
        expect(file.mimeType).toBeDefined()
        expect(file.permissions).toBeDefined()
      })
    })
  })

  describe("Error Handling Integration", () => {
    test("should handle migration errors gracefully", async () => {
      const invalidData = { invalid: "structure" }

      const result = await migrationService.processData("FileNode", invalidData, {
        currentVersion: "1.0.0",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()

      // Store should handle the error
      fileSystemActions.setError(result.error!)

      const state = fileSystemStore.getState()
      expect(state.error).toBeTruthy()
      expect(state.isLoading).toBe(false)
    })

    test("should handle validation errors in stores", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      // Try to set invalid data
      healthActions.setSystemHealth(null as any)
      fileSystemActions.setFileTree("invalid" as any)

      // Should not crash and should log errors
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    test("should recover from store errors", () => {
      // Cause an error
      fileSystemActions.setError("Test error")

      let state = fileSystemStore.getState()
      expect(state.error).toBe("Test error")

      // Clear the error
      fileSystemActions.clearError()

      state = fileSystemStore.getState()
      expect(state.error).toBeNull()

      // Set valid data
      fileSystemActions.setFileTree([
        {
          id: "1",
          name: "test.txt",
          type: "file" as const,
          path: "/test.txt",
        },
      ])

      state = fileSystemStore.getState()
      expect(state.fileTree).toHaveLength(1)
      expect(state.error).toBeNull()
    })
  })

  describe("Performance Integration", () => {
    test("should handle large datasets efficiently", async () => {
      // Create large dataset
      const largeFileTree = Array.from({ length: 1000 }, (_, i) => ({
        id: `file${i}`,
        name: `file${i}.txt`,
        type: "file" as const,
        path: `/files/file${i}.txt`,
        size: Math.floor(Math.random() * 10000),
      }))

      const start = performance.now()

      // Batch migrate
      const migrationResult = await migrationService.batchProcess("FileNode", largeFileTree, {
        currentVersion: "1.0.0",
      })

      // Store in file system
      fileSystemActions.setFileTree(migrationResult.results)

      const end = performance.now()
      const duration = end - start

      expect(migrationResult.success).toBe(true)
      expect(migrationResult.successCount).toBe(1000)
      expect(duration).toBeLessThan(5000) // Should complete in less than 5 seconds

      const state = fileSystemStore.getState()
      expect(state.fileTree).toHaveLength(1000)
    })

    test("should handle frequent updates efficiently", () => {
      const start = performance.now()

      // Perform many rapid updates
      for (let i = 0; i < 100; i++) {
        healthActions.setLoading(i % 2 === 0)
        fileSystemActions.setCurrentPath(`/path${i}`)

        if (i % 10 === 0) {
          healthActions.setSystemHealth({
            status: "healthy",
            services: i,
            healthy: i,
            unhealthy: 0,
            details: [],
          })
        }
      }

      const end = performance.now()
      const duration = end - start

      expect(duration).toBeLessThan(1000) // Should complete in less than 1 second

      // Final state should be consistent
      const healthState = healthStore.getState()
      const fileSystemState = fileSystemStore.getState()

      expect(healthState.isLoading).toBe(false) // Last update was false
      expect(fileSystemState.currentPath).toBe("/path99")
      expect(healthState.systemHealth?.services).toBe(90) // Last update was i=90
    })
  })

  describe("Memory Management Integration", () => {
    test("should not leak memory with store operations", () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Create many temporary stores and operations
      for (let i = 0; i < 100; i++) {
        const tempStore = createStore({ data: Array.from({ length: 100 }, (_, j) => ({ id: j, value: `item${j}` })) })

        // Subscribe and unsubscribe
        const unsubscribe = tempStore.subscribe(() => {})
        tempStore.setState((state) => ({ data: [...state.data, { id: 999, value: "new" }] }))
        unsubscribe()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    test("should clean up migration cache appropriately", async () => {
      // Perform many migrations to fill cache
      for (let i = 0; i < 50; i++) {
        await migrationService.processData(
          "FileNode",
          {
            id: `file${i}`,
            name: `file${i}.txt`,
            type: "file",
            path: `/file${i}.txt`,
          },
          {
            currentVersion: "1.0.0",
          },
        )
      }

      const statsBefore = schemaManager.getStats()
      expect(statsBefore.cacheSize).toBeGreaterThan(0)

      // Clear cache
      schemaManager.clearCache()

      const statsAfter = schemaManager.getStats()
      expect(statsAfter.cacheSize).toBe(0)
    })
  })

  describe("Real-world Scenarios", () => {
    test("should handle complete file system workflow", async () => {
      // 1. Start with loading state
      fileSystemActions.setLoading(true)
      expect(fileSystemStore.getState().isLoading).toBe(true)

      // 2. Simulate receiving old format data
      const oldFormatData = [
        { id: "1", name: "document.pdf", type: "file", path: "/documents/document.pdf", size: 1024000 },
        { id: "2", name: "image.jpg", type: "file", path: "/images/image.jpg", size: 512000 },
        { id: "3", name: "documents", type: "directory", path: "/documents" },
        { id: "4", name: "images", type: "directory", path: "/images" },
      ]

      // 3. Migrate data
      const migrationResult = await migrationService.batchProcess("FileNode", oldFormatData, {
        currentVersion: "1.0.0",
      })

      expect(migrationResult.success).toBe(true)

      // 4. Update store with migrated data
      fileSystemActions.setFileTree(migrationResult.results)
      fileSystemActions.setLoading(false)

      // 5. Verify final state
      const finalState = fileSystemStore.getState()
      expect(finalState.isLoading).toBe(false)
      expect(finalState.fileTree).toHaveLength(4)
      expect(finalState.error).toBeNull()

      // All files should have new schema fields
      finalState.fileTree.forEach((file) => {
        expect(file.mimeType).toBeDefined()
        expect(file.permissions).toBeDefined()
        if (file.type === "file") {
          expect(file.thumbnailUrl).toBeDefined()
          expect(file.previewUrl).toBeDefined()
        }
      })

      // 6. Simulate user interactions
      fileSystemActions.setSelectedFiles([finalState.fileTree[0].id, finalState.fileTree[1].id])
      fileSystemActions.setCurrentPath("/documents")

      const interactionState = fileSystemStore.getState()
      expect(interactionState.selectedFiles).toHaveLength(2)
      expect(interactionState.currentPath).toBe("/documents")
    })

    test("should handle health monitoring workflow", () => {
      // 1. Start monitoring
      healthActions.setLoading(true)
      healthActions.setRefreshInterval(5000)

      // 2. Simulate health check results
      const healthData = {
        status: "degraded" as const,
        services: 5,
        healthy: 4,
        unhealthy: 1,
        details: [
          { service: "api", status: "healthy" as const, lastCheck: "2024-01-01T00:00:00Z", responseTime: 120 },
          { service: "database", status: "healthy" as const, lastCheck: "2024-01-01T00:00:00Z", responseTime: 80 },
          { service: "cache", status: "healthy" as const, lastCheck: "2024-01-01T00:00:00Z", responseTime: 30 },
          { service: "storage", status: "healthy" as const, lastCheck: "2024-01-01T00:00:00Z", responseTime: 200 },
          {
            service: "search",
            status: "unhealthy" as const,
            lastCheck: "2024-01-01T00:00:00Z",
            responseTime: 5000,
            error: "Timeout",
          },
        ],
      }

      // 3. Validate and store health data
      const validation = schemaManager.validateVersion("SystemHealth", healthData)
      expect(validation.isValid).toBe(true)

      healthActions.setSystemHealth(healthData)
      healthActions.setLoading(false)

      // 4. Verify health state
      const healthState = healthStore.getState()
      expect(healthState.isLoading).toBe(false)
      expect(healthState.systemHealth?.status).toBe("degraded")
      expect(healthState.systemHealth?.unhealthy).toBe(1)
      expect(healthState.error).toBeNull()
      expect(healthState.lastUpdated).toBeTruthy()

      // 5. Simulate error recovery
      const recoveredHealthData = {
        ...healthData,
        status: "healthy" as const,
        healthy: 5,
        unhealthy: 0,
        details: healthData.details.map((detail) =>
          detail.service === "search"
            ? { ...detail, status: "healthy" as const, responseTime: 150, error: undefined }
            : detail,
        ),
      }

      healthActions.setSystemHealth(recoveredHealthData)

      const recoveredState = healthStore.getState()
      expect(recoveredState.systemHealth?.status).toBe("healthy")
      expect(recoveredState.systemHealth?.unhealthy).toBe(0)
    })
  })

  describe("Edge Cases and Robustness", () => {
    test("should handle concurrent operations", async () => {
      // Simulate concurrent operations
      const promises = []

      // Concurrent migrations
      for (let i = 0; i < 10; i++) {
        promises.push(
          migrationService.processData(
            "FileNode",
            {
              id: `concurrent${i}`,
              name: `file${i}.txt`,
              type: "file",
              path: `/concurrent/file${i}.txt`,
            },
            {
              currentVersion: "1.0.0",
            },
          ),
        )
      }

      // Concurrent store updates
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              healthActions.setLoading(i % 2 === 0)
              fileSystemActions.setCurrentPath(`/concurrent${i}`)
              resolve(true)
            }, Math.random() * 100)
          }),
        )
      }

      const results = await Promise.all(promises)

      // All operations should complete successfully
      results.slice(0, 10).forEach((result) => {
        expect((result as any).success).toBe(true)
      })

      // Stores should be in consistent state
      const healthState = healthStore.getState()
      const fileSystemState = fileSystemStore.getState()

      expect(typeof healthState.isLoading).toBe("boolean")
      expect(fileSystemState.currentPath).toMatch(/^\/concurrent\d+$/)
    })

    test("should handle malformed data gracefully", async () => {
      const malformedData = [
        null,
        undefined,
        "string instead of object",
        { incomplete: "object" },
        { id: null, name: undefined, type: "invalid" },
      ]

      for (const data of malformedData) {
        const result = await migrationService.processData("FileNode", data, {
          currentVersion: "1.0.0",
        })

        // Should fail gracefully without crashing
        expect(result.success).toBe(false)
        expect(result.error).toBeTruthy()
      }

      // System should still be functional
      const validData = { id: "valid", name: "valid.txt", type: "file", path: "/valid.txt" }
      const validResult = await migrationService.processData("FileNode", validData, {
        currentVersion: "1.0.0",
      })

      expect(validResult.success).toBe(true)
    })

    test("should maintain data integrity under stress", async () => {
      // Stress test with rapid operations
      const operations = []

      for (let i = 0; i < 100; i++) {
        operations.push(async () => {
          // Random operation type
          const opType = Math.floor(Math.random() * 4)

          switch (opType) {
            case 0:
              // Migration
              await migrationService.processData(
                "FileNode",
                {
                  id: `stress${i}`,
                  name: `file${i}.txt`,
                  type: "file",
                  path: `/stress/file${i}.txt`,
                },
                { currentVersion: "1.0.0" },
              )
              break

            case 1:
              // Health update
              healthActions.setSystemHealth({
                status: "healthy",
                services: i,
                healthy: i,
                unhealthy: 0,
                details: [],
              })
              break

            case 2:
              // File system update
              fileSystemActions.setCurrentPath(`/stress${i}`)
              break

            case 3:
              // Error simulation
              if (Math.random() < 0.1) {
                // 10% chance of error
                fileSystemActions.setError(`Stress test error ${i}`)
                setTimeout(() => fileSystemActions.clearError(), 10)
              }
              break
          }
        })
      }

      // Execute all operations
      await Promise.all(operations.map((op) => op()))

      // Verify system is still functional
      const healthState = healthStore.getState()
      const fileSystemState = fileSystemStore.getState()

      // Should have valid state structure
      expect(typeof healthState.isLoading).toBe("boolean")
      expect(typeof healthState.autoRefresh).toBe("boolean")
      expect(typeof healthState.refreshInterval).toBe("number")

      expect(typeof fileSystemState.currentPath).toBe("string")
      expect(Array.isArray(fileSystemState.fileTree)).toBe(true)
      expect(Array.isArray(fileSystemState.selectedFiles)).toBe(true)
      expect(Array.isArray(fileSystemState.operations)).toBe(true)
    })
  })
})
