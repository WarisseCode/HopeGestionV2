// frontend/src/utils/saveBlob.ts
/**
 * Déclenche le téléchargement d'un fichier reçu en mémoire (Blob).
 *
 * Safari annule le téléchargement si l'URL du blob est révoquée juste après le clic :
 * c'était la cause des téléchargements de PDF qui échouaient sous Safari (BUG-016).
 * On révoque donc l'URL plus tard, une fois le téléchargement lancé.
 */
export function saveBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
