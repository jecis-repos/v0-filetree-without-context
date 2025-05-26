import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const scenarios = [
      {
        id: "small-project",
        name: "Small Project",
        description: "Typical small web project structure",
        config: {
          outputPaths: ["/src/components", "/src/pages", "/src/utils", "/public", "/package.json"],
          depth: 3,
          breadth: 10,
          fileTypes: ["js", "ts", "jsx", "tsx", "css", "json", "md"],
          operations: ["read", "write", "search"],
          iterations: 5,
          providers: ["Memory", "WASM"],
        },
        enabled: true,
        lastRun: new Date().toISOString(),
      },
    ]

    return NextResponse.json({
      success: true,
      data: scenarios,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      },
      { status: 500 },
    )
  }
}
