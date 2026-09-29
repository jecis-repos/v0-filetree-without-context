# Filetree without context

Next.js prototype for exploring a file tree and experimenting with filesystem providers, benchmarks, and PHP-backed exports.

## Local development

Use Node.js 20 or newer and the pinned pnpm version:

```sh
npx pnpm@9.15.9 install --frozen-lockfile
npx pnpm@9.15.9 dev
```

Open http://localhost:3000. For a production build:

```sh
npx pnpm@9.15.9 build
npx pnpm@9.15.9 start
```

See [ENVIRONMENT.md](ENVIRONMENT.md) for optional external-service configuration. The application has in-memory provider fallbacks; a successful health response does not prove an external PHP or storage service is available.

## Checks

`pnpm smoke` starts a built server on an unused local port and verifies the homepage, health response and missing-file download response. CI runs the build and this startup check.

`pnpm typecheck` exposes the existing TypeScript diagnostics. The current build configuration skips type checking and linting, so a successful build alone does not establish that those checks pass. The historical test files do not yet have a configured test runner.

[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) and [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) describe the prototype structure. They include planned capabilities as well as implemented ones.
