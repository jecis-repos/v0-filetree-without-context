"use server"

interface PhpApiRequest {
  action: string
  data?: any
}

interface PhpApiResponse {
  success: boolean
  data?: any
  error?: string
}

export async function callPhpApi(request: PhpApiRequest): Promise<PhpApiResponse> {
  try {
    const apiKey = process.env.PHP_API_KEY // Server-side only

    const response = await fetch(`${process.env.PHP_ENDPOINT || "http://localhost:8080"}/api/php/image-generator.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey ? `Bearer ${apiKey}` : "",
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function checkPhpHealth(): Promise<PhpApiResponse> {
  return callPhpApi({ action: "health_check" })
}

export async function generateImage(options: {
  fileTree: any
  width: number
  height: number
  format: string
  theme?: string
}): Promise<PhpApiResponse> {
  return callPhpApi({
    action: "generate_image",
    data: options,
  })
}
