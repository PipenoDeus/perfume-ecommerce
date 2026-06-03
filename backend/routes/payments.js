import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { authenticateUser } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import {
  getOrder,
  updateOrderStatus
} from '../services/orderService.js';
import {
  verifyPayPalSignature,
  validatePaymentAmount,
  isValidPaymentStatus
} from '../services/paymentValidator.js';
import { encryptData } from '../services/encryptionService.js';
import AuditLogger from '../services/auditLogger.js';

const router = express.Router();

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api.paypal.com'
  : 'https://api.sandbox.paypal.com';

const flowEnv = String(process.env.FLOW_ENV || 'sandbox').trim().toLowerCase();
const FLOW_API_BASE = flowEnv === 'production'
  ? 'https://www.flow.cl/api'
  : 'https://sandbox.flow.cl/api';

const getFrontendBaseUrl = () => {
  const raw = process.env.FRONTEND_URL;
  if (!raw) {
    throw new Error('FRONTEND_URL environment variable is required');
  }
  return raw.split(',')[0].trim();
};

const buildFlowSignature = (params, secretKey) => {
  const data = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && key !== 's')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('hex');
};

const flowRequest = async (endpoint, params = {}, method = 'POST') => {
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  const looksLikePlaceholder = (value) => /^TU_FLOW_/i.test(String(value || '').trim());

  if (!apiKey || !secretKey) {
    throw new Error('Flow credentials are missing');
  }

  if (looksLikePlaceholder(apiKey) || looksLikePlaceholder(secretKey)) {
    throw new Error('Flow credentials are placeholders. Reemplaza FLOW_API_KEY y FLOW_SECRET_KEY por credenciales reales.');
  }

  const baseParams = {
    apiKey,
    ...params,
  };

  const signature = buildFlowSignature(baseParams, secretKey);
  const signedParams = {
    ...baseParams,
    s: signature,
  };

  if (method === 'GET') {
    const query = new URLSearchParams(signedParams).toString();
    try {
      const response = await axios.get(`${FLOW_API_BASE}${endpoint}?${query}`);
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      const payload = error?.response?.data;
      const details = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
      throw new Error(`Flow API GET ${endpoint} failed (${status || 'no-status'}): ${details}`);
    }
  }

  const body = new URLSearchParams(signedParams).toString();
  try {
    const response = await axios.post(`${FLOW_API_BASE}${endpoint}`, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const payload = error?.response?.data;
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    throw new Error(`Flow API POST ${endpoint} failed (${status || 'no-status'}): ${details}`);
  }
};

const createFlowPayment = async (order, reqUserEmail = '') => {
  const amount = Math.round(Number(order.total || 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Monto inválido para Flow');
  }

  const payerEmail = String(reqUserEmail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
    throw new Error('Flow requiere un email válido en la cuenta del usuario para continuar con el pago.');
  }

  if (!process.env.BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is required');
  }
  const backendBaseUrl = process.env.BACKEND_URL;

  const frontendBaseUrl = getFrontendBaseUrl();

  const urlConfirmation = `${backendBaseUrl}/api/payments/flow/confirmation`;
  const urlReturn =`${backendBaseUrl}/api/payments/flow/return?orderId=${encodeURIComponent(order.id)}`;

  console.log('[FLOW DEBUG]', {
    backendBaseUrl,
    frontendBaseUrl,
    urlConfirmation,
    urlReturn,
  });

  const flowPayload = {
    commerceOrder: String(order.id),
    subject: `Pedido ${order.id}`,
    currency: 'CLP',
    amount,
    email: payerEmail,
    urlConfirmation,
    urlReturn,
  };
  console.log('[FLOW PAYLOAD ENVIADO]', flowPayload);
  const response = await flowRequest('/payment/create', flowPayload);

  return {
    token: response?.token,
    url: response?.url,
    flowOrder: response?.flowOrder,
  };
};

const getFlowPaymentStatus = async (token) => {
  if (!token) {
    throw new Error('Flow token is required');
  }

  return flowRequest('/payment/getStatus', { token }, 'GET');
};

const getPayPalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are missing');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, body, {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data.access_token;
};

const createPayPalOrder = async (order) => {
  const token = await getPayPalAccessToken();
  const baseUrl = getFrontendBaseUrl();

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: Number(order.total || 0).toFixed(2)
        },
        custom_id: order.id,
        invoice_id: order.id,
        description: `Order ${order.id}`
      }
    ],
    application_context: {
      return_url: `${baseUrl}/payment-success?provider=paypal&orderId=${encodeURIComponent(order.id)}`,
      cancel_url: `${baseUrl}/cart?provider=paypal&status=cancelled&orderId=${encodeURIComponent(order.id)}`
    }
  };

  const response = await axios.post(`${PAYPAL_API}/v2/checkout/orders`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const approveLink = response.data?.links?.find((link) => link.rel === 'approve')?.href;
  return { id: response.data?.id, approveLink };
};

const capturePayPalOrder = async (paypalOrderId) => {
  const token = await getPayPalAccessToken();

  const response = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

// Create payment session
router.post('/create-session', authenticateUser, paymentLimiter, async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    console.log('[payments] create-session', {
      userId: req.user?.id,
      orderId,
      paymentMethod,
      ip: req.ip,
    });

    if (!orderId || !paymentMethod) {
      AuditLogger.logSecurityEvent('INVALID_PAYMENT_REQUEST', {
        userId: req.user.id,
        ipAddress: req.ip,
        severity: 'WARNING',
        details: 'Missing orderId or paymentMethod'
      });
      return res.status(400).json({ error: 'Missing orderId or paymentMethod' });
    }

    const order = await getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify user owns this order
    if (order.user_id !== req.user.id) {
      AuditLogger.logSecurityEvent('UNAUTHORIZED_PAYMENT_ACCESS', {
        userId: req.user.id,
        orderId: orderId,
        ipAddress: req.ip,
        severity: 'CRITICAL',
        details: 'User tried to access payment for order they do not own'
      });
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order already processed' });
    }

    AuditLogger.logPayment('PAYMENT_SESSION_CREATED', {
      userId: req.user.id,
      orderId: orderId,
      amount: order.total,
      method: paymentMethod,
      status: 'pending',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (paymentMethod === 'paypal') {
      const paypalOrder = await createPayPalOrder(order);

      if (!paypalOrder.id || !paypalOrder.approveLink) {
        throw new Error('Failed to create PayPal order');
      }

      return res.json({
        sessionId: paypalOrder.id,
        orderId: orderId,
        approvalUrl: paypalOrder.approveLink
      });
    } else if (paymentMethod === 'flow') {
      const flowSession = await createFlowPayment(order, req.user?.email);

      if (!flowSession?.token || !flowSession?.url) {
        throw new Error('Failed to create Flow payment');
      }

      const approvalUrl = `${flowSession.url}${flowSession.url.includes('?') ? '&' : '?'}token=${encodeURIComponent(flowSession.token)}`;

      return res.json({
        sessionId: flowSession.token,
        orderId,
        approvalUrl,
      });
    } else if (paymentMethod === 'bank') {
      // Return reference only, encrypt sensitive bank details if needed
      const bankDetails = {
        accountNumber: process.env.BANK_ACCOUNT_NUMBER,
        bankCode: process.env.BANK_CODE,
        bankName: process.env.BANK_NAME
      };

      // Encrypt sensitive data
      const encryptedDetails = {
        accountNumber: encryptData(bankDetails.accountNumber),
        bankCode: encryptData(bankDetails.bankCode)
      };

      return res.json({
        sessionId: `bank_${orderId}_${Date.now()}`,
        orderId: orderId,
        reference: orderId,
        bankName: bankDetails.bankName, // Safe to send
        encryptedDetails: encryptedDetails, // Only admin can decrypt
        message: 'Use encrypted details to complete bank transfer'
      });
    }

    return res.status(400).json({ error: 'Invalid payment method' });
  } catch (error) {
    AuditLogger.logSecurityEvent('PAYMENT_SESSION_ERROR', {
      userId: req.user?.id,
      ipAddress: req.ip,
      severity: 'WARNING',
      details: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

router.post('/flow/confirmation', async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token;
    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    const flowResult = await getFlowPaymentStatus(token);
    const orderId = String(flowResult?.commerceOrder || '');

    if (!orderId || !isUuid(orderId)) {
      return res.status(400).json({ error: 'Invalid commerce order' });
    }

    const order = await getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const paid = Number(flowResult?.status) === 2;
    if (paid && order.status !== 'paid') {
      const transactionId = String(flowResult?.flowOrder || token);
      await updateOrderStatus(orderId, 'paid', transactionId, {
        provider: 'flow',
        paymentResponse: flowResult,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[flow/confirmation] error:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Flow confirmation failed' });
  }
});

router.all('/flow/return', async (req, res) => {
  try {
    const frontendBaseUrl = getFrontendBaseUrl();
    const token = String(req.body?.token || req.query?.token || '').trim();
    let orderId = String(req.body?.orderId || req.query?.orderId || '').trim();
    let status = String(req.body?.status || req.query?.status || '').trim().toLowerCase();

    if (token) {
      try {
        const flowResult = await getFlowPaymentStatus(token);
        orderId = orderId || String(flowResult?.commerceOrder || '').trim();

        const flowStatus = Number(flowResult?.status || 0);
        if (!status) {
          if (flowStatus === 2) {
            status = 'paid';
          } else if (flowStatus === 3 || flowStatus === 4) {
            status = 'failed';
          } else {
            status = 'pending';
          }
        }
      } catch (error) {
        console.error('[flow/return] status lookup error:', error?.message || error);
      }
    }

    const redirectParams = new URLSearchParams({ provider: 'flow' });

    if (orderId) {
      redirectParams.set('orderId', orderId);
    }

    if (token) {
      redirectParams.set('token', token);
    }

    if (status) {
      redirectParams.set('status', status);
    }

    return res.redirect(`${frontendBaseUrl}/payment-success?${redirectParams.toString()}`);
  } catch (error) {
    console.error('[flow/return] error:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Flow return redirect failed' });
  }
});

router.post('/flow/confirm', authenticateUser, paymentLimiter, async (req, res) => {
  try {
    const { token, orderId } = req.body;

    if (!token || !orderId) {
      return res.status(400).json({ error: 'Missing token or orderId' });
    }

    const order = await getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (order.status === 'paid') {
      const storedTransactionId =
        order.webpay_response?.transactionId ||
        order.webpay_response?.flowOrder ||
        order.webpay_buy_order ||
        token;
      return res.json({ status: 'paid', orderId, transactionId: storedTransactionId });
    }

    const flowResult = await getFlowPaymentStatus(token);
    const commerceOrder = String(flowResult?.commerceOrder || '');

    if (commerceOrder !== String(orderId)) {
      return res.status(400).json({ error: 'Flow commerceOrder does not match orderId' });
    }

    const paymentAmount = Number(flowResult?.amount || 0);
    if (!validatePaymentAmount(order.total, paymentAmount)) {
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    const flowStatus = Number(flowResult?.status || 0);
    const transactionId = String(flowResult?.flowOrder || token);

    if (flowStatus === 2) {
      await updateOrderStatus(orderId, 'paid', transactionId, {
        provider: 'flow',
        paymentResponse: flowResult,
      });
      return res.json({ status: 'paid', orderId, transactionId });
    }

    if (flowStatus === 3 || flowStatus === 4) {
      await updateOrderStatus(orderId, 'failed', transactionId, {
        provider: 'flow',
        paymentResponse: flowResult,
      });
      return res.json({ status: 'failed', orderId, transactionId });
    }

    return res.json({ status: 'pending', orderId, transactionId });
  } catch (error) {
    console.error('[flow/confirm] error:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Flow confirm failed' });
  }
});

// PayPal webhook callback - SECURELY validate
router.post('/paypal-webhook', async (req, res) => {
  try {
    const webhookEvent = req.body;
    const headers = req.headers;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    // 1. Verify PayPal signature
    const isSignatureValid = await verifyPayPalSignature(webhookEvent, webhookId, headers);
    if (!isSignatureValid) {
      AuditLogger.logSecurityEvent('INVALID_PAYPAL_SIGNATURE', {
        ipAddress: req.ip,
        severity: 'CRITICAL',
        details: 'PayPal webhook signature verification failed'
      });
      return res.status(403).json({ error: 'Invalid PayPal signature' });
    }

    // 2. Validate event type
    const eventType = webhookEvent.event_type;
    if (!['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED'].includes(eventType)) {
      AuditLogger.logSecurityEvent('UNSUPPORTED_WEBHOOK_EVENT', {
        ipAddress: req.ip,
        severity: 'WARNING',
        details: `Unsupported event type: ${eventType}`
      });
      return res.status(400).json({ error: 'Unsupported event type' });
    }

    // 3. Extract order ID and validate
    const orderId =
      webhookEvent.resource?.purchase_units?.[0]?.custom_id ||
      webhookEvent.resource?.id ||
      webhookEvent.resource?.supplementary_data?.related_ids?.order_id;
    if (!orderId) {
      AuditLogger.logSecurityEvent('WEBHOOK_MISSING_ORDER_ID', {
        ipAddress: req.ip,
        severity: 'WARNING',
        details: 'Webhook event missing order ID'
      });
      return res.status(400).json({ error: 'Missing order ID' });
    }

    const order = await getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 4. Validate payment amount
    const paymentAmount = parseFloat(webhookEvent.resource?.amount?.value || 0);
    if (!validatePaymentAmount(order.total, paymentAmount)) {
      AuditLogger.logPayment('PAYMENT_AMOUNT_MISMATCH', {
        userId: order.user_id,
        orderId: orderId,
        amount: order.total,
        paymentAmount: paymentAmount,
        method: 'paypal',
        status: 'rejected',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { reason: 'Amount mismatch' }
      });
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    // 5. Validate payment status
    const paymentStatus = webhookEvent.resource?.status;
    if (!isValidPaymentStatus(paymentStatus)) {
      AuditLogger.logSecurityEvent('INVALID_PAYMENT_STATUS', {
        ipAddress: req.ip,
        severity: 'WARNING',
        details: `Invalid payment status: ${paymentStatus}`
      });
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    // 6. Update order
    const transactionId = webhookEvent.id;
    await updateOrderStatus(orderId, 'paid', transactionId, {
      provider: 'paypal',
      paymentResponse: webhookEvent,
    });

    AuditLogger.logPayment('PAYMENT_COMPLETED', {
      userId: order.user_id,
      orderId: orderId,
      amount: paymentAmount,
      method: 'paypal',
      status: 'completed',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { transactionId: transactionId }
    });

    res.json({ status: 'success', message: 'Payment verified' });
  } catch (error) {
    AuditLogger.logSecurityEvent('PAYPAL_WEBHOOK_ERROR', {
      ipAddress: req.ip,
      severity: 'WARNING',
      details: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// PayPal capture after return_url
router.post('/capture', authenticateUser, paymentLimiter, async (req, res) => {
  try {
    const { paypalOrderId, orderId: providedOrderId } = req.body;

    if (!paypalOrderId) {
      return res.status(400).json({ error: 'Missing paypalOrderId' });
    }

    const captureData = await capturePayPalOrder(paypalOrderId);
    const paypalStatus = captureData?.status;

    if (!isValidPaymentStatus(paypalStatus)) {
      return res.status(400).json({ error: 'Invalid PayPal status' });
    }

    const internalOrderId =
      captureData?.purchase_units?.[0]?.custom_id ||
      captureData?.purchase_units?.[0]?.invoice_id ||
      providedOrderId;

    if (!internalOrderId) {
      return res.status(400).json({ error: 'Missing internal order id' });
    }

    const order = await getOrder(internalOrderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (order.status === 'paid') {
      return res.json({ status: 'success', message: 'Order already paid' });
    }

    const captureAmount = Number(
      captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0
    );

    if (!validatePaymentAmount(order.total, captureAmount)) {
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    const transactionId = captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalOrderId;
    await updateOrderStatus(internalOrderId, 'paid', transactionId, {
      provider: 'paypal',
      paymentResponse: captureData,
    });

    AuditLogger.logPayment('PAYMENT_CAPTURED_PAYPAL', {
      userId: order.user_id,
      orderId: internalOrderId,
      amount: captureAmount,
      method: 'paypal',
      status: 'completed',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { transactionId: transactionId }
    });

    res.json({ status: 'success', orderId: internalOrderId, transactionId });
  } catch (error) {
    AuditLogger.logSecurityEvent('PAYPAL_CAPTURE_ERROR', {
      userId: req.user?.id,
      ipAddress: req.ip,
      severity: 'WARNING',
      details: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Bank payment confirmation (admin only) - with validation and audit
router.post('/confirm-bank', authenticateUser, paymentLimiter, async (req, res) => {
  try {
    // Only allow admin/dueño to confirm
    if (req.user.role !== 'dueño' && req.user.role !== 'admin') {
      AuditLogger.logSecurityEvent('UNAUTHORIZED_ADMIN_ACTION', {
        userId: req.user.id,
        ipAddress: req.ip,
        severity: 'CRITICAL',
        details: 'Non-admin tried to confirm bank payment'
      });
      return res.status(403).json({ error: 'Only admin can confirm bank payments' });
    }

    const { orderId, transactionId } = req.body;

    if (!orderId || !transactionId) {
      AuditLogger.logSecurityEvent('INVALID_BANK_CONFIRMATION', {
        userId: req.user.id,
        ipAddress: req.ip,
        severity: 'WARNING',
        details: 'Missing orderId or transactionId'
      });
      return res.status(400).json({ error: 'Missing orderId or transactionId' });
    }

    // Validate transaction ID format
    if (!/^[A-Z0-9]{10,}$/.test(transactionId)) {
      AuditLogger.logSecurityEvent('INVALID_TRANSACTION_ID', {
        userId: req.user.id,
        ipAddress: req.ip,
        severity: 'WARNING',
        details: `Invalid transaction ID format: ${transactionId}`
      });
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }

    const order = await getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prevent double-payment
    if (order.status === 'paid') {
      AuditLogger.logSecurityEvent('DOUBLE_PAYMENT_ATTEMPT', {
        userId: req.user.id,
        orderId: orderId,
        ipAddress: req.ip,
        severity: 'WARNING',
        details: 'Attempted to confirm payment for already paid order'
      });
      return res.status(400).json({ error: 'Order already paid' });
    }

    await updateOrderStatus(orderId, 'paid', transactionId, {
      provider: 'bank',
      paymentResponse: { transactionId },
    });

    AuditLogger.logPayment('PAYMENT_CONFIRMED_BANK', {
      userId: order.user_id,
      orderId: orderId,
      amount: order.total,
      method: 'bank',
      status: 'completed',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { confirmedBy: req.user.id, transactionId: transactionId }
    });

    AuditLogger.logAdmin('PAYMENT_CONFIRMED', {
      adminId: req.user.id,
      targetId: order.user_id,
      changes: { status: 'paid', transactionId: transactionId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: 'Bank transfer confirmed'
    });

    res.json({ status: 'success', message: 'Bank payment confirmed' });
  } catch (error) {
    AuditLogger.logSecurityEvent('BANK_CONFIRMATION_ERROR', {
      userId: req.user?.id,
      ipAddress: req.ip,
      severity: 'WARNING',
      details: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

export default router;
