/**
 * Validation Utilities and Schema Definitions
 * Provides runtime validation for complex data structures
 */

import { isString, isNumber, isBoolean, isObject, isArray, isDate, isNullish } from "./type-guards"

// Validation result types
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
}

export interface ValidationError {
  path: string
  message: string
  code: string
  value?: unknown
}

export interface ValidationOptions {
  strict?: boolean
  allowExtraProperties?: boolean
  coerceTypes?: boolean
  maxDepth?: number
}

// Schema definition types
export interface Schema {
  type: SchemaType
  required?: boolean
  nullable?: boolean
  default?: unknown
  validate?: (value: unknown) => boolean | string
  transform?: (value: unknown) => unknown
}

export interface ObjectSchema extends Schema {
  type: "object"
  properties: Record<string, Schema>
  additionalProperties?: boolean | Schema
}

export interface ArraySchema extends Schema {
  type: "array"
  items: Schema
  minItems?: number
  maxItems?: number
}

export interface StringSchema extends Schema {
  type: "string"
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  enum?: string[]
}

export interface NumberSchema extends Schema {
  type: "number"
  min?: number
  max?: number
  integer?: boolean
}

export type SchemaType = "string" | "number" | "boolean" | "object" | "array" | "date" | "any"

// Validator class
export class Validator {
  private options: ValidationOptions
  private currentPath: string[] = []

  constructor(options: ValidationOptions = {}) {
    this.options = {
      strict: false,
      allowExtraProperties: true,
      coerceTypes: false,
      maxDepth: 10,
      ...options,
    }
  }

  validate(value: unknown, schema: Schema): ValidationResult {
    this.currentPath = []
    const errors: ValidationError[] = []
    const warnings: string[] = []

    try {
      this.validateValue(value, schema, errors, warnings, 0)
    } catch (error) {
      errors.push({
        path: this.getPath(),
        message: error instanceof Error ? error.message : "Validation failed",
        code: "VALIDATION_ERROR",
        value,
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  private validateValue(
    value: unknown,
    schema: Schema,
    errors: ValidationError[],
    warnings: string[],
    depth: number,
  ): void {
    // Check max depth
    if (depth > (this.options.maxDepth || 10)) {
      errors.push({
        path: this.getPath(),
        message: "Maximum validation depth exceeded",
        code: "MAX_DEPTH_EXCEEDED",
        value,
      })
      return
    }

    // Handle nullable values
    if (isNullish(value)) {
      if (schema.nullable || !schema.required) {
        return
      }
      errors.push({
        path: this.getPath(),
        message: "Value is required but null/undefined",
        code: "REQUIRED_VALUE_NULL",
        value,
      })
      return
    }

    // Type-specific validation
    switch (schema.type) {
      case "string":
        this.validateString(value, schema as StringSchema, errors)
        break
      case "number":
        this.validateNumber(value, schema as NumberSchema, errors)
        break
      case "boolean":
        this.validateBoolean(value, schema, errors)
        break
      case "object":
        this.validateObject(value, schema as ObjectSchema, errors, warnings, depth + 1)
        break
      case "array":
        this.validateArray(value, schema as ArraySchema, errors, warnings, depth + 1)
        break
      case "date":
        this.validateDate(value, schema, errors)
        break
      case "any":
        // No validation for any type
        break
      default:
        errors.push({
          path: this.getPath(),
          message: `Unknown schema type: ${schema.type}`,
          code: "UNKNOWN_SCHEMA_TYPE",
          value,
        })
    }

    // Custom validation
    if (schema.validate) {
      const result = schema.validate(value)
      if (result !== true) {
        errors.push({
          path: this.getPath(),
          message: isString(result) ? result : "Custom validation failed",
          code: "CUSTOM_VALIDATION_FAILED",
          value,
        })
      }
    }
  }

  private validateString(value: unknown, schema: StringSchema, errors: ValidationError[]): void {
    if (!isString(value)) {
      if (this.options.coerceTypes && (isNumber(value) || isBoolean(value))) {
        value = String(value)
      } else {
        errors.push({
          path: this.getPath(),
          message: `Expected string, got ${typeof value}`,
          code: "TYPE_MISMATCH",
          value,
        })
        return
      }
    }

    const str = value as string

    if (schema.minLength !== undefined && str.length < schema.minLength) {
      errors.push({
        path: this.getPath(),
        message: `String length ${str.length} is less than minimum ${schema.minLength}`,
        code: "MIN_LENGTH_VIOLATION",
        value,
      })
    }

    if (schema.maxLength !== undefined && str.length > schema.maxLength) {
      errors.push({
        path: this.getPath(),
        message: `String length ${str.length} exceeds maximum ${schema.maxLength}`,
        code: "MAX_LENGTH_VIOLATION",
        value,
      })
    }

    if (schema.pattern && !schema.pattern.test(str)) {
      errors.push({
        path: this.getPath(),
        message: `String does not match pattern ${schema.pattern}`,
        code: "PATTERN_MISMATCH",
        value,
      })
    }

    if (schema.enum && !schema.enum.includes(str)) {
      errors.push({
        path: this.getPath(),
        message: `String "${str}" is not in allowed values: ${schema.enum.join(", ")}`,
        code: "ENUM_VIOLATION",
        value,
      })
    }
  }

  private validateNumber(value: unknown, schema: NumberSchema, errors: ValidationError[]): void {
    if (!isNumber(value)) {
      if (this.options.coerceTypes && isString(value)) {
        const parsed = Number(value)
        if (!isNaN(parsed)) {
          value = parsed
        } else {
          errors.push({
            path: this.getPath(),
            message: `Cannot coerce "${value}" to number`,
            code: "COERCION_FAILED",
            value,
          })
          return
        }
      } else {
        errors.push({
          path: this.getPath(),
          message: `Expected number, got ${typeof value}`,
          code: "TYPE_MISMATCH",
          value,
        })
        return
      }
    }

    const num = value as number

    if (schema.integer && !Number.isInteger(num)) {
      errors.push({
        path: this.getPath(),
        message: `Expected integer, got ${num}`,
        code: "INTEGER_REQUIRED",
        value,
      })
    }

    if (schema.min !== undefined && num < schema.min) {
      errors.push({
        path: this.getPath(),
        message: `Number ${num} is less than minimum ${schema.min}`,
        code: "MIN_VALUE_VIOLATION",
        value,
      })
    }

    if (schema.max !== undefined && num > schema.max) {
      errors.push({
        path: this.getPath(),
        message: `Number ${num} exceeds maximum ${schema.max}`,
        code: "MAX_VALUE_VIOLATION",
        value,
      })
    }
  }

  private validateBoolean(value: unknown, schema: Schema, errors: ValidationError[]): void {
    if (!isBoolean(value)) {
      if (this.options.coerceTypes) {
        // Try to coerce common boolean representations
        if (value === "true" || value === 1) {
          value = true
        } else if (value === "false" || value === 0) {
          value = false
        } else {
          errors.push({
            path: this.getPath(),
            message: `Cannot coerce "${value}" to boolean`,
            code: "COERCION_FAILED",
            value,
          })
        }
      } else {
        errors.push({
          path: this.getPath(),
          message: `Expected boolean, got ${typeof value}`,
          code: "TYPE_MISMATCH",
          value,
        })
      }
    }
  }

  private validateObject(
    value: unknown,
    schema: ObjectSchema,
    errors: ValidationError[],
    warnings: string[],
    depth: number,
  ): void {
    if (!isObject(value)) {
      errors.push({
        path: this.getPath(),
        message: `Expected object, got ${typeof value}`,
        code: "TYPE_MISMATCH",
        value,
      })
      return
    }

    const obj = value as Record<string, unknown>

    // Validate required properties
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      this.currentPath.push(key)

      if (propSchema.required && !(key in obj)) {
        errors.push({
          path: this.getPath(),
          message: `Required property "${key}" is missing`,
          code: "REQUIRED_PROPERTY_MISSING",
          value: undefined,
        })
      } else if (key in obj) {
        this.validateValue(obj[key], propSchema, errors, warnings, depth)
      }

      this.currentPath.pop()
    }

    // Check for extra properties
    if (!this.options.allowExtraProperties && !schema.additionalProperties) {
      const allowedKeys = Object.keys(schema.properties)
      const extraKeys = Object.keys(obj).filter((key) => !allowedKeys.includes(key))

      for (const key of extraKeys) {
        warnings.push(`Extra property "${key}" found at ${this.getPath()}`)
      }
    }
  }

  private validateArray(
    value: unknown,
    schema: ArraySchema,
    errors: ValidationError[],
    warnings: string[],
    depth: number,
  ): void {
    if (!isArray(value)) {
      errors.push({
        path: this.getPath(),
        message: `Expected array, got ${typeof value}`,
        code: "TYPE_MISMATCH",
        value,
      })
      return
    }

    const arr = value as unknown[]

    if (schema.minItems !== undefined && arr.length < schema.minItems) {
      errors.push({
        path: this.getPath(),
        message: `Array length ${arr.length} is less than minimum ${schema.minItems}`,
        code: "MIN_ITEMS_VIOLATION",
        value,
      })
    }

    if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
      errors.push({
        path: this.getPath(),
        message: `Array length ${arr.length} exceeds maximum ${schema.maxItems}`,
        code: "MAX_ITEMS_VIOLATION",
        value,
      })
    }

    // Validate each item
    for (let i = 0; i < arr.length; i++) {
      this.currentPath.push(String(i))
      this.validateValue(arr[i], schema.items, errors, warnings, depth)
      this.currentPath.pop()
    }
  }

  private validateDate(value: unknown, schema: Schema, errors: ValidationError[]): void {
    if (!isDate(value)) {
      if (this.options.coerceTypes && isString(value)) {
        const parsed = new Date(value)
        if (!isNaN(parsed.getTime())) {
          value = parsed
        } else {
          errors.push({
            path: this.getPath(),
            message: `Cannot coerce "${value}" to date`,
            code: "COERCION_FAILED",
            value,
          })
        }
      } else {
        errors.push({
          path: this.getPath(),
          message: `Expected date, got ${typeof value}`,
          code: "TYPE_MISMATCH",
          value,
        })
      }
    }
  }

  private getPath(): string {
    return this.currentPath.length > 0 ? this.currentPath.join(".") : "root"
  }
}

// Convenience functions
export function createValidator(options?: ValidationOptions): Validator {
  return new Validator(options)
}

export function validate(value: unknown, schema: Schema, options?: ValidationOptions): ValidationResult {
  const validator = new Validator(options)
  return validator.validate(value, schema)
}
