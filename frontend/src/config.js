// Central API configuration
// In production (Vercel), requests hit relative '/api' on the exact same domain (zero CORS!).
// In local development, fall back to http://127.0.0.1:8000 if VITE_API_URL is unset.
export const API_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000')
