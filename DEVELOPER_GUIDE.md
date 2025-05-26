# Developer Guide - Enterprise File Explorer

## 🚀 Quick Start

### Automated Setup

Run the automated setup script:

\`\`\`bash
# Clone and setup in one command
curl -fsSL https://raw.githubusercontent.com/your-repo/setup.sh | bash
\`\`\`

Or manual setup:

\`\`\`bash
# 1. Clone the repository
git clone https://github.com/your-repo/enterprise-file-explorer.git
cd enterprise-file-explorer

# 2. Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
\`\`\`

### Prerequisites

- **Node.js** 18.17+ or 20+
- **pnpm** 8+ (recommended) or npm/yarn
- **Git** 2.40+
- **Docker** (optional, for containerized development)

## 📁 Project Structure

\`\`\`
enterprise-file-explorer/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── actions/           # Server actions
│   └── (pages)/           # Page components
├── src/
│   ├── components/        # React components
│   ├── services/          # Business logic
│   ├── providers/         # Data providers
│   ├── interfaces/        # TypeScript interfaces
│   ├── utils/            # Utility functions
│   ├── styles/           # Styling and themes
│   └── __tests__/        # Test files
├── scripts/              # Development scripts
├── docs/                 # Documentation
└── public/              # Static assets
\`\`\`

## 🛠️ Development Setup

### Environment Configuration

1. **Copy environment template:**
\`\`\`bash
cp .env.example .env.local
\`\`\`

2. **Configure required variables:**
\`\`\`env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fileexplorer"

# PHP Integration
PHP_API_KEY="your-php-api-key"
PHP_ENDPOINT="http://localhost:8080"

# Optional: External APIs
OPENAI_API_KEY="your-openai-key"
SENTRY_DSN="your-sentry-dsn"
\`\`\`

### Installation

\`\`\`bash
# Install dependencies
pnpm install

# Setup database (if using)
pnpm db:setup

# Run development server
pnpm dev
\`\`\`

### Docker Development

\`\`\`bash
# Build and run with Docker Compose
docker-compose up -d

# Or use the development container
docker-compose -f docker-compose.dev.yml up
\`\`\`

## 🧪 Testing

### Running Tests

\`\`\`bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e
\`\`\`

### Test Structure

- **Unit Tests**: `src/**/*.test.ts`
- **Integration Tests**: `src/__tests__/integration/`
- **E2E Tests**: `e2e/`
- **Component Tests**: `src/__tests__/components/`

## 🎨 Theming & Styling

### Dark Mode Implementation

The application uses a comprehensive theming system with full dark mode support:

\`\`\`typescript
// Using the theme in components
import { useTheme } from '@/src/styles/ThemeProvider'

function MyComponent() {
  const { isDark, mode, setMode } = useTheme()
  
  return (
    <div className={`bg-background text-foreground ${isDark ? 'dark-specific-class' : ''}`}>
      <button onClick={() => setMode(isDark ? 'light' : 'dark')}>
        Toggle Theme
      </button>
    </div>
  )
}
\`\`\`

### CSS Variables

All colors use CSS custom properties that automatically switch in dark mode:

\`\`\`css
/* Light mode */
:root {
  --background: 255 255 255;
  --foreground: 0 0 0;
}

/* Dark mode */
.dark {
  --background: 0 0 0;
  --foreground: 255 255 255;
}
\`\`\`

## 🔧 Development Scripts

### Available Commands

\`\`\`bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm type-check       # Run TypeScript checks

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests
pnpm test:integration # Run integration tests
pnpm test:e2e         # Run E2E tests
pnpm test:coverage    # Run tests with coverage

# Code Quality
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting
pnpm analyze          # Analyze bundle size
pnpm security-check   # Run security audit
\`\`\`

## 🏗️ Architecture

### Dependency Injection

The application uses a custom DI container for service management:

\`\`\`typescript
// Registering services
container.register('FileSystemService', FileSystemService)
container.register('CacheService', CacheService)

// Resolving services
const fileService = container.resolve<FileSystemService>('FileSystemService')
\`\`\`

### Service Layer

- **FileSystemService**: Core file operations
- **CacheService**: Caching layer
- **PerformanceMonitor**: Performance tracking
- **LoggingService**: Centralized logging
- **HealthService**: System health monitoring

### Provider Pattern

Data providers abstract different data sources:

- **MemoryFileSystemProvider**: In-memory file system
- **WasmFileSystemProvider**: WebAssembly-based provider
- **PhpImageProvider**: PHP-based image generation

## 🚀 Deployment

### Vercel Deployment

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
\`\`\`

### Docker Deployment

\`\`\`bash
# Build production image
docker build -t enterprise-file-explorer .

# Run container
docker run -p 3000:3000 enterprise-file-explorer
\`\`\`

### Environment Variables for Production

Required environment variables for production:

\`\`\`env
# Database
DATABASE_URL=
POSTGRES_URL=

# Security
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# External APIs
PHP_API_KEY=
PHP_ENDPOINT=

# Monitoring
SENTRY_DSN=
\`\`\`

## 🔍 Debugging

### Development Tools

1. **React Developer Tools**: Browser extension for React debugging
2. **Next.js DevTools**: Built-in Next.js debugging
3. **Prisma Studio**: Database GUI (if using database)
4. **Vercel Analytics**: Performance monitoring

### Logging

\`\`\`typescript
import { LoggingService } from '@/src/services/LoggingService'

const logger = new LoggingService()
logger.info('Application started')
logger.error('Error occurred', { error })
logger.debug('Debug information', { data })
\`\`\`

### Performance Monitoring

\`\`\`typescript
import { PerformanceMonitor } from '@/src/services/PerformanceMonitor'

const monitor = new PerformanceMonitor()
const timer = monitor.startTimer('operation')
// ... perform operation
monitor.endTimer(timer)
\`\`\`

## 📚 API Documentation

### Health Endpoints

- `GET /api/health` - Basic health check
- `GET /api/health/simple` - Simple health status
- `GET /api/v1/health` - Detailed health information

### File System Endpoints

- `GET /api/filesystem/health` - File system health
- `GET /api/filesystem/download/[fileId]` - Download file

### Deployment Endpoints

- `GET /api/deployment/check` - Deployment verification
- `GET /api/deployment/readiness` - Readiness check
- `GET /api/deployment/final-check` - Final deployment check

## 🤝 Contributing

### Code Style

- **ESLint**: Enforced code style
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **Conventional Commits**: Commit message format

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit changes: `git commit -m 'feat: add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Review Checklist

- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance impact considered
- [ ] Accessibility requirements met

## 🐛 Troubleshooting

### Common Issues

**Build Errors:**
\`\`\`bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules pnpm-lock.yaml
pnpm install
\`\`\`

**Database Issues:**
\`\`\`bash
# Reset database
pnpm db:reset
pnpm db:seed
\`\`\`

**Type Errors:**
\`\`\`bash
# Regenerate types
pnpm db:generate
pnpm type-check
\`\`\`

### Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share ideas
- **Documentation**: Check the docs folder
- **Discord**: Join our development community

## 📈 Performance

### Optimization Tips

1. **Bundle Analysis**: Use `pnpm analyze` to check bundle size
2. **Image Optimization**: Use Next.js Image component
3. **Code Splitting**: Implement dynamic imports
4. **Caching**: Utilize the built-in cache service
5. **Monitoring**: Use performance monitoring tools

### Metrics

- **Core Web Vitals**: Monitored automatically
- **Bundle Size**: Tracked in CI/CD
- **Performance Budget**: Enforced in builds
- **Lighthouse Scores**: Automated testing

## 🔒 Security

### Security Practices

- **Environment Variables**: Never commit secrets
- **Input Validation**: Validate all user inputs
- **CSRF Protection**: Built-in Next.js protection
- **Content Security Policy**: Configured headers
- **Dependency Scanning**: Automated security checks

### Security Checklist

- [ ] Environment variables secured
- [ ] Dependencies up to date
- [ ] Input validation implemented
- [ ] Authentication configured
- [ ] HTTPS enforced
- [ ] Security headers set
