// Development command utilities
// Run with: npx tsx scripts/dev-commands.ts <command>

import { execSync } from "child_process"

const commands = {
  setup: () => {
    console.log("🚀 Running automated setup...")
    execSync("chmod +x scripts/setup.sh && ./scripts/setup.sh", { stdio: "inherit" })
  },

  verify: () => {
    console.log("🔍 Verifying setup...")
    execSync("chmod +x scripts/verify-setup.sh && ./scripts/verify-setup.sh", { stdio: "inherit" })
  },

  dev: () => {
    console.log("🏃 Starting development server...")
    execSync("npm run dev", { stdio: "inherit" })
  },

  build: () => {
    console.log("🏗️ Building application...")
    execSync("npm run build", { stdio: "inherit" })
  },

  test: () => {
    console.log("🧪 Running tests...")
    execSync("npm run test", { stdio: "inherit" })
  },

  lint: () => {
    console.log("🔍 Running linter...")
    execSync("npm run lint", { stdio: "inherit" })
  },

  "type-check": () => {
    console.log("📝 Running type checks...")
    execSync("npm run type-check", { stdio: "inherit" })
  },

  clean: () => {
    console.log("🧹 Cleaning build artifacts...")
    execSync("rm -rf .next node_modules/.cache", { stdio: "inherit" })
  },

  reset: () => {
    console.log("🔄 Resetting development environment...")
    execSync("rm -rf .next node_modules package-lock.json pnpm-lock.yaml", { stdio: "inherit" })
    execSync("npm install", { stdio: "inherit" })
  },

  docker: () => {
    console.log("🐳 Starting Docker development environment...")
    execSync("docker-compose -f docker-compose.dev.yml up -d", { stdio: "inherit" })
  },

  "docker-stop": () => {
    console.log("🛑 Stopping Docker development environment...")
    execSync("docker-compose -f docker-compose.dev.yml down", { stdio: "inherit" })
  },

  help: () => {
    console.log(`
🎯 Enterprise File Explorer - Development Commands

Available commands:
  setup        - Run automated setup script
  verify       - Verify development environment
  dev          - Start development server
  build        - Build application for production
  test         - Run test suite
  lint         - Run ESLint
  type-check   - Run TypeScript type checking
  clean        - Clean build artifacts
  reset        - Reset development environment
  docker       - Start Docker development environment
  docker-stop  - Stop Docker development environment
  help         - Show this help message

Usage:
  npx tsx scripts/dev-commands.ts <command>

Examples:
  npx tsx scripts/dev-commands.ts setup
  npx tsx scripts/dev-commands.ts dev
  npx tsx scripts/dev-commands.ts test
    `)
  },
}

const command = process.argv[2]

if (!command || !commands[command as keyof typeof commands]) {
  console.error('❌ Invalid command. Use "help" to see available commands.')
  process.exit(1)
}

try {
  commands[command as keyof typeof commands]()
} catch (error) {
  console.error("❌ Command failed:", error)
  process.exit(1)
}
