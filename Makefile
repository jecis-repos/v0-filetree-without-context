# FileTree Explorer Makefile
# Cross-platform build system for Unix/Mac/Windows

# Detect OS
UNAME_S := $(shell uname -s 2>/dev/null || echo Windows)
ARCH := $(shell uname -m 2>/dev/null || echo x86_64)

# Set platform-specific variables
ifeq ($(UNAME_S),Linux)
    PLATFORM := linux
    SHELL_EXT := 
    EXEC_EXT := 
endif
ifeq ($(UNAME_S),Darwin)
    PLATFORM := macos
    SHELL_EXT := 
    EXEC_EXT := 
endif
ifeq ($(UNAME_S),Windows)
    PLATFORM := windows
    SHELL_EXT := .cmd
    EXEC_EXT := .exe
endif

# Project variables
PROJECT_NAME := filetree-explorer
VERSION := 2.0.0
BUILD_DIR := dist
DOCKER_IMAGE := $(PROJECT_NAME):$(VERSION)

# Node.js and package manager
NPM := npm$(SHELL_EXT)
PNPM := pnpm$(SHELL_EXT)
NODE := node$(EXEC_EXT)

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Show this help message
	@echo "FileTree Explorer Build System"
	@echo "Platform: $(PLATFORM) ($(ARCH))"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development targets
.PHONY: install
install: ## Install dependencies
	@echo "Installing dependencies for $(PLATFORM)..."
	$(NPM) install
	@echo "Dependencies installed successfully"

.PHONY: dev
dev: ## Start development server
	@echo "Starting development server..."
	$(NPM) run dev

.PHONY: dev-docker
dev-docker: ## Start development with Docker
	@echo "Starting development with Docker..."
	docker-compose -f docker-compose.dev.yml up --build

# Build targets
.PHONY: build
build: ## Build for production
	@echo "Building for production..."
	$(NPM) run build

.PHONY: build-wasm
build-wasm: ## Build WebAssembly modules
	@echo "Building WebAssembly modules..."
	$(NPM) run build:wasm

.PHONY: build-php-wasm
build-php-wasm: ## Build PHP-WASM integration
	@echo "Building PHP-WASM integration..."
	$(NPM) run build:php-wasm

.PHONY: build-all
build-all: clean install build-wasm build-php-wasm build ## Build everything
	@echo "Complete build finished"

# Test targets
.PHONY: test
test: ## Run unit tests
	@echo "Running unit tests..."
	$(NPM) run test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo "Running tests in watch mode..."
	$(NPM) run test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	$(NPM) run test:coverage

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "Running E2E tests..."
	$(NPM) run test:e2e

.PHONY: test-all
test-all: test test-e2e ## Run all tests
	@echo "All tests completed"

# Quality targets
.PHONY: lint
lint: ## Run linter
	@echo "Running linter..."
	$(NPM) run lint

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "Running type check..."
	$(NPM) run type-check

.PHONY: quality
quality: lint type-check ## Run all quality checks
	@echo "Quality checks completed"

# Docker targets
.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE) .

.PHONY: docker-run
docker-run: ## Run Docker container
	@echo "Running Docker container..."
	docker run -p 3000:3000 $(DOCKER_IMAGE)

.PHONY: docker-push
docker-push: docker-build ## Push Docker image
	@echo "Pushing Docker image..."
	docker push $(DOCKER_IMAGE)

# Deployment targets
.PHONY: deploy-staging
deploy-staging: build-all ## Deploy to staging
	@echo "Deploying to staging..."
	# Add staging deployment commands here

.PHONY: deploy-prod
deploy-prod: build-all test-all ## Deploy to production
	@echo "Deploying to production..."
	# Add production deployment commands here

# Utility targets
.PHONY: clean
clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf public/wasm
	rm -rf coverage
	@echo "Clean completed"

.PHONY: clean-all
clean-all: clean ## Clean everything including node_modules
	@echo "Cleaning everything..."
	rm -rf node_modules
	@echo "Deep clean completed"

.PHONY: setup
setup: clean-all install build-all ## Complete project setup
	@echo "Project setup completed"

# Platform-specific targets
.PHONY: setup-linux
setup-linux: ## Setup for Linux
	@echo "Setting up for Linux..."
	sudo apt-get update
	sudo apt-get install -y nodejs npm docker.io
	$(MAKE) setup

.PHONY: setup-macos
setup-macos: ## Setup for macOS
	@echo "Setting up for macOS..."
	brew install node npm docker
	$(MAKE) setup

.PHONY: setup-windows
setup-windows: ## Setup for Windows
	@echo "Setting up for Windows..."
	@echo "Please install Node.js and Docker Desktop manually"
	$(MAKE) setup

# Service targets
.PHONY: start-services
start-services: ## Start all services
	@echo "Starting services..."
	docker-compose up -d

.PHONY: stop-services
stop-services: ## Stop all services
	@echo "Stopping services..."
	docker-compose down

.PHONY: restart-services
restart-services: stop-services start-services ## Restart all services

# Monitoring targets
.PHONY: logs
logs: ## Show service logs
	docker-compose logs -f

.PHONY: status
status: ## Show service status
	docker-compose ps

# Release targets
.PHONY: release
release: clean-all setup test-all build-all ## Create a release
	@echo "Creating release $(VERSION)..."
	git tag -a v$(VERSION) -m "Release version $(VERSION)"
	@echo "Release $(VERSION) created"

.PHONY: version
version: ## Show version information
	@echo "FileTree Explorer v$(VERSION)"
	@echo "Platform: $(PLATFORM) ($(ARCH))"
	@echo "Node.js: $(shell $(NODE) --version 2>/dev/null || echo 'Not installed')"
	@echo "NPM: $(shell $(NPM) --version 2>/dev/null || echo 'Not installed')"
