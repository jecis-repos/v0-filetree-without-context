"use server"

/**
 * Secure PHP Operations - Server Actions
 * Handles sensitive PHP operations server-side following Vercel best practices
 *
 * References:
 * - https://vercel.com/docs/functions/serverless-functions/runtimes/node-js
 * - https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
 */

import { serverEnv } from "@/lib/env-config"
import { headers } from "next/headers"
import { ratelimit } from "@/lib/ratelimit"

interface SecurePhpRequest {
  action: string
  data?: any
  options?: Record<string, any>
}

interface SecurePhpResponse {
  success: boolean
  data?: any
  error?: string
  metadata?: Record<string, any>
}

/**
 * Rate limiting for security
 */
async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const { success } = await ratelimit.limit(identifier)
    return success
  } catch (error) {
    console.error("Rate limit check failed:", error)
    return false
  }
}

/**
 * Validate request authentication
 */
function validateRequest(request: SecurePhpRequest): boolean {
  // Add your authentication logic here
  // For example, check API keys, JWT tokens, etc.
  return true
}

/**
 * Execute secure PHP operations via external PHP-CGI service
 */
export async function executeSecurePhpOperation(request: SecurePhpRequest): Promise<SecurePhpResponse> {
  try {
    // Get client IP for rate limiting
    const headersList = headers()
    const clientIp = headersList.get("x-forwarded-for") || "unknown"

    // Check rate limit
    const rateLimitOk = await checkRateLimit(clientIp)
    if (!rateLimitOk) {
      return {
        success: false,
        error: "Rate limit exceeded",
      }
    }

    // Validate request
    if (!validateRequest(request)) {
      return {
        success: false,
        error: "Invalid request",
      }
    }

    // Make secure request to PHP-CGI service
    const response = await fetch(serverEnv.PHP_ENDPOINT + "/api/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.PHP_API_KEY}`,
        "X-Client-IP": clientIp,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`PHP service error: ${response.statusText}`)
    }

    const result = await response.json()

    return {
      success: true,
      data: result.data,
      metadata: {
        executionTime: result.executionTime,
        memoryUsage: result.memoryUsage,
      },
    }
  } catch (error) {
    console.error("Secure PHP operation failed:", error)

    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Generate secure file tree image
 */
export async function generateSecureFileTreeImage(
  fileTree: any[],
  options: {
    width: number
    height: number
    format: "png" | "jpg" | "webp"
    theme?: string
    quality?: number
  },
): Promise<SecurePhpResponse & { imageUrl?: string }> {
  const result = await executeSecurePhpOperation({
    action: "generate_file_tree_image",
    data: { fileTree, options },
  })

  if (result.success && result.data?.imageData) {
    // Store image securely and return URL instead of raw data
    const imageUrl = await storeImageSecurely(result.data.imageData, options.format)

    return {
      ...result,
      imageUrl,
      data: undefined, // Remove raw image data for security
    }
  }

  return result
}

/**
 * Store image securely (implement based on your storage solution)
 */
async function storeImageSecurely(imageData: string, format: string): Promise<string> {
  // Implement secure image storage
  // For example, upload to Vercel Blob, AWS S3, etc.

  // This is a placeholder implementation
  const imageId = generateSecureId()
  const imageUrl = `/api/images/${imageId}.${format}`

  // Store the image data securely
  // await storageService.store(imageId, imageData)

  return imageUrl
}

/**
 * Generate secure ID for resources
 */
function generateSecureId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Health check for PHP service
 */
export async function checkPhpServiceHealth(): Promise<SecurePhpResponse> {
  try {
    const response = await fetch(serverEnv.PHP_ENDPOINT + "/health", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serverEnv.PHP_API_KEY}`,
      },
      timeout: 5000,
    })

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }

    const healthData = await response.json()

    return {
      success: true,
      data: {
        status: "healthy",
        phpVersion: healthData.phpVersion,
        extensions: healthData.extensions,
        memoryUsage: healthData.memoryUsage,
        uptime: healthData.uptime,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: {
        status: "unhealthy",
      },
    }
  }
}
