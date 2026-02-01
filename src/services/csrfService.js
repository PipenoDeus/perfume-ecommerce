const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

let csrfToken = null;
let tokenExpiry = null;

/**
 * Fetch a new CSRF token from the backend
 */
export async function fetchCSRFToken() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    csrfToken = data.csrfToken;
    
    // Token expires in 1 hour, refresh after 55 minutes
    tokenExpiry = Date.now() + (55 * 60 * 1000);
    
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Get the current CSRF token, fetching a new one if needed
 */
export async function getCSRFToken() {
  // If no token or token expired, fetch new one
  if (!csrfToken || !tokenExpiry || Date.now() >= tokenExpiry) {
    return await fetchCSRFToken();
  }
  
  return csrfToken;
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
    await fetchCSRFToken();
  } catch (error) {
    console.error('Failed to initialize CSRF token:', error);
  }
}
