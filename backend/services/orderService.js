import { supabase } from '../server.js';

const getOrderItems = (items = []) => {
  const itemMap = new Map();

  for (const item of items || []) {
    const id = String(item?.id || '').trim();
    const quantity = Number(item?.quantity || 0);
    if (!id || !Number.isFinite(quantity) || quantity <= 0) continue;

    itemMap.set(id, (itemMap.get(id) || 0) + quantity);
  }

  return Array.from(itemMap.entries()).map(([id, quantity]) => ({ id, quantity }));
};

const validatePerfumeStock = async (items = []) => {
  const orderItems = getOrderItems(items);

  for (const item of orderItems) {
    const { data: perfume, error } = await supabase
      .from('perfumes')
      .select('id, name, stock')
      .eq('id', item.id)
      .maybeSingle();

    if (error) throw error;
    if (!perfume) {
      throw new Error(`Perfume not found: ${item.id}`);
    }

    const stock = Number(perfume.stock || 0);
    if (stock < item.quantity) {
      throw new Error(`Stock insuficiente para ${perfume.name}. Disponible: ${stock}`);
    }
  }
};

const decrementPerfumeStock = async (items = []) => {
  const orderItems = getOrderItems(items);

  for (const item of orderItems) {
    let updated = false;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: perfume, error: fetchError } = await supabase
        .from('perfumes')
        .select('id, stock')
        .eq('id', item.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!perfume) {
        throw new Error(
          `Producto no encontrado: ${item.id}`
        );
      }

      const currentStock = Number(perfume.stock || 0);

      if (currentStock < item.quantity) {
        throw new Error(
          `Stock insuficiente para producto ${item.id}`
        );
      }

      const nextStock = currentStock - item.quantity;

      const { data: updatedPerfume, error: updateError } = await supabase
        .from('perfumes')
        .update({
          stock: nextStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('stock', currentStock)
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;

      if (updatedPerfume) {
        updated = true;
        break;
      }
    }

    if (!updated) {
      throw new Error(
        `No fue posible actualizar el stock de ${item.id}`
      );
    }
  }
};

// Create a new order
export const createOrder = async (
  userId,
  items,
  shippingAddress,
  total
) => {
  try {
    await validatePerfumeStock(items);

    const calculatedTotal = Number(total);

    if (!Number.isFinite(calculatedTotal)) {
      throw new Error('Invalid total');
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        items,
        shipping_address: shippingAddress,
        total: calculatedTotal,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return data;

  } catch (err) {
    throw new Error(
      `Error creating order: ${err.message}`
    );
  }
};



// Get order by ID
export const getOrder = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error fetching order: ${err.message}`);
  }
};

// Get user orders
export const getUserOrders = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error fetching user orders: ${err.message}`);
  }
};

// Update order status using the real orders schema
export const updateOrderStatus = async (orderId, status, transactionId = null, options = {}) => {
  try {
    const existingOrder = await getOrder(orderId);
    const shouldDecrementStock = status === 'paid' && existingOrder?.status !== 'paid';
    const provider = options.provider || null;
    const paymentResponse = options.paymentResponse || null;
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (provider) {
      updateData.payment_provider = provider;
    }

    if (transactionId || paymentResponse) {
      updateData.webpay_response = paymentResponse || {
        provider: provider || 'unknown',
        transactionId,
      };
    }

    if (status === 'paid') {
      updateData.payment_status = 'paid';
      updateData.paid_at = new Date().toISOString();
    } else if (status === 'failed' || status === 'cancelled') {
      updateData.payment_status = status;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    if (shouldDecrementStock) {
      await decrementPerfumeStock(existingOrder.items);
    }

    return data;
  } catch (err) {
    throw new Error(`Error updating order: ${err.message}`);
  }
};

// Update order tracking (admin, service-role — bypasses RLS)
export const updateOrderTracking = async (orderId, { trackingCode, courier, status }) => {
  try {
    const payload = {
      tracking_code: trackingCode,
      courier: courier,
      tracking_number: trackingCode,
      shipping_company: courier === 'correos' ? 'correoschile' : courier,
      status: status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error updating tracking: ${err.message}`);
  }
};

export const updateOrderShippingAddress = async (orderId, userId, shippingAddress) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        shipping_address: shippingAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('user_id', userId)
      .select('id, user_id, status, shipping_address, updated_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Order not found or unauthorized');

    return data;
  } catch (err) {
    throw new Error(`Error updating shipping address: ${err.message}`);
  }
};

// Get all orders (for admin)
export const getAllOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error fetching orders: ${err.message}`);
  }
};
