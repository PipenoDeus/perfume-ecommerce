# Security Implementation Guide

## Overview
This document outlines all security measures implemented in the Perfume E-Commerce application.

---

## 1. Authentication & Authorization ✅

### JWT Verification
- **Location**: `backend/middleware/auth.js`
- **Implementation**: Uses `supabase.auth.getUser(token)` to verify JWT signature and expiration
- **Protection Against**: Token tampering, expired tokens, invalid tokens
- **Status**: ✅ IMPLEMENTED

```javascript
// JWT is verified with:
// 1. Supabase signature verification
// 2. Token expiration check (exp * 1000 < Date.now())
// 3. Subject (sub) validation
```

### Role-Based Access Control (RBAC)
- **Roles**: `cliente`, `admin`, `dueño`
- **Implementation**: 
  - Database roles stored in `public.users` table
  - RLS (Row Level Security) policies enforce restrictions
  - Backend middleware checks role in `req.user.role`
- **Protected Routes**:
  - Admin-only: `/api/payments/confirm-bank`
  - User-owned: `/api/orders/:orderId`
- **Status**: ✅ IMPLEMENTED

### Session Management
- **Frontend**: Supabase `onAuthStateChange` listener
- **Logout**: Clears session immediately, then calls `supabase.auth.signOut()`
- **Auto-login Prevention**: No auto-login after signup; user must login manually
- **Status**: ✅ IMPLEMENTED

---

## 2. Cross-Site Request Forgery (CSRF) Protection ✅

### CSRF Token System
- **Location**: `backend/middleware/csrf.js`
- **Implementation**:
  - Generates 32-byte random tokens using `crypto.randomBytes()`
  - Tokens expire after 1 hour
  - Tokens stored in Map (TODO: Redis for production)
  - One-time use: token deleted after validation
- **Token Usage**:
  - GET `/api/csrf-token` to request new token
  - Send via `X-CSRF-Token` header or `csrfToken` body field
  - Required for POST/PUT/DELETE operations
- **Status**: ✅ IMPLEMENTED

### Frontend Integration
- Frontend must:
  1. Call `GET /api/csrf-token` on load
  2. Include token in `X-CSRF-Token` header for mutations
- **Status**: ⏳ NEEDS FRONTEND UPDATE

---

## 3. Payment Security ✅

### PayPal Webhook Validation
- **Location**: `backend/services/paymentValidator.js`
- **Implementation**:
  - Verifies webhook signature using PayPal cert URL + RSA verification
  - Validates webhook event type
  - Validates payment amount (±$0.01 tolerance)
  - Validates payment status against whitelist
- **Protected Against**: Forged payment notifications, tampering
- **Status**: ✅ IMPLEMENTED & INTEGRATED

### Amount Validation
- **Check**: Ensures payment matches order total exactly
- **Tolerance**: ±$0.01 (handles currency rounding)
- **Status**: ✅ IMPLEMENTED

### Double-Payment Prevention
- **Check**: Rejects payments for orders already marked as paid
- **Implementation**: `if (order.status === 'paid') return 400`
- **Status**: ✅ IMPLEMENTED

### Bank Transfer Security
- **Encrypted Details**: Bank account numbers encrypted with AES-256-GCM
- **Limited Exposure**: Only displayed to admin when confirming payment
- **Audit Trail**: All bank confirmations logged with admin ID
- **Status**: ✅ IMPLEMENTED

---

## 4. Encryption ✅

### Data Encryption Service
- **Location**: `backend/services/encryptionService.js`
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: `crypto.scryptSync()` with salt
- **Auth Tag**: Prevents tampering (16 bytes)
- **IV**: Random per encryption (16 bytes)

### Encrypted Fields
- Bank account numbers (in payment responses)
- Bank codes
- Transaction IDs (optional)

### Usage
```javascript
import { encryptData, decryptData } from '../services/encryptionService.js';

const encrypted = encryptData('sensitive-data');  // Returns: iv:authTag:encrypted
const decrypted = decryptData(encrypted);         // Returns: sensitive-data
```

### Requirements
- Set `ENCRYPTION_KEY` in `.env` (minimum 32 characters)
- Key must be the same across all server instances (store in secrets manager)
- Status**: ✅ IMPLEMENTED

---

## 5. Rate Limiting ✅

### Global Rate Limiter
- **Limit**: 100 requests per 15 minutes per IP
- **Applied To**: All endpoints except health check
- **Status**: ✅ IMPLEMENTED

### Authentication Rate Limiter
- **Limit**: 5 failed attempts per 15 minutes per IP
- **Applied To**: Login endpoints (when added)
- **skipSuccessfulRequests**: Only counts failed attempts
- **Status**: ✅ IMPLEMENTED

### Payment Rate Limiter
- **Limit**: 10 payment requests per hour per user
- **Uses**: User ID if authenticated, falls back to IP
- **Protected Against**: Brute force attacks, resource exhaustion
- **Status**: ✅ IMPLEMENTED

### Order Rate Limiter
- **Limit**: 20 orders per hour per user
- **Uses**: User ID if authenticated, falls back to IP
- **Status**: ✅ IMPLEMENTED

---

## 6. Security Headers ✅

### Helmet.js Configuration
- **Strict-Transport-Security**: 1 year, includeSubDomains, preload
- **Content-Security-Policy**: Restricts script sources, allows PayPal API
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-XSS-Protection**: Enabled
- **Status**: ✅ IMPLEMENTED

---

## 7. Input Validation ✅

### Order Creation
- Validates order items: id, price, quantity (must be positive)
- Validates shipping address: city, address fields required
- Rejects large payloads: 10KB limit via `express.json({ limit: '10kb' })`
- Status**: ✅ IMPLEMENTED

### Payment Processing
- Validates orderId, paymentMethod, transactionId
- Rejects invalid transaction ID format: `/^[A-Z0-9]{10,}$/`
- Validates payment amount matches order
- Status**: ✅ IMPLEMENTED

---

## 8. Audit Logging ✅

### AuditLogger Service
- **Location**: `backend/services/auditLogger.js`
- **Events Tracked**:
  - Payment events: PAYMENT_CREATED, PAYMENT_COMPLETED, PAYMENT_FAILED, AMOUNT_MISMATCH
  - Security events: INVALID_SIGNATURE, UNAUTHORIZED_ACCESS, RATE_LIMIT_EXCEEDED
  - Auth events: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
  - Admin actions: PAYMENT_CONFIRMED, ORDER_CANCELLED, USER_BANNED

### Log Format
```javascript
{
  timestamp: ISO8601,
  type: 'PAYMENT|SECURITY|AUTH|ADMIN',
  event: 'EVENT_NAME',
  userId: 'user-id',
  orderId: 'order-id',
  ipAddress: 'IP',
  userAgent: 'User-Agent',
  severity: 'INFO|WARNING|CRITICAL',
  metadata: {}
}
```

### Logging Destinations
- **Development**: Console output
- **Production**: TODO - Configure centralized logging (Datadog, ELK, Splunk)
- **Status**: ✅ IMPLEMENTED (console), ⏳ TODO (production integration)

---

## 9. CORS & Allowed Origins ✅

### Configuration
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,        // Only specified frontend allowed
  credentials: true,                        // Allow cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Only necessary methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

### Security Implications
- Frontend URL must match exactly (or list of URLs)
- Prevents requests from unknown origins
- Credentials (JWT) only sent to allowed origins
- Status**: ✅ IMPLEMENTED

---

## 10. Environment Secrets ✅

### Required Variables (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=          # PRIVATE - Never expose
SUPABASE_ANON_KEY=                  # PRIVATE - Frontend only (limited RLS)
FRONTEND_URL=                       # CORS origin
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=               # PRIVATE
PAYPAL_WEBHOOK_ID=
ENCRYPTION_KEY=                     # PRIVATE - 32+ chars
BANK_ACCOUNT_NUMBER=                # PRIVATE
BANK_CODE=                          # PRIVATE
BANK_NAME=
```

### Best Practices
- ✅ `.env` file in `.gitignore`
- ✅ Service role key NEVER in frontend
- ✅ Anon key limited by RLS policies
- ✅ Use secrets manager in production (AWS Secrets Manager, HashiCorp Vault)
- **Status**: ✅ IMPLEMENTED

---

## 11. Database Security (RLS) ✅

### Row Level Security Policies

#### public.users table
```sql
-- SELECT: Users can see public profile data (not passwords)
-- INSERT/UPDATE/DELETE: Only admin/dueño can manage roles
```

#### perfumes table
```sql
-- SELECT: Anyone can see products
-- INSERT/UPDATE/DELETE: Only admin/dueño can manage
```

#### orders table
```sql
-- SELECT: Users see own orders, admin/dueño see all
-- INSERT: Users create own orders
-- UPDATE: Admin/dueño can change status
```

### Protection Against
- Unauthorized data access
- Data modification by non-owners
- Role escalation attacks
- **Status**: ✅ IMPLEMENTED

---

## 12. Deployment Checklist

Before going to production, ensure:

- [ ] ENCRYPTION_KEY set in production secrets (32+ chars)
- [ ] PAYPAL credentials configured (production vs sandbox)
- [ ] PAYPAL_WEBHOOK_ID configured
- [ ] FRONTEND_URL points to production domain
- [ ] SUPABASE_SERVICE_ROLE_KEY secure (never committed)
- [ ] All `.env` variables set in production environment
- [ ] CORS origin restricted to production domain only
- [ ] Rate limiting thresholds reviewed and adjusted
- [ ] Audit logging configured to centralized service
- [ ] HTTPS/SSL enforced (Helmet HSTS enabled)
- [ ] Database backups automated
- [ ] Monitoring and alerting configured
- [ ] Regular security audits scheduled

---

## 13. Security Vulnerabilities Fixed

### Critical (Fixed)
1. ✅ JWT Verification: Now validates signature + expiration
2. ✅ CSRF Protection: Added token generation and validation
3. ✅ PayPal Webhook Validation: Verifies signature and amount
4. ✅ Encryption: AES-256-GCM for sensitive data
5. ✅ Rate Limiting: Prevents brute force and resource exhaustion

### High Priority (TODO)
- [ ] Configure centralized audit logging for production
- [ ] Implement request size limits (10KB done, review others)
- [ ] Add security questions/2FA (optional)
- [ ] SQL injection prevention (parameterized queries in orderService)
- [ ] XSS prevention (validate frontend input)

### Medium Priority
- [ ] Add IP whitelisting for admin endpoints
- [ ] Implement API versioning for breaking changes
- [ ] Add request signing for sensitive operations
- [ ] Implement circuit breaker for PayPal API

---

## 14. Security Best Practices for Developers

### When Adding New Endpoints
1. Add `authenticateUser` middleware if user-specific
2. Check role if admin-only: `if (req.user.role !== 'admin')`
3. Validate all inputs before processing
4. Add audit logging for sensitive operations
5. Apply appropriate rate limiter
6. Test CSRF token validation
7. Document authorization requirements

### When Handling Sensitive Data
1. Never log passwords, tokens, account numbers
2. Encrypt data before sending to client
3. Use HTTPS only (enforced in production)
4. Never expose internal IDs unnecessarily
5. Sanitize error messages (no implementation details)

### Code Review Checklist
- [ ] No hardcoded secrets
- [ ] Authentication on all protected routes
- [ ] Authorization checks before data access
- [ ] Input validation on all user inputs
- [ ] Audit logging for sensitive operations
- [ ] No SQL injection vulnerabilities
- [ ] CSRF token present for mutations
- [ ] Rate limiting applied

---

## 15. Monitoring & Incident Response

### Alerts to Configure
- Repeated 401 errors (unauthorized)
- Repeated 403 errors (forbidden)
- High rate limiting triggers
- Invalid payment signatures
- Failed PayPal webhook validations
- Double-payment attempts
- Unusual order patterns

### Incident Response
1. Check audit logs immediately
2. Disable affected user if malicious activity
3. Review CORS/rate limiting settings
4. Check PayPal for disputes
5. Notify affected customers if data breach

---

## Contact Security Issues

If you discover a security vulnerability, please email security@example.com with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Your contact information

Do NOT publicly disclose the vulnerability before we have a chance to patch.

---

**Last Updated**: February 1, 2026
**Status**: All critical fixes implemented ✅
