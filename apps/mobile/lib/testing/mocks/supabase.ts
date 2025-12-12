/**
 * Mock Supabase client for testing
 *
 * Usage in tests:
 * ```typescript
 * jest.mock('@/lib/supabase/supabase', () => require('@/lib/testing/mocks/supabase'));
 *
 * import { supabase, mockAuthSession, resetSupabaseMocks } from '@/lib/testing/mocks/supabase';
 * ```
 */

// Mock query builder for chainable Supabase queries
class MockQueryBuilder {
  private _data: any = null;
  private _error: any = null;
  private _promise: Promise<any> | null = null;

  // Helper to set response data
  _setResponse(data: any, error: any = null) {
    this._data = data;
    this._error = error;
    this._createPromise();
    return this;
  }

  private _createPromise() {
    this._promise = this._error
      ? Promise.reject(this._error)
      : Promise.resolve({
          data: this._data,
          error: null,
          count: null,
          status: 200,
          statusText: "OK",
        });
  }

  // Chainable query methods
  select(columns?: string) {
    return this;
  }

  eq(column: string, value: any) {
    return this;
  }

  in(column: string, values: any[]) {
    return this;
  }

  not(column: string, operator: string, value: any) {
    return this;
  }

  order(column: string, options?: { ascending: boolean }) {
    return this;
  }

  single() {
    return this;
  }

  // Promise-like interface for await support
  then(resolve: any, reject?: any) {
    if (!this._promise) {
      this._createPromise();
    }
    return this._promise!.then(resolve, reject);
  }

  catch(reject: any) {
    if (!this._promise) {
      this._createPromise();
    }
    return this._promise!.catch(reject);
  }
}

// Export MockQueryBuilder for tests that need it
export { MockQueryBuilder };

// Mock Supabase client
export const supabase = {
  from: jest.fn((table: string) => {
    const builder = new MockQueryBuilder();
    return builder;
  }),

  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "mock-test-token",
          user: {
            id: "test-user-id",
            email: "test@example.com",
          },
        },
      },
      error: null,
    }),

    signOut: jest.fn().mockResolvedValue({
      error: null,
    }),

    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },

  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  })),

  removeChannel: jest.fn(),
};

// Helper function to mock Supabase responses in tests
export const mockSupabaseQuery = (
  table: string,
  data: any,
  error: any = null
) => {
  const builder = new MockQueryBuilder();
  builder._setResponse(data, error);
  (supabase.from as jest.Mock).mockReturnValueOnce(builder);
  return builder;
};

// Helper to mock auth session
export const mockAuthSession = (session: any) => {
  // If session is null or undefined, use mockNoAuthSession
  if (!session) {
    mockNoAuthSession();
    return;
  }

  // Ensure session has the structure videoService expects
  const fullSession = {
    access_token: session.access_token || session,
    user: session.user || {
      id: "test-user-id",
      email: "test@example.com",
    },
    ...session,
  };

  (supabase.auth.getSession as jest.Mock).mockImplementation(() =>
    Promise.resolve({
      data: { session: fullSession },
      error: null,
    })
  );
};

// Helper to mock no auth session
export const mockNoAuthSession = () => {
  (supabase.auth.getSession as jest.Mock).mockImplementation(() =>
    Promise.resolve({
      data: { session: null },
      error: { message: "Not authenticated" },
    })
  );
};

// Reset all mocks
export const resetSupabaseMocks = () => {
  // Clear all from() mocks but preserve auth.getSession
  (supabase.from as jest.Mock).mockClear();

  // Reset to default authenticated state
  (supabase.auth.getSession as jest.Mock).mockImplementation(() =>
    Promise.resolve({
      data: {
        session: {
          access_token: "mock-test-token",
          user: {
            id: "test-user-id",
            email: "test@example.com",
          },
        },
      },
      error: null,
    })
  );
};
