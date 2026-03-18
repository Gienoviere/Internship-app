// api.js
import { API_BASE, getToken } from './config.js';

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  const res = await fetch(API_BASE + endpoint, { ...options, headers });
  if (!res.ok) {
    let errorText = `HTTP error ${res.status}`;
    try {
      const errData = await res.json();
      errorText = errData.error || errorText;
    } catch (e) {}
    throw new Error(errorText);
  }
  return res.json();
}

export async function fetchFeedItems() {
  return apiFetch('/inventory/feed-items');
}

export async function fetchMovements() {
  return apiFetch('/inventory/movements');
}

export async function createFeedItem(name, stockGrams) {
  return apiFetch('/inventory/feed-items', {
    method: 'POST',
    body: JSON.stringify({ name, stockGrams })
  });
}

export async function patchFeedItem(id, updates) {
  return apiFetch(`/inventory/feed-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteFeedItem(id) {
  return apiFetch(`/inventory/feed-items/${id}`, { method: 'DELETE' });
}

export async function createMovement(feedItemId, date, deltaGrams, reason) {
  return apiFetch('/inventory/movements', {
    method: 'POST',
    body: JSON.stringify({ feedItemId, date, deltaGrams, reason })
  });
}

export async function deleteMovement(id) {
  return apiFetch(`/inventory/movements/${id}`, { method: 'DELETE' });
}