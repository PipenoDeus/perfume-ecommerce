import express from 'express';
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

// Create payment session
router.post('/create-session', authenticateUser, async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

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
      // Return encrypted payment session (do NOT expose amounts here)
      return res.json({ 
        sessionId: `paypal_${orderId}_${Date.now()}`,
        orderId: orderId,
        callbackUrl: `${process.env.FRONTEND_URL}/payment-success`
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
    const orderId = webhookEvent.resource?.id || webhookEvent.resource?.supplementary_data?.related_ids?.order_id;
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
