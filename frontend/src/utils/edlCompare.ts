import { apiCall } from './apiUtils';
import { API_URL } from '../config';

interface CounterpartResponse {
    source: { id: number; type_edl: string };
    counterpart: { id: number; ref_edl: string; type_edl: string } | null;
}

/**
 * Résout le couple (entrée, sortie) à comparer à partir d'un EDL quelconque :
 * interroge le backend pour trouver l'EDL de type opposé du même bail/lot, puis
 * ordonne le couple (l'entrée en premier). Renvoie null s'il n'y a pas de contrepartie.
 */
export async function resolveComparison(edlId: number | string): Promise<{ idEntree: number; idSortie: number } | null> {
    const data = await apiCall<CounterpartResponse>(`${API_URL}/edl/${edlId}/counterpart`);
    if (!data.counterpart) return null;
    const srcId = data.source.id;
    const cpId = data.counterpart.id;
    // L'entrée doit être le premier paramètre. Si la source est une sortie, la contrepartie est l'entrée.
    if (data.source.type_edl === 'sortie') return { idEntree: cpId, idSortie: srcId };
    return { idEntree: srcId, idSortie: cpId };
}
