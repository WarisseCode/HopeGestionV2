// frontend/src/components/ui/Table.tsx
//
// Composant Table atomique et générique.
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI : 25 pages réimplémentaient à la main le même squelette de table
// (wrapper scrollable, skeleton de chargement, état vide en colSpan, hover des
// lignes, tri, pagination). Ce composant absorbe tout ce boilerplate derrière une
// config `columns` déclarative — les pages ne décrivent plus QUE leurs colonnes.
//
// Tri et pagination sont intégrés et côté client (les jeux de données des pages
// admin tiennent en mémoire). Pour un tri/pagination serveur, ne pas passer
// `pageSize`/`sortAccessor` et garder la logique dans la page.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';

type Align = 'left' | 'center' | 'right';

// Générique <T> : le type de la donnée d'une ligne. Les accesseurs (`render`,
// `sortAccessor`) reçoivent une ligne typée — zéro `any` côté page appelante.
export interface Column<T> {
  /** Identifiant unique de la colonne — sert de clé React et d'état de tri. */
  key: string;
  /** Libellé d'en-tête (texte ou nœud). */
  header: React.ReactNode;
  /** Rend la cellule. Reçoit la ligne + son index dans la page courante. */
  render: (row: T, index: number) => React.ReactNode;
  align?: Align;
  /** Classe Tailwind de largeur, ex. 'w-12'. */
  width?: string;
  /** Classes supplémentaires sur la cellule <td>. */
  className?: string;
  /** Classes supplémentaires sur l'en-tête <th>. */
  headerClassName?: string;
  /**
   * Si fourni, la colonne devient triable. Retourne une valeur comparable
   * (string / number / Date). null/undefined sont rejetés en fin de tri.
   */
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Clé stable par ligne (id de préférence) — évite les remounts au tri. */
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Classes conditionnelles par ligne (ex. surlignage d'un statut). */
  rowClassName?: (row: T) => string;
  /** Si défini, active la pagination client avec N lignes par page. */
  pageSize?: number;
  /** Tri initial appliqué au montage. */
  defaultSort?: { key: string; direction: SortDirection };
  /** Lignes plus compactes (py réduit). */
  dense?: boolean;
  /** Classes du conteneur externe (carte). */
  className?: string;
}

type SortDirection = 'asc' | 'desc';
type SortState = { key: string; direction: SortDirection } | null;

const alignClass: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = 'Aucune donnée à afficher.',
  emptyIcon,
  onRowClick,
  rowClassName,
  pageSize,
  defaultSort = undefined,
  dense = false,
  className = '',
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState>(defaultSort ?? null);
  const [page, setPage] = useState(1);

  // Tri trois-états : asc → desc → aucun (retour à l'ordre d'origine).
  // Cliquer une autre colonne repart sur 'asc'.
  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null; // 3e clic : on annule le tri
    });
    setPage(1); // un changement de tri réinitialise la pagination
  };

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortAccessor) return data;
    const accessor = col.sortAccessor;

    // Copie avant tri : .sort() mute en place, on ne touche pas au tableau source.
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      // null/undefined toujours en fin, quel que soit le sens du tri.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va instanceof Date && vb instanceof Date) {
        return (va.getTime() - vb.getTime()) * dir;
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb), 'fr', { numeric: true }) * dir;
    });
  }, [data, sort, columns]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  // Clamp : si les données rétrécissent (filtre), on ne reste pas sur une page vide.
  const safePage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    if (!pageSize) return sortedData;
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pageSize, safePage]);

  const cellPad = dense ? 'py-2 px-3' : 'py-4 px-4';
  const colCount = columns.length;

  return (
    <div className={`bg-base-100 rounded-2xl shadow-soft border border-base-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead className="bg-base-200/50">
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.key === col.key;
                const sortable = !!col.sortAccessor;
                // aria-sort communique l'état de tri aux lecteurs d'écran.
                // Typage explicite : jsx-a11y refuse une expression non littérale.
                const ariaSort: React.AriaAttributes['aria-sort'] = !sortable
                  ? undefined
                  : isSorted
                    ? sort!.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`${cellPad} font-semibold text-base-content/60 text-xs uppercase tracking-wider ${alignClass[col.align ?? 'left']} ${col.width ?? ''} ${col.headerClassName ?? ''}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-base-content transition-colors ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                      >
                        {col.header}
                        {isSorted ? (
                          sort!.direction === 'asc' ? (
                            <ChevronUp size={14} className="text-primary" />
                          ) : (
                            <ChevronDown size={14} className="text-primary" />
                          )
                        ) : (
                          <ChevronsUpDown size={14} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-base-200">
            {loading ? (
              // Skeleton : autant de lignes que la page, pour éviter le saut de hauteur.
              Array.from({ length: pageSize ?? 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className={cellPad}>
                      <div className="h-4 bg-base-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-16">
                  <div className="flex flex-col items-center justify-center gap-3 text-base-content/40">
                    {emptyIcon ?? <Inbox size={36} className="opacity-50" />}
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} hover:bg-base-200/50 ${rowClassName?.(row) ?? ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${cellPad} ${alignClass[col.align ?? 'left']} ${col.className ?? ''}`}
                    >
                      {col.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination : affichée seulement si pageSize défini ET plus d'une page. */}
      {pageSize && totalPages > 1 && !loading && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-base-200">
          <p className="text-sm text-base-content/50">
            {sortedData.length} résultats • Page {safePage}/{totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Page précédente"
              className="btn btn-sm btn-ghost"
            >
              <ChevronLeft size={16} />
            </button>
            {/* Fenêtre glissante de 5 pages centrée sur la page courante. */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p =
                safePage <= 3
                  ? i + 1
                  : safePage >= totalPages - 2
                    ? totalPages - 4 + i
                    : safePage - 2 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPage(p)}
                  aria-current={safePage === p ? 'page' : undefined}
                  className={`btn btn-sm ${safePage === p ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Page suivante"
              className="btn btn-sm btn-ghost"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
