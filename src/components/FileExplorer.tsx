"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { FileTreeExplorer } from "./FileTreeExplorer"
import { ErrorBoundary } from "./ErrorBoundary"
import { DIContainer } from "../container/DIContainer"
import { ServiceLayer } from "../services/ServiceLayer"

export const FileExplorer: React.FC = () => {
  const [container, setContainer] = useState<DIContainer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeContainer = async () => {
      try {
        setIsLoading(true)
        const newContainer = new DIContainer()

        // Initialize service layer
        const serviceLayer = new ServiceLayer(newContainer)
        await serviceLayer.initialize()

        // Register the service layer itself
        newContainer.registerInstance("ServiceLayer", serviceLayer)

        // Log successful initialization
        const logger = serviceLayer.getLoggingService()
        logger.info("System", "File Explorer initialized successfully with ServiceLayer")

        // Perform health check
        const healthCheck = await serviceLayer.healthCheck()
        logger.info("System", "Service health check completed", healthCheck)

        setContainer(newContainer)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        console.error("Failed to initialize File Explorer:", err)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    initializeContainer()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing file explorer...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Initialization Failed</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!container) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600">Container not available</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <FileTreeExplorer container={container} />
    </ErrorBoundary>
  )
}

export default FileExplorer
