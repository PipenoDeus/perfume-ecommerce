import { API_BASE_URL } from './apiConfig';

const RAW_CSRF_PATH = import.meta.env.VITE_CSRF_PATH || '/api/csrf-token';

let CSRF_PATH = RAW_CSRF_PATH.startsWith('/') ? RAW_CSRF_PATH : `/${RAW_CSRF_PATH}`;

// Evita /api/api/*
if (API_BASE_URL.endsWith('/api') && CSRF_PATH.startsWith('/api/')) {
  CSRF_PATH = CSRF_PATH.replace(/^\/api/, '');
}

const buildUrl = () => `${API_BASE_URL}${CSRF_PATH}`;

let csrfToken = null;
let tokenExpiry = null;

/**
 * Fetch a new CSRF token from the backend
 */
export async function fetchCSRFToken() {
  console.log('[CSRF] Fetching token from backend', { url: buildUrl() });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(buildUrl(), {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token (${response.status})`);
    }

    const data = await response.json();
    csrfToken = data.csrfToken || data.token || null;

    console.log('[CSRF] Token received', {
      csrfTokenPresent: Boolean(csrfToken),
      responseStatus: response.status,
      hasTokenInResponse: Boolean(data.csrfToken || data.token),
    });

    if (!csrfToken) {
      throw new Error('CSRF token missing in response');
    }

    tokenExpiry = Date.now() + 55 * 60 * 1000;
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get the current CSRF token, fetching a new one if needed
 */
export async function getCSRFToken() {
  if (csrfToken && tokenExpiry && Date.now() < tokenExpiry) {
    return csrfToken;
  }
  return fetchCSRFToken();
}

/**
 * Clear the CSRF token (e.g., on logout)
 */
export function clearCSRFToken() {
  csrfToken = null;
  tokenExpiry = null;
}

/**
 * Initialize CSRF token on app load
 */
export async function initializeCSRF() {
  try {
    await getCSRFToken();
  } catch (error) {
    console.error('Failed to initialize CSRF token:', error);
  }
}
