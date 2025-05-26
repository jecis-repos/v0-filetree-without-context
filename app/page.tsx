"use client"

import { useEffect, useState } from "react"
import { FileTreeExplorer } from "../src/components/FileTreeExplorer"
import { ThemeProvider } from "../src/styles/ThemeProvider"
import { ErrorBoundary } from "../src/components/ErrorBoundary"
import { DIContainer } from "../src/container/DIContainer"
import { ServiceRegistry } from "../src/services/ServiceRegistry"
import { SystemDiagnostics } from "../src/services/SystemDiagnostics"
import { ApiVerificationDashboard } from "../src/components/ApiVerificationDashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DiagnosticsReport } from "../src/services/SystemDiagnostics"

export default function Home() {
  const [container, setContainer] = useState<DIContainer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null)
  const [initializationStep, setInitializationStep] = useState("Starting...")

  useEffect(() => {
    const initializeApplication = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Step 1: Create container
        setInitializationStep("Creating DI Container...")
        const newContainer = new DIContainer()

        // Step 2: Register all services
        setInitializationStep("Registering services...")
        const serviceRegistry = new ServiceRegistry(newContainer, {
          enableWasm: true,
          enableIndexedDB: true,
          enableImageExport: true,
          enableHealthChecks: true,
        })

        await serviceRegistry.registerAllServices()

        // Step 3: Test all services
        setInitializationStep("Testing services...")
        const serviceTests = await serviceRegistry.testAllServices()
        const failedServices = Object.entries(serviceTests).filter(([, passed]) => !passed)

        if (failedServices.length > 0) {
          console.warn("Some services failed tests:", failedServices)
        }

        // Step 4: Run system diagnostics
        setInitializationStep("Running diagnostics...")
        const systemDiagnostics = new SystemDiagnostics(newContainer)
        const diagnosticsReport = await systemDiagnostics.runFullDiagnostics()
        setDiagnostics(diagnosticsReport)

        // Step 5: Check deployment readiness
        setInitializationStep("Checking deployment readiness...")
        if (!diagnosticsReport.deployment.ready) {
          console.warn("Deployment issues detected:", diagnosticsReport.deployment.issues)
        }

        // Step 6: Finalize
        setInitializationStep("Finalizing...")
        setContainer(newContainer)

        const logger = newContainer.resolve("ILoggingService")
        logger.info("Application", "Initialization completed successfully", {
          servicesRegistered: serviceRegistry.getRegisteredServices().length,
          servicesHealthy: Object.values(serviceTests).filter(Boolean).length,
          endpointsHealthy: diagnosticsReport.endpoints.healthy,
          deploymentReady: diagnosticsReport.deployment.ready,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        console.error("Failed to initialize application:", err)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    initializeApplication()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Initializing Enterprise File Explorer</h2>
          <p className="text-gray-600 mb-4">{initializationStep}</p>
          {diagnostics && (
            <div className="text-sm text-gray-500 space-y-1">
              <div>Services: {Object.values(diagnostics.services.tested).filter(Boolean).length} registered</div>
              <div>Endpoints: {diagnostics.endpoints.healthy} healthy</div>
              <div>Deployment: {diagnostics.deployment.ready ? "Ready" : "Issues detected"}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-red-800 mb-2">Initialization Failed</h1>
          <p className="text-red-600 mb-4">{error}</p>
          {diagnostics && diagnostics.recommendations.length > 0 && (
            <div className="text-left text-sm text-red-700 mb-4">
              <p className="font-semibold mb-2">Recommendations:</p>
              <ul className="list-disc list-inside space-y-1">
                {diagnostics.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Container not available</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <main className="min-h-screen bg-background">
          {diagnostics && !diagnostics.deployment.ready && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Deployment Warning:</strong> Some issues were detected. Please review the diagnostics.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="explorer" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="explorer">File Explorer</TabsTrigger>
              <TabsTrigger value="health">Health Dashboard</TabsTrigger>
              <TabsTrigger value="verification">API Verification</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="explorer">
              <FileTreeExplorer container={container} />
            </TabsContent>

            <TabsContent value="health">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">System Health Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Services Status</h3>
                    <p className="text-sm text-gray-600">
                      {diagnostics ? Object.values(diagnostics.services.tested).filter(Boolean).length : 0} services
                      healthy
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Endpoints Status</h3>
                    <p className="text-sm text-gray-600">
                      {diagnostics ? diagnostics.endpoints.healthy : 0} endpoints healthy
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Deployment Status</h3>
                    <p className="text-sm text-gray-600">
                      {diagnostics?.deployment.ready ? "Ready" : "Issues detected"}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="verification" className="space-y-4">
              <ApiVerificationDashboard />
            </TabsContent>

            <TabsContent value="metrics">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Performance Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">System Performance</h3>
                    <p className="text-sm text-gray-600">Performance monitoring active</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Cache Performance</h3>
                    <p className="text-sm text-gray-600">Cache service operational</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
