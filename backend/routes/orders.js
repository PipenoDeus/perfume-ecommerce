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
    console.log('[ORDERS] POST /api/orders', {
      path: req.path,
      userId: req.user?.id || null,
      hasAuthHeader: !!req.headers.authorization,
      csrfHeader: req.headers['x-csrf-token'] ? 'present' : 'missing',
      hasCookie: !!req.headers.cookie,
    });

    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    if (!shippingAddress || !shippingAddress.city || !shippingAddress.address) {
      return res.status(400).json({ error: 'Invalid shipping address' });
    }

    for (const item of items) {
    if (!item.id || !item.quantity) {
      return res.status(400).json({
        error: 'Invalid item format'
      });
    }

    if (
      typeof item.quantity !== 'number' ||
      item.quantity < 1
    ) {
      return res.status(400).json({
        error: 'Invalid quantity'
      });
    }
  }

    console.log('[ORDERS DATA]', {
      userId: req.user.id,
      items,
      shippingAddress
    });


    const uniqueProductIds = [
      ...new Set(items.map(item => item.id))
    ];

    const { data: products, error: productsError } = await supabase
    .from('perfumes')
    .select('id, price')
    .in('id', uniqueProductIds);

    if (productsError) {
      throw new Error(productsError.message);
    }

    if (!products || products.length !== uniqueProductIds.length) {
      return res.status(400).json({
        error: 'Uno o más productos no existen'
      });
    }

    const productMap = new Map(
      products.map(product => [
        product.id,
        Number(product.price)
      ])
    );

    // aquí sigue la consulta de shipping_cost
    const { data: shippingData, error: shippingError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'shipping_cost')
      .single();

    if (shippingError) {
      throw new Error(shippingError.message);
    }

    const shippingCost = Number(
      shippingData?.value
    );

    if (Number.isNaN(shippingCost)) {
      throw new Error(
        'shipping_cost inválido en settings'
      );
    }

    let subtotal = 0;

    const validatedItems = [];

    for (const item of items) {
      const realPrice = productMap.get(item.id);

      if (realPrice === undefined) {
        return res.status(400).json({
          error: `Producto ${item.id} no encontrado`
        });
      }

      subtotal += realPrice * item.quantity;

      validatedItems.push({
        ...item,
        price: realPrice
      });
    }

    const total = subtotal + shippingCost;

    const order = await createOrder(
      req.user.id,
      validatedItems,
      shippingAddress,
      total
    );

    console.log('[ORDER CREATED]', order);

    res.status(201).json(order);

  } catch (error) {
    console.error('[ORDERS ERROR]', error);
    console.error('[ORDERS ERROR MESSAGE]', error?.message);
    console.error('[ORDERS ERROR STACK]', error?.stack);

    res.status(500).json({
      error: error.message,
    });
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
