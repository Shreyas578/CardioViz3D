// Central API configuration — supports VITE_API_URL env variable for production (Vercel) deployment
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

