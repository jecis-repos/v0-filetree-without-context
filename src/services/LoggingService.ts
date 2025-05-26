export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  category: string
  message: string
  data?: any
  source?: string
}

export interface ILoggingService {
  debug(category: string, message: string, data?: any): void
  info(category: string, message: string, data?: any): void
  warn(category: string, message: string, data?: any): void
  error(category: string, message: string, data?: any): void
  getLogs(level?: LogLevel, category?: string): LogEntry[]
  clearLogs(): void
  exportLogs(): string
}

export class LoggingService implements ILoggingService {
  private logs: LogEntry[] = []
  private maxLogs: number

  constructor(maxLogs = 1000) {
    this.maxLogs = maxLogs
  }

  debug(category: string, message: string, data?: any): void {
    this.addLog("debug", category, message, data)
  }

  info(category: string, message: string, data?: any): void {
    this.addLog("info", category, message, data)
  }

  warn(category: string, message: string, data?: any): void {
    this.addLog("warn", category, message, data)
  }

  error(category: string, message: string, data?: any): void {
    this.addLog("error", category, message, data)
  }

  private addLog(level: LogLevel, category: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      source: this.getCallStack(),
    }

    this.logs.push(entry)

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Also log to console for development
    const consoleMethod = level === "debug" ? "log" : level
    console[consoleMethod](`[${category}] ${message}`, data || "")
  }

  getLogs(level?: LogLevel, category?: string): LogEntry[] {
    let filtered = this.logs

    if (level) {
      const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 }
      const minPriority = levelPriority[level]
      filtered = filtered.filter((log) => levelPriority[log.level] >= minPriority)
    }

    if (category) {
      filtered = filtered.filter((log) => log.category === category)
    }

    return filtered
  }

  clearLogs(): void {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  private getCallStack(): string {
    const stack = new Error().stack
    if (!stack) return "unknown"

    const lines = stack.split("\n")
    // Skip the first few lines (Error, this method, addLog method)
    const relevantLine = lines[4] || lines[3] || lines[2]
    return relevantLine ? relevantLine.trim() : "unknown"
  }
}
