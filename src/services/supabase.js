import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Perfume service functions
export const perfumeService = {
  // Get all perfumes
  async getAllPerfumes() {
    const { data, error } = await supabase
      .from('perfumes')
      .select('*');
    if (error) throw error;
    return data;
  },

  // Get single perfume
  async getPerfumeById(id) {
    const { data, error } = await supabase
      .from('perfumes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Create perfume (admin only)
  async createPerfume(perfume) {
    const { data, error } = await supabase
      .from('perfumes')
      .insert([perfume])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update perfume (admin only)
  async updatePerfume(id, updates) {
    const { data, error } = await supabase
      .from('perfumes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete perfume (admin only)
  async deletePerfume(id) {
    const { error } = await supabase
      .from('perfumes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Upload image to Supabase Storage 'perfumes' bucket
  async uploadPerfumeImage(file) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('perfumes')
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('perfumes')
        .getPublicUrl(filePath);

      return { publicUrl: publicData.publicUrl, path: filePath };
    } catch (err) {
      throw err;
    }
  },
};

// Auth service functions
export const authService = {
  // Sign up
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Sign in
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Send password recovery email
  async resetPasswordForEmail(email, redirectTo) {
    const options = redirectTo ? { redirectTo } : undefined;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, options);
    if (error) throw error;
    return data;
  },

  // Update current authenticated user password (used after recovery link)
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
};

// Cart/Orders service
export const orderService = {
  // Create order
  async createOrder(userId, items, total) {
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          user_id: userId,
          items,
          total,
          status: 'pending',
        },
      ])
      .select();
    if (error) throw error;
    return data;
  },

  // Get user orders
  async getUserOrders(userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  },
};
