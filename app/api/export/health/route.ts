import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Check if image export services are available
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        canvas: typeof HTMLCanvasElement !== "undefined",
        webgl: typeof WebGLRenderingContext !== "undefined",
        offscreenCanvas: typeof OffscreenCanvas !== "undefined",
      },
      formats: ["png", "jpg", "webp", "svg"],
    }

    return NextResponse.json(healthData)
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
