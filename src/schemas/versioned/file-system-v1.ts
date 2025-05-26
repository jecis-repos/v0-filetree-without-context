/**
 * File System Schema Version 1.0.0
 * Initial schema definition
 */

import type { ObjectSchema } from "../../utils/validation"

export const fileNodeSchemaV1: ObjectSchema = {
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
    children: {
      type: "array",
      required: false,
      nullable: true,
      items: { type: "any" },
    },
  },
  additionalProperties: false,
}

export const fileSystemStatsSchemaV1: ObjectSchema = {
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
  },
  additionalProperties: false,
}
