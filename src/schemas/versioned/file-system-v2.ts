/**
 * File System Schema Version 2.0.0
 * Added metadata, permissions, and MIME type support
 */

import type { ObjectSchema } from "../../utils/validation"

export const fileNodeSchemaV2: ObjectSchema = {
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
      items: { type: "any" },
    },
  },
  additionalProperties: false,
}

export const fileSystemStatsSchemaV2: ObjectSchema = {
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
  },
  additionalProperties: false,
}
