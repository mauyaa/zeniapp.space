/**
 * Listings API — search, fetch, save, alert, agent CRUD.
 */

import { request, buildQuery, getToken } from './client';
import { apiUrl } from '../runtime';

// ---------- Types ----------

export type ListingSearchParams = {
  q?: string;
  purpose?: 'rent' | 'buy';
  city?: string;
  area?: string;
  county?: string;
  subCounty?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  type?: string;
  amenities?: string;
  verifiedOnly?: boolean;
  availabilityOnly?: boolean;
  lng?: number;
  lat?: number;
  radiusKm?: number;
  minLng?: number;
  minLat?: number;
  maxLng?: number;
  maxLat?: number;
  commuteLat?: number;
  commuteLng?: number;
  commuteMins?: number;
  page?: number;
  limit?: number;
};

export type ListingCard = {
  id: string;
  title: string;
  category?: string;
  description?: string;
  price: number;
  currency: string;
  type?: string;
  purpose?: 'rent' | 'buy';
  floorPlans?: { label: string; url: string; sizeBytes?: number }[];
  catalogueUrl?: string;
  location?: { neighborhood?: string; city?: string; lat?: number; lng?: number; coordinates?: number[] };
  beds?: number;
  baths?: number;
  sqm?: number;
  amenities?: string[];
  verified?: boolean;
  imageUrl?: string;
  agent?: { id?: string; name?: string; image?: string };
  availabilityStatus?: string;
  saved?: boolean;
  images?: { url?: string; isPrimary?: boolean }[];
};

export type AgentListing = {
  _id: string;
  title: string;
  category?: string;
  description?: string;
  price: number;
  currency: string;
  purpose?: 'rent' | 'buy';
  beds?: number;
  baths?: number;
  sqm?: number;
  type?: string;
  amenities?: string[];
  location?: { address?: string; city?: string; area?: string; coordinates?: number[] };
  images?: { url?: string; isPrimary?: boolean }[];
  status: string;
  /** available | under_offer | sold | let — sold/let are hidden from public but visible to agent/admin */
  availabilityStatus?: 'available' | 'under_offer' | 'sold' | 'let';
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Insight = {
  id: string;
  tag: string;
  title: string;
  desc: string;
  href?: string;
};

export type SavedSearch = {
  id: string;
  name: string;
  params: Record<string, unknown>;
  alertsEnabled?: boolean;
  snoozeUntil?: string | null;
  shareToken?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// ---------- Public listings ----------

export function searchListings(
  params: ListingSearchParams,
  options?: { signal?: AbortSignal }
): Promise<{ items: ListingCard[]; total: number }> {
  return request(`/listings/search${buildQuery(params as Record<string, unknown>)}`, options);
}

export function fetchListing(id: string, options?: { signal?: AbortSignal }): Promise<ListingCard> {
  return request(`/listings/${id}`, options);
}

export function fetchSavedListings(options?: { signal?: AbortSignal }): Promise<{ items: ListingCard[] }> {
  return request<{ items: ListingCard[] }>('/listings/saved', options);
}

export function toggleSaveListing(listingId: string): Promise<{ saved: boolean }> {
  return request(`/listings/${listingId}/save`, { method: 'POST' });
}

export function toggleAlertListing(listingId: string): Promise<{ alert: boolean }> {
  return request(`/listings/${listingId}/alert`, { method: 'POST' });
}

export function recordLead(listingId: string, source: 'whatsapp' | 'message' | 'call'): Promise<{ success: boolean; leadId: string }> {
  return request(`/listings/${listingId}/lead`, { method: 'POST', body: JSON.stringify({ source }) });
}

// ---------- Image uploads ----------

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(apiUrl('/upload/image'), {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${getToken() || ''}`,
    },
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json() as Promise<{ url: string }>;
}

/** Upload an image for use as a chat attachment (user, agent, or admin). */
export async function uploadChatImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(apiUrl('/upload/chat-image'), {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${getToken() || ''}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Upload failed');
  }
  return res.json() as Promise<{ url: string }>;
}

// ---------- Agent listings ----------

export function fetchAgentListings(): Promise<AgentListing[]> {
  return request('/agent/listings');
}

export function fetchAgentListing(id: string): Promise<AgentListing> {
  return request(`/agent/listings/${id}`);
}

export function createAgentListing(body: Record<string, unknown>) {
  return request('/agent/listings', { method: 'POST', body: JSON.stringify(body) });
}

export function updateAgentListing(id: string, body: Record<string, unknown>) {
  return request(`/agent/listings/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function submitAgentListing(id: string) {
  return request(`/agent/listings/${id}/submit`, { method: 'POST' });
}

export function deleteAgentListing(id: string) {
  return request(`/agent/listings/${id}`, { method: 'DELETE' });
}

// ---------- Reports ----------

export function reportListing(
  listingId: string,
  body: { category: string; severity?: string; message?: string }
): Promise<{ id?: string; status?: string }> {
  const categoryMap: Record<string, string> = {
    scam: 'scam',
    misleading: 'duplicates',
    inappropriate: 'abuse',
    other: 'other',
  };
  return request('/reports', {
    method: 'POST',
    body: JSON.stringify({
      targetType: 'listing',
      targetId: listingId,
      category: categoryMap[body.category] || 'other',
      severity: body.severity || 'medium',
      message: body.message,
    }),
  });
}

// ---------- Marketing ----------

export function fetchInsights(limit = 3): Promise<{ items: Insight[] }> {
  return request(`/insights?limit=${limit}`);
}

export function subscribeNewsletter(email: string, source?: string) {
  return request<{ status: 'created' | 'exists' | 'reactivated' }>('/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email, source }),
  });
}

// ---------- Saved searches ----------

export function fetchSavedSearches(): Promise<{ items: SavedSearch[] }> {
  return request('/saved-searches');
}

export function createSavedSearch(body: { name: string; params: Record<string, unknown> }) {
  return request<SavedSearch>('/saved-searches', { method: 'POST', body: JSON.stringify(body) });
}

export function deleteSavedSearch(id: string) {
  return request<void>(`/saved-searches/${id}`, { method: 'DELETE' });
}

export function updateSavedSearchApi(
  id: string,
  body: Partial<{
    name: string;
    params: Record<string, unknown>;
    alertsEnabled: boolean;
    snoozeUntil: string | null;
  }>
) {
  return request<SavedSearch>(`/saved-searches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function duplicateSavedSearchApi(id: string) {
  return request<SavedSearch>(`/saved-searches/${id}/duplicate`, { method: 'POST' });
}

export function shareSavedSearch(id: string) {
  return request<{ shareToken: string }>(`/saved-searches/${id}/share`, { method: 'POST' });
}

export function fetchSharedSavedSearch(token: string) {
  return request<SavedSearch>(`/saved-searches/shared/${token}`);
}

// ---------- Recommendations ----------

export function fetchRecommendations(options?: { signal?: AbortSignal }): Promise<{ items: ListingCard[] }> {
  return request('/recommendations', options);
}

// ---------- Reservations ----------

export function listReservations() {
  return request('/reservations');
}

export function createReservationHold(body: {
  listingId: string;
  amount: number;
  currency?: string;
}) {
  return request('/reservations', { method: 'POST', body: JSON.stringify(body) });
}

export function cancelReservation(id: string) {
  return request(`/reservations/${id}/cancel`, { method: 'POST' });
}

// ---------- User documents ----------

export function listUserDocs() {
  return request('/user/documents');
}

export function uploadUserDoc(body: {
  type: 'preapproval' | 'pof' | 'id';
  url: string;
  note?: string;
  sharedListings?: string[];
}) {
  return request('/user/documents', { method: 'POST', body: JSON.stringify(body) });
}

export function updateUserDocShare(id: string, sharedListings: string[]) {
  return request(`/user/documents/${id}/share`, {
    method: 'PATCH',
    body: JSON.stringify({ sharedListings }),
  });
}
