import { supabase } from './supabase';
import { fetchCSRFToken, getCSRFToken } from './csrfService';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

const fetchWithCSRFRetry = async (url, options = {}) => {
  const token = await getCSRFToken();

  const doRequest = async (csrfToken) => fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  let response = await doRequest(token);

  if (response.status === 403) {
    const errorPayload = await response.clone().json().catch(() => ({}));
    const message = String(errorPayload?.error || '');

    if (/csrf|expired/i.test(message)) {
      const freshToken = await fetchCSRFToken();
      response = await doRequest(freshToken);
    }
  }

  return response;
};

// Get JWT token from Supabase session
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export const orderService = {
  // Create a new order
  async createOrder(items, shippingAddress) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetchWithCSRFRetry(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ items, shippingAddress })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }

    return response.json();
  },

  // Get all user orders
  async getUserOrders() {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch orders');
    }

    return response.json();
  },

  // Get order by ID
  async getOrder(orderId) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch order');
    }

    return response.json();
  },

  async updateOrderShippingAddress(orderId, shippingAddress) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetchWithCSRFRetry(`${API_BASE_URL}/api/orders/${orderId}/shipping-address`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ shippingAddress }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update shipping address');
    }

    return response.json();
  }
};

export const paymentService = {
  // Create payment session
  async createPaymentSession(orderId, paymentMethod) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const endpoint = `${API_BASE_URL}/api/payments/create-session`;

    if (import.meta.env.DEV) {
      console.log('[payments] create-session ->', endpoint);
    }

    const response = await fetchWithCSRFRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, paymentMethod })
    });

    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.warn('[payments] create-session failed', response.status);
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment session');
    }

    return response.json();
  },

  // Capture PayPal payment after return_url
  async capturePayPalOrder(paypalOrderId, orderId = null) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetchWithCSRFRetry(`${API_BASE_URL}/api/payments/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ paypalOrderId, orderId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to capture payment');
    }

    return response.json();
  },

  // Confirm bank payment (admin only)
  async confirmBankPayment(orderId, transactionId) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetchWithCSRFRetry(`${API_BASE_URL}/api/payments/confirm-bank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, transactionId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to confirm bank payment');
    }

    return response.json();
  },

  // Confirm Flow payment after return_url
  async confirmFlowPayment(token, orderId) {
    const authToken = await getAuthToken();
    if (!authToken) throw new Error('Not authenticated');

    const response = await fetchWithCSRFRetry(`${API_BASE_URL}/api/payments/flow/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, orderId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to confirm Flow transaction');
    }

    return response.json();
  }
};
