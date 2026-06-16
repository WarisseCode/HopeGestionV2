import { getToken } from '../api/authApi';

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

    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
}
