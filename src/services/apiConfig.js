const RAW_API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:3000';

export const API_BASE_URL = RAW_API_BASE_URL
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

