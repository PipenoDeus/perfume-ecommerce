# Backend API - Perfume E-Commerce

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Create `.env` file:**
```env
PORT=3000
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

BANK_ACCOUNT_NUMBER=your_bank_account
BANK_CODE=your_bank_code
```

3. **Create `orders` table in Supabase:**
```sql
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL,
  shipping_address jsonb NOT NULL,
  total numeric NOT NULL,
  status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  transaction_id varchar,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only owner/admin can update orders
CREATE POLICY "Owner/Admin can update orders" ON public.orders
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dueño'))
  );
```

4. **Run development server:**
```bash
npm run dev
```

## API Endpoints

### Orders
- `POST /api/orders` - Create order (requires auth)
- `GET /api/orders` - Get user's orders (requires auth)
- `GET /api/orders/:orderId` - Get order details (requires auth)

### Payments
- `POST /api/payments/create-session` - Create payment session (requires auth)
- `POST /api/payments/paypal-callback` - PayPal webhook callback
- `POST /api/payments/confirm-bank` - Confirm bank payment (admin only)

## Example Request

```javascript
// Create order
const response = await fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    items: [
      { id: '1', name: 'Perfume X', price: 50000, quantity: 1 }
    ],
    shippingAddress: {
      address: 'Calle Principal 123',
      city: 'Santiago',
      postal_code: '8300000'
    }
  })
});

const order = await response.json();
console.log(order);
```

## Security Notes

✅ **Implemented:**
- JWT authentication via Supabase
- RLS policies on orders table
- Server-side validation
- Service role key hidden in .env
- CORS restricted to frontend URL

⚠️ **TODO:**
- Implement real PayPal integration
- Implement bank API integration
- Add rate limiting
- Add request logging/audit trail
- Add email notifications
