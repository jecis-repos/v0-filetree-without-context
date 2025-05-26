/**
 * Schema Registry Initialization
 * Registers all schemas and migrations
 */

import { schemaManager } from "../utils/schema-versioning"

// Import schema versions
import { fileNodeSchemaV1, fileSystemStatsSchemaV1 } from "./versioned/file-system-v1"
import { fileNodeSchemaV2, fileSystemStatsSchemaV2 } from "./versioned/file-system-v2"
import { fileNodeSchemaV3, fileSystemStatsSchemaV3 } from "./versioned/file-system-v3"

// Import migrations
import { fileSystemV1ToV2, fileSystemV2ToV3, fileSystemV1ToV3 } from "./migrations/file-system-migrations"

// Import health schemas
import { healthStatusSchema, systemHealthSchema } from "./health-schemas"

/**
 * Initialize all schemas and migrations
 */
export function initializeSchemaRegistry(): void {
  // Register FileNode schemas
  schemaManager.registerSchema("FileNode", "1.0.0", fileNodeSchemaV1)
  schemaManager.registerSchema("FileNode", "2.0.0", fileNodeSchemaV2)
  schemaManager.registerSchema("FileNode", "3.0.0", fileNodeSchemaV3)

  // Register FileSystemStats schemas
  schemaManager.registerSchema("FileSystemStats", "1.0.0", fileSystemStatsSchemaV1)
  schemaManager.registerSchema("FileSystemStats", "2.0.0", fileSystemStatsSchemaV2)
  schemaManager.registerSchema("FileSystemStats", "3.0.0", fileSystemStatsSchemaV3)

  // Register Health schemas (current version only)
  schemaManager.registerSchema("HealthStatus", "1.0.0", healthStatusSchema)
  schemaManager.registerSchema("SystemHealth", "1.0.0", systemHealthSchema)

  // Register migrations
  schemaManager.registerMigration("FileNode", fileSystemV1ToV2)
  schemaManager.registerMigration("FileNode", fileSystemV2ToV3)
  schemaManager.registerMigration("FileNode", fileSystemV1ToV3)

  schemaManager.registerMigration("FileSystemStats", fileSystemV1ToV2)
  schemaManager.registerMigration("FileSystemStats", fileSystemV2ToV3)
  schemaManager.registerMigration("FileSystemStats", fileSystemV1ToV3)

  // Mark older versions as deprecated
  schemaManager.registerSchema("FileNode", "1.0.0", fileNodeSchemaV1, {
    deprecated: true,
    deprecationDate: "2024-01-01",
    supportUntil: "2024-12-31",
  })

  schemaManager.registerSchema("FileNode", "2.0.0", fileNodeSchemaV2, {
    deprecated: true,
    deprecationDate: "2024-06-01",
    supportUntil: "2025-06-01",
  })
}

/**
 * Get schema manager instance
 */
export function getSchemaManager() {
  return schemaManager
}

/**
 * Utility functions for common operations
 */
export function migrateFileNode(data: any, fromVersion: string, toVersion?: string) {
  return schemaManager.migrate("FileNode", data, fromVersion, toVersion)
}

export function migrateFileSystemStats(data: any, fromVersion: string, toVersion?: string) {
  return schemaManager.migrate("FileSystemStats", data, fromVersion, toVersion)
}

export function autoMigrateFileNode(data: any, currentVersion?: string) {
  return schemaManager.autoMigrate("FileNode", data, currentVersion)
}

export function autoMigrateFileSystemStats(data: any, currentVersion?: string) {
  return schemaManager.autoMigrate("FileSystemStats", data, currentVersion)
}

export function validateFileNode(data: any, version?: string) {
  return schemaManager.validateVersion("FileNode", data, version)
}

export function validateFileSystemStats(data: any, version?: string) {
  return schemaManager.validateVersion("FileSystemStats", data, version)
}
