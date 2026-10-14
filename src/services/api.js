
const configuredBase = (
  import.meta.env.VITE_API_BASE_URL || ''
).trim();

// Local development: localhost
// Production: Vercel environment variable se backend URL
const rawBase =
  configuredBase ||
  (import.meta.env.DEV ? 'http://localhost:8080' : '');

export const API_BASE = rawBase.replace(/\/+$/, '');
export const API_ENABLED = Boolean(API_BASE);

console.log('API_BASE:', API_BASE);

/**
 * API error ko readable English message mein convert karta hai.
 */
export function displayApiError(error) {
  if (error?.status === 0 || error instanceof TypeError) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}

/**
 * Backend API request helper.
 */
export async function apiRequest(path, options = {}) {
  if (!API_ENABLED) {
    throw new Error(
      'Backend URL is not configured. Please set VITE_API_BASE_URL in Vercel.'
    );
  }

  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    const networkError = new Error(
      'Unable to connect to the backend. Please check that the server is running and try again.'
    );

    networkError.cause = error;
    networkError.status = 0;

    throw networkError;
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  try {
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text || null;
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === 'string'
        ? data
        : data?.message ||
          data?.error ||
          `Request failed with status ${response.status}.`;

    const apiError = new Error(message);
    apiError.status = response.status;

    throw apiError;
  }

  return data;
}
