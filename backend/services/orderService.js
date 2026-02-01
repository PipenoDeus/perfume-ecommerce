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

// Update order status
export const updateOrderStatus = async (orderId, status, transactionId = null) => {
  try {
    const updateData = { status };
    if (transactionId) {
      updateData.transaction_id = transactionId;
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
