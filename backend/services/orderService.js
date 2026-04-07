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

export const saveWebpaySession = async (orderId, { buyOrder, sessionId, token }) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_provider: 'webpay',
        webpay_buy_order: buyOrder,
        webpay_session_id: sessionId,
        webpay_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error saving Webpay session: ${err.message}`);
  }
};

export const getOrderByWebpayToken = async (token) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('webpay_token', token)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error fetching order by Webpay token: ${err.message}`);
  }
};

export const saveWebpayResult = async (orderId, token, result) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_provider: 'webpay',
        webpay_token: token,
        webpay_buy_order: result?.buy_order || null,
        webpay_session_id: result?.session_id || null,
        webpay_authorization_code: result?.authorization_code || null,
        webpay_response: result || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error saving Webpay result: ${err.message}`);
  }
};

// Update order tracking number
export const updateOrderTracking = async (orderId, trackingNumber, status = 'shipped') => {
  try {
    const updateData = {
      tracking_number: trackingNumber,
      status: status,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Error updating tracking: ${err.message}`);
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
