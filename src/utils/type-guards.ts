/**
 * Comprehensive Type Guards and Safe Operations
 * Prevents object-to-primitive conversion errors
 */

export function isString(value: any): value is string {
  return typeof value === "string"
}

export function isNumber(value: any): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value)
}

export function isBoolean(value: any): value is boolean {
  return typeof value === "boolean"
}

export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function isArray(value: any): value is any[] {
  return Array.isArray(value)
}

export function isFunction(value: any): value is Function {
  return typeof value === "function"
}

export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime())
}

export function isNull(value: any): value is null {
  return value === null
}

export function isUndefined(value: any): value is undefined {
  return value === undefined
}

export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined
}

export function isPrimitive(value: any): value is string | number | boolean | null | undefined {
  const type = typeof value
  return value === null || type === "undefined" || type === "string" || type === "number" || type === "boolean"
}

export function isPlainObject(value: any): value is Record<string, any> {
  if (!isObject(value)) return false

  // Check if it's a plain object (not a class instance, Date, etc.)
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

/**
 * Safe conversion utilities to prevent object-to-primitive errors
 */

export function safeString(value: any): string {
  if (isNullOrUndefined(value)) return ""
  if (isString(value)) return value
  if (isNumber(value) || isBoolean(value)) return String(value)
  if (isDate(value)) return value.toISOString()
  if (isObject(value) || isArray(value)) {
    try {
      return JSON.stringify(value)
    } catch {
      return "[Object]"
    }
  }
  try {
    return String(value)
  } catch {
    return "[Unknown]"
  }
}

export function safeNumber(value: any, fallback = 0): number {
  if (isNumber(value)) return value
  if (isString(value)) {
    const parsed = Number.parseFloat(value)
    return isNumber(parsed) ? parsed : fallback
  }
  if (isBoolean(value)) return value ? 1 : 0
  return fallback
}

export function safeBoolean(value: any): boolean {
  if (isBoolean(value)) return value
  if (isString(value)) return value.toLowerCase() === "true" || value === "1"
  if (isNumber(value)) return value !== 0
  return Boolean(value)
}

export function safeArray<T>(value: any): T[] {
  if (isArray(value)) return value
  if (isNullOrUndefined(value)) return []
  return [value]
}

export function safeObject(value: any): Record<string, any> {
  if (isPlainObject(value)) return value
  if (isNullOrUndefined(value)) return {}
  return { value }
}

/**
 * Safe comparison utilities
 */

export function safeEquals(a: any, b: any): boolean {
  try {
    if (a === b) return true
    if (isNullOrUndefined(a) || isNullOrUndefined(b)) return a === b

    // Convert both to strings for comparison if they're different types
    if (typeof a !== typeof b) {
      return safeString(a) === safeString(b)
    }

    if (isPrimitive(a) && isPrimitive(b)) {
      return a === b
    }

    // For objects, do a shallow comparison
    if (isObject(a) && isObject(b)) {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      return keysA.every((key) => safeEquals(a[key], b[key]))
    }

    if (isArray(a) && isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => safeEquals(item, b[index]))
    }

    return false
  } catch {
    return false
  }
}

export function safeCompare(a: any, b: any): number {
  try {
    if (a === b) return 0
    if (isNullOrUndefined(a)) return isNullOrUndefined(b) ? 0 : -1
    if (isNullOrUndefined(b)) return 1

    // If both are numbers, compare numerically
    if (isNumber(a) && isNumber(b)) {
      return a - b
    }

    // If both are dates, compare by time
    if (isDate(a) && isDate(b)) {
      return a.getTime() - b.getTime()
    }

    // Convert to strings and compare
    const strA = safeString(a)
    const strB = safeString(b)
    return strA.localeCompare(strB)
  } catch {
    return 0
  }
}

/**
 * Safe mathematical operations
 */

export function safeAdd(a: any, b: any): number {
  return safeNumber(a) + safeNumber(b)
}

export function safeSubtract(a: any, b: any): number {
  return safeNumber(a) - safeNumber(b)
}

export function safeMultiply(a: any, b: any): number {
  return safeNumber(a) * safeNumber(b)
}

export function safeDivide(a: any, b: any, fallback = 0): number {
  const numA = safeNumber(a)
  const numB = safeNumber(b)
  if (numB === 0) return fallback
  return numA / numB
}

/**
 * Safe property access
 */

export function safeGet(obj: any, path: string | string[], fallback?: any): any {
  try {
    if (isNullOrUndefined(obj)) return fallback

    const keys = isArray(path) ? path : path.split(".")
    let current = obj

    for (const key of keys) {
      if (isNullOrUndefined(current) || !(key in current)) {
        return fallback
      }
      current = current[key]
    }

    return current
  } catch {
    return fallback
  }
}

export function safeSet(obj: any, path: string | string[], value: any): boolean {
  try {
    if (isNullOrUndefined(obj) || !isObject(obj)) return false

    const keys = isArray(path) ? path : path.split(".")
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || !isObject(current[key])) {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
    return true
  } catch {
    return false
  }
}
