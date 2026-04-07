import { supabase } from './supabase';
import { getCSRFToken } from './csrfService';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

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

    const csrfToken = await getCSRFToken();

    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
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
  }
};

export const paymentService = {
  // Create payment session
  async createPaymentSession(orderId, paymentMethod) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const csrfToken = await getCSRFToken();
    const endpoint = `${API_BASE_URL}/api/payments/create-session`;

    if (import.meta.env.DEV) {
      console.log('[payments] create-session ->', endpoint);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
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

    const csrfToken = await getCSRFToken();

    const response = await fetch(`${API_BASE_URL}/api/payments/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
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

    const csrfToken = await getCSRFToken();

    const response = await fetch(`${API_BASE_URL}/api/payments/confirm-bank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ orderId, transactionId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to confirm bank payment');
    }

    return response.json();
  },

  // Create Webpay transaction
  async createWebpayTransaction(orderId) {
    const csrfToken = await getCSRFToken();
    const { data: { session } } = await supabase.auth.getSession();

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const response = await fetch(`${API_BASE_URL}/api/payments/webpay/create`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ orderId }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(data?.error || 'Demasiados intentos de pago. Espera un momento y vuelve a intentarlo.');
      }
      throw new Error(data?.error || data?.message || `Error ${response.status}`);
    }
    return data;
  },

  // Commit Webpay transaction
  async commitWebpayTransaction(token_ws) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const csrfToken = await getCSRFToken();

    const response = await fetch(`${API_BASE_URL}/api/payments/webpay/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ token: token_ws })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to commit Webpay transaction');
    }

    return response.json();
  }
};
