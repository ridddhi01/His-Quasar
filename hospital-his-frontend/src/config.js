// Centralized configuration file for all API endpoints

// Base URLs
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';
export const ML_URL = import.meta.env.VITE_ML_URL || '';
export const AI_URL = import.meta.env.VITE_AI_URL || '';
export const FILE_SERVICE_URL = import.meta.env.VITE_FILE_SERVICE_URL || import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
export const OCR_SERVICE_URL = import.meta.env.VITE_OCR_SERVICE_URL || '';
