/**
 * JSON Utilities with Enhanced Type Safety
 * Safe JSON parsing, stringifying, and comparison utilities
 */

import { isObject, isArray, isString } from "./type-guards"

export interface JsonParseResult {
  success: boolean
  data?: any
  error?: string
}

export interface JsonStringifyResult {
  success: boolean
  json?: string
  error?: string
}

export interface JsonCompareResult {
  equal: boolean
  differences?: string[]
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse(jsonString: string): JsonParseResult {
  try {
    if (!isString(jsonString)) {
      return {
        success: false,
        error: "Input is not a string",
      }
    }

    if (jsonString.trim() === "") {
      return {
        success: false,
        error: "Empty string cannot be parsed as JSON",
      }
    }

    const data = JSON.parse(jsonString)
    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Safe JSON stringifying with circular reference handling
 */
export function safeStringify(
  data: any,
  options: {
    space?: number
    replacer?: (key: string, value: any) => any
    maxDepth?: number
  } = {},
): string | null {
  try {
    const { space = 0, replacer, maxDepth = 100 } = options
    const seen = new WeakSet()
    let depth = 0

    const circularReplacer = (key: string, value: any): any => {
      // Handle depth limit
      if (depth > maxDepth) {
        return "[Max Depth Exceeded]"
      }

      // Handle circular references
      if (isObject(value) && value !== null) {
        if (seen.has(value)) {
          return "[Circular Reference]"
        }
        seen.add(value)
      }

      // Handle special values
      if (value === undefined) {
        return "[Undefined]"
      }

      if (typeof value === "function") {
        return "[Function]"
      }

      if (typeof value === "symbol") {
        return `[Symbol: ${String(value)}]`
      }

      if (typeof value === "bigint") {
        return `[BigInt: ${String(value)}]`
      }

      // Handle dates
      if (value instanceof Date) {
        return value.toISOString()
      }

      // Handle errors
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        }
      }

      // Apply custom replacer if provided
      if (replacer) {
        depth++
        const result = replacer(key, value)
        depth--
        return result
      }

      return value
    }

    return JSON.stringify(data, circularReplacer, space)
  } catch (error) {
    console.error("JSON stringify error:", error)
    return null
  }
}

/**
 * Deep clone an object safely
 */
export function deepClone<T>(obj: T): T {
  try {
    if (obj === null || typeof obj !== "object") {
      return obj
    }

    // Handle dates
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T
    }

    // Handle arrays
    if (isArray(obj)) {
      return obj.map((item) => deepClone(item)) as T
    }

    // Handle regular objects
    if (isObject(obj)) {
      const cloned = {} as T
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          ;(cloned as any)[key] = deepClone((obj as any)[key])
        }
      }
      return cloned
    }

    return obj
  } catch (error) {
    console.error("Deep clone error:", error)
    return obj
  }
}

/**
 * Deep comparison of two values
 */
export function deepEqual(a: any, b: any): boolean {
  try {
    // Same reference
    if (a === b) return true

    // Null/undefined checks
    if (a == null || b == null) return a === b

    // Type checks
    if (typeof a !== typeof b) return false

    // Primitive types
    if (typeof a !== "object") return a === b

    // Date objects
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    }

    // Array comparison
    if (isArray(a) && isArray(b)) {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false
      }
      return true
    }

    // Object comparison
    if (isObject(a) && isObject(b)) {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)

      if (keysA.length !== keysB.length) return false

      for (const key of keysA) {
        if (!keysB.includes(key)) return false
        if (!deepEqual(a[key], b[key])) return false
      }
      return true
    }

    return false
  } catch (error) {
    console.error("Deep equal error:", error)
    return false
  }
}

/**
 * Compare two JSON objects and return differences
 */
export function compareJson(a: any, b: any, path = ""): JsonCompareResult {
  try {
    const differences: string[] = []

    function findDifferences(obj1: any, obj2: any, currentPath: string): void {
      if (obj1 === obj2) return

      if (obj1 == null || obj2 == null) {
        differences.push(`${currentPath}: ${String(obj1)} !== ${String(obj2)}`)
        return
      }

      if (typeof obj1 !== typeof obj2) {
        differences.push(`${currentPath}: type mismatch (${typeof obj1} vs ${typeof obj2})`)
        return
      }

      if (typeof obj1 !== "object") {
        differences.push(`${currentPath}: ${String(obj1)} !== ${String(obj2)}`)
        return
      }

      if (isArray(obj1) && isArray(obj2)) {
        if (obj1.length !== obj2.length) {
          differences.push(`${currentPath}: array length mismatch (${obj1.length} vs ${obj2.length})`)
        }

        const maxLength = Math.max(obj1.length, obj2.length)
        for (let i = 0; i < maxLength; i++) {
          const newPath = `${currentPath}[${i}]`
          if (i >= obj1.length) {
            differences.push(`${newPath}: missing in first array`)
          } else if (i >= obj2.length) {
            differences.push(`${newPath}: missing in second array`)
          } else {
            findDifferences(obj1[i], obj2[i], newPath)
          }
        }
        return
      }

      if (isObject(obj1) && isObject(obj2)) {
        const keys1 = Object.keys(obj1)
        const keys2 = Object.keys(obj2)
        const allKeys = new Set([...keys1, ...keys2])

        for (const key of allKeys) {
          const newPath = currentPath ? `${currentPath}.${key}` : key

          if (!(key in obj1)) {
            differences.push(`${newPath}: missing in first object`)
          } else if (!(key in obj2)) {
            differences.push(`${newPath}: missing in second object`)
          } else {
            findDifferences(obj1[key], obj2[key], newPath)
          }
        }
        return
      }

      differences.push(`${currentPath}: ${String(obj1)} !== ${String(obj2)}`)
    }

    findDifferences(a, b, path)

    return {
      equal: differences.length === 0,
      differences: differences.length > 0 ? differences : undefined,
    }
  } catch (error) {
    return {
      equal: false,
      differences: [`Comparison error: ${error instanceof Error ? error.message : String(error)}`],
    }
  }
}

/**
 * Sanitize JSON data by removing unsafe properties
 */
export function sanitizeJson(data: any): any {
  try {
    if (data === null || typeof data !== "object") {
      return data
    }

    if (isArray(data)) {
      return data.map(sanitizeJson)
    }

    if (isObject(data)) {
      const sanitized: any = {}
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          // Skip potentially dangerous properties
          if (key === "__proto__" || key === "constructor" || key === "prototype") {
            continue
          }
          sanitized[key] = sanitizeJson(data[key])
        }
      }
      return sanitized
    }

    return data
  } catch (error) {
    console.error("JSON sanitization error:", error)
    return null
  }
}

/**
 * Validate JSON structure against a simple schema
 */
export function validateJsonStructure(
  data: any,
  expectedStructure: any,
): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  function validate(obj: any, expected: any, path = ""): void {
    try {
      if (expected === null) {
        if (obj !== null) {
          errors.push(`${path}: expected null, got ${typeof obj}`)
        }
        return
      }

      if (typeof expected === "string") {
        if (typeof obj !== "string") {
          errors.push(`${path}: expected string, got ${typeof obj}`)
        }
        return
      }

      if (typeof expected === "number") {
        if (typeof obj !== "number") {
          errors.push(`${path}: expected number, got ${typeof obj}`)
        }
        return
      }

      if (typeof expected === "boolean") {
        if (typeof obj !== "boolean") {
          errors.push(`${path}: expected boolean, got ${typeof obj}`)
        }
        return
      }

      if (isArray(expected)) {
        if (!isArray(obj)) {
          errors.push(`${path}: expected array, got ${typeof obj}`)
          return
        }

        if (expected.length > 0) {
          const expectedItem = expected[0]
          obj.forEach((item: any, index: number) => {
            validate(item, expectedItem, `${path}[${index}]`)
          })
        }
        return
      }

      if (isObject(expected)) {
        if (!isObject(obj)) {
          errors.push(`${path}: expected object, got ${typeof obj}`)
          return
        }

        for (const key in expected) {
          if (Object.prototype.hasOwnProperty.call(expected, key)) {
            const newPath = path ? `${path}.${key}` : key
            if (!(key in obj)) {
              errors.push(`${newPath}: missing required property`)
            } else {
              validate(obj[key], expected[key], newPath)
            }
          }
        }
        return
      }
    } catch (error) {
      errors.push(`${path}: validation error - ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  validate(data, expectedStructure)

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Safely converts any value to a string representation
 */
export function safeToString(value: any): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch (e) {
      return "[Object]"
    }
  }
  return String(value)
}

/**
 * Safe clone function (alternative implementation)
 */
export function safeClone<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj
  }

  const seen = new WeakMap()

  function clone(item: any): any {
    if (item === null || item === undefined || typeof item !== "object") {
      return item
    }

    if (seen.has(item)) {
      return "[Circular Reference]"
    }

    seen.set(item, true)

    if (Array.isArray(item)) {
      return item.map((i) => clone(i))
    }

    if (item instanceof Date) {
      return new Date(item)
    }

    if (item instanceof RegExp) {
      return new RegExp(item.source, item.flags)
    }

    if (item instanceof Map) {
      const map = new Map()
      item.forEach((value, key) => {
        map.set(key, clone(value))
      })
      return map
    }

    if (item instanceof Set) {
      const set = new Set()
      item.forEach((value) => {
        set.add(clone(value))
      })
      return set
    }

    const result: Record<string, any> = {}
    Object.keys(item).forEach((key) => {
      result[key] = clone(item[key])
    })

    return result
  }

  return clone(obj) as T
}

/**
 * Checks if a value is a plain object
 */
export function isPlainObject(value: any): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp) &&
    !(value instanceof Map) &&
    !(value instanceof Set)
  )
}

/**
 * Alias for safeStringify for backward compatibility
 */
export const safeJsonStringify = safeStringify
