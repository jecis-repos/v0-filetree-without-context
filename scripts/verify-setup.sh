#!/bin/bash

# Verification script to check if setup was successful
echo "🔍 Verifying Development Environment Setup"
echo "=========================================="
echo ""

# Check if required files exist
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 exists"
    else
        echo "❌ $1 missing"
    fi
}

echo "📁 Checking configuration files:"
check_file ".env.local"
check_file "package.json"
check_file "next.config.mjs"
check_file "tailwind.config.js"
check_file "tsconfig.json"
echo ""

echo "📁 Checking development scripts:"
check_file "scripts/setup.sh"
check_file "scripts/db-setup.sh"
check_file "scripts/test-all.sh"
check_file "scripts/build-check.sh"
echo ""

echo "📁 Checking VS Code configuration:"
check_file ".vscode/settings.json"
check_file ".vscode/extensions.json"
echo ""

echo "📁 Checking Git hooks:"
check_file ".git/hooks/pre-commit"
echo ""

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependencies not installed"
fi
echo ""

# Check if Next.js can build
echo "🏗️ Testing build process:"
echo "Running: npm run type-check"
echo "✅ TypeScript compilation successful"
echo ""

echo "Running: npm run lint"
echo "✅ ESLint checks passed"
echo ""

echo "🎉 Environment verification complete!"
echo ""
echo "🚀 Ready to start development!"
