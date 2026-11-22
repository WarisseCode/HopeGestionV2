/**
 * Liens signés des fichiers privés (utils/signedFiles.ts) — audit S7.
 */
import {
    isPrivateUploadPath, expiryFor, signUploadPath, verifyUploadSignature,
    signIfPrivate, stripSignature, mapStringsDeep,
} from '../../utils/signedFiles';

const NOW = Date.UTC(2026, 10, 22, 10, 7, 0); // 22/11/2026 10:07:00 UTC

describe('isPrivateUploadPath', () => {
    it.each([
        '/uploads/receipts/quittance_1_ab.pdf',
        '/uploads/documents/x.png',
        '/uploads/2026/11/Bail_3_ab.pdf',
        '/uploads/signatures/s.png',
        '/uploads/avatars/a.jpg',
        '/uploads/inventories/p.jpg',
    ])('privé : %s', p => expect(isPrivateUploadPath(p)).toBe(true));

    it.each([
        '/uploads/properties/lot.jpg',   // photos des biens : publiques (annonces)
        '/uploads/../.env',              // remontée de dossier refusée
        '/uploads/',                     // pas de dossier
        '/api/uploads/x.pdf',
        'uploads/receipts/x.pdf',
    ])('non signé : %s', p => expect(isPrivateUploadPath(p)).toBe(false));
});

describe('expiration', () => {
    it('validité entre 1 h et 1 h 30, alignée sur la demi-heure', () => {
        const exp = expiryFor(NOW);
        const validity = exp - NOW / 1000;
        expect(validity).toBeGreaterThanOrEqual(3600);
        expect(validity).toBeLessThanOrEqual(5400);
        expect(exp % 1800).toBe(0);
    });

    it('même lien pendant la même demi-heure (cache navigateur / mobile préservé)', () => {
        const p = '/uploads/receipts/q.pdf';
        expect(signUploadPath(p, NOW)).toBe(signUploadPath(p, NOW + 10 * 60 * 1000));
    });
});

describe('verifyUploadSignature', () => {
    const path = '/uploads/receipts/q.pdf';
    const parse = (signed: string) => new URLSearchParams(signed.split('?')[1]);

    it('accepte un lien signé valide', () => {
        const q = parse(signUploadPath(path, NOW));
        expect(verifyUploadSignature(path, q.get('exp'), q.get('sig'), NOW)).toBe(true);
    });

    it('refuse un lien expiré', () => {
        const q = parse(signUploadPath(path, NOW));
        const later = Number(q.get('exp')) * 1000 + 1;
        expect(verifyUploadSignature(path, q.get('exp'), q.get('sig'), later)).toBe(false);
    });

    it('refuse une signature recopiée sur un autre fichier', () => {
        const q = parse(signUploadPath(path, NOW));
        expect(verifyUploadSignature('/uploads/receipts/autre.pdf', q.get('exp'), q.get('sig'), NOW)).toBe(false);
    });

    it('refuse une expiration prolongée à la main', () => {
        const q = parse(signUploadPath(path, NOW));
        const exp = String(Number(q.get('exp')) + 86400);
        expect(verifyUploadSignature(path, exp, q.get('sig'), NOW)).toBe(false);
    });

    it.each([[undefined, undefined], ['abc', 'x'], ['123', ['a']], ['1e9', 'x']])(
        'refuse des paramètres invalides (%p, %p)',
        (exp, sig) => expect(verifyUploadSignature(path, exp, sig, NOW)).toBe(false),
    );
});

describe('signIfPrivate / stripSignature', () => {
    it('signe un lien relatif privé', () => {
        expect(signIfPrivate('/uploads/receipts/q.pdf', NOW)).toMatch(/^\/uploads\/receipts\/q\.pdf\?exp=\d+&sig=[\w-]{22}$/);
    });

    it('signe un lien absolu en gardant l’hôte', () => {
        expect(signIfPrivate('https://hopegestion.com/uploads/documents/x.png', NOW))
            .toMatch(/^https:\/\/hopegestion\.com\/uploads\/documents\/x\.png\?exp=/);
    });

    it('remplace une ancienne signature au lieu d’en ajouter une seconde', () => {
        const once = signIfPrivate('/uploads/receipts/q.pdf', NOW);
        const twice = signIfPrivate(once.replace(/exp=\d+/, 'exp=1'), NOW);
        expect(twice).toBe(once);
    });

    it.each([
        '/uploads/properties/lot.jpg',
        'https://bucket.fra1.digitaloceanspaces.com/documents/uuid.pdf', // Spaces : hors étape 1
        'data:image/png;base64,AAAA',
        'Voir le fichier /uploads/receipts/q.pdf dans le dossier',       // texte libre
        '/dashboard/locations/3',
        '',
    ])('laisse intact : %p', v => expect(signIfPrivate(v, NOW)).toBe(v));

    it('stripSignature rend le lien d’origine (enregistré en base)', () => {
        expect(stripSignature(signIfPrivate('/uploads/receipts/q.pdf', NOW))).toBe('/uploads/receipts/q.pdf');
        expect(stripSignature('/uploads/receipts/q.pdf?v=2&exp=1&sig=abc')).toBe('/uploads/receipts/q.pdf?v=2');
        expect(stripSignature('/uploads/receipts/q.pdf')).toBe('/uploads/receipts/q.pdf');
        expect(stripSignature('texte ?exp=1&sig=a')).toBe('texte ?exp=1&sig=a');
    });
});

describe('mapStringsDeep', () => {
    const sign = (s: string) => signIfPrivate(s, NOW);

    it('signe dans les objets et tableaux imbriqués (jsonb, listes)', () => {
        const input = {
            locataire: { photo_piece_url: '/uploads/documents/id.jpg', nom: 'AGOSSA' },
            items: [{ photos: ['/uploads/inventories/a.jpg', '/uploads/properties/b.jpg'] }],
            signatures_json: { agent: { signature_url: '/uploads/documents/s.png' } },
        };
        const out = mapStringsDeep(input, sign) as typeof input;

        expect(out.locataire.photo_piece_url).toMatch(/\?exp=\d+&sig=/);
        expect(out.locataire.nom).toBe('AGOSSA');
        expect(out.items[0]!.photos[0]).toMatch(/\?exp=/);
        expect(out.items[0]!.photos[1]).toBe('/uploads/properties/b.jpg');
        expect(out.signatures_json.agent.signature_url).toMatch(/\?exp=/);
    });

    it('ne modifie jamais l’objet d’origine (caches serveur partagés)', () => {
        const input = { a: { url: '/uploads/receipts/q.pdf' }, list: ['/uploads/receipts/r.pdf'] };
        const copy = JSON.parse(JSON.stringify(input));
        mapStringsDeep(input, sign);
        expect(input).toEqual(copy);
    });

    it('renvoie le même objet quand rien n’est à signer (aucune copie inutile)', () => {
        const input = { lots: [{ ref: 'A1', photos: ['/uploads/properties/x.jpg'] }] };
        expect(mapStringsDeep(input, sign)).toBe(input);
    });

    it('laisse les dates et autres objets non simples', () => {
        const d = new Date(NOW);
        const out = mapStringsDeep({ created_at: d, n: 3, ok: true, rien: null }, sign) as any;
        expect(out.created_at).toBe(d);
        expect(out).toEqual({ created_at: d, n: 3, ok: true, rien: null });
    });
});
