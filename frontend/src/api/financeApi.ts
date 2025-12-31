// frontend/src/api/financeApi.ts
import { getToken } from './authApi';
import { API_URL as BASE_URL } from '../config';

// Interfaces pour les données financières
export interface Paiement {
  id: number;
  reference?: string;
  lease_id?: number;
  date_paiement: string;
  type: string;
  montant: number;
  mode_paiement: string;
  statut?: string;
  reference_transaction?: string;
  tenant_name?: string;
  tenant_surname?: string;
  ref_lot?: string;
  building_name?: string;
}

export interface Depense {
  id: number;
  building_id?: number;
  lot_id?: number;
  description: string;
  category: string;
  date_expense: string;
  amount: number;
  supplier_name: string;
  proof_url?: string;
  building_name?: string;
  ref_lot?: string;
  owner_name?: string;
}

export interface FinanceStats {
    mois: number;
    annee: number;
}

// === PAIEMENTS ===

export async function getPaiements(): Promise<Paiement[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${BASE_URL}/paiements`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
  return await response.json();
}

export async function savePaiement(paiement: Partial<Paiement>): Promise<Paiement> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${BASE_URL}/paiements`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paiement),
  });

  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
  return await response.json();
}

export async function getPaiementStats(): Promise<FinanceStats> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');
  
    const response = await fetch(`${BASE_URL}/paiements/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  
    if (!response.ok) throw new Error(`Erreur: ${response.status}`);
    return await response.json();
}

// === DEPENSES ===

export async function getDepenses(): Promise<Depense[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${BASE_URL}/depenses`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
  return await response.json();
}

export async function saveDepense(depense: Partial<Depense>): Promise<Depense> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${BASE_URL}/depenses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(depense),
  });

  if (!response.ok) throw new Error(`Erreur: ${response.status}`);
  return await response.json();
}

export async function getDepenseStats(): Promise<FinanceStats> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');
  
    const response = await fetch(`${BASE_URL}/depenses/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  
    if (!response.ok) throw new Error(`Erreur: ${response.status}`);
    return await response.json();
}

export async function getPaiementHistory(): Promise<{ mois: string, mois_num: number, total: string }[]> {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/paiements/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur historique paiements');
    return await response.json();
}

export async function getDepenseHistory(): Promise<{ mois: string, mois_num: number, total: string }[]> {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/depenses/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur historique depenses');
    return await response.json();
}