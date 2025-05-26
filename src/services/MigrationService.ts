/**
 * Migration Service
 * Handles data migrations and schema evolution in the application
 */

import { schemaManager, type MigrationResult } from "../utils/schema-versioning"
import { safeJsonParse } from "../utils/json-utils"

export interface MigrationOptions {
  autoMigrate?: boolean
  validateResult?: boolean
  preserveOriginal?: boolean
  logMigrations?: boolean
}

export interface MigrationLog {
  timestamp: string
  schemaName: string
  fromVersion: string
  toVersion: string
  success: boolean
  migrationsApplied: string[]
  errors?: string[]
  warnings?: string[]
}

export class MigrationService {
  private migrationLogs: MigrationLog[] = []
  private options: MigrationOptions

  constructor(options: MigrationOptions = {}) {
    this.options = {
      autoMigrate: true,
      validateResult: true,
      preserveOriginal: false,
      logMigrations: true,
      ...options,
    }
  }

  /**
   * Process data with automatic migration
   */
  async processData(
    schemaName: string,
    data: any,
    options: {
      currentVersion?: string
      targetVersion?: string
      validate?: boolean
    } = {},
  ): Promise<{
    success: boolean
    data?: any
    originalData?: any
    migrationResult?: MigrationResult
    validationResult?: any
    error?: string
  }> {
    try {
      const originalData = this.options.preserveOriginal ? JSON.parse(JSON.stringify(data)) : undefined

      // Auto-detect version if not provided
      let currentVersion = options.currentVersion
      if (!currentVersion && this.options.autoMigrate) {
        currentVersion = this.detectDataVersion(schemaName, data)
      }

      if (!currentVersion) {
        return {
          success: false,
          error: "Could not detect data version and no version specified",
          originalData,
        }
      }

      // Perform migration
      const migrationResult = schemaManager.migrate(schemaName, data, currentVersion, options.targetVersion)

      // Log migration
      if (this.options.logMigrations) {
        this.logMigration(schemaName, migrationResult)
      }

      if (!migrationResult.success) {
        return {
          success: false,
          error: migrationResult.errors?.join(", ") || "Migration failed",
          originalData,
          migrationResult,
        }
      }

      // Validate result if requested
      let validationResult
      if (options.validate !== false && this.options.validateResult) {
        validationResult = schemaManager.validateVersion(schemaName, migrationResult.data, migrationResult.toVersion)

        if (!validationResult.isValid) {
          return {
            success: false,
            error: `Validation failed after migration: ${validationResult.errors.map((e) => e.message).join(", ")}`,
            originalData,
            migrationResult,
            validationResult,
          }
        }
      }

      return {
        success: true,
        data: migrationResult.data,
        originalData,
        migrationResult,
        validationResult,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during data processing",
        originalData: this.options.preserveOriginal ? data : undefined,
      }
    }
  }

  /**
   * Process JSON string with migration
   */
  async processJsonString(
    schemaName: string,
    jsonString: string,
    options: {
      currentVersion?: string
      targetVersion?: string
      validate?: boolean
    } = {},
  ): Promise<{
    success: boolean
    data?: any
    originalJson?: string
    migrationResult?: MigrationResult
    validationResult?: any
    error?: string
  }> {
    // Parse JSON safely
    const parseResult = safeJsonParse(jsonString)
    if (!parseResult.success) {
      return {
        success: false,
        error: `JSON parsing failed: ${parseResult.error}`,
        originalJson: this.options.preserveOriginal ? jsonString : undefined,
      }
    }

    // Process the parsed data
    const result = await this.processData(schemaName, parseResult.data, options)

    return {
      ...result,
      originalJson: this.options.preserveOriginal ? jsonString : undefined,
    }
  }

  /**
   * Batch process multiple data items
   */
  async batchProcess(
    schemaName: string,
    dataItems: any[],
    options: {
      currentVersion?: string
      targetVersion?: string
      validate?: boolean
      continueOnError?: boolean
    } = {},
  ): Promise<{
    success: boolean
    results: any[]
    errors: string[]
    successCount: number
    errorCount: number
  }> {
    const results: any[] = []
    const errors: string[] = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < dataItems.length; i++) {
      try {
        const result = await this.processData(schemaName, dataItems[i], options)

        if (result.success) {
          results.push(result.data)
          successCount++
        } else {
          results.push(null)
          errors.push(`Item ${i}: ${result.error}`)
          errorCount++

          if (!options.continueOnError) {
            break
          }
        }
      } catch (error) {
        results.push(null)
        errors.push(`Item ${i}: ${error instanceof Error ? error.message : "Unknown error"}`)
        errorCount++

        if (!options.continueOnError) {
          break
        }
      }
    }

    return {
      success: errorCount === 0,
      results,
      errors,
      successCount,
      errorCount,
    }
  }

  /**
   * Get migration history
   */
  getMigrationHistory(schemaName?: string): MigrationLog[] {
    if (schemaName) {
      return this.migrationLogs.filter((log) => log.schemaName === schemaName)
    }
    return [...this.migrationLogs]
  }

  /**
   * Clear migration history
   */
  clearMigrationHistory(): void {
    this.migrationLogs = []
  }

  /**
   * Get migration statistics
   */
  getMigrationStats(): {
    totalMigrations: number
    successfulMigrations: number
    failedMigrations: number
    schemaStats: Record<string, { total: number; successful: number; failed: number }>
  } {
    const totalMigrations = this.migrationLogs.length
    const successfulMigrations = this.migrationLogs.filter((log) => log.success).length
    const failedMigrations = totalMigrations - successfulMigrations

    const schemaStats: Record<string, { total: number; successful: number; failed: number }> = {}

    for (const log of this.migrationLogs) {
      if (!schemaStats[log.schemaName]) {
        schemaStats[log.schemaName] = { total: 0, successful: 0, failed: 0 }
      }

      schemaStats[log.schemaName].total++
      if (log.success) {
        schemaStats[log.schemaName].successful++
      } else {
        schemaStats[log.schemaName].failed++
      }
    }

    return {
      totalMigrations,
      successfulMigrations,
      failedMigrations,
      schemaStats,
    }
  }

  /**
   * Detect data version by trying validation against known schemas
   */
  private detectDataVersion(schemaName: string, data: any): string | null {
    const versions = schemaManager.getVersions(schemaName)

    // Try latest version first, then work backwards
    for (const version of versions.reverse()) {
      const validation = schemaManager.validateVersion(schemaName, data, version)
      if (validation.isValid) {
        return version
      }
    }

    return null
  }

  /**
   * Log migration result
   */
  private logMigration(schemaName: string, result: MigrationResult): void {
    const log: MigrationLog = {
      timestamp: new Date().toISOString(),
      schemaName,
      fromVersion: result.fromVersion || "unknown",
      toVersion: result.toVersion || "unknown",
      success: result.success,
      migrationsApplied: result.migrationsApplied || [],
      errors: result.errors,
      warnings: result.warnings,
    }

    this.migrationLogs.push(log)

    // Keep only last 1000 logs to prevent memory issues
    if (this.migrationLogs.length > 1000) {
      this.migrationLogs = this.migrationLogs.slice(-1000)
    }
  }
}

// Global migration service instance
export const migrationService = new MigrationService()
