/**
 * Schema Versioning and Evolution System
 * Handles schema changes, migrations, and backward compatibility
 */

import { deepClone, safeStringify } from "./json-utils"
import { validate, type Schema, type ValidationResult } from "./validation"

// Version types
export interface SchemaVersion {
  version: string
  schema: Schema
  migrations?: SchemaMigration[]
  deprecated?: boolean
  deprecationDate?: string
  supportUntil?: string
}

export interface SchemaMigration {
  fromVersion: string
  toVersion: string
  transform: (data: any) => any
  description: string
  reversible?: boolean
  reverseTransform?: (data: any) => any
}

export interface MigrationResult {
  success: boolean
  data?: any
  fromVersion?: string
  toVersion?: string
  migrationsApplied?: string[]
  errors?: string[]
  warnings?: string[]
}

export interface SchemaRegistry {
  [schemaName: string]: {
    versions: SchemaVersion[]
    currentVersion: string
    migrations: SchemaMigration[]
  }
}

// Safe hash function for cache keys
function createCacheKey(schemaName: string, fromVersion: string, toVersion: string, data: any): string {
  try {
    const dataHash = safeStringify(data)
    return `${schemaName}:${fromVersion}:${toVersion}:${dataHash?.substring(0, 100) || "unknown"}`
  } catch (error) {
    return `${schemaName}:${fromVersion}:${toVersion}:${Date.now()}`
  }
}

// Schema evolution manager
export class SchemaEvolutionManager {
  private registry: SchemaRegistry = {}
  private migrationCache = new Map<string, MigrationResult>()

  /**
   * Register a new schema version
   */
  registerSchema(
    schemaName: string,
    version: string,
    schema: Schema,
    options: {
      migrations?: SchemaMigration[]
      deprecated?: boolean
      deprecationDate?: string
      supportUntil?: string
    } = {},
  ): void {
    try {
      if (!this.registry[schemaName]) {
        this.registry[schemaName] = {
          versions: [],
          currentVersion: version,
          migrations: [],
        }
      }

      const schemaVersion: SchemaVersion = {
        version,
        schema,
        migrations: options.migrations || [],
        deprecated: options.deprecated,
        deprecationDate: options.deprecationDate,
        supportUntil: options.supportUntil,
      }

      // Add or update version
      const existingIndex = this.registry[schemaName].versions.findIndex((v) => v.version === version)
      if (existingIndex >= 0) {
        this.registry[schemaName].versions[existingIndex] = schemaVersion
      } else {
        this.registry[schemaName].versions.push(schemaVersion)
      }

      // Sort versions
      this.registry[schemaName].versions.sort((a, b) => this.compareVersions(a.version, b.version))

      // Update current version if this is newer
      if (this.compareVersions(version, this.registry[schemaName].currentVersion) > 0) {
        this.registry[schemaName].currentVersion = version
      }

      // Add migrations to registry
      if (options.migrations) {
        this.registry[schemaName].migrations.push(...options.migrations)
      }
    } catch (error) {
      console.error(`Failed to register schema ${schemaName} version ${version}:`, error)
    }
  }

  /**
   * Register a migration between versions
   */
  registerMigration(schemaName: string, migration: SchemaMigration): void {
    if (!this.registry[schemaName]) {
      throw new Error(`Schema "${schemaName}" not found`)
    }

    this.registry[schemaName].migrations.push(migration)
  }

  /**
   * Get schema by name and version
   */
  getSchema(schemaName: string, version?: string): Schema | null {
    try {
      const schemaInfo = this.registry[schemaName]
      if (!schemaInfo) return null

      const targetVersion = version || schemaInfo.currentVersion
      const schemaVersion = schemaInfo.versions.find((v) => v.version === targetVersion)

      return schemaVersion?.schema || null
    } catch (error) {
      console.error(`Failed to get schema ${schemaName} version ${version}:`, error)
      return null
    }
  }

  /**
   * Get current version of a schema
   */
  getCurrentVersion(schemaName: string): string | null {
    return this.registry[schemaName]?.currentVersion || null
  }

  /**
   * Get all versions of a schema
   */
  getVersions(schemaName: string): string[] {
    return this.registry[schemaName]?.versions.map((v) => v.version) || []
  }

  /**
   * Check if a version is deprecated
   */
  isVersionDeprecated(schemaName: string, version: string): boolean {
    try {
      const schemaInfo = this.registry[schemaName]
      if (!schemaInfo) return false

      const schemaVersion = schemaInfo.versions.find((v) => v.version === version)
      return schemaVersion?.deprecated || false
    } catch (error) {
      console.error(`Failed to check deprecation for ${schemaName} version ${version}:`, error)
      return false
    }
  }

  /**
   * Get deprecation info for a version
   */
  getDeprecationInfo(
    schemaName: string,
    version: string,
  ): {
    deprecated: boolean
    deprecationDate?: string
    supportUntil?: string
  } {
    try {
      const schemaInfo = this.registry[schemaName]
      if (!schemaInfo) {
        return { deprecated: false }
      }

      const schemaVersion = schemaInfo.versions.find((v) => v.version === version)
      return {
        deprecated: schemaVersion?.deprecated || false,
        deprecationDate: schemaVersion?.deprecationDate,
        supportUntil: schemaVersion?.supportUntil,
      }
    } catch (error) {
      console.error(`Failed to get deprecation info for ${schemaName} version ${version}:`, error)
      return { deprecated: false }
    }
  }

  /**
   * Migrate data from one version to another
   */
  migrate(schemaName: string, data: any, fromVersion: string, toVersion?: string): MigrationResult {
    try {
      const schemaInfo = this.registry[schemaName]
      if (!schemaInfo) {
        return {
          success: false,
          errors: [`Schema "${schemaName}" not found`],
        }
      }

      const targetVersion = toVersion || schemaInfo.currentVersion
      if (fromVersion === targetVersion) {
        return {
          success: true,
          data: deepClone(data),
          fromVersion,
          toVersion: targetVersion,
          migrationsApplied: [],
        }
      }

      // Check cache
      const cacheKey = createCacheKey(schemaName, fromVersion, targetVersion, data)
      if (this.migrationCache.has(cacheKey)) {
        const cachedResult = this.migrationCache.get(cacheKey)!
        return deepClone(cachedResult)
      }

      const migrationPath = this.findMigrationPath(schemaName, fromVersion, targetVersion)
      if (!migrationPath) {
        return {
          success: false,
          errors: [`No migration path found from ${fromVersion} to ${targetVersion}`],
        }
      }

      let currentData = deepClone(data)
      const migrationsApplied: string[] = []
      const warnings: string[] = []

      for (const migration of migrationPath) {
        try {
          currentData = migration.transform(currentData)
          migrationsApplied.push(`${migration.fromVersion} -> ${migration.toVersion}`)

          // Validate intermediate result if possible
          const intermediateSchema = this.getSchema(schemaName, migration.toVersion)
          if (intermediateSchema) {
            const validation = validate(currentData, intermediateSchema)
            if (!validation.isValid) {
              warnings.push(
                `Data validation failed after migration ${migration.fromVersion} -> ${migration.toVersion}: ${validation.errors
                  .map((e) => e.message)
                  .join(", ")}`,
              )
            }
          }
        } catch (error) {
          return {
            success: false,
            errors: [
              `Migration failed at ${migration.fromVersion} -> ${migration.toVersion}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            ],
            migrationsApplied,
          }
        }
      }

      const result: MigrationResult = {
        success: true,
        data: currentData,
        fromVersion,
        toVersion: targetVersion,
        migrationsApplied,
        warnings: warnings.length > 0 ? warnings : undefined,
      }

      // Cache result
      this.migrationCache.set(cacheKey, deepClone(result))

      return result
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      }
    }
  }

  /**
   * Validate data against a specific schema version
   */
  validateVersion(schemaName: string, data: any, version?: string): ValidationResult & { version: string } {
    try {
      const targetVersion = version || this.getCurrentVersion(schemaName)
      if (!targetVersion) {
        return {
          isValid: false,
          errors: [{ path: "root", message: `Schema "${schemaName}" not found`, code: "SCHEMA_NOT_FOUND" }],
          warnings: [],
          version: "unknown",
        }
      }

      const schema = this.getSchema(schemaName, targetVersion)
      if (!schema) {
        return {
          isValid: false,
          errors: [
            {
              path: "root",
              message: `Schema version "${targetVersion}" not found`,
              code: "VERSION_NOT_FOUND",
            },
          ],
          warnings: [],
          version: targetVersion,
        }
      }

      const result = validate(data, schema)
      return {
        ...result,
        version: targetVersion,
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            path: "root",
            message: error instanceof Error ? error.message : String(error),
            code: "VALIDATION_ERROR",
          },
        ],
        warnings: [],
        version: version || "unknown",
      }
    }
  }

  /**
   * Auto-migrate data to the latest version
   */
  autoMigrate(schemaName: string, data: any, currentVersion?: string): MigrationResult {
    try {
      if (!currentVersion) {
        // Try to detect version from data
        currentVersion = this.detectVersion(schemaName, data)
      }

      if (!currentVersion) {
        return {
          success: false,
          errors: ["Could not detect data version and no version specified"],
        }
      }

      const latestVersion = this.getCurrentVersion(schemaName)
      if (!latestVersion) {
        return {
          success: false,
          errors: [`Schema "${schemaName}" not found`],
        }
      }

      return this.migrate(schemaName, data, currentVersion, latestVersion)
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      }
    }
  }

  /**
   * Find migration path between versions
   */
  private findMigrationPath(schemaName: string, fromVersion: string, toVersion: string): SchemaMigration[] | null {
    try {
      const schemaInfo = this.registry[schemaName]
      if (!schemaInfo) return null

      // Use BFS to find shortest migration path
      const migrations = schemaInfo.migrations
      const graph = new Map<string, SchemaMigration[]>()

      // Build migration graph
      for (const migration of migrations) {
        if (!graph.has(migration.fromVersion)) {
          graph.set(migration.fromVersion, [])
        }
        graph.get(migration.fromVersion)!.push(migration)
      }

      // Find path using BFS
      const queue: { version: string; path: SchemaMigration[] }[] = [{ version: fromVersion, path: [] }]
      const visited = new Set<string>()

      while (queue.length > 0) {
        const current = queue.shift()
        if (!current) break

        const { version, path } = current

        if (version === toVersion) {
          return path
        }

        if (visited.has(version)) {
          continue
        }
        visited.add(version)

        const nextMigrations = graph.get(version) || []
        for (const migration of nextMigrations) {
          if (!visited.has(migration.toVersion)) {
            queue.push({
              version: migration.toVersion,
              path: [...path, migration],
            })
          }
        }
      }

      return null
    } catch (error) {
      console.error(`Failed to find migration path from ${fromVersion} to ${toVersion}:`, error)
      return null
    }
  }

  /**
   * Detect version from data structure
   */
  private detectVersion(schemaName: string, data: any): string | null {
    try {
      const schemaInfo = this.registry[schemaName]
      if (!schemaInfo) return null

      // Try to validate against each version, starting with the latest
      const versions = [...schemaInfo.versions].reverse()

      for (const version of versions) {
        try {
          const validation = validate(data, version.schema)
          if (validation.isValid) {
            return version.version
          }
        } catch (error) {
          // Continue to next version
          continue
        }
      }

      return null
    } catch (error) {
      console.error(`Failed to detect version for schema ${schemaName}:`, error)
      return null
    }
  }

  /**
   * Compare version strings (semantic versioning)
   */
  private compareVersions(a: string, b: string): number {
    try {
      const parseVersion = (version: string): number[] => {
        const parts = String(version)
          .split(".")
          .map((part) => {
            const num = Number.parseInt(String(part), 10)
            return isNaN(num) ? 0 : num
          })
        return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
      }

      const [aMajor, aMinor, aPatch] = parseVersion(a)
      const [bMajor, bMinor, bPatch] = parseVersion(b)

      if (aMajor !== bMajor) return aMajor - bMajor
      if (aMinor !== bMinor) return aMinor - bMinor
      return aPatch - bPatch
    } catch (error) {
      console.error(`Failed to compare versions ${a} and ${b}:`, error)
      return 0
    }
  }

  /**
   * Clear migration cache
   */
  clearCache(): void {
    this.migrationCache.clear()
  }

  /**
   * Get migration statistics
   */
  getStats(): {
    schemas: number
    totalVersions: number
    totalMigrations: number
    cacheSize: number
  } {
    try {
      const schemas = Object.keys(this.registry).length
      const totalVersions = Object.values(this.registry).reduce((sum, schema) => sum + schema.versions.length, 0)
      const totalMigrations = Object.values(this.registry).reduce((sum, schema) => sum + schema.migrations.length, 0)

      return {
        schemas,
        totalVersions,
        totalMigrations,
        cacheSize: this.migrationCache.size,
      }
    } catch (error) {
      console.error("Failed to get migration stats:", error)
      return {
        schemas: 0,
        totalVersions: 0,
        totalMigrations: 0,
        cacheSize: 0,
      }
    }
  }
}

// Global schema manager instance
export const schemaManager = new SchemaEvolutionManager()

// Utility functions
export function createMigration(
  fromVersion: string,
  toVersion: string,
  transform: (data: any) => any,
  description: string,
  options: {
    reversible?: boolean
    reverseTransform?: (data: any) => any
  } = {},
): SchemaMigration {
  return {
    fromVersion: String(fromVersion),
    toVersion: String(toVersion),
    transform,
    description: String(description),
    reversible: options.reversible,
    reverseTransform: options.reverseTransform,
  }
}

export function migrateData(schemaName: string, data: any, fromVersion: string, toVersion?: string): MigrationResult {
  return schemaManager.migrate(String(schemaName), data, String(fromVersion), toVersion ? String(toVersion) : undefined)
}

export function autoMigrateData(schemaName: string, data: any, currentVersion?: string): MigrationResult {
  return schemaManager.autoMigrate(String(schemaName), data, currentVersion ? String(currentVersion) : undefined)
}
