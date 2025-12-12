export const mockFetch = global.fetch as jest.Mock;

/**
 * Create a mock fetch Response object
 */
export const createMockFetchResponse = (
  data: any,
  options: { ok?: boolean; status?: number } = {}
): Response => {
  const { ok = true, status = 200 } = options;

  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? "OK" : "Error",
    type: "basic",
    url: "http://localhost:8080",
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
  } as any;
};

/**
 * Create a mock error Response object
 */
export const createMockErrorResponse = (
  errorMessage: string,
  status: number = 400
): Response => {
  return createMockFetchResponse(
    { error: errorMessage },
    { ok: false, status }
  );
};

/**
 * Mock fetch to return a specific response
 */
export const mockFetchResponse = (response: Response) => {
  mockFetch.mockResolvedValueOnce(response);
};

/**
 * Mock fetch to reject with an error
 */
export const mockFetchError = (error: Error) => {
  mockFetch.mockRejectedValueOnce(error);
};

/**
 * Assert that fetch was called with specific parameters
 */
export const expectFetchCalledWith = (url: string, options?: RequestInit) => {
  expect(global.fetch).toHaveBeenCalledWith(
    url,
    expect.objectContaining(options || {})
  );
};

/**
 * Create a mock progress callback for testing
 */
export const createMockProgressCallback = () => {
  const progressValues: number[] = [];
  const callback = jest.fn((progress: number) => {
    progressValues.push(progress);
  });

  return {
    callback,
    progressValues,
    getProgressValues: () => progressValues,
  };
};
