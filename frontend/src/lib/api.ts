/**
 * API Configuration and Helper
 */

// Centralized API Base URL configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface FetchOptions extends RequestInit {
  data?: any;
}

/**
 * A reusable fetch wrapper that automatically prepends the API base URL,
 * includes standard headers, and handles common error scenarios.
 */
export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, headers: customHeaders, ...customConfig } = options;

  // Ensure endpoint starts with a slash for consistent URL building
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(customHeaders);
  headers.set('Content-Type', 'application/json');

  const config: RequestInit = {
    method: data ? 'POST' : 'GET', // Default method
    ...customConfig,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      // Try to parse error details from the response
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData && errorData.detail) {
           errorMessage = errorData.detail; // Common in FastAPI/Python backends
        }
      } catch (e) {
        // Fallback if response is not JSON
      }
      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetchApi error on ${url}]:`, error);
    throw error;
  }
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'data'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data: any, options?: Omit<FetchOptions, 'method' | 'data'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'POST', data }),

  put: <T>(endpoint: string, data: any, options?: Omit<FetchOptions, 'method' | 'data'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'PUT', data }),

  delete: <T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'data'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),

  patch: <T>(endpoint: string, data: any, options?: Omit<FetchOptions, 'method' | 'data'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'PATCH', data }),
};
