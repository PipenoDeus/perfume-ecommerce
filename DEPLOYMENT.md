# Deployment Guide

## Pre-Deployment Security Checklist

Before deploying to production, complete this checklist:

### 1. Environment Secrets
- [ ] Create `.env` file with all required variables (see `.env.example`)
- [ ] Never commit `.env` file to version control
- [ ] Use a secrets manager for production (AWS Secrets Manager, Heroku Config Vars, etc.)
- [ ] Verify `ENCRYPTION_KEY` is at least 32 characters
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is secure and never exposed

### 2. Frontend Configuration
- [ ] Update `VITE_BACKEND_URL` to production backend URL
- [ ] Update `VITE_SUPABASE_URL` to production Supabase instance
- [ ] Ensure `FRONTEND_URL` matches production domain

### 3. Backend Configuration
- [ ] Set `FRONTEND_URL` to production domain (CORS restriction)
- [ ] Set `PAYPAL_MODE=live` (not sandbox)
- [ ] Configure `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` for production
- [ ] Configure `PAYPAL_WEBHOOK_ID` for production webhooks
- [ ] Set `NODE_ENV=production`

### 4. Database Security
- [ ] Enable RLS on all tables
- [ ] Review RLS policies (see SECURITY.md)
- [ ] Enable backups in Supabase dashboard
- [ ] Set backup frequency (daily recommended)
- [ ] Test backup restoration process

### 5. PayPal Setup
- [ ] Create PayPal business account
- [ ] Generate API credentials for production
- [ ] Register webhook endpoint: `https://your-domain.com/api/payments/paypal-webhook`
- [ ] Configure webhook events: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED
- [ ] Test webhook with PayPal webhook tester

### 6. Encryption Keys
- [ ] Generate strong `ENCRYPTION_KEY` (at least 32 characters)
- [ ] Store in production secrets manager (never in code)
- [ ] Document key rotation procedure
- [ ] Test encryption/decryption with production key

### 7. SSL/TLS
- [ ] Obtain SSL certificate (Let's Encrypt, AWS ACM, etc.)
- [ ] Configure HTTPS on all endpoints
- [ ] Enable HSTS headers (done via Helmet)
- [ ] Test SSL configuration with SSL Labs

### 8. Monitoring & Logging
- [ ] Configure centralized logging (Datadog, Splunk, ELK, etc.)
- [ ] Set up alerts for security events
- [ ] Configure audit logging to persistent storage
- [ ] Set up performance monitoring

### 9. Rate Limiting
- [ ] Review rate limiting thresholds
- [ ] Adjust based on expected traffic
- [ ] Monitor for legitimate users hitting limits

### 10. Testing
- [ ] Run full test suite
- [ ] Test payment flow (use PayPal sandbox first)
- [ ] Test CSRF token protection
- [ ] Test rate limiting
- [ ] Test with production Supabase instance
- [ ] Security scan with OWASP ZAP or Burp Suite

---

## Deployment Steps

### Option 1: Heroku Deployment

1. Install Heroku CLI
   ```bash
   npm install -g heroku
   ```

2. Login to Heroku
   ```bash
   heroku login
   ```

3. Create Heroku app
   ```bash
   heroku create your-app-name
   ```

4. Set environment variables
   ```bash
   heroku config:set SUPABASE_URL=your_url
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_key
   heroku config:set FRONTEND_URL=https://your-frontend.com
   heroku config:set ENCRYPTION_KEY=your_encryption_key
   heroku config:set PAYPAL_CLIENT_ID=your_paypal_id
   heroku config:set PAYPAL_CLIENT_SECRET=your_paypal_secret
   heroku config:set PAYPAL_WEBHOOK_ID=your_webhook_id
   ```

5. Deploy
   ```bash
   git push heroku main
   ```

6. View logs
   ```bash
   heroku logs --tail
   ```

### Option 2: AWS EC2 Deployment

1. Launch EC2 instance (Ubuntu 20.04 LTS)

2. Install Node.js
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Install PM2 (process manager)
   ```bash
   sudo npm install -g pm2
   ```

4. Clone repository
   ```bash
   git clone your-repo-url
   cd project
   npm install
   ```

5. Create .env file with secrets
   ```bash
   nano .env
   ```

6. Start with PM2
   ```bash
   pm2 start backend/server.js --name perfume-api
   pm2 save
   pm2 startup
   ```

7. Configure nginx as reverse proxy
   ```bash
   sudo apt-get install nginx
   # Configure nginx to proxy to localhost:3000
   ```

8. Configure SSL with Certbot
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d your-domain.com
   ```

### Option 3: Railway or Render Deployment

1. Push code to GitHub

2. Connect GitHub repository to Railway/Render

3. Add environment variables in dashboard

4. Auto-deploy on push to main branch

---

## Post-Deployment

### 1. Verify Deployment
```bash
curl https://your-domain.com/health
# Should return: { "status": "OK", "timestamp": "..." }
```

### 2. Test Payment Flow
- [ ] Create test order in frontend
- [ ] Attempt PayPal payment
- [ ] Confirm bank payment via admin panel
- [ ] Verify order status updated to "paid"

### 3. Monitor Logs
```bash
# View backend logs
heroku logs --tail
# or
pm2 logs perfume-api
```

### 4. Configure Backups
- [ ] Enable daily Supabase backups
- [ ] Test backup restoration
- [ ] Document recovery procedure

### 5. Security Hardening Post-Deploy
- [ ] Run OWASP ZAP security scan
- [ ] Review firewall rules (allow only necessary ports)
- [ ] Enable DDoS protection if available
- [ ] Configure Web Application Firewall (WAF)

---

## Performance Optimization

### Frontend
```bash
# Build production bundle
npm run build

# Analyze bundle size
npm run build --report
```

### Backend
- Use Redis for CSRF tokens (instead of in-memory Map)
- Use Redis for rate limiting (instead of express-rate-limit memory)
- Configure connection pooling for database
- Enable gzip compression on responses

### Database
- Add indexes on frequently queried columns
- Archive old orders (move to separate table after 1 year)
- Regular vacuum/analyze on PostgreSQL

---

## Rollback Procedure

### If Something Goes Wrong

1. **Frontend Rollback** (Vercel/Netlify)
   ```
   Go to dashboard → Deployments → Select previous version → Promote to production
   ```

2. **Backend Rollback** (Heroku)
   ```bash
   heroku releases
   heroku rollback v#
   ```

3. **Backend Rollback** (AWS EC2)
   ```bash
   git checkout previous-commit
   npm install
   pm2 restart perfume-api
   ```

4. **Database Rollback**
   - Restore from most recent backup
   - Verify in staging first
   - Notify users of data loss (if applicable)

---

## Ongoing Maintenance

### Weekly
- Review error logs for patterns
- Check rate limiting metrics
- Verify all services running

### Monthly
- Update dependencies: `npm update`
- Review security advisories: `npm audit`
- Review audit logs for suspicious activity
- Test disaster recovery procedures

### Quarterly
- Full security audit
- Performance analysis and optimization
- Load testing for capacity planning
- Update security checklist

### Annually
- Major dependency updates
- Security pentest by external firm
- Architecture review and scaling planning

---

## Support

For deployment issues:
1. Check error logs first
2. Review this deployment guide
3. Check SECURITY.md for security concerns
4. Contact development team with:
   - Error message
   - Steps to reproduce
   - Environment details (Heroku/AWS/other)
   - Recent changes

---

**Last Updated**: February 1, 2026
