// config.js
export const API_BASE = 'http://localhost:3001';
export const LARGE_DAYS = 9999; // Used when there is stock but no usage to determine status

export function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}