import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { supabase } from '../server.js';
import { 
  createOrder, 
  getOrder, 
  getUserOrders, 
  updateOrderStatus,
  updateOrderShippingAddress,
  updateOrderTracking,
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

router.put('/:orderId/shipping-address', authenticateUser, async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city) {
      return res.status(400).json({ error: 'Invalid shipping address' });
    }

    const order = await getOrder(req.params.orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const editableStatuses = ['pending', 'paid', 'processing'];
    if (!editableStatuses.includes(String(order.status || '').toLowerCase())) {
      return res.status(400).json({
        error: 'La dirección de envío solo se puede editar antes de que el pedido sea enviado.'
      });
    }

    const updatedOrder = await updateOrderShippingAddress(
      req.params.orderId,
      req.user.id,
      shippingAddress
    );

    res.json(updatedOrder);
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

// Admin: update order tracking
router.put('/:orderId/tracking', authenticateUser, async (req, res) => {
  try {
    const normalizeRole = (value) => String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const toEffectiveRole = (value) => {
      const normalized = normalizeRole(value);
      return normalized === 'dueno' ? 'admin' : normalized;
    };

    const tokenRole = toEffectiveRole(req.user?.role);

    // Prefer DB role because JWT user_metadata may be stale or absent.
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .maybeSingle();

    if (dbUserError) {
      return res.status(500).json({ error: `Error validando rol: ${dbUserError.message}` });
    }

    const dbRole = toEffectiveRole(dbUser?.role);
    const effectiveRole = dbRole || tokenRole;

    if (effectiveRole !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { trackingCode, courier, status } = req.body;
    if (!trackingCode || !trackingCode.trim()) {
      return res.status(400).json({ error: 'El código de seguimiento es requerido' });
    }
    if (!courier) {
      return res.status(400).json({ error: 'La empresa de envío es requerida' });
    }

    const validStatuses = ['paid', 'shipped', 'delivered'];
    const finalStatus = validStatuses.includes(status) ? status : 'shipped';

    const order = await updateOrderTracking(req.params.orderId, {
      trackingCode: trackingCode.trim().toUpperCase(),
      courier,
      status: finalStatus,
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
