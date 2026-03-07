import express from 'express';
import axios from 'axios';
import { authenticateUser } from '../middleware/auth.js';
import { getOrder, updateOrderStatus } from '../services/orderService.js';
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

const getFrontendBaseUrl = () => {
  const origins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins[0] || 'http://localhost:5173';
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
        description: `Order ${order.id}`
      }
    ],
    application_context: {
      return_url: `${baseUrl}/payment-success`,
      cancel_url: `${baseUrl}/cart`
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

// Create payment session
router.post('/create-session', authenticateUser, async (req, res) => {
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
    await updateOrderStatus(orderId, 'paid', transactionId);

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
router.post('/capture', authenticateUser, async (req, res) => {
  try {
    const { paypalOrderId } = req.body;

    if (!paypalOrderId) {
      return res.status(400).json({ error: 'Missing paypalOrderId' });
    }

    const captureData = await capturePayPalOrder(paypalOrderId);
    const paypalStatus = captureData?.status;

    if (!isValidPaymentStatus(paypalStatus)) {
      return res.status(400).json({ error: 'Invalid PayPal status' });
    }

    const internalOrderId = captureData?.purchase_units?.[0]?.custom_id;
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
    await updateOrderStatus(internalOrderId, 'paid', transactionId);

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
router.post('/confirm-bank', authenticateUser, async (req, res) => {
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

    await updateOrderStatus(orderId, 'paid', transactionId);

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
