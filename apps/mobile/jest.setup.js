// Jest setup file for global test configuration

// Mock environment variables (must be set before any imports)
process.env.EXPO_PUBLIC_API_URL = "http://localhost:8080";
process.env.EXPO_PUBLIC_R2_PUBLIC_URL = "https://test.r2.dev";
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Mock fetch globally
global.fetch = jest.fn();

// Reset fetch mock before each test
beforeEach(() => {
  global.fetch.mockClear();
});

// Mock expo-file-system
jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation((uri) => ({
    uri,
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
  })),
}));

// Suppress console errors in tests (optional - comment out if you want to see errors)
// global.console.error = jest.fn();
// global.console.warn = jest.fn();
