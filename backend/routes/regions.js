import express from 'express';
import { supabase } from '../server.js';

const router = express.Router();

// GET /api/regions - public, no auth required
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('id, code, name')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
