/**
 * Comprehensive Migration System Tests
 * Verifies all migration functionality works correctly
 */

import { SchemaEvolutionManager, createMigration, autoMigrateData } from "../../utils/schema-versioning"
import { migrationService } from "../../services/MigrationService"
import { initializeSchemaRegistry } from "../../schemas/schema-registry"

describe("Migration System", () => {
  let schemaManager: SchemaEvolutionManager

  beforeEach(() => {
    schemaManager = new SchemaEvolutionManager()

    // Register test schemas
    schemaManager.registerSchema("TestSchema", "1.0.0", {
      type: "object",
      properties: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
      },
    })

    schemaManager.registerSchema("TestSchema", "2.0.0", {
      type: "object",
      properties: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        email: { type: "string", required: false },
        metadata: { type: "object", required: false, nullable: true },
      },
    })

    schemaManager.registerSchema("TestSchema", "3.0.0", {
      type: "object",
      properties: {
        id: { type: "string", required: true },
        name: { type: "string", required: true },
        email: { type: "string", required: false },
        metadata: { type: "object", required: false, nullable: true },
        createdAt: { type: "date", required: false },
        tags: { type: "array", required: false, items: { type: "string" } },
      },
    })

    // Register migrations
    const migration1to2 = createMigration(
      "1.0.0",
      "2.0.0",
      (data: any) => ({
        ...data,
        email: null,
        metadata: null,
      }),
      "Add email and metadata fields",
      {
        reversible: true,
        reverseTransform: (data: any) => {
          const { email, metadata, ...rest } = data
          return rest
        },
      },
    )

    const migration2to3 = createMigration(
      "2.0.0",
      "3.0.0",
      (data: any) => ({
        ...data,
        createdAt: new Date().toISOString(),
        tags: [],
      }),
      "Add createdAt and tags fields",
      {
        reversible: true,
        reverseTransform: (data: any) => {
          const { createdAt, tags, ...rest } = data
          return rest
        },
      },
    )

    schemaManager.registerMigration("TestSchema", migration1to2)
    schemaManager.registerMigration("TestSchema", migration2to3)
  })

  describe("Schema Registration", () => {
    test("should register schemas correctly", () => {
      const versions = schemaManager.getVersions("TestSchema")
      expect(versions).toEqual(["1.0.0", "2.0.0", "3.0.0"])
    })

    test("should get current version", () => {
      const currentVersion = schemaManager.getCurrentVersion("TestSchema")
      expect(currentVersion).toBe("3.0.0")
    })

    test("should get schema by version", () => {
      const schema = schemaManager.getSchema("TestSchema", "2.0.0")
      expect(schema).toBeTruthy()
      expect(schema?.type).toBe("object")
    })

    test("should handle non-existent schema", () => {
      const schema = schemaManager.getSchema("NonExistent", "1.0.0")
      expect(schema).toBeNull()
    })

    test("should handle non-existent version", () => {
      const schema = schemaManager.getSchema("TestSchema", "999.0.0")
      expect(schema).toBeNull()
    })
  })

  describe("Version Comparison", () => {
    test("should compare versions correctly", () => {
      const manager = new SchemaEvolutionManager()

      // Test with different schemas to verify comparison
      manager.registerSchema("VersionTest", "1.0.0", { type: "string" })
      manager.registerSchema("VersionTest", "1.1.0", { type: "string" })
      manager.registerSchema("VersionTest", "2.0.0", { type: "string" })
      manager.registerSchema("VersionTest", "10.0.0", { type: "string" })

      const versions = manager.getVersions("VersionTest")
      expect(versions).toEqual(["1.0.0", "1.1.0", "2.0.0", "10.0.0"])
    })

    test("should handle malformed versions", () => {
      const manager = new SchemaEvolutionManager()

      // These should not crash
      manager.registerSchema("MalformedTest", "v1", { type: "string" })
      manager.registerSchema("MalformedTest", "1.0", { type: "string" })
      manager.registerSchema("MalformedTest", "1.0.0.0", { type: "string" })

      const versions = manager.getVersions("MalformedTest")
      expect(versions).toHaveLength(3)
    })
  })

  describe("Basic Migrations", () => {
    test("should migrate from v1 to v2", () => {
      const v1Data = { id: "123", name: "Test User" }

      const result = schemaManager.migrate("TestSchema", v1Data, "1.0.0", "2.0.0")

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        id: "123",
        name: "Test User",
        email: null,
        metadata: null,
      })
      expect(result.migrationsApplied).toEqual(["1.0.0 -> 2.0.0"])
    })

    test("should migrate from v2 to v3", () => {
      const v2Data = { id: "123", name: "Test User", email: "test@example.com", metadata: null }

      const result = schemaManager.migrate("TestSchema", v2Data, "2.0.0", "3.0.0")

      expect(result.success).toBe(true)
      expect(result.data.id).toBe("123")
      expect(result.data.name).toBe("Test User")
      expect(result.data.email).toBe("test@example.com")
      expect(result.data.createdAt).toBeTruthy()
      expect(result.data.tags).toEqual([])
    })

    test("should migrate from v1 to v3 (multi-step)", () => {
      const v1Data = { id: "123", name: "Test User" }

      const result = schemaManager.migrate("TestSchema", v1Data, "1.0.0", "3.0.0")

      expect(result.success).toBe(true)
      expect(result.data.id).toBe("123")
      expect(result.data.name).toBe("Test User")
      expect(result.data.email).toBeNull()
      expect(result.data.metadata).toBeNull()
      expect(result.data.createdAt).toBeTruthy()
      expect(result.data.tags).toEqual([])
      expect(result.migrationsApplied).toEqual(["1.0.0 -> 2.0.0", "2.0.0 -> 3.0.0"])
    })

    test("should handle same version migration", () => {
      const data = { id: "123", name: "Test User" }

      const result = schemaManager.migrate("TestSchema", data, "1.0.0", "1.0.0")

      expect(result.success).toBe(true)
      expect(result.data).toEqual(data)
      expect(result.migrationsApplied).toEqual([])
    })

    test("should handle migration to current version", () => {
      const data = { id: "123", name: "Test User" }

      const result = schemaManager.migrate("TestSchema", data, "1.0.0")

      expect(result.success).toBe(true)
      expect(result.toVersion).toBe("3.0.0")
    })
  })

  describe("Auto Migration", () => {
    test("should auto-detect version and migrate", () => {
      const v1Data = { id: "123", name: "Test User" }

      const result = schemaManager.autoMigrate("TestSchema", v1Data)

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe("1.0.0")
      expect(result.toVersion).toBe("3.0.0")
    })

    test("should handle data that matches latest version", () => {
      const v3Data = {
        id: "123",
        name: "Test User",
        email: "test@example.com",
        metadata: null,
        createdAt: "2024-01-01T00:00:00Z",
        tags: ["tag1"],
      }

      const result = schemaManager.autoMigrate("TestSchema", v3Data)

      expect(result.success).toBe(true)
      expect(result.fromVersion).toBe("3.0.0")
      expect(result.toVersion).toBe("3.0.0")
      expect(result.migrationsApplied).toEqual([])
    })

    test("should handle unrecognizable data", () => {
      const invalidData = { invalid: "data" }

      const result = schemaManager.autoMigrate("TestSchema", invalidData)

      expect(result.success).toBe(false)
      expect(result.errors).toContain("Could not detect data version and no version specified")
    })
  })

  describe("Migration Errors", () => {
    test("should handle migration errors gracefully", () => {
      const errorMigration = createMigration(
        "1.0.0",
        "2.0.0",
        () => {
          throw new Error("Migration failed")
        },
        "Failing migration",
      )

      const errorManager = new SchemaEvolutionManager()
      errorManager.registerSchema("ErrorTest", "1.0.0", { type: "object", properties: {} })
      errorManager.registerSchema("ErrorTest", "2.0.0", { type: "object", properties: {} })
      errorManager.registerMigration("ErrorTest", errorMigration)

      const result = errorManager.migrate("ErrorTest", { test: "data" }, "1.0.0", "2.0.0")

      expect(result.success).toBe(false)
      expect(result.errors?.[0]).toContain("Migration failed")
    })

    test("should handle non-existent migration path", () => {
      const isolatedManager = new SchemaEvolutionManager()
      isolatedManager.registerSchema("IsolatedTest", "1.0.0", { type: "object", properties: {} })
      isolatedManager.registerSchema("IsolatedTest", "3.0.0", { type: "object", properties: {} })
      // No migration between 1.0.0 and 3.0.0

      const result = isolatedManager.migrate("IsolatedTest", { test: "data" }, "1.0.0", "3.0.0")

      expect(result.success).toBe(false)
      expect(result.errors?.[0]).toContain("No migration path found")
    })

    test("should handle invalid schema name", () => {
      const result = schemaManager.migrate("NonExistent", { test: "data" }, "1.0.0", "2.0.0")

      expect(result.success).toBe(false)
      expect(result.errors?.[0]).toContain('Schema "NonExistent" not found')
    })
  })

  describe("Reverse Migrations", () => {
    test("should perform reverse migration", () => {
      const v2Data = { id: "123", name: "Test User", email: "test@example.com", metadata: null }

      // Get the migration and use its reverse transform
      const migrations = schemaManager["registry"]["TestSchema"].migrations
      const migration1to2 = migrations.find((m) => m.fromVersion === "1.0.0" && m.toVersion === "2.0.0")

      expect(migration1to2?.reversible).toBe(true)
      expect(migration1to2?.reverseTransform).toBeTruthy()

      if (migration1to2?.reverseTransform) {
        const v1Data = migration1to2.reverseTransform(v2Data)
        expect(v1Data).toEqual({ id: "123", name: "Test User" })
      }
    })
  })

  describe("Migration Caching", () => {
    test("should cache migration results", () => {
      const data = { id: "123", name: "Test User" }

      // First migration
      const result1 = schemaManager.migrate("TestSchema", data, "1.0.0", "2.0.0")

      // Second migration with same data should use cache
      const result2 = schemaManager.migrate("TestSchema", data, "1.0.0", "2.0.0")

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.data).toEqual(result2.data)
    })

    test("should clear cache", () => {
      const data = { id: "123", name: "Test User" }

      schemaManager.migrate("TestSchema", data, "1.0.0", "2.0.0")

      const statsBefore = schemaManager.getStats()
      expect(statsBefore.cacheSize).toBeGreaterThan(0)

      schemaManager.clearCache()

      const statsAfter = schemaManager.getStats()
      expect(statsAfter.cacheSize).toBe(0)
    })
  })

  describe("Migration Service", () => {
    test("should process data with migration service", async () => {
      const data = { id: "123", name: "Test User" }

      const result = await migrationService.processData("TestSchema", data, {
        currentVersion: "1.0.0",
        targetVersion: "3.0.0",
      })

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe("123")
      expect(result.data?.name).toBe("Test User")
      expect(result.migrationResult?.migrationsApplied).toHaveLength(2)
    })

    test("should process JSON string", async () => {
      const jsonString = '{"id":"123","name":"Test User"}'

      const result = await migrationService.processJsonString("TestSchema", jsonString, {
        currentVersion: "1.0.0",
        targetVersion: "2.0.0",
      })

      expect(result.success).toBe(true)
      expect(result.data?.email).toBeNull()
    })

    test("should batch process data", async () => {
      const dataItems = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
        { id: "3", name: "User 3" },
      ]

      const result = await migrationService.batchProcess("TestSchema", dataItems, {
        currentVersion: "1.0.0",
        targetVersion: "2.0.0",
      })

      expect(result.success).toBe(true)
      expect(result.successCount).toBe(3)
      expect(result.errorCount).toBe(0)
      expect(result.results).toHaveLength(3)
      expect(result.results[0]?.email).toBeNull()
    })

    test("should handle batch processing with errors", async () => {
      const dataItems = [
        { id: "1", name: "User 1" },
        null, // This will cause an error
        { id: "3", name: "User 3" },
      ]

      const result = await migrationService.batchProcess("TestSchema", dataItems, {
        currentVersion: "1.0.0",
        targetVersion: "2.0.0",
        continueOnError: true,
      })

      expect(result.success).toBe(false)
      expect(result.successCount).toBe(2)
      expect(result.errorCount).toBe(1)
      expect(result.errors).toHaveLength(1)
    })

    test("should track migration history", async () => {
      await migrationService.processData(
        "TestSchema",
        { id: "1", name: "User 1" },
        {
          currentVersion: "1.0.0",
          targetVersion: "2.0.0",
        },
      )

      const history = migrationService.getMigrationHistory("TestSchema")
      expect(history).toHaveLength(1)
      expect(history[0].schemaName).toBe("TestSchema")
      expect(history[0].fromVersion).toBe("1.0.0")
      expect(history[0].toVersion).toBe("2.0.0")
      expect(history[0].success).toBe(true)
    })

    test("should provide migration statistics", async () => {
      await migrationService.processData(
        "TestSchema",
        { id: "1", name: "User 1" },
        {
          currentVersion: "1.0.0",
          targetVersion: "2.0.0",
        },
      )

      await migrationService.processData(
        "TestSchema",
        { id: "2", name: "User 2" },
        {
          currentVersion: "2.0.0",
          targetVersion: "3.0.0",
        },
      )

      const stats = migrationService.getMigrationStats()
      expect(stats.totalMigrations).toBe(2)
      expect(stats.successfulMigrations).toBe(2)
      expect(stats.failedMigrations).toBe(0)
      expect(stats.schemaStats.TestSchema.total).toBe(2)
    })
  })

  describe("Real Schema Integration", () => {
    beforeEach(() => {
      // Initialize the actual schema registry
      initializeSchemaRegistry()
    })

    test("should work with FileNode schemas", () => {
      const v1FileNode = {
        id: "file1",
        name: "test.txt",
        type: "file",
        path: "/test.txt",
        size: 100,
        lastModified: "2024-01-01T00:00:00Z",
      }

      // This should work with the actual registered schemas
      const result = autoMigrateData("FileNode", v1FileNode, "1.0.0")

      expect(result.success).toBe(true)
      expect(result.data?.mimeType).toBeDefined()
      expect(result.data?.permissions).toBeDefined()
    })

    test("should work with FileSystemStats schemas", () => {
      const v1Stats = {
        totalFiles: 10,
        totalDirectories: 5,
        totalSize: 1024,
        maxDepth: 3,
      }

      const result = autoMigrateData("FileSystemStats", v1Stats, "1.0.0")

      expect(result.success).toBe(true)
      expect(result.data?.largestFile).toBeDefined()
      expect(result.data?.fileTypes).toBeDefined()
    })
  })

  describe("Performance Tests", () => {
    test("should handle large data migration efficiently", () => {
      const largeData = {
        id: "large",
        name: "Large Dataset",
        items: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
      }

      const start = performance.now()
      const result = schemaManager.migrate("TestSchema", largeData, "1.0.0", "2.0.0")
      const end = performance.now()

      expect(result.success).toBe(true)
      expect(end - start).toBeLessThan(1000) // Should complete in less than 1 second
    })

    test("should handle many small migrations efficiently", () => {
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        const data = { id: `${i}`, name: `User ${i}` }
        schemaManager.migrate("TestSchema", data, "1.0.0", "2.0.0")
      }

      const end = performance.now()
      expect(end - start).toBeLessThan(2000) // Should complete in less than 2 seconds
    })
  })
})
