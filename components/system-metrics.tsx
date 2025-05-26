"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Cpu, HardDrive, Activity, Zap } from "lucide-react"

interface SystemMetric {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}

export default function SystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { label: "CPU", value: "0%", icon: <Cpu className="w-4 h-4" />, color: "text-blue-500" },
    { label: "Memory", value: "0MB", icon: <HardDrive className="w-4 h-4" />, color: "text-green-500" },
    { label: "Requests", value: "0/s", icon: <Activity className="w-4 h-4" />, color: "text-orange-500" },
    { label: "Cache", value: "0%", icon: <Zap className="w-4 h-4" />, color: "text-purple-500" },
  ])

  useEffect(() => {
    const updateMetrics = () => {
      // Simulate system metrics
      setMetrics([
        {
          label: "CPU",
          value: `${Math.floor(Math.random() * 30 + 10)}%`,
          icon: <Cpu className="w-4 h-4" />,
          color: "text-blue-500",
        },
        {
          label: "Memory",
          value: `${Math.floor(Math.random() * 50 + 20)}MB`,
          icon: <HardDrive className="w-4 h-4" />,
          color: "text-green-500",
        },
        {
          label: "Requests",
          value: `${Math.floor(Math.random() * 10)}/s`,
          icon: <Activity className="w-4 h-4" />,
          color: "text-orange-500",
        },
        {
          label: "Cache",
          value: `${Math.floor(Math.random() * 40 + 60)}%`,
          icon: <Zap className="w-4 h-4" />,
          color: "text-purple-500",
        },
      ])
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2">
      {metrics.map((metric, idx) => (
        <Card key={idx} className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={metric.color}>{metric.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-sm font-semibold">{metric.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
