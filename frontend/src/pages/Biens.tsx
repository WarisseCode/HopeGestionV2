// frontend/src/pages/Biens.tsx
// Orchestrateur mince — délègue state/logique à useBiens, rendu complexe aux sous-composants.
import React from 'react';
import {
  Building2, Home, Plus, Edit3, Trash2, MapPin,
  ArrowLeft, LayoutGrid, List, X, ChevronLeft, ChevronRight, UserPlus,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import FilterPanel from '../components/ui/FilterPanel';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ImmeubleForm from '../components/biens/ImmeubleForm';
import LotForm from '../components/biens/LotForm';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import AssignmentForm from '../components/biens/AssignmentForm';
import ImmeubleCard from '../components/biens/ImmeubleCard';
import LotCard from '../components/biens/LotCard';
import ImmeubleDetailModal from '../components/biens/ImmeubleDetailModal';
import LotDetailModal from '../components/biens/LotDetailModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { saveLot } from '../api/bienApi';
import type { Immeuble, Lot } from '../api/bienApi';
import { useBiens } from '../hooks/useBiens';
import { getPlaceholderImage, getLotStatut } from '../utils/bienUtils';
import toast from 'react-hot-toast';

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// ── Skeleton loaders (presentational only, stays local) ──────────────────────

const GridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="bg-base-100 rounded-2xl shadow-lg border border-base-200 overflow-hidden animate-pulse">
        <SkeletonLoader variant="rectangular" height={192} />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SkeletonLoader variant="rectangular" height={60} className="rounded-xl" />
            <SkeletonLoader variant="rectangular" height={60} className="rounded-xl" />
          </div>
          <SkeletonLoader variant="text" width="60%" />
        </div>
      </div>
    ))}
  </div>
);

const TableSkeleton = () => (
  <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead className="bg-base-200/50">
          <tr>
            {['Référence', 'Type', 'Immeuble', 'Loyer', 'Statut', 'Actions'].map(h => (
              <th key={h} className="py-4 text-xs uppercase font-bold text-base-content/50" scope="col">
                <SkeletonLoader variant="text" width={80} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i} className="border-b border-base-200">
              {[1, 2, 3, 4, 5, 6].map(j => (
                <td key={j} className="py-4">
                  <SkeletonLoader variant="text" width={j === 6 ? 60 : 100} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);

// ── Main component ────────────────────────────────────────────────────────────

const Biens: React.FC = () => {
  const b = useBiens();
  const { t } = useTranslation();

  // ── Form views ──────────────────────────────────────────────────────────

  if (b.formView === 'immeuble') {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => b.setFormView(null)} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('properties.backToPortfolio')}</span>
          </button>
          <div className="h-5 w-px bg-base-300" />
          <h1 className="text-xl font-bold text-base-content/90">
            {b.editingImmeuble.id ? t('properties.editBuilding') : t('properties.newBuilding')}
          </h1>
        </div>
        {b.error   && <Alert variant="error"   onClose={() => b.setError(null)}>{b.error}</Alert>}
        {b.success && <Alert variant="success" onClose={() => b.setSuccess(null)}>{b.success}</Alert>}
        <ImmeubleForm
          immeuble={b.editingImmeuble}
          proprietaires={b.proprietaires}
          gestionnaires={b.users}
          onSave={async (data) => {
            const saved = await b.handleSaveImmeuble(data);
            if (saved) b.setFormView(null);
          }}
          onSaveAndAddLots={async (data) => {
            const saved = await b.handleSaveImmeuble(data);
            if (saved?.id) {
              b.setActiveTab('lots');
              b.setEditingLot({ reference: '', type: 'Appartement', building_id: saved.id, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '' });
              b.setFormView('lot');
            }
          }}
          onCancel={() => b.setFormView(null)}
        />
      </div>
    );
  }

  if (b.formView === 'lot') {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => b.setFormView(null)} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('properties.backToPortfolio')}</span>
          </button>
          <div className="h-5 w-px bg-base-300" />
          <h1 className="text-xl font-bold text-base-content/90">
            {b.editingLot.id ? t('properties.editLot') : t('properties.newLot')}
          </h1>
        </div>
        {b.error   && <Alert variant="error"   onClose={() => b.setError(null)}>{b.error}</Alert>}
        {b.success && <Alert variant="success" onClose={() => b.setSuccess(null)}>{b.success}</Alert>}
        <LotForm
          lot={b.editingLot}
          immeubles={b.immeubles}
          onSave={async (data) => {
            await saveLot(data);
            await b.fetchData();
            b.setFormView(null);
            b.setSuccess(t('properties.lotSaved'));
          }}
          onStatusChange={async (data, newStatus) => {
            if (['occupe', 'vendu', 'reserve'].includes(newStatus)) {
              b.setEditingLot(data as Lot);
              b.setActiveAssignmentLot(data as Lot);
              b.setFormView('assignment');
            } else {
              await saveLot({ ...data, statut: newStatus });
              await b.fetchData();
              b.setFormView(null);
              b.setSuccess(t('properties.lotStatusChanged', { status: newStatus }));
            }
          }}
          onCancel={() => b.setFormView(null)}
          loading={b.loading}
        />
      </div>
    );
  }

  if (b.formView === 'assignment') {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => b.setFormView(null)} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('properties.backToPortfolio')}</span>
          </button>
          <div className="h-5 w-px bg-base-300" />
          <h1 className="text-xl font-bold text-base-content/90">{t('properties.newAssignment')}</h1>
        </div>
        {b.error && <Alert variant="error" onClose={() => b.setError(null)}>{b.error}</Alert>}
        {b.activeAssignmentLot && (
          <AssignmentForm
            lot={b.activeAssignmentLot}
            onSuccess={async () => {
              await b.fetchData();
              b.setFormView(null);
              b.setSuccess(t('properties.assignmentSuccess'));
            }}
            onCancel={() => b.setFormView(null)}
          />
        )}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            {t('nav.parcImmobilier')} <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">{t('properties.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            placeholder={t('properties.searchPlaceholder')}
            value={b.searchQuery}
            onChange={b.setSearchQuery}
            className="w-64"
          />
          {b.canWrite && (
            <div className="relative group" title={b.isLimitReached ? t('properties.limitReachedTitle') : ''}>
              <Button
                variant="primary"
                disabled={b.isLimitReached}
                className={`rounded-full px-6 shadow-lg shadow-primary/20 transition-all font-semibold ${b.isLimitReached ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-primary/40'}`}
                onClick={() => {
                  if (b.isLimitReached) { toast(t('properties.limitReachedToast'), { icon: '👑' }); return; }
                  if (b.activeTab === 'immeubles') b.openNewImmeuble();
                  else b.openNewLot();
                }}
              >
                <Plus size={18} className="mr-2" />
                {b.activeTab === 'immeubles' ? t('properties.newBuilding') : t('properties.newLot')}
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Alerts */}
      {b.error   && <Alert variant="error"   onClose={() => b.setError(null)}>{b.error}</Alert>}
      {b.success && <Alert variant="success" onClose={() => b.setSuccess(null)}>{b.success}</Alert>}

      {/* Tabs & Controls */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-base-100 rounded-2xl p-3 shadow-sm border border-base-200">
        <div className="flex p-1 bg-base-300/50 rounded-xl">
          {(['immeubles', 'lots'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { b.setActiveTab(tab); b.setFilterValues({}); }}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                b.activeTab === tab ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
              }`}
            >
              {tab === 'immeubles' ? <Building2 size={18} /> : <Home size={18} />}
              {tab === 'immeubles' ? t('properties.buildings') : t('properties.lots')}
              <span className="ml-1 px-2 py-0.5 rounded-full bg-base-300 text-xs">
                {tab === 'immeubles' ? b.immeubles.length : b.lots.length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* View mode */}
          <div className="flex bg-base-300 rounded-lg p-1">
            {(['grid', 'list'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => b.setViewMode(mode)}
                className={`p-2 rounded-md transition-all ${b.viewMode === mode ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/50 hover:text-base-content/70'}`}
                title={mode === 'grid' ? t('common.gridView') : t('common.listView')}
              >
                {mode === 'grid' ? <LayoutGrid size={18} /> : <List size={18} />}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <Button
            variant={b.showFilters ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => b.setShowFilters(!b.showFilters)}
            className={b.showFilters ? '' : 'text-base-content/60'}
          >
            {b.showFilters && <X size={16} className="mr-1" />}
            {t('common.filters')}
            {Object.keys(b.filterValues).length > 0 && (
              <span className="ml-2 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {Object.keys(b.filterValues).length}
              </span>
            )}
          </Button>

          <div className="h-6 w-px bg-base-300" />
          <span className="text-sm font-semibold text-base-content/60">{t('common.results', { count: b.currentData.length })}</span>
        </div>
      </motion.div>

      {/* Filter panel */}
      <AnimatePresence>
        {b.showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <FilterPanel
              filters={b.activeTab === 'immeubles' ? b.dynamicImmeubleFilters : b.lotFilters}
              values={b.filterValues}
              onChange={b.setFilterValues}
              onClear={() => b.setFilterValues({})}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {b.loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {b.viewMode === 'grid' ? <GridSkeleton /> : <TableSkeleton />}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {b.activeTab === 'immeubles' ? (
              b.viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {b.paginatedData.length === 0 ? (
                    <EmptyState
                      icon={<Building2 size={40} />}
                      title={t('properties.noBuildingsFound')}
                      description={t('properties.noBuildingsDesc')}
                      actionLabel={b.canWrite ? t('properties.addBuilding') : undefined}
                      onAction={b.canWrite ? () => b.openNewImmeuble() : undefined}
                      className="mt-6"
                    />
                  ) : (
                    (b.paginatedData as Immeuble[]).map(immeuble => (
                      <ImmeubleCard
                        key={immeuble.id}
                        immeuble={immeuble}
                        lots={b.lots}
                        canWrite={b.canWrite}
                        onEdit={() => { b.setEditingImmeuble(immeuble); b.setFormView('immeuble'); }}
                        onDelete={() => b.handleDeleteImmeuble(immeuble.id)}
                        onDetail={() => b.setDetailImmeuble(immeuble)}
                        onGallery={() => { b.setGallerySelectedBuilding(immeuble); b.setShowGalleryModal(true); }}
                      />
                    ))
                  )}
                </div>
              ) : (
                // Immeubles — list view
                <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead className="bg-base-200/50">
                        <tr>
                          <th className="py-4 pl-6">{t('properties.colPhoto')}</th>
                          <th className="py-4">{t('common.name')}</th>
                          <th className="py-4 hidden md:table-cell">{t('properties.colCity')}</th>
                          <th className="py-4 hidden sm:table-cell">{t('properties.colNbLots')}</th>
                          <th className="py-4 hidden lg:table-cell">{t('dashboard.occupancy')}</th>
                          <th className="py-4 pr-6 text-right">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(b.paginatedData as Immeuble[]).map(immeuble => (
                          <tr key={immeuble.id} className="hover:bg-base-200/50 transition-colors">
                            <td className="pl-6">
                              <div
                                className="avatar h-12 w-16 rounded cursor-pointer overflow-hidden relative shadow-sm"
                                onClick={() => { b.setGallerySelectedBuilding(immeuble); b.setShowGalleryModal(true); }}
                                title={t('properties.openGallery')}
                              >
                                <img
                                  src={immeuble.photo || (immeuble.photos?.length ? immeuble.photos[0] : getPlaceholderImage(immeuble.id))}
                                  alt={`${immeuble.nom} — ${immeuble.ville}`}
                                  className="h-full w-full object-cover transition-transform hover:scale-110"
                                />
                              </div>
                            </td>
                            <td className="font-bold text-base-content/90">{immeuble.nom}</td>
                            <td className="text-base-content/70 hidden md:table-cell">{immeuble.ville}</td>
                            <td className="font-mono hidden sm:table-cell">{immeuble.nbLots || 0}</td>
                            <td className="hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <progress className="progress progress-primary w-20" value={immeuble.occupation || 0} max="100" />
                                <span className="text-xs font-bold">{immeuble.occupation || 0}%</span>
                              </div>
                            </td>
                            <td className="pr-6 text-right">
                              <div className="flex justify-end gap-1">
                                {b.canWrite && <button type="button" title={t('common.edit')} onClick={() => { b.setEditingImmeuble(immeuble); b.setFormView('immeuble'); }} className="btn btn-ghost btn-xs btn-square"><Edit3 size={14} /></button>}
                                {b.canWrite && <button type="button" title={t('common.delete')} onClick={() => b.handleDeleteImmeuble(immeuble.id)} className="btn btn-ghost btn-xs btn-square text-error"><Trash2 size={14} /></button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            ) : (
              b.viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {(b.paginatedData as Lot[]).length === 0 ? (
                    <div className="col-span-full text-center py-12 text-base-content/50">
                      <Home size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="font-medium">{t('properties.noLotsFound')}</p>
                    </div>
                  ) : (
                    (b.paginatedData as Lot[]).map(lot => (
                      <LotCard
                        key={lot.id}
                        lot={lot}
                        canWrite={b.canWrite}
                        onEdit={e => { e.stopPropagation(); b.setEditingLot(lot); b.setFormView('lot'); }}
                        onDetail={() => b.setDetailLot(lot)}
                      />
                    ))
                  )}
                </div>
              ) : (
                // Lots — list view
                <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead className="bg-base-200/50">
                        <tr>
                          <th className="py-4 pl-6">{t('properties.colPhoto')}</th>
                          <th className="py-4">{t('properties.colReference')}</th>
                          <th className="py-4 hidden md:table-cell">{t('properties.colBuilding')}</th>
                          <th className="py-4">{t('common.status')}</th>
                          <th className="py-4 hidden sm:table-cell">{t('properties.colRentPrice')}</th>
                          <th className="py-4 pr-6 text-right">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(b.paginatedData as Lot[]).length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-12 text-base-content/50">{t('properties.noLotsFound')}</td></tr>
                        ) : (
                          (b.paginatedData as Lot[]).map(lot => {
                            const s = getLotStatut(lot.statut);
                            return (
                              <tr key={lot.id} className="hover:bg-base-200/50 transition-colors group cursor-pointer" onClick={() => b.setDetailLot(lot)}>
                                <td className="pl-6">
                                  <div className="avatar h-10 w-16 rounded overflow-hidden shadow-sm">
                                    <img
                                      src={lot.photos?.length ? lot.photos[0] : getPlaceholderImage(lot.id)}
                                      alt={lot.reference}
                                      className="h-full w-full object-cover transition-transform hover:scale-110"
                                    />
                                  </div>
                                </td>
                                <td className="font-bold text-base-content/90">{lot.reference}</td>
                                <td className="text-base-content/70 hidden md:table-cell">{lot.immeuble}</td>
                                <td>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.pill}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                    {t(s.labelKey)}
                                  </span>
                                </td>
                                <td className="font-mono font-medium text-base-content/80 hidden sm:table-cell">
                                  {lot.type === 'Vente' || lot.prix_vente
                                    ? <span className="text-teal-700">{lot.prix_vente?.toLocaleString()} FCFA ({t('properties.sale')})</span>
                                    : <span>{lot.loyer?.toLocaleString()} FCFA/{t('properties.perMonth')}</span>
                                  }
                                </td>
                                <td className="pr-6 text-right">
                                  <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {b.canWrite && (lot.statut === 'disponible' || lot.statut === 'libre') && (
                                      <button
                                        type="button"
                                        title={t('properties.assign')}
                                        onClick={e => { e.stopPropagation(); b.setEditingLot(lot); b.setActiveAssignmentLot(lot); b.setFormView('assignment'); }}
                                        className="btn btn-ghost btn-xs btn-square text-primary tooltip tooltip-left"
                                        data-tip={t('properties.assign')}
                                      >
                                        <UserPlus size={14} />
                                      </button>
                                    )}
                                    {b.canWrite && <button type="button" title={t('common.edit')} onClick={e => { e.stopPropagation(); b.setEditingLot(lot); b.setFormView('lot'); }} className="btn btn-ghost btn-xs btn-square"><Edit3 size={14} /></button>}
                                    {b.canWrite && <button type="button" title={t('common.delete')} onClick={e => { e.stopPropagation(); b.handleDeleteLot(lot.id); }} className="btn btn-ghost btn-xs btn-square text-error"><Trash2 size={14} /></button>}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            )}

            {/* Pagination */}
            {b.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button type="button" title={t('common.prevPage')} onClick={() => b.setCurrentPage(p => Math.max(1, p - 1))} disabled={b.currentPage === 1} className="btn btn-ghost btn-sm btn-circle disabled:opacity-40">
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: b.totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    aria-label={t('common.page', { number: page })}
                    onClick={() => b.setCurrentPage(page)}
                    className={`btn btn-sm btn-circle ${b.currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {page}
                  </button>
                ))}
                <button type="button" title={t('common.nextPage')} onClick={() => b.setCurrentPage(p => Math.min(b.totalPages, p + 1))} disabled={b.currentPage === b.totalPages} className="btn btn-ghost btn-sm btn-circle disabled:opacity-40">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ImmeubleDetailModal
        immeuble={b.detailImmeuble}
        lots={b.lots}
        canWrite={b.canWrite}
        onClose={() => b.setDetailImmeuble(null)}
        onEdit={() => { b.setEditingImmeuble(b.detailImmeuble!); b.setDetailImmeuble(null); b.setFormView('immeuble'); }}
        onGallery={() => { b.setGallerySelectedBuilding(b.detailImmeuble); b.setShowGalleryModal(true); }}
      />

      <LotDetailModal
        lot={b.detailLot}
        locations={b.locations}
        canWrite={b.canWrite}
        onClose={() => b.setDetailLot(null)}
        onEdit={() => { b.setEditingLot(b.detailLot!); b.setDetailLot(null); b.setFormView('lot'); }}
        onAssign={() => { b.setActiveAssignmentLot(b.detailLot!); b.setEditingLot(b.detailLot!); b.setDetailLot(null); b.setFormView('assignment'); }}
      />

      {/* Gallery modal */}
      <Modal
        isOpen={b.showGalleryModal}
        onClose={() => b.setShowGalleryModal(false)}
        title={t('properties.galleryTitle', { name: b.gallerySelectedBuilding?.nom })}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {b.gallerySelectedBuilding?.photos?.length ? (
              b.gallerySelectedBuilding.photos.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-base-200 shadow-sm hover:shadow-md transition-shadow">
                  <img src={url} alt={`${t('properties.photo')} ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-base-content/50">
                <p>{t('properties.noPhotos')}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => b.setShowGalleryModal(false)}>{t('common.close')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={b.confirmConfig.isOpen}
        onClose={b.closeConfirm}
        onConfirm={() => { b.confirmConfig.action(); b.closeConfirm(); }}
        title={b.confirmConfig.title}
        message={b.confirmConfig.message}
        type={b.confirmConfig.type}
      />
    </motion.div>
  );
};

export default Biens;
