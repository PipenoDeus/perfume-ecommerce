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
    console.error('[REGIONS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/regions/:regionId/communes - public, no auth required
router.get('/:regionId/communes', async (req, res) => {
  try {
    const regionId = Number(req.params.regionId);

    if (!Number.isInteger(regionId) || regionId <= 0) {
      return res.status(400).json({ error: 'Invalid regionId' });
    }

    const { data, error } = await supabase
      .from('communes')
      .select('id, name, region_id')
      .eq('region_id', regionId)
      .order('name', { ascending: true });

    if (error) throw error;
    return res.json(data || []);
  } catch (error) {
    console.error('[REGIONS/COMMUNES ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
