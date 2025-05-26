import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Return sample scenarios for testing
    const scenarios = [
      {
        id: "1",
        name: "Basic File Operations",
        description: "Test basic file operations like create, read, update, delete",
        status: "active",
        lastRun: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Provider Switching",
        description: "Test switching between different file system providers",
        status: "active",
        lastRun: new Date().toISOString(),
      },
      {
        id: "3",
        name: "Large File Tree",
        description: "Test performance with large file trees",
        status: "pending",
        lastRun: null,
      },
    ]

    return NextResponse.json({
      success: true,
      data: scenarios,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Scenarios API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch scenarios",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        {
          success: false,
          error: "Name and description are required",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Create new scenario
    const newScenario = {
      id: Date.now().toString(),
      name: body.name,
      description: body.description,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: newScenario,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Create scenario error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create scenario",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
