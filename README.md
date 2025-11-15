# Hyperbolic - Tricking Community App

A monorepo containing the Hyperbolic mobile app and backend services for the tricking community.

## Project Structure

```
hyperbolic/
├── apps/
│   ├── mobile/              # React Native (Expo) mobile app
│   └── dolos-web-service/   # Go backend API service
└── packages/                # Shared packages (if any)
```

## Quick Start

### Prerequisites
- Node.js >= 18
- pnpm 9.x
- Go 1.21+ (for backend service)

### Installation

```bash
# Install dependencies
pnpm install

# Run all apps in development mode
pnpm dev

# Run specific apps
pnpm mobile    # Mobile app only
pnpm api       # Backend service only
```

## Environment Variables

### Strategy

This monorepo uses **app-specific environment files** for clarity and security:

- **Secrets** (API keys, service keys) → Server only (`dolos-web-service`)
- **Public values** (API URLs, public bucket URLs) → Can be in client apps
- **Mobile app** requires `EXPO_PUBLIC_` prefix for bundled env vars

### Setup

1. **Mobile App** - Copy and configure:
   ```bash
   cd apps/mobile
   cp .env.local.example .env.local  # If example exists
   # Edit .env.local with your values
   ```

2. **Backend Service** - Copy and configure:
   ```bash
   cd apps/dolos-web-service
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

### What Goes Where

**Mobile** (`apps/mobile/.env.local`):
```bash
# ✅ PUBLIC variables only (these get bundled into the app)
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Anon key is safe
EXPO_PUBLIC_R2_PUBLIC_URL=https://pub-xxx.r2.dev

# ❌ NEVER put server secrets here!
```

**Backend** (`apps/dolos-web-service/.env`):
```bash
# ✅ Server can have ALL secrets
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
SUPABASE_SERVICE_KEY=...  # Server-only secret
# See .env.example for full list
```

### Why This Approach?

- **Security**: Secrets never leak into client bundles
- **Clarity**: Each app's requirements are explicit
- **Flexibility**: Apps can use different env var formats
- **No Magic**: No complex env var inheritance

## Development

### Available Scripts

```bash
pnpm dev        # Run all apps in development mode
pnpm build      # Build all apps
pnpm lint       # Lint all apps
pnpm test       # Run all tests
pnpm clean      # Clean all build artifacts
```

## Tech Stack

- **Mobile**: React Native + Expo + TypeScript
- **Backend**: Go + Chi Router
- **Database**: Supabase (PostgreSQL)
- **Storage**: Cloudflare R2
- **Monorepo**: Turborepo + pnpm

## Documentation

- Mobile app: See `apps/mobile/CLAUDE.md`
- Backend API: See `apps/dolos-web-service/README.md` (if exists)
