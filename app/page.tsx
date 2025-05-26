"use client"

import { useState } from "react"
import { Activity, BarChart3, CheckCircle, FileText, Settings, Monitor, Rocket } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileExplorer } from "../src/components/FileExplorer"
import { HealthDashboard } from "../src/components/HealthDashboard"
import { ApiVerificationDashboard } from "../src/components/ApiVerificationDashboard"
import { MetricsDashboard } from "../src/components/MetricsDashboard"
import { EnvironmentTestDashboard } from "../src/components/EnvironmentTestDashboard"
import { SystemStatusDashboard } from "../src/components/SystemStatusDashboard"
import { DeploymentReadiness } from "../src/components/DeploymentReadiness"

const tabs = [
  { id: "deployment", label: "Deploy", icon: Rocket },
  { id: "system", label: "System Status", icon: Monitor },
  { id: "explorer", label: "File Explorer", icon: FileText },
  { id: "health", label: "Health Dashboard", icon: Activity },
  { id: "verification", label: "API Verification", icon: CheckCircle },
  { id: "environment", label: "Environment Test", icon: Settings },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState(tabs[0].id)

  return (
    <div className="container mx-auto py-10">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="deployment" className="space-y-6">
          <DeploymentReadiness />
        </TabsContent>
        <TabsContent value="system" className="space-y-6">
          <SystemStatusDashboard />
        </TabsContent>
        <TabsContent value="explorer" className="space-y-6">
          <FileExplorer />
        </TabsContent>
        <TabsContent value="health" className="space-y-6">
          <HealthDashboard />
        </TabsContent>
        <TabsContent value="verification" className="space-y-6">
          <ApiVerificationDashboard />
        </TabsContent>
        <TabsContent value="environment" className="space-y-6">
          <EnvironmentTestDashboard />
        </TabsContent>
        <TabsContent value="metrics" className="space-y-6">
          <MetricsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
