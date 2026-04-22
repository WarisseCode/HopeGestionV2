import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Home, Users, Building2, FileText, Settings, CreditCard, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getImmeubles } from '../../api/bienApi';
import { getLocataires } from '../../api/locataireApi';

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ReactNode;
  category: string;
}

const staticIndex: SearchItem[] = [
  { id: 'dashboard', title: 'Tableau de bord', url: '/dashboard', icon: <Home size={18} />, category: 'Navigation' },
  { id: 'biens', title: 'Mes Biens & Immeubles', url: '/dashboard/biens', icon: <Building2 size={18} />, category: 'Gestion' },
  { id: 'locataires', title: 'Locataires', url: '/dashboard/locataires', icon: <Users size={18} />, category: 'Gestion' },
  { id: 'locations', title: 'Locations & Baux', url: '/dashboard/locations', icon: <FileText size={18} />, category: 'Gestion' },
  { id: 'finances', title: 'Finances & Transactions', url: '/dashboard/finances', icon: <CreditCard size={18} />, category: 'Finance' },
  { id: 'documents', title: 'Documents', url: '/dashboard/documents', icon: <FileText size={18} />, category: 'Outils' },
  { id: 'parametres', title: 'Paramètres', url: '/dashboard/parametres', icon: <Settings size={18} />, category: 'Système' },
  { id: 'mon-compte', title: 'Mon Profil', url: '/dashboard/mon-compte', icon: <Users size={18} />, category: 'Système' },
  { id: 'alertes', title: 'Alertes & Notifications', url: '/dashboard/alertes', icon: <Settings size={18} />, category: 'Système' },
  { id: 'mobile-money', title: 'Mobile Money', url: '/dashboard/mobile-money', icon: <CreditCard size={18} />, category: 'Finance' },
  { id: 'quittances', title: 'Quittances', url: '/dashboard/quittances', icon: <FileText size={18} />, category: 'Outils' },
  { id: 'calendrier', title: 'Calendrier', url: '/dashboard/calendrier', icon: <FileText size={18} />, category: 'Outils' },
  { id: 'reservations', title: 'Réservations', url: '/dashboard/reservations', icon: <FileText size={18} />, category: 'Gestion' },
  { id: 'interventions', title: 'Interventions', url: '/dashboard/interventions', icon: <Settings size={18} />, category: 'Outils' },
  { id: 'rapports', title: 'Rapports', url: '/dashboard/rapports', icon: <FileText size={18} />, category: 'Finance' },
];

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchPalette: React.FC<SearchPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveResults, setLiveResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const staticResults = query === ''
    ? []
    : staticIndex.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );

  const allResults = [...staticResults, ...liveResults];

  const groupedResults = allResults.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  const flattenedResults = Object.values(groupedResults).flat();

  const fetchLiveResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setLiveResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const [immeubles, locataires] = await Promise.allSettled([
        getImmeubles(),
        getLocataires(),
      ]);

      const items: SearchItem[] = [];
      const lq = q.toLowerCase();

      if (immeubles.status === 'fulfilled') {
        const data = Array.isArray(immeubles.value) ? immeubles.value : (immeubles.value as any)?.data ?? [];
        data
          .filter((b: any) => b.nom?.toLowerCase().includes(lq) || b.ville?.toLowerCase().includes(lq))
          .slice(0, 5)
          .forEach((b: any) => {
            items.push({
              id: `bien-${b.id}`,
              title: b.nom,
              subtitle: b.ville,
              url: '/dashboard/biens',
              icon: <Building2 size={18} />,
              category: 'Biens',
            });
          });
      }

      if (locataires.status === 'fulfilled') {
        const data = Array.isArray(locataires.value) ? locataires.value : (locataires.value as any)?.data ?? [];
        data
          .filter((l: any) => {
            const name = `${l.nom ?? ''} ${l.prenoms ?? ''}`.toLowerCase();
            return name.includes(lq) || l.email?.toLowerCase().includes(lq);
          })
          .slice(0, 5)
          .forEach((l: any) => {
            items.push({
              id: `locataire-${l.id}`,
              title: `${l.nom ?? ''} ${l.prenoms ?? ''}`.trim(),
              subtitle: l.email,
              url: `/dashboard/locataires/${l.id}`,
              icon: <Users size={18} />,
              category: 'Locataires',
            });
          });
      }

      setLiveResults(items);
    } catch {
      setLiveResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => fetchLiveResults(query), 300);
    } else {
      setLiveResults([]);
      setIsSearching(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchLiveResults]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
      setLiveResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => prev < flattenedResults.length - 1 ? prev + 1 : prev);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (flattenedResults[selectedIndex]) {
            navigate(flattenedResults[selectedIndex].url);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flattenedResults, selectedIndex, navigate, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 sm:pt-32">
        {/* Backdrop overlay */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           onClick={onClose}
           className="fixed inset-0 bg-base-300/60 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
           role="dialog"
           aria-modal="true"
           aria-label="Recherche rapide"
           initial={{ opacity: 0, scale: 0.95, y: -20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: -20 }}
           transition={{ duration: 0.15, ease: "easeOut" }}
           className="relative w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl overflow-hidden border border-base-200 mx-4"
        >
          {/* Input Header */}
          <div className="flex items-center px-4 py-4 border-b border-base-200 gap-3">
            {isSearching
              ? <Loader2 size={22} className="text-primary animate-spin shrink-0" />
              : <Search size={22} className="text-base-content/50 shrink-0" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une page, un bien, un locataire..."
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-base-content/50 text-base-content"
            />
            {query && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setQuery('')}
                className="p-1 rounded-md hover:bg-base-200 transition-colors"
              >
                <X size={18} className="text-base-content/50" />
              </button>
            )}
            <div className="hidden sm:flex border border-base-200 rounded px-2 py-1 text-xs text-base-content/60 font-mono">
              ESC
            </div>
          </div>

          {/* Results Area */}
          <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-base-300">
            {query === '' ? (
              <div className="px-4 py-10 text-center text-base-content/50">
                <Search size={32} className="mx-auto mb-3 opacity-20" />
                <p>Tapez pour rechercher dans les pages, biens et locataires...</p>
              </div>
            ) : flattenedResults.length === 0 && !isSearching ? (
              <div className="px-4 py-10 text-center text-base-content/50">
                <p>Aucun résultat pour "{query}"</p>
              </div>
            ) : (
              Object.entries(groupedResults).map(([category, items]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-3 py-2 text-xs font-semibold text-base-content/60 uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {items.map(item => {
                      const index = flattenedResults.indexOf(item);
                      const isSelected = index === selectedIndex;

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            navigate(item.url);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-base-200 text-base-content/80'
                          }`}
                        >
                          <div className={`mr-4 p-2 rounded-lg shrink-0 ${isSelected ? 'bg-primary/20' : 'bg-base-200'}`}>
                            {item.icon}
                          </div>
                          <div className="text-left flex-1 flex flex-col min-w-0">
                            <span className={`font-medium truncate ${isSelected ? 'text-primary' : 'text-base-content'}`}>
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <span className="text-xs text-base-content/50 truncate">{item.subtitle}</span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="hidden sm:flex pl-3 shrink-0">
                              <span className="text-xs font-medium text-primary bg-primary/20 px-2 py-1 rounded">Aller</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SearchPalette;
