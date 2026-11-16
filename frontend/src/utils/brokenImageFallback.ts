// frontend/src/utils/brokenImageFallback.ts
//
// Filet de sécurité global pour les images ENVOYÉES par les utilisateurs (photos de
// locataires, propriétaires, biens, états des lieux, signatures…).
//
// Pourquoi : après la suspension du serveur, beaucoup de fichiers ont été perdus alors que
// leurs adresses sont restées en base. Le navigateur affichait alors l'icône d'image
// cassée. Plutôt que de corriger chacun des ~35 <img> du site (et d'en oublier un futur),
// on écoute une seule fois les erreurs de chargement d'image et on remplace l'image
// cassée par un visuel neutre :
//   - image ronde (avatar)  → silhouette grise ;
//   - autre image           → icône « image indisponible » (même esprit que NoPhotoPlaceholder).
//
// Ne touche qu'aux fichiers envoyés (/uploads/… ou stockage DigitalOcean Spaces) : jamais
// au logo ni aux images du site. Aucune donnée n'est modifiée. Importé une fois dans main.tsx.

const svg = (body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${body}</svg>`
  )}`;

// Gris neutres (fonctionnent en thème clair et sombre)
const AVATAR_FALLBACK = svg(
  '<rect width="100" height="100" fill="#CBD2DA"/>' +
  '<circle cx="50" cy="40" r="17" fill="#F4F6F7"/>' +
  '<path d="M18 92c3-19 17-29 32-29s29 10 32 29z" fill="#F4F6F7"/>'
);
const PHOTO_FALLBACK = svg(
  '<rect width="100" height="100" fill="#E7EBEF"/>' +
  '<g fill="none" stroke="#9AA5B1" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="30" y="34" width="40" height="32" rx="4"/>' +
  '<circle cx="42" cy="45" r="4"/>' +
  '<path d="M68 60 56 49 36 66"/>' +
  '<path d="M24 24 76 76"/>' +
  '</g>'
);

/** Fichier envoyé par un utilisateur (et non image du site). */
const isUploadedFile = (src: string) =>
  src.includes('/uploads/') || /digitaloceanspaces\.com|cdn\.digitalocean/i.test(src);

const isRound = (img: HTMLImageElement) => {
  if (img.classList.contains('rounded-full')) return true;
  const r = getComputedStyle(img).borderRadius;
  return r.includes('%') ? parseFloat(r) >= 50 : parseFloat(r) >= Math.min(img.width, img.height) / 2;
};

function onImageError(e: Event) {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.fallbackApplied) return; // évite toute boucle si le visuel de repli échouait
  const src = img.getAttribute('src') || '';
  if (!src || src.startsWith('data:') || src.startsWith('blob:') || !isUploadedFile(src)) return;

  img.dataset.fallbackApplied = 'true';
  img.dataset.brokenSrc = src; // garde l'adresse d'origine pour le diagnostic (inspecteur)
  img.removeAttribute('srcset');
  img.src = isRound(img) ? AVATAR_FALLBACK : PHOTO_FALLBACK;
  if (!img.getAttribute('alt')) img.setAttribute('alt', 'Image indisponible');
  img.title = img.title || 'Image indisponible';
}

// Les erreurs de chargement ne remontent pas (pas de bubbling) : écoute en phase de capture.
if (typeof document !== 'undefined') {
  document.addEventListener('error', onImageError, true);
}

export {};
