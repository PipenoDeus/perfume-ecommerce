import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { 
  createOrder, 
  getOrder, 
  getUserOrders, 
  updateOrderStatus 
} from '../services/orderService.js';

const router = express.Router();

// Create order
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    if (!shippingAddress || !shippingAddress.city || !shippingAddress.address) {
      return res.status(400).json({ error: 'Invalid shipping address' });
    }

    // Validate items have required fields
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
    }

    const order = await createOrder(req.user.id, items, shippingAddress);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders
router.get('/', authenticateUser, async (req, res) => {
  try {
    const orders = await getUserOrders(req.user.id);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/:orderId', authenticateUser, async (req, res) => {
  try {
    const order = await getOrder(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify user owns this order
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
