/**
 * Safe Type Conversion Utilities
 * Prevents object-to-primitive conversion errors
 */

export function safeToString(value: any): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number") return isNaN(value) ? "0" : String(value)
  if (typeof value === "boolean") return String(value)
  if (typeof value === "bigint") return String(value)
  if (typeof value === "symbol") return value.toString()

  // Handle objects
  if (typeof value === "object") {
    // Handle Date objects
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? "" : value.toISOString()
    }

    // Handle Error objects
    if (value instanceof Error) {
      return value.message || "Error"
    }

    // Handle arrays
    if (Array.isArray(value)) {
      try {
        return value.map((item) => safeToString(item)).join(", ")
      } catch {
        return "[Array]"
      }
    }

    // Handle plain objects
    try {
      // Check if object has toString method
      if (value.toString && typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
        return value.toString()
      }

      // Try JSON.stringify for plain objects
      return JSON.stringify(value)
    } catch {
      return "[Object]"
    }
  }

  // Fallback for functions and other types
  try {
    return String(value)
  } catch {
    return "[Unknown]"
  }
}

export function safeToNumber(value: any, fallback = 0): number {
  if (typeof value === "number") {
    return isNaN(value) || !isFinite(value) ? fallback : value
  }

  if (typeof value === "string") {
    if (value.trim() === "") return fallback
    const parsed = Number(value)
    return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0
  }

  if (typeof value === "bigint") {
    try {
      return Number(value)
    } catch {
      return fallback
    }
  }

  if (value instanceof Date) {
    const time = value.getTime()
    return isNaN(time) ? fallback : time
  }

  // For objects, arrays, etc.
  if (typeof value === "object" && value !== null) {
    // Try valueOf method
    if (typeof value.valueOf === "function") {
      try {
        const primitive = value.valueOf()
        if (typeof primitive !== "object") {
          return safeToNumber(primitive, fallback)
        }
      } catch {
        // Continue to fallback
      }
    }

    // For arrays, try to get length
    if (Array.isArray(value)) {
      return value.length
    }
  }

  return fallback
}

export function safeToBoolean(value: any): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0 && !isNaN(value)
  if (typeof value === "string") return value.trim().toLowerCase() === "true" || value.trim() === "1"
  if (typeof value === "bigint") return value !== 0n
  if (value === null || value === undefined) return false

  // For objects
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.length > 0
    if (value instanceof Date) return !isNaN(value.getTime())
    return true // Non-null objects are truthy
  }

  return Boolean(value)
}

export function safeConcat(...values: any[]): string {
  return values.map((value) => safeToString(value)).join("")
}

export function safeAdd(a: any, b: any): number {
  return safeToNumber(a) + safeToNumber(b)
}

export function safeSubtract(a: any, b: any): number {
  return safeToNumber(a) - safeToNumber(b)
}

export function safeMultiply(a: any, b: any): number {
  return safeToNumber(a) * safeToNumber(b)
}

export function safeDivide(a: any, b: any, fallback = 0): number {
  const numA = safeToNumber(a)
  const numB = safeToNumber(b)
  if (numB === 0) return fallback
  const result = numA / numB
  return isNaN(result) || !isFinite(result) ? fallback : result
}

export function safeCompare(a: any, b: any): number {
  // Handle null/undefined
  if (a === null || a === undefined) {
    if (b === null || b === undefined) return 0
    return -1
  }
  if (b === null || b === undefined) return 1

  // Same type comparison
  if (typeof a === typeof b) {
    if (typeof a === "string") return a.localeCompare(b)
    if (typeof a === "number") {
      if (isNaN(a) && isNaN(b)) return 0
      if (isNaN(a)) return 1
      if (isNaN(b)) return -1
      return a - b
    }
    if (typeof a === "boolean") return a === b ? 0 : a ? 1 : -1
    if (a instanceof Date && b instanceof Date) {
      const timeA = a.getTime()
      const timeB = b.getTime()
      if (isNaN(timeA) && isNaN(timeB)) return 0
      if (isNaN(timeA)) return 1
      if (isNaN(timeB)) return -1
      return timeA - timeB
    }
  }

  // Different types - convert to strings
  const strA = safeToString(a)
  const strB = safeToString(b)
  return strA.localeCompare(strB)
}

export function safeEquals(a: any, b: any): boolean {
  // Strict equality first
  if (a === b) return true

  // Handle null/undefined
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true
  if (a === null || a === undefined || b === null || b === undefined) return false

  // Same type comparison
  if (typeof a === typeof b) {
    if (typeof a === "object") {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        return a.every((item, index) => safeEquals(item, b[index]))
      }
      if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
      }
      // For other objects, use reference equality
      return a === b
    }
    return a === b
  }

  // Different types - try conversion
  if (typeof a === "number" && typeof b === "string") {
    return a === safeToNumber(b)
  }
  if (typeof a === "string" && typeof b === "number") {
    return safeToNumber(a) === b
  }

  return false
}

// Template literal safe interpolation
export function safeTemplate(template: string, values: Record<string, any>): string {
  return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
    const value = values[key.trim()]
    return safeToString(value)
  })
}

// Safe property access
export function safeGet(obj: any, path: string | string[], defaultValue: any = undefined): any {
  if (obj === null || obj === undefined) return defaultValue

  const keys = Array.isArray(path) ? path : path.split(".")
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) return defaultValue
    if (typeof current !== "object") return defaultValue
    current = current[key]
  }

  return current === undefined ? defaultValue : current
}
