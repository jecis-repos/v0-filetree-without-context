#!/bin/bash

# Enterprise File Explorer - Automated Setup Script
# This script sets up the development environment automatically

set -e  # Exit on any error

echo "🚀 Setting up Enterprise File Explorer..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        print_success "Node.js found: v$NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 18.17+ or 20+"
        exit 1
    fi
    
    # Check pnpm (preferred) or npm
    if command_exists pnpm; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm found: v$PNPM_VERSION"
        PACKAGE_MANAGER="pnpm"
    elif command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_warning "npm found: v$NPM_VERSION (pnpm recommended)"
        PACKAGE_MANAGER="npm"
    else
        print_error "No package manager found. Please install pnpm or npm"
        exit 1
    fi
    
    # Check Git
    if command_exists git; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        print_success "Git found: v$GIT_VERSION"
    else
        print_error "Git not found. Please install Git"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi
    
    print_success "Dependencies installed successfully"
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Copy environment template if it doesn't exist
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            print_success "Environment template copied to .env.local"
            print_warning "Please update .env.local with your actual values"
        else
            # Create basic .env.local
            cat > .env.local << EOF
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/fileexplorer"

# PHP Integration
PHP_API_KEY="your-php-api-key-here"
PHP_ENDPOINT="http://localhost:8080"

# Optional APIs
OPENAI_API_KEY="your-openai-key"
SENTRY_DSN="your-sentry-dsn"

# Next.js Configuration
NEXT_PUBLIC_ENVIRONMENT="development"
NEXT_PUBLIC_ENABLE_ANALYTICS="false"
NEXT_PUBLIC_ENABLE_DEBUG="true"
EOF
            print_success "Basic .env.local created"
            print_warning "Please update .env.local with your actual values"
        fi
    else
        print_success "Environment file already exists"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    
    # Create pre-commit hook
    mkdir -p .git/hooks
    
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for Enterprise File Explorer

echo "Running pre-commit checks..."

# Run linting
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix the issues before committing."
    exit 1
fi

# Run type checking
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed. Please fix the issues before committing."
    exit 1
fi

# Run tests
npm run test:unit
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix the issues before committing."
    exit 1
fi

echo "✅ All pre-commit checks passed!"
EOF

    chmod +x .git/hooks/pre-commit
    print_success "Git hooks configured"
}

# Setup development tools
setup_dev_tools() {
    print_status "Setting up development tools..."
    
    # Install global tools if not present
    if ! command_exists vercel; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Setup VS Code settings if VS Code is detected
    if command_exists code; then
        mkdir -p .vscode
        
        # Create VS Code settings
        cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
EOF

        # Create VS Code extensions recommendations
        cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
EOF

        print_success "VS Code configuration created"
    fi
}

# Create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    mkdir -p scripts
    
    # Create database setup script
    cat > scripts/db-setup.sh << 'EOF'
#!/bin/bash
# Database setup script

echo "Setting up database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in environment"
    exit 1
fi

# Run database migrations
npm run db:generate
npm run db:push
npm run db:seed

echo "✅ Database setup complete"
EOF

    # Create test script
    cat > scripts/test-all.sh << 'EOF'
#!/bin/bash
# Comprehensive test script

echo "Running all tests..."

# Unit tests
echo "🧪 Running unit tests..."
npm run test:unit

# Integration tests
echo "🔗 Running integration tests..."
npm run test:integration

# E2E tests (if available)
if npm run | grep -q "test:e2e"; then
    echo "🌐 Running E2E tests..."
    npm run test:e2e
fi

# Type checking
echo "📝 Running type checks..."
npm run type-check

# Linting
echo "🔍 Running linting..."
npm run lint

echo "✅ All tests completed"
EOF

    # Create build script
    cat > scripts/build-check.sh << 'EOF'
#!/bin/bash
# Build verification script

echo "Verifying build..."

# Clean previous builds
rm -rf .next

# Run build
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi
EOF

    chmod +x scripts/*.sh
    print_success "Development scripts created"
}

# Run initial checks
run_initial_checks() {
    print_status "Running initial checks..."
    
    # Type checking
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm type-check
    else
        npm run type-check
    fi
    
    # Linting
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm lint
    else
        npm run lint
    fi
    
    print_success "Initial checks completed"
}

# Main setup function
main() {
    echo "🎯 Enterprise File Explorer Setup"
    echo "================================="
    
    check_prerequisites
    install_dependencies
    setup_environment
    setup_git_hooks
    setup_dev_tools
    create_dev_scripts
    run_initial_checks
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update .env.local with your actual configuration values"
    echo "2. Run 'npm run dev' to start the development server"
    echo "3. Open http://localhost:3000 in your browser"
    echo ""
    echo "Available commands:"
    echo "  npm run dev          - Start development server"
    echo "  npm run build        - Build for production"
    echo "  npm run test         - Run tests"
    echo "  npm run lint         - Run linting"
    echo "  npm run type-check   - Run type checking"
    echo ""
    echo "For more information, see DEVELOPER_GUIDE.md"
}

# Run main function
main "$@"
EOF
