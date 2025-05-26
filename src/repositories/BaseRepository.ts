/**
 * Enhanced Base Repository with Type Safety
 * Provides type-safe CRUD operations with validation
 */

import { safeJsonParse, safeJsonStringify } from "../utils/json-utils"
import { validate, type Schema, type ValidationResult } from "../utils/validation"
import { isObject, isString } from "../utils/type-guards"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface QueryOptions {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
  filters?: Record<string, any>
}

export interface RepositoryOptions {
  timeout?: number
  retries?: number
  validateResponses?: boolean
  responseSchema?: Schema
}

export abstract class BaseRepository<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  protected baseUrl: string
  protected endpoint: string
  protected options: RepositoryOptions

  constructor(baseUrl: string, endpoint: string, options: RepositoryOptions = {}) {
    this.baseUrl = baseUrl
    this.endpoint = endpoint
    this.options = {
      timeout: 30000,
      retries: 3,
      validateResponses: true,
      ...options,
    }
  }

  protected async request<R = T>(path: string, requestOptions: RequestInit = {}): Promise<ApiResponse<R>> {
    const url = `${this.baseUrl}${this.endpoint}${path}`
    let lastError: Error | null = null

    // Retry logic
    for (let attempt = 0; attempt <= (this.options.retries || 0); attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...requestOptions.headers,
          },
          signal: controller.signal,
          ...requestOptions,
        })

        clearTimeout(timeoutId)

        // Parse response
        const responseText = await response.text()
        let responseData: any

        if (responseText) {
          const parseResult = safeJsonParse(responseText)
          if (!parseResult.success) {
            return {
              success: false,
              error: `Invalid JSON response: ${parseResult.error}`,
              timestamp: new Date().toISOString(),
            }
          }
          responseData = parseResult.data
        }

        if (!response.ok) {
          return {
            success: false,
            error: responseData?.error || `HTTP ${response.status}: ${response.statusText}`,
            timestamp: new Date().toISOString(),
          }
        }

        // Validate response if schema is provided
        if (this.options.validateResponses && this.options.responseSchema && responseData?.data) {
          const validation = validate(responseData.data, this.options.responseSchema)
          if (!validation.isValid) {
            return {
              success: false,
              error: `Response validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
              timestamp: new Date().toISOString(),
            }
          }
        }

        return {
          success: true,
          data: responseData?.data || responseData,
          timestamp: new Date().toISOString(),
          metadata: responseData?.metadata,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error")

        // Don't retry on certain errors
        if (error instanceof TypeError && error.message.includes("fetch")) {
          break // Network error, don't retry
        }

        // Wait before retry (exponential backoff)
        if (attempt < (this.options.retries || 0)) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "Request failed after retries",
      timestamp: new Date().toISOString(),
    }
  }

  protected buildQueryString(options?: QueryOptions): string {
    if (!options) return ""

    const params = new URLSearchParams()

    if (options.limit !== undefined) {
      params.append("limit", String(options.limit))
    }
    if (options.offset !== undefined) {
      params.append("offset", String(options.offset))
    }
    if (options.sortBy) {
      params.append("sortBy", options.sortBy)
    }
    if (options.sortOrder) {
      params.append("sortOrder", options.sortOrder)
    }

    if (options.filters && isObject(options.filters)) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value))
        }
      })
    }

    const query = params.toString()
    return query ? `?${query}` : ""
  }

  protected validateInput<TInput>(data: TInput, schema: Schema): ValidationResult {
    return validate(data, schema)
  }

  async findAll(options?: QueryOptions): Promise<ApiResponse<T[]>> {
    const query = this.buildQueryString(options)
    return this.request<T[]>(query)
  }

  async findById(id: string): Promise<ApiResponse<T>> {
    if (!isString(id) || id.trim() === "") {
      return {
        success: false,
        error: "Invalid ID provided",
        timestamp: new Date().toISOString(),
      }
    }

    return this.request<T>(`/${encodeURIComponent(id)}`)
  }

  async create(data: TCreate): Promise<ApiResponse<T>> {
    const stringifyResult = safeJsonStringify(data)
    if (!stringifyResult.success) {
      return {
        success: false,
        error: `Failed to serialize data: ${stringifyResult.error}`,
        timestamp: new Date().toISOString(),
      }
    }

    return this.request<T>("", {
      method: "POST",
      body: stringifyResult.data,
    })
  }

  async update(id: string, data: TUpdate): Promise<ApiResponse<T>> {
    if (!isString(id) || id.trim() === "") {
      return {
        success: false,
        error: "Invalid ID provided",
        timestamp: new Date().toISOString(),
      }
    }

    const stringifyResult = safeJsonStringify(data)
    if (!stringifyResult.success) {
      return {
        success: false,
        error: `Failed to serialize data: ${stringifyResult.error}`,
        timestamp: new Date().toISOString(),
      }
    }

    return this.request<T>(`/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: stringifyResult.data,
    })
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    if (!isString(id) || id.trim() === "") {
      return {
        success: false,
        error: "Invalid ID provided",
        timestamp: new Date().toISOString(),
      }
    }

    return this.request<void>(`/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
  }
}
