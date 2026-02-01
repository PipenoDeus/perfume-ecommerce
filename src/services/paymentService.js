import { supabase } from './supabase';
import { getCSRFToken } from './csrfService';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';

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

    const response = await fetch(`${API_URL}/orders`, {
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

    const response = await fetch(`${API_URL}/orders`, {
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

    const response = await fetch(`${API_URL}/orders/${orderId}`, {
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

    const response = await fetch(`${API_URL}/payments/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ orderId, paymentMethod })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment session');
    }

    return response.json();
  },

  // Confirm bank payment (admin only)
  async confirmBankPayment(orderId, transactionId) {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const csrfToken = await getCSRFToken();

    const response = await fetch(`${API_URL}/payments/confirm-bank`, {
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
  }
};
