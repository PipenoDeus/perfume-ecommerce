import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getOrder, updateOrderStatus } from '../services/orderService.js';

const router = express.Router();

// Initialize PayPal (placeholder - configure with real credentials)
// import paypal from 'paypal-rest-sdk';
// paypal.configure({
//   mode: process.env.PAYPAL_MODE || 'sandbox',
//   client_id: process.env.PAYPAL_CLIENT_ID,
//   client_secret: process.env.PAYPAL_CLIENT_SECRET
// });

// Create payment session
router.post('/create-session', authenticateUser, async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({ error: 'Missing orderId or paymentMethod' });
    }

    const order = await getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify user owns this order
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order already processed' });
    }

    // TODO: Implement PayPal/Bank payment creation
    // For now, return placeholder response
    
    if (paymentMethod === 'paypal') {
      // Create PayPal payment
      // const payment = await createPayPalPayment(order);
      // return res.json({ redirectUrl: payment.links.find(l => l.rel === 'approval_url').href });
      return res.json({ 
        redirectUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=PLACEHOLDER',
        sessionId: `paypal_${orderId}`
      });
    } else if (paymentMethod === 'bank') {
      // Create bank transfer
      return res.json({
        sessionId: `bank_${orderId}`,
        bankDetails: {
          accountNumber: process.env.BANK_ACCOUNT_NUMBER,
          bankCode: process.env.BANK_CODE,
          reference: orderId
        }
      });
    }

    return res.status(400).json({ error: 'Invalid payment method' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PayPal callback (webhook)
router.post('/paypal-callback', async (req, res) => {
  try {
    const { orderId, paymentId, payerId } = req.body;

    // TODO: Verify PayPal payment
    // const verified = await verifyPayPalPayment(paymentId);

    // For now, accept as verified
    const verified = true;

    if (verified) {
      await updateOrderStatus(orderId, 'paid', paymentId);
      return res.json({ status: 'success', message: 'Payment verified' });
    }

    res.status(400).json({ error: 'Payment verification failed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bank payment confirmation (admin only)
router.post('/confirm-bank', authenticateUser, async (req, res) => {
  try {
    // Only allow admin to confirm
    if (req.user.role !== 'dueño' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can confirm bank payments' });
    }

    const { orderId, transactionId } = req.body;

    if (!orderId || !transactionId) {
      return res.status(400).json({ error: 'Missing orderId or transactionId' });
    }

    const order = await getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await updateOrderStatus(orderId, 'paid', transactionId);
    res.json({ status: 'success', message: 'Bank payment confirmed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
