import { type NextRequest, NextResponse } from "next/server"
import { checkPhpHealth } from "../../../actions/php-api"

export async function GET(request: NextRequest) {
  try {
    const result = await checkPhpHealth()

    if (result.success) {
      return NextResponse.json({
        status: "healthy",
        ...result.data,
      })
    } else {
      return NextResponse.json(
        {
          status: "unhealthy",
          error: result.error,
        },
        { status: 503 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request) // Same logic for both GET and POST
}
