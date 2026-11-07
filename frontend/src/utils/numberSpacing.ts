// frontend/src/utils/numberSpacing.ts
//
// Espace des milliers dans les montants (« 391 347 FCFA »).
//
// En français, Intl.NumberFormat et Number.toLocaleString séparent les milliers par
// une espace fine insécable (U+202F). Dans Plus Jakarta Sans, ce caractère est presque
// nul : « 391 347 » se lisait « 391347 ». Le CSS ne peut rien y faire, car Chrome
// ignore word-spacing et unicode-range pour ce caractère.
//
// Correctif unique, appliqué dès l'import de ce module (premier import de main.tsx), au lieu de
// modifier les ~80 appels de formatage du code : on remplace U+202F par l'espace
// insécable classique (U+00A0). Elle reste insécable (le montant ne se coupe pas en fin
// de ligne) et profite du word-spacing défini dans globals.css.
// Seuls les nombres sont concernés ; les dates ne passent pas par ici.

const NARROW_NBSP = / /g;
const NBSP = ' ';
const swap = (s: string): string => s.replace(NARROW_NBSP, NBSP);

const PATCHED = Symbol.for('hopegestion.numberSpacing');

export function patchNumberSpacing(): void {
  const g = globalThis as unknown as Record<symbol, boolean>;
  if (g[PATCHED]) return; // évite un double patch (rechargement à chaud de Vite)
  g[PATCHED] = true;

  // Number.prototype.toLocaleString
  const toLocale = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (this: number, ...args: Parameters<typeof toLocale>) {
    return swap(toLocale.apply(this, args));
  };

  // Intl.NumberFormat.prototype.format est un accesseur (getter) qui renvoie une
  // fonction liée à l'instance : on enveloppe la fonction renvoyée.
  const proto = Intl.NumberFormat.prototype;
  const formatDesc = Object.getOwnPropertyDescriptor(proto, 'format');
  if (formatDesc?.get) {
    const getFormat = formatDesc.get;
    Object.defineProperty(proto, 'format', {
      ...formatDesc,
      get(this: Intl.NumberFormat) {
        const format = getFormat.call(this) as (n: number | bigint) => string;
        return (n: number | bigint) => swap(format(n));
      },
    });
  }

  // formatToParts : même remplacement dans chaque morceau (séparateur de groupe).
  const toParts = proto.formatToParts;
  if (toParts) {
    proto.formatToParts = function (this: Intl.NumberFormat, n?: number | bigint) {
      return toParts.call(this, n).map(p => ({ ...p, value: swap(p.value) }));
    };
  }
}

// Appliqué à l'import : les imports ES sont évalués dans l'ordre, avant le corps de main.tsx.
patchNumberSpacing();
