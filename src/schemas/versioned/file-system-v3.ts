/**
 * File System Schema Version 3.0.0
 * Added preview URLs, thumbnails, and enhanced metadata
 */

import type { ObjectSchema } from "../../utils/validation"

export const fileNodeSchemaV3: ObjectSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      required: true,
    },
    name: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      required: true,
    },
    path: {
      type: "string",
      required: true,
    },
    size: {
      type: "number",
      required: false,
      nullable: true,
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
      properties: {
        encoding: {
          type: "string",
          required: false,
          nullable: true,
        },
        checksum: {
          type: "string",
          required: false,
          nullable: true,
        },
        tags: {
          type: "array",
          required: false,
          nullable: true,
          items: { type: "string" },
        },
      },
      additionalProperties: true,
    },
    children: {
      type: "array",
      required: false,
      nullable: true,
      items: { type: "any" },
    },
  },
  additionalProperties: false,
}

export const fileSystemStatsSchemaV3: ObjectSchema = {
  type: "object",
  properties: {
    totalFiles: {
      type: "number",
      required: true,
    },
    totalDirectories: {
      type: "number",
      required: true,
    },
    totalSize: {
      type: "number",
      required: true,
    },
    maxDepth: {
      type: "number",
      required: true,
    },
    largestFile: {
      type: "object",
      required: false,
      nullable: true,
      properties: {},
      additionalProperties: true,
    },
    fileTypes: {
      type: "object",
      required: false,
      nullable: true,
      properties: {},
      additionalProperties: {
        type: "number",
      },
    },
    averageFileSize: {
      type: "number",
      required: false,
      nullable: true,
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
