# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hyperbolic is a React Native mobile application for the Tricking community (a sport combining martial arts, gymnastics, and breakdancing). Built with Expo and TypeScript, it uses Supabase for backend services.

## Essential Commands

```bash
# Development
npm start          # Start Expo development server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser

# Code Quality
npm run lint       # Run Expo linter
npm test          # Run Jest tests (watch mode)

# Project Management
npm run reset-project  # Reset to fresh state
```

## Architecture Overview

### Navigation Structure
The app uses Expo Router with file-based routing:
- `app/` contains all screens and navigation
- `app/(tabs)/` implements tab navigation with Home and About screens
- Navigation configuration is in `_layout.tsx` files

### Core Technologies
- **Frontend**: React Native 0.76.9 with Expo 52
- **Language**: TypeScript with strict mode
- **Backend**: Supabase (auth + database)
- **Testing**: Jest with jest-expo preset
- **State Management**: Not yet implemented

### Database Schema
Three main tables in Supabase:
1. `TricksTable` - Trick catalog with difficulty ratings
2. `UsersTable` - User profiles and statistics  
3. `UserToTricksTable` - Links users to their learned tricks

### Key Directories
- `components/` - Reusable UI components
- `lib/supabase/` - Supabase client and TypeScript types
- `assets/` - Static images and fonts

## Development Guidelines

### Environment Setup
Requires environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Current State
The app is in early development. The main screen currently shows a sticker/image editing demo. Core features like trick tracking, social features, and video sharing are planned but not yet implemented.

### When Making Changes
1. Follow existing TypeScript patterns - all components are functional with proper typing
2. Use React Native StyleSheet for styling, not external CSS
3. Place new screens in `app/` following the file-based routing convention
4. Reusable components go in `components/`
5. Database types are auto-generated in `lib/supabase/database.types.ts`

### Testing
Currently no tests exist. When adding tests:
- Place in `__tests__` directories
- Use Jest with react-test-renderer
- Run with `npm test`