# Quick Start - Security Configuration

## 1. Install Backend Dependencies

```bash
cd backend
npm install
```

## 2. Create Environment File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

## 3. Configure Environment Variables

Edit `backend/.env` and set:

```env
# Backend
PORT=3000
NODE_ENV=development

# Supabase (get from Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Frontend
FRONTEND_URL=http://localhost:5173

# PayPal (sandbox for development)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your-sandbox-client-id
PAYPAL_CLIENT_SECRET=your-sandbox-client-secret
PAYPAL_WEBHOOK_ID=your-webhook-id

# Bank (placeholder for development)
BANK_ACCOUNT_NUMBER=1234567890
BANK_CODE=001
BANK_NAME=Example Bank

# Encryption - MUST be at least 32 characters
ENCRYPTION_KEY=your-secure-encryption-key-min-32-chars

# JWT
JWT_SECRET=your-jwt-secret-key
```

## 4. Start Backend Server

```bash
npm run dev
```

Expected output:
```
✅ Backend server running on port 3000
🔒 Security features enabled: Helmet, CORS, Rate Limiting, CSRF Protection, JWT Verification
```

## 5. Verify Backend is Running

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-02-01T..."
}
```

## 6. Test CSRF Token Endpoint

```bash
curl http://localhost:3000/api/csrf-token
```

Expected response:
```json
{
  "csrfToken": "a1b2c3d4..."
}
```

## 7. Update Frontend Environment

Edit `.env` in root directory:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 8. Implement CSRF in Frontend

Follow instructions in `CSRF_IMPLEMENTATION.md`:
1. Create `src/services/csrfService.js`
2. Update `src/services/paymentService.js`
3. Update order creation endpoints

## 9. Test Security Features

### Test JWT Verification
```bash
# Without token (should fail with 401)
curl http://localhost:3000/api/orders \
  -H "Content-Type: application/json"

# With invalid token (should fail with 401)
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer invalid-token"
```

### Test CSRF Protection
```bash
# Get token
CSRF_TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r .csrfToken)

# Without CSRF token (should fail with 403)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": []}'

# With CSRF token (should fail with 401 - needs JWT, but CSRF validation passes)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"items": []}'
```

### Test Rate Limiting
```bash
# Make 101 requests (101st should fail with 429)
for i in {1..101}; do
  echo "Request $i"
  curl -s http://localhost:3000/health | head -1
done
```

## 10. Verify Security Headers

```bash
curl -I http://localhost:3000/health
```

Expected headers:
```
X-DNS-Prefetch-Control: off
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Download-Options: noopen
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
```

## 11. Production Deployment

When ready for production:
1. Follow **DEPLOYMENT.md**
2. Set `NODE_ENV=production` in .env
3. Set `PAYPAL_MODE=live`
4. Use production PayPal credentials
5. Configure HTTPS/SSL
6. Set strong `ENCRYPTION_KEY` (32+ chars)
7. Review rate limiting thresholds

## Troubleshooting

### Backend won't start
- Check `.env` file exists in `backend/` directory
- Verify all required variables are set
- Check port 3000 is not already in use

### CSRF token errors
- Verify backend is running
- Check `FRONTEND_URL` matches your frontend URL
- Try requesting new token

### JWT verification errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check user is logged in (has valid session)
- Verify token is being sent in `Authorization: Bearer <token>` header

### Rate limiting too strict
- Adjust thresholds in `backend/middleware/rateLimiter.js`
- For development, increase limits temporarily

## Security Checklist

Before production:
- [ ] All environment variables set
- [ ] ENCRYPTION_KEY is strong (32+ characters)
- [ ] HTTPS enabled
- [ ] CORS restricted to production domain
- [ ] PayPal webhook registered
- [ ] Rate limiting tested
- [ ] Audit logging configured
- [ ] Database RLS enabled
- [ ] Backups configured

---

**Need Help?**
- **Security**: Read `SECURITY.md`
- **Deployment**: Read `DEPLOYMENT.md`
- **CSRF Frontend**: Read `CSRF_IMPLEMENTATION.md`
- **Security Summary**: Read `SECURITY_SUMMARY.md`

---

**Last Updated**: February 1, 2026
