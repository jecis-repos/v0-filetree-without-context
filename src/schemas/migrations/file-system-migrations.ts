/**
 * File System Schema Migrations
 * Defines transformations between schema versions
 */

import { createMigration } from "../../utils/schema-versioning"
import { isObject, isArray } from "../../utils/type-guards"

// Migration from v1.0.0 to v2.0.0
export const fileSystemV1ToV2 = createMigration(
  "1.0.0",
  "2.0.0",
  (data: any) => {
    if (!isObject(data)) return data

    const migrateFileNode = (node: any): any => {
      if (!isObject(node)) return node

      const migrated = { ...node }

      // Add new fields with default values
      if (!("mimeType" in migrated)) {
        migrated.mimeType = null
      }
      if (!("permissions" in migrated)) {
        migrated.permissions = null
      }
      if (!("metadata" in migrated)) {
        migrated.metadata = null
      }

      // Migrate children recursively
      if (isArray(migrated.children)) {
        migrated.children = migrated.children.map(migrateFileNode)
      }

      return migrated
    }

    // Handle different data structures
    if ("totalFiles" in data) {
      // FileSystemStats migration
      const migrated = { ...data }
      if (!("largestFile" in migrated)) {
        migrated.largestFile = null
      }
      if (!("fileTypes" in migrated)) {
        migrated.fileTypes = null
      }
      if (!("averageFileSize" in migrated)) {
        migrated.averageFileSize = null
      }
      return migrated
    } else {
      // FileNode migration
      return migrateFileNode(data)
    }
  },
  "Add MIME type, permissions, and metadata support",
  {
    reversible: true,
    reverseTransform: (data: any) => {
      if (!isObject(data)) return data

      const revertFileNode = (node: any): any => {
        if (!isObject(node)) return node

        const reverted = { ...node }

        // Remove v2 fields
        delete reverted.mimeType
        delete reverted.permissions
        delete reverted.metadata

        // Revert children recursively
        if (isArray(reverted.children)) {
          reverted.children = reverted.children.map(revertFileNode)
        }

        return reverted
      }

      if ("totalFiles" in data) {
        // FileSystemStats reversion
        const reverted = { ...data }
        delete reverted.largestFile
        delete reverted.fileTypes
        delete reverted.averageFileSize
        return reverted
      } else {
        // FileNode reversion
        return revertFileNode(data)
      }
    },
  },
)

// Migration from v2.0.0 to v3.0.0
export const fileSystemV2ToV3 = createMigration(
  "2.0.0",
  "3.0.0",
  (data: any) => {
    if (!isObject(data)) return data

    const migrateFileNode = (node: any): any => {
      if (!isObject(node)) return node

      const migrated = { ...node }

      // Add new fields
      if (!("thumbnailUrl" in migrated)) {
        migrated.thumbnailUrl = null
      }
      if (!("previewUrl" in migrated)) {
        migrated.previewUrl = null
      }

      // Enhance metadata structure
      if (migrated.metadata === null || migrated.metadata === undefined) {
        migrated.metadata = null
      } else if (isObject(migrated.metadata)) {
        const enhancedMetadata = { ...migrated.metadata }
        if (!("encoding" in enhancedMetadata)) {
          enhancedMetadata.encoding = null
        }
        if (!("checksum" in enhancedMetadata)) {
          enhancedMetadata.checksum = null
        }
        if (!("tags" in enhancedMetadata)) {
          enhancedMetadata.tags = null
        }
        migrated.metadata = enhancedMetadata
      }

      // Migrate children recursively
      if (isArray(migrated.children)) {
        migrated.children = migrated.children.map(migrateFileNode)
      }

      return migrated
    }

    if ("totalFiles" in data) {
      // FileSystemStats migration
      const migrated = { ...data }
      if (!("creationDate" in migrated)) {
        migrated.creationDate = null
      }
      if (!("lastModifiedDate" in migrated)) {
        migrated.lastModifiedDate = null
      }
      return migrated
    } else {
      // FileNode migration
      return migrateFileNode(data)
    }
  },
  "Add preview URLs, thumbnails, and enhanced metadata",
  {
    reversible: true,
    reverseTransform: (data: any) => {
      if (!isObject(data)) return data

      const revertFileNode = (node: any): any => {
        if (!isObject(node)) return node

        const reverted = { ...node }

        // Remove v3 fields
        delete reverted.thumbnailUrl
        delete reverted.previewUrl

        // Revert metadata structure
        if (isObject(reverted.metadata)) {
          const revertedMetadata = { ...reverted.metadata }
          delete revertedMetadata.encoding
          delete revertedMetadata.checksum
          delete revertedMetadata.tags

          // If metadata is now empty, set to null
          if (Object.keys(revertedMetadata).length === 0) {
            reverted.metadata = null
          } else {
            reverted.metadata = revertedMetadata
          }
        }

        // Revert children recursively
        if (isArray(reverted.children)) {
          reverted.children = reverted.children.map(revertFileNode)
        }

        return reverted
      }

      if ("totalFiles" in data) {
        // FileSystemStats reversion
        const reverted = { ...data }
        delete reverted.creationDate
        delete reverted.lastModifiedDate
        return reverted
      } else {
        // FileNode reversion
        return revertFileNode(data)
      }
    },
  },
)

// Migration from v1.0.0 to v3.0.0 (direct migration)
export const fileSystemV1ToV3 = createMigration(
  "1.0.0",
  "3.0.0",
  (data: any) => {
    // Apply v1->v2 then v2->v3
    const v2Data = fileSystemV1ToV2.transform(data)
    return fileSystemV2ToV3.transform(v2Data)
  },
  "Direct migration from v1 to v3 (combines v1->v2 and v2->v3)",
)
