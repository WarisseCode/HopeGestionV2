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
