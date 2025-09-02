# Monorepo Migration Guide

## Architecture Decision

### Why Monorepo?
- **Shared types/schemas** - Go server, Next.js web, and React Native mobile can share TypeScript types, API contracts, and database schemas
- **Atomic changes** - Update API endpoints and their consumers in one PR
- **Unified CI/CD** - Deploy everything together or separately with path-based triggers
- **Code reuse** - Share utilities, validation logic, and business logic across projects

### Why PostgreSQL/Supabase (not Cassandra)?
- Data model (Users, Tricks, UserToTricks) is inherently relational
- Supabase provides built-in auth, real-time subscriptions, and row-level security
- PostgreSQL easily handles millions of users (Instagram scale)
- ACID transactions needed for user operations
- Cassandra would add unnecessary operational complexity for initial scale

## Target Structure

```
hyperbolic/
├── apps/
│   ├── mobile/          # React Native app (Expo)
│   ├── web/             # Next.js web app
│   └── landing/         # Marketing site (could be part of web/)
├── services/
│   └── api/             # Go server for complex operations
├── packages/
│   ├── shared-types/    # TypeScript types, schemas
│   ├── utils/           # Shared utilities, validation
│   ├── api-client/      # Shared API clients, Supabase
│   └── business-logic/  # Shared hooks, data transformation
├── turbo.json           # Turborepo configuration
├── pnpm-workspace.yaml  # Workspace configuration
└── package.json         # Root workspace config
```

## What Can Be Shared

### ✅ CAN Share Between React Native & Next.js
1. **Business Logic & Hooks**
   ```tsx
   // packages/business-logic/hooks/useTricks.ts
   export const useTricks = () => {
     // API calls, data transformation
   }
   ```

2. **TypeScript Types & Schemas**
   ```tsx
   // packages/shared-types/trick.ts
   export interface Trick {
     id: string
     name: string
     difficulty: number
   }
   ```

3. **Utilities & Constants**
   ```tsx
   // packages/utils/validation.ts
   export const validateEmail = (email: string) => { ... }
   ```

4. **API Clients & Services**
   ```tsx
   // packages/api-client/supabase.ts
   export const fetchTricks = async () => { ... }
   ```

### ❌ CANNOT Share (Different Primitives)
- **UI Components** - React Native uses `View`, `Text`, `TouchableOpacity` while Next.js uses `div`, `p`, `button`
- **Styling** - React Native uses StyleSheet, Next.js uses CSS/Tailwind
- **Navigation** - Expo Router vs Next.js Router

## Migration Steps

### Phase 1: Setup Monorepo Infrastructure
```bash
# 1. Install pnpm globally
npm install -g pnpm

# 2. Initialize workspace in project root
pnpm init

# 3. Create pnpm-workspace.yaml
echo 'packages:
  - "apps/*"
  - "services/*"
  - "packages/*"' > pnpm-workspace.yaml

# 4. Install Turborepo
pnpm add -Dw turbo
```

### Phase 2: Reorganize Current React Native App
```bash
# 1. Create directory structure
mkdir -p apps/mobile
mkdir -p packages/shared-types
mkdir -p services/api

# 2. Move React Native app
mv * apps/mobile/ 2>/dev/null || true
mv .* apps/mobile/ 2>/dev/null || true

# 3. Restore workspace files
git restore pnpm-workspace.yaml package.json turbo.json
```

### Phase 3: Configure Turborepo
Create `turbo.json` in root:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

### Phase 4: Update Package Scripts
Root `package.json`:
```json
{
  "name": "hyperbolic",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "mobile": "turbo run dev --filter=mobile",
    "web": "turbo run dev --filter=web",
    "api": "turbo run dev --filter=api"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

### Phase 5: Extract Shared Code
1. **Move TypeScript types**
   ```bash
   # Create shared types package
   cd packages/shared-types
   pnpm init
   # Move database.types.ts and other shared types here
   ```

2. **Create utils package**
   ```bash
   cd packages/utils
   pnpm init
   # Add validation, formatting utilities
   ```

3. **Update imports in mobile app**
   ```tsx
   // Before
   import { Database } from '../../lib/supabase/database.types'
   
   // After
   import { Database } from '@hyperbolic/shared-types'
   ```

## Commands Reference

### With pnpm in Monorepo
```bash
# Install dependencies (from root)
pnpm install

# Run mobile app
pnpm --filter mobile start
# OR from apps/mobile directory
pnpm start

# Run all apps in dev mode
pnpm dev

# Add dependency to specific app
pnpm --filter mobile add react-native-reanimated

# Add shared dependency
pnpm add typescript -w # workspace root
```

### Expo/npx Still Works
```bash
cd apps/mobile
npx expo start        # Still works!
pnpm expo start       # Uses local expo
pnpm dlx expo start   # pnpm's npx equivalent
```

## Adding New Services

### Adding Go API Server
```bash
# Create Go service
mkdir -p services/api
cd services/api
go mod init github.com/hyperbolic/api

# Add to turborepo pipeline
# Update turbo.json to include Go build/dev commands
```

### Adding Next.js Web App
```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --app
```

## Best Practices

1. **Keep UI layers separate** - Don't try to share components between RN and Next.js
2. **Share everything else** - Types, logic, utilities, API clients
3. **Use workspace protocol** - In package.json: `"@hyperbolic/types": "workspace:*"`
4. **Incremental migration** - Start with current setup, gradually extract shared code
5. **Path-based CI/CD** - Deploy only what changed using GitHub Actions path filters

## Common Issues & Solutions

### Issue: Expo Metro bundler can't find shared packages
**Solution**: Configure Metro to look in workspace
```js
// apps/mobile/metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, '../../packages')
];

module.exports = config;
```

### Issue: TypeScript can't resolve shared packages
**Solution**: Update tsconfig paths
```json
// apps/mobile/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@hyperbolic/*": ["../../packages/*/src"]
    }
  }
}
```

## Next Steps

1. Set up monorepo structure
2. Move current React Native app to `apps/mobile`
3. Extract database types to `packages/shared-types`
4. Create Go API service in `services/api`
5. Add Next.js web app when ready
6. Set up CI/CD with path-based triggers