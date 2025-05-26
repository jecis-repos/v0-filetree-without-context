import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Basic filesystem health check
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      providers: {
        memory: true,
        indexedDB: typeof indexedDB !== "undefined",
        webAssembly: typeof WebAssembly !== "undefined",
      },
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
