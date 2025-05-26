import { DeploymentVerification } from "@/src/components/DeploymentVerification"
import { HealthDashboard } from "@/src/components/HealthDashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Shield, Server } from "lucide-react"

export default function HealthPage() {
  return (
    <main className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6">System Health & Verification</h1>

      <Tabs defaultValue="health">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health">
            <Activity className="h-4 w-4 mr-2" />
            Health Status
          </TabsTrigger>
          <TabsTrigger value="verification">
            <Shield className="h-4 w-4 mr-2" />
            Deployment Verification
          </TabsTrigger>
          <TabsTrigger value="services">
            <Server className="h-4 w-4 mr-2" />
            Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-6">
          <HealthDashboard />
        </TabsContent>

        <TabsContent value="verification" className="mt-6">
          <DeploymentVerification />
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Services</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span>Main API</span>
                    <span className="text-green-600">Online</span>
                  </li>
                  <li className="flex justify-between">
                    <span>File System API</span>
                    <span className="text-green-600">Online</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Export API</span>
                    <span className="text-green-600">Online</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Health API</span>
                    <span className="text-green-600">Online</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File System Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span>Memory Provider</span>
                    <span className="text-green-600">Active</span>
                  </li>
                  <li className="flex justify-between">
                    <span>WASM Provider</span>
                    <span className="text-green-600">Available</span>
                  </li>
                  <li className="flex justify-between">
                    <span>IndexedDB Provider</span>
                    <span className="text-yellow-600">Pending</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
