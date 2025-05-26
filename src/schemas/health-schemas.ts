/**
 * Health Monitoring Domain Schemas
 * Type-safe validation for health monitoring data structures
 */

import type { ObjectSchema } from "../utils/validation"
import { isString, isNumber } from "../utils/type-guards"

// HealthStatus schema
export const healthStatusSchema: ObjectSchema = {
  type: "object",
  properties: {
    service: {
      type: "string",
      required: true,
      validate: (value) => isString(value) && value.length > 0,
    },
    status: {
      type: "string",
      required: true,
      validate: (value) => ["healthy", "degraded", "unhealthy", "unknown"].includes(value as string),
    },
    lastCheck: {
      type: "string",
      required: true,
      validate: (value) => isString(value) && !isNaN(Date.parse(value)),
    },
    responseTime: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0,
    },
    error: {
      type: "string",
      required: false,
      nullable: true,
    },
    details: {
      type: "object",
      required: false,
      nullable: true,
      properties: {},
      additionalProperties: true,
    },
  },
  additionalProperties: false,
}

// SystemHealth schema
export const systemHealthSchema: ObjectSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      required: true,
      validate: (value) => ["healthy", "degraded", "unhealthy"].includes(value as string),
    },
    services: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0 && Number.isInteger(value),
    },
    healthy: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0 && Number.isInteger(value),
    },
    unhealthy: {
      type: "number",
      required: true,
      validate: (value) => isNumber(value) && value >= 0 && Number.isInteger(value),
    },
    details: {
      type: "array",
      required: true,
      items: healthStatusSchema,
    },
  },
  additionalProperties: false,
}
