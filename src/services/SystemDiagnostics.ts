import type { DIContainer } from "../container/DIContainer"
import type { ILoggingService } from "./LoggingService"
import { ServiceRegistry } from "./ServiceRegistry"
import { EndpointChecker } from "./EndpointChecker"

export interface DiagnosticsReport {
  timestamp: string
  system: {
    platform: string
    userAgent: string
    memory: any
    performance: any
  }
  services: {
    registered: string[]
    tested: Record<string, boolean>
    issues: string[]
  }
  endpoints: {
    total: number
    healthy: number
    unhealthy: number
    details: any[]
  }
  fileSystem: {
    providers: string[]
    currentProvider: string
    capabilities: string[]
  }
  deployment: {
    environment: string
    ready: boolean
    issues: string[]
  }
  recommendations: string[]
}

export class SystemDiagnostics {
  private container: DIContainer
  private logger: ILoggingService
  private serviceRegistry: ServiceRegistry
  private endpointChecker: EndpointChecker

  constructor(container: DIContainer) {
    this.container = container
    this.logger = container.resolve("ILoggingService")
    this.serviceRegistry = new ServiceRegistry(container)
    this.endpointChecker = new EndpointChecker(this.logger)
  }

  async runFullDiagnostics(): Promise<DiagnosticsReport> {
    this.logger.info("SystemDiagnostics", "Starting full system diagnostics")

    const report: DiagnosticsReport = {
      timestamp: new Date().toISOString(),
      system: await this.getSystemInfo(),
      services: await this.getServicesInfo(),
      endpoints: await this.getEndpointsInfo(),
      fileSystem: await this.getFileSystemInfo(),
      deployment: await this.getDeploymentInfo(),
      recommendations: [],
    }

    // Generate recommendations based on findings
    report.recommendations = this.generateRecommendations(report)

    this.logger.info("SystemDiagnostics", "Full diagnostics completed", {
      servicesHealthy: Object.values(report.services.tested).filter(Boolean).length,
      endpointsHealthy: report.endpoints.healthy,
      deploymentReady: report.deployment.ready,
      recommendationCount: report.recommendations.length,
    })

    return report
  }

  private async getSystemInfo(): Promise<any> {
    const systemInfo: any = {
      platform: typeof window !== "undefined" ? "browser" : "server",
      timestamp: Date.now(),
    }

    if (typeof window !== "undefined") {
      systemInfo.userAgent = navigator.userAgent
      systemInfo.language = navigator.language
      systemInfo.cookieEnabled = navigator.cookieEnabled
      systemInfo.onLine = navigator.onLine

      // Performance API
      if (performance.memory) {
        systemInfo.memory = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        }
      }

      // Screen info
      systemInfo.screen = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      }
    } else {
      systemInfo.nodeVersion = process.version
      systemInfo.platform = process.platform
      systemInfo.arch = process.arch
    }

    return systemInfo
  }

  private async getServicesInfo(): Promise<any> {
    const registeredServices = this.container.getRegisteredServices()
    const testedServices = await this.serviceRegistry.testAllServices()
    const issues: string[] = []

    // Check for missing critical services
    const criticalServices = ["ILoggingService", "IPerformanceMonitor", "IFileSystemProvider"]
    for (const service of criticalServices) {
      if (!registeredServices.includes(service)) {
        issues.push(`Critical service missing: ${service}`)
      }
    }

    // Check for failed service tests
    for (const [service, passed] of Object.entries(testedServices)) {
      if (!passed) {
        issues.push(`Service test failed: ${service}`)
      }
    }

    return {
      registered: registeredServices,
      tested: testedServices,
      issues,
    }
  }

  private async getEndpointsInfo(): Promise<any> {
    const endpointResults = await this.endpointChecker.checkAllEndpoints()

    return {
      total: endpointResults.length,
      healthy: endpointResults.filter((r) => r.status === "healthy").length,
      unhealthy: endpointResults.filter((r) => r.status === "unhealthy").length,
      details: endpointResults,
    }
  }

  private async getFileSystemInfo(): Promise<any> {
    const providers: string[] = []
    let currentProvider = "unknown"
    const capabilities: string[] = []

    try {
      // Check available providers
      if (this.container.hasService("MemoryFileSystemProvider")) {
        providers.push("Memory")
      }
      if (this.container.hasService("WasmFileSystemProvider")) {
        providers.push("WASM")
      }

      // Get current provider info
      const fsProvider = this.container.resolve("IFileSystemProvider")
      if (fsProvider && fsProvider.name) {
        currentProvider = fsProvider.name
      }

      // Check capabilities
      if (fsProvider) {
        capabilities.push("read", "write", "search")
        if (typeof fsProvider.importFileTree === "function") {
          capabilities.push("import")
        }
        if (typeof fsProvider.getStats === "function") {
          capabilities.push("statistics")
        }
      }
    } catch (error) {
      this.logger.error("SystemDiagnostics", "Failed to get file system info", { error })
    }

    return {
      providers,
      currentProvider,
      capabilities,
    }
  }

  private async getDeploymentInfo(): Promise<any> {
    const issues: string[] = []
    let ready = true

    // Check environment
    const environment = process.env.NODE_ENV || "unknown"
    if (environment === "unknown") {
      issues.push("NODE_ENV not set")
      ready = false
    }

    // Check required environment variables
    const requiredEnvVars = ["DATABASE_URL", "PHP_API_KEY", "PHP_ENDPOINT"]
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        issues.push(`Missing environment variable: ${envVar}`)
        ready = false
      }
    }

    // Check for sensitive data exposure
    for (const key in process.env) {
      if (key.startsWith("NEXT_PUBLIC_") && (key.includes("KEY") || key.includes("SECRET"))) {
        issues.push(`Sensitive data exposed: ${key}`)
        ready = false
      }
    }

    return {
      environment,
      ready,
      issues,
    }
  }

  private generateRecommendations(report: DiagnosticsReport): string[] {
    const recommendations: string[] = []

    // Service recommendations
    if (report.services.issues.length > 0) {
      recommendations.push("Fix service registration issues before deployment")
    }

    // Endpoint recommendations
    if (report.endpoints.unhealthy > 0) {
      recommendations.push("Fix failing API endpoints before deployment")
    }

    // Deployment recommendations
    if (!report.deployment.ready) {
      recommendations.push("Address deployment issues before going live")
    }

    // Performance recommendations
    if (report.system.memory && report.system.memory.used > report.system.memory.limit * 0.8) {
      recommendations.push("Consider optimizing memory usage")
    }

    // Provider recommendations
    if (report.fileSystem.providers.length === 1) {
      recommendations.push("Consider adding additional file system providers for redundancy")
    }

    return recommendations
  }
}
