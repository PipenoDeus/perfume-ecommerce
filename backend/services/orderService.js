import { supabase } from '../server.js';

// Create a new order
export const createOrder = async (userId, items, shippingAddress) => {
  try {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        items: items,
        shipping_address: shippingAddress,
        total: total,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error creating order: ${err.message}`);
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
export const updateOrderStatus = async (orderId, status, transactionId = null) => {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (transactionId) {
      updateData.transaction_id = transactionId;
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
