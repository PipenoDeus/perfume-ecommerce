# CSRF Token Implementation for Frontend

## Overview

The backend now requires CSRF tokens for all state-changing operations (POST, PUT, DELETE). This file explains how to update the frontend to include CSRF tokens in all requests.

## Step 1: Create CSRF Service

Create a new file: `src/services/csrfService.js`

```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export async function getCSRFToken() {
  try {
    const response = await axios.get(`${API_URL}/api/csrf-token`);
    return response.data.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    throw error;
  }
}
```

## Step 2: Update PaymentService

Update `src/services/paymentService.js` to include CSRF tokens:

```javascript
import axios from 'axios';
import { getCSRFToken } from './csrfService.js';

const API_URL = import.meta.env.VITE_BACKEND_URL;

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export const paymentService = {
  async createPaymentSession(orderId, paymentMethod) {
    try {
      const token = await getAuthToken();
      const csrfToken = await getCSRFToken(); // NEW: Get CSRF token

      const response = await axios.post(
        `${API_URL}/api/payments/create-session`,
        { orderId, paymentMethod },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': csrfToken // NEW: Include CSRF token
          }
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async confirmBankPayment(orderId, transactionId) {
    try {
      const token = await getAuthToken();
      const csrfToken = await getCSRFToken(); // NEW: Get CSRF token

      const response = await axios.post(
        `${API_URL}/api/payments/confirm-bank`,
        { orderId, transactionId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': csrfToken // NEW: Include CSRF token
          }
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default paymentService;
```

## Step 3: Update OrderService

Update `src/services/orderService.js` (or create if doesn't exist):

```javascript
import axios from 'axios';
import { getCSRFToken } from './csrfService.js';

const API_URL = import.meta.env.VITE_BACKEND_URL;

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export const orderService = {
  async createOrder(items, shippingAddress) {
    try {
      const token = await getAuthToken();
      const csrfToken = await getCSRFToken(); // NEW: Get CSRF token

      const response = await axios.post(
        `${API_URL}/api/orders`,
        { items, shippingAddress },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': csrfToken // NEW: Include CSRF token
          }
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getUserOrders() {
    try {
      const token = await getAuthToken();

      const response = await axios.get(
        `${API_URL}/api/orders`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default orderService;
```

## Step 4: Request CSRF Token on App Load

Update `src/App.jsx` or main component to request CSRF token on mount:

```javascript
import { useEffect } from 'react';
import { getCSRFToken } from './services/csrfService.js';

function App() {
  useEffect(() => {
    // Request CSRF token on app load
    getCSRFToken()
      .then(token => {
        console.log('CSRF token obtained');
        // Token is requested from server on each mutation
      })
      .catch(error => {
        console.error('Failed to get initial CSRF token:', error);
      });
  }, []);

  return (
    // Your app JSX
  );
}
```

## Step 5: Update Checkout Component

When user clicks "Pay" or "Confirm Order", ensure CSRF token is sent:

```javascript
async function handleCheckout() {
  try {
    const csrfToken = await getCSRFToken();

    const response = await axios.post(
      `${API_URL}/api/payments/create-session`,
      { orderId, paymentMethod },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken
        }
      }
    );

    // Process response...
  } catch (error) {
    // Handle error
  }
}
```

## Troubleshooting

### "Missing CSRF Token" Error
- Ensure `csrfService.js` is created
- Ensure backend endpoint `/api/csrf-token` is accessible
- Check browser console for errors

### "Invalid CSRF Token" Error
- Token may have expired (1 hour expiration)
- Request a new token before making request
- Check that token is sent in `X-CSRF-Token` header (not body)

### Still Getting 403 Errors
1. Verify CSRF token is being sent
2. Check backend logs for details
3. Ensure token is not empty string
4. Try in private/incognito window to rule out cache issues

## Security Notes

- CSRF tokens expire after 1 hour
- Tokens are one-time use (deleted after validation)
- New token must be requested for each mutation
- Tokens should NOT be stored in localStorage permanently
- Always request token fresh on page load

## Testing

Test CSRF protection with curl:

```bash
# Get CSRF token
curl http://localhost:3000/api/csrf-token
# Response: { "csrfToken": "abc123..." }

# Try POST without token (should fail)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": []}'
# Response: 403 Forbidden - CSRF token missing

# Try POST with token (should work)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123..." \
  -H "Authorization: Bearer token" \
  -d '{"items": []}'
# Response: 200 OK or validation error
```

---

**Last Updated**: February 1, 2026
