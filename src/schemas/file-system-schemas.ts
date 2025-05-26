/**
 * File System Domain Schemas
 * Type-safe validation for file system related data structures
 */

import type { ObjectSchema } from "../utils/validation"
import { isString, isNumber } from "../utils/type-guards"

// FileNode schema
export const fileNodeSchema: ObjectSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      required: true,
      validate: (value) => isString(value) && value.length > 0,
    },
    name: {
      type: "string",
      required: true,
      validate: (value) => isString(value) && value.length > 0 && !/[<>:"/\\|?*]/.test(value),
    },
    type: {
      type: "string",
      required: true,
      validate: (value) => value === "file" || value === "directory",
    },
    path: {
      type: "string",
      required: true,
      validate: (value) => isString(value) && value.startsWith("/"),
    },
    size: {
      type: "number",
      required: false,
      nullable: true,
      validate: (value) => value === null || value === undefined || (isNumber(value) && value >= 0),
    },
    lastModified: {
      type: "date",
      required: false,
      nullable: true,
    },
    mimeType: {
      type: "string",
      required: false,
      nullable: true,
      validate: (value) =>
        value === null ||
        value === undefined ||
        (isString(value) && /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/.test(value)),
    },
    permissions: {
      type: "string",
      required: false,
      nullable: true,
    },
    thumbnailUrl: {
      type: "string",
      required: false,
      nullable: true,
    },
    previewUrl: {
      type: "string",
      required: false,
      nullable: true,
    },
    metadata: {
      type: "object",
      required: false,
      nullable: true,
      properties: {},
      additionalProperties: true,
    },
    children: {
      type: "array",
      required: false,
      nullable: true,
      items: { type: "any" }, // Recursive reference
    },
  },
  additionalProperties: false,
}

// FileSystemStats schema
export const fileSystemStatsSchema: ObjectSchema = {
  type: "object",
  properties: {
    totalFiles: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0 && Number.isInteger(value),
    },
    totalDirectories: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0 && Number.isInteger(value),
    },
    totalSize: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0,
    },
    maxDepth: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0 && Number.isInteger(value),
    },
    largestFile: {
      type: "object",
      required: false,
      nullable: true,
      properties: fileNodeSchema.properties,
    },
    fileTypes: {
      type: "object",
      required: false,
      nullable: true,
      properties: {},
      additionalProperties: {
        type: "number",
        validate: (value) => isNumber(value) && value >= 0 && Number.isInteger(value),
      },
    },
    averageFileSize: {
      type: "number",
      required: false,
      nullable: true,
      validate: (value) => value === null || value === undefined || (isNumber(value) && value >= 0),
    },
    creationDate: {
      type: "date",
      required: false,
      nullable: true,
    },
    lastModifiedDate: {
      type: "date",
      required: false,
      nullable: true,
    },
  },
  additionalProperties: false,
}

// FileOperation schema
export const fileOperationSchema: ObjectSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      required: true,
    },
    operation: {
      type: "string",
      required: true,
      validate: (value) => ["create", "read", "update", "delete", "move", "copy"].includes(value as string),
    },
    path: {
      type: "string",
      required: true,
      validate: (value) => isString(value) && value.startsWith("/"),
    },
    timestamp: {
      type: "string",
      required: true,
      validate: (value) => isString(value) && !isNaN(Date.parse(value)),
    },
    duration: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0,
    },
    success: {
      type: "boolean",
      required: true,
    },
    error: {
      type: "string",
      required: false,
      nullable: true,
    },
  },
  additionalProperties: false,
}

// Import data schema
export const importDataSchema: ObjectSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      required: false,
      nullable: true,
    },
    filepaths: {
      type: "array",
      required: false,
      nullable: true,
      items: {
        type: "string",
        validate: (value) => isString(value) && value.trim().length > 0,
      },
    },
    // Alternative: hierarchical structure
    nodes: {
      type: "array",
      required: false,
      nullable: true,
      items: fileNodeSchema,
    },
  },
  additionalProperties: true,
}
