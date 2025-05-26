"use client"

import { useState, useEffect } from "react"

export default function DeploymentCheckPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkDeployment() {
      try {
        setStatus("loading")

        const response = await fetch("/api/deployment/check")

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`)
        }

        const result = await response.json()
        setData(result)
        setStatus("success")
      } catch (err) {
        console.error("Deployment check failed:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setStatus("error")
      }
    }

    checkDeployment()
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Deployment Check</h1>

      {status === "loading" && (
        <div className="bg-blue-50 p-4 rounded">
          <p>Loading deployment status...</p>
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-50 p-4 rounded border border-red-200">
          <h2 className="text-lg font-semibold text-red-700">Error</h2>
          <p className="text-red-600">{error || "Failed to check deployment status"}</p>
          <div className="mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {status === "success" && data && (
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">
            Status:
            <span className={data.status === "healthy" ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
              {data.status}
            </span>
          </h2>

          <div className="mt-4">
            <h3 className="font-medium mb-2">API Checks:</h3>
            <ul className="list-disc pl-5">
              <li className={data.checks?.api?.health ? "text-green-600" : "text-red-600"}>
                Health API: {data.checks?.api?.health ? "✅ Healthy" : "❌ Unhealthy"}
              </li>
              <li className={data.checks?.api?.filesystem ? "text-green-600" : "text-red-600"}>
                Filesystem API: {data.checks?.api?.filesystem ? "✅ Healthy" : "❌ Unhealthy"}
              </li>
            </ul>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Environment:</h3>
            <ul className="list-disc pl-5">
              <li>Node Environment: {data.checks?.environment?.nodeEnv}</li>
              <li className={data.checks?.environment?.hasRequiredVars ? "text-green-600" : "text-red-600"}>
                Required Variables: {data.checks?.environment?.hasRequiredVars ? "✅ Present" : "❌ Missing"}
              </li>
            </ul>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Timestamp:</h3>
            <p>{data.checks?.timestamp}</p>
          </div>

          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
