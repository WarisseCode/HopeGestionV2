import { getToken } from '../api/authApi';
import { saveBlob } from './saveBlob';

/**
 * Télécharge un PDF servi par une route authentifiée.
 * Un simple <a href> ou window.open n'enverrait pas le JWT → on fetch avec le
 * header Authorization, puis on déclenche le téléchargement du blob.
 */
export async function downloadPdf(url: string, filename: string): Promise<void> {
    const token = getToken();
    const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error('Téléchargement échoué');

    saveBlob(await resp.blob(), filename);
}
