// frontend/src/api/reportApi.ts
import { getToken } from './authApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface BuildingStats {
    building_id: string;
    stats: {
        total_lots: number;
        occupied_lots: number;
        occupancy_rate: number;
        financial_performance: {
            month: number;
            year: number;
            total_due: number;
            total_paid: number;
            collection_efficiency: number;
        }
    }
}

export async function getBuildingStats(id: number): Promise<BuildingStats> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const res = await fetch(`${API_URL}/finances/stats/building/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erreur lors de la récupération des stats');
    }
    return res.json();
}

export async function getGlobalStats(): Promise<any> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const res = await fetch(`${API_URL}/finances/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erreur lors de la récupération des stats globales');
    }
    return res.json();
}

export async function exportExcel(startDate?: string, endDate?: string): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    let url = `${API_URL}/finances/export/excel`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        throw new Error('Erreur lors de l\'exportation Excel');
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Rapport_Financier_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
}
