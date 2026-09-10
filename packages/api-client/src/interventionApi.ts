/**
 * @hopegestion/api-client — Interventions (Tickets & Providers) API
 * Compatible web + mobile
 */
import { apiCall } from './core';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  category?: string;
  building_id?: number;
  lot_id?: number;
  assigned_to?: number;
  assigned_name?: string;
  building_name?: string;
  ref_lot?: string;
  created_at: string;
  updated_at?: string;
  photo_url?: string;
  resolution_notes?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Provider {
  id: number;
  nom: string;
  specialite: string;
  telephone?: string;
  email?: string;
  tarif_horaire?: number;
  statut: 'actif' | 'inactif';
}

export const interventionApi = {
  getTickets: async (
    filters: Record<string, string | number> = {}
  ): Promise<PaginatedResponse<Ticket>> => {
    const query = new URLSearchParams(filters as Record<string, string>).toString();
    return apiCall<PaginatedResponse<Ticket>>(`/tickets?${query}`);
  },

  getTicket: async (id: number): Promise<Ticket> => {
    return apiCall<Ticket>(`/tickets/${id}`);
  },

  createTicket: async (data: Partial<Ticket>): Promise<Ticket> => {
    return apiCall<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTicket: async (id: number, data: Partial<Ticket>): Promise<Ticket> => {
    return apiCall<Ticket>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  closeTicket: async (id: number, data: { resolution_notes?: string }): Promise<Ticket> => {
    return apiCall<Ticket>(`/tickets/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getProviders: async (
    filters: Record<string, string | number> = {}
  ): Promise<PaginatedResponse<Provider>> => {
    const query = new URLSearchParams(filters as Record<string, string>).toString();
    return apiCall<PaginatedResponse<Provider>>(`/providers?${query}`);
  },

  createProvider: async (data: Partial<Provider>): Promise<Provider> => {
    return apiCall<Provider>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProvider: async (id: number, data: Partial<Provider>): Promise<Provider> => {
    return apiCall<Provider>(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteProvider: async (id: number): Promise<void> => {
    return apiCall<void>(`/providers/${id}`, { method: 'DELETE' });
  },
};
