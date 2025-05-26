import { type NextRequest, NextResponse } from "next/server"
import { sanitizeForLogging } from "@/lib/security-utils"
import { DIContainer } from "@/src/container/DIContainer"
import { LoggingService } from "@/src/services/LoggingService"

// Initialize services
const logger = new LoggingService()
const container = new DIContainer()

// Initialize container with required services
try {
  // Register logger first for error tracking
  container.registerInstance("ILoggingService", logger)

  // Load other required services
  // This will be executed once and reused across requests
  logger.info("API", "Initializing download route handler")
} catch (error) {
  logger.error("API", "Failed to initialize download route handler", {
    error: sanitizeForLogging(error),
  })
}

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  const { fileId } = params

  try {
    logger.info("API", "File download requested", { fileId })

    // Validate file ID
    if (!fileId || typeof fileId !== "string") {
      logger.warn("API", "Invalid file ID for download", { fileId })
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 })
    }

    // Get file system provider
    const fileSystemProvider = container.resolve("IFileSystemProvider")

    // Check if file exists
    const fileExists = await fileSystemProvider.fileExists(fileId)
    if (!fileExists) {
      logger.warn("API", "File not found for download", { fileId })
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Get file metadata
    const fileInfo = await fileSystemProvider.getFileInfo(fileId)

    // Get file content
    const fileContent = await fileSystemProvider.getFileContent(fileId)
    if (!fileContent) {
      logger.error("API", "Failed to get file content for download", { fileId })
      return NextResponse.json({ error: "Failed to get file content" }, { status: 500 })
    }

    // Determine content type
    const contentType = fileInfo.mimeType || "application/octet-stream"

    // Create response with appropriate headers
    const response = new NextResponse(fileContent, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileInfo.name)}"`,
        "Cache-Control": "no-cache",
      },
    })

    logger.info("API", "File download successful", {
      fileId,
      fileName: fileInfo.name,
      contentType,
      contentLength: fileContent.length,
    })

    return response
  } catch (error) {
    logger.error("API", "File download failed", {
      fileId,
      error: sanitizeForLogging(error),
    })

    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
