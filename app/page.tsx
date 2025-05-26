import { Suspense } from "react"
import { FileTreeExplorer } from "../src/components/FileTreeExplorer"
import HealthDashboard from "../src/components/HealthDashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  const container = "test-container" // Replace with actual container logic if needed

  return (
    <main className="container mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">File Tree Explorer</h1>
        <p className="text-gray-600">
          Advanced file system visualization with WebAssembly, PHP integration, and real-time monitoring
        </p>
      </div>

      <Tabs defaultValue="explorer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="explorer">File Explorer</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="space-y-4">
          <Suspense fallback={<div>Loading file explorer...</div>}>
            <FileTreeExplorer container={container} />
          </Suspense>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Suspense fallback={<div>Loading health dashboard...</div>}>
            <HealthDashboard />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  )
}
