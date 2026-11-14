// Compression intelligente + horodatage des photos d'état des lieux (CdC VIII.4).
// Redimensionne au plus grand côté maxDim, ré-encode en JPEG, et incruste la
// date/heure de prise en bas à droite (preuve juridique). Renvoie un Blob prêt à uploader.

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
    });
}

export async function compressImage(file: File, maxDim = 1280, quality = 0.7): Promise<Blob> {
    const img = await loadImage(file);

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    const longest = Math.max(width, height);
    if (longest > maxDim) {
        const scale = maxDim / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file; // pas de canvas → on renvoie le fichier d'origine
    ctx.drawImage(img, 0, 0, width, height);

    // Horodatage incrusté (bas-droite) sur un bandeau semi-transparent.
    const stamp = new Date().toLocaleString('fr-FR');
    const fontSize = Math.max(12, Math.round(height * 0.028));
    const pad = Math.round(fontSize * 0.4);
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textW = ctx.measureText(stamp).width;
    const boxW = textW + pad * 2;
    const boxH = fontSize + pad * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(width - boxW, height - boxH, boxW, boxH);
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.fillText(stamp, width - boxW + pad, height - boxH + pad);

    return new Promise<Blob>((resolve) => {
        canvas.toBlob(
            (b) => resolve(b || file),
            'image/jpeg',
            quality
        );
    });
}

// ─── Redimensionnement des photos de biens / locataires (BUG-005) ─────────────
// Les photos de téléphone font souvent 3 à 8 Mo pour 4000 px de large : lentes à
// envoyer en 3G/4G, et lentes à afficher dans les listes (BUG-001). On les réduit
// dans le navigateur avant l'envoi, sans horodatage (contrairement à l'EDL).
//
// Règles :
// - GIF / SVG : renvoyés tels quels (animation / vectoriel perdus au ré-encodage) ;
// - image déjà petite (côté ≤ maxDim et ≤ 500 Ko) : renvoyée telle quelle ;
// - sinon : JPEG, fond blanc (un PNG transparent ne devient pas noir) ;
// - si le résultat est plus lourd que l'original ou si le navigateur échoue à
//   décoder l'image : on renvoie l'original (jamais pire qu'avant).
const SMALL_ENOUGH_BYTES = 500 * 1024;

export async function resizeImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
        return file;
    }

    let img: HTMLImageElement;
    try {
        img = await loadImage(file);
    } catch {
        return file;
    }

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) return file;

    const longest = Math.max(srcW, srcH);
    if (longest <= maxDim && file.size <= SMALL_ENOUGH_BYTES) return file;

    const scale = longest > maxDim ? maxDim / longest : 1;
    const width = Math.round(srcW * scale);
    const height = Math.round(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob || blob.size >= file.size) return file;

    // Le backend déduit l'extension du nom d'origine : on la remplace par .jpg
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
