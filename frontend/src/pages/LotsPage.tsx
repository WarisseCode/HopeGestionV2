// frontend/src/pages/LotsPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  LayoutGrid, 
  List,
  MapPin,
  Users,
  DollarSign
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { getImmeubles, getLots, saveLot, deleteLot } from '../api/propertyApi';
import type { Immeuble, Lot } from '../api/propertyApi';

const LotsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data
  const [lots, setLots] = useState<Lot[]>([]);
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterImmeuble, setFilterImmeuble] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatut, setFilterStatut] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLot, setEditingLot] = useState<Partial<Lot>>({
    reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lotsData, immeublesData] = await Promise.all([
        getLots(),
        getImmeubles()
      ]);
      setLots(lotsData);
      setImmeubles(immeublesData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      setError(null);
      if (!editingLot.building_id) {
        throw new Error('Veuillez sélectionner un immeuble');
      }
      await saveLot(editingLot);
      setSuccess('Lot enregistré avec succès');
      setShowModal(false);
      setEditingLot({ reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce lot ?')) return;
    try {
      await deleteLot(id);
      setSuccess('Lot supprimé');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter lots
  const filteredLots = lots.filter(lot => {
    const matchSearch = !searchTerm || 
      lot.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.immeuble?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchImmeuble = !filterImmeuble || lot.building_id === filterImmeuble;
    const matchType = !filterType || lot.type === filterType;
    const matchStatut = !filterStatut || lot.statut === filterStatut;
    
    return matchSearch && matchImmeuble && matchType && matchStatut;
  });

  // Stats
  const totalLots = lots.length;
  const lotsOccupes = lots.filter(l => l.statut === 'occupe' || l.statut === 'occupé').length;
  const lotsVacants = lots.filter(l => l.statut === 'libre' || !l.statut).length;
  const loyerTotal = lots.reduce((sum, l) => sum + (l.loyer || 0), 0);

  if (loading) {
    return <div className="p-8 flex justify-center"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des Lots</h1>
        <Button variant="primary" onClick={() => {
          setEditingLot({ reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '' });
          setShowModal(true);
        }}>
          <Plus size={18} className="mr-2" />
          Nouveau Lot
        </Button>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-base-100 rounded-xl border border-base-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Home className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLots}</p>
              <p className="text-xs text-base-content/60">Lots totaux</p>
            </div>
          </div>
        </div>
        <div className="bg-base-100 rounded-xl border border-base-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Users className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{lotsOccupes}</p>
              <p className="text-xs text-base-content/60">Occupés</p>
            </div>
          </div>
        </div>
        <div className="bg-base-100 rounded-xl border border-base-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Home className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{lotsVacants}</p>
              <p className="text-xs text-base-content/60">Vacants</p>
            </div>
          </div>
        </div>
        <div className="bg-base-100 rounded-xl border border-base-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{loyerTotal.toLocaleString()}</p>
              <p className="text-xs text-base-content/60">Loyer total FCFA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-1 block">Recherche</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input 
                type="text"
                placeholder="Référence ou immeuble..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="min-w-[150px]">
            <Select
              label="Immeuble"
              value={filterImmeuble}
              onChange={(e) => setFilterImmeuble(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="Tous"
              options={immeubles.map(i => ({ value: i.id, label: i.nom }))}
            />
          </div>
          <div className="min-w-[120px]">
            <Select
              label="Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              placeholder="Tous"
              options={[
                { value: 'Appartement', label: 'Appartement' },
                { value: 'Studio', label: 'Studio' },
                { value: 'Chambre', label: 'Chambre' },
                { value: 'Boutique', label: 'Boutique' },
                { value: 'Bureau', label: 'Bureau' }
              ]}
            />
          </div>
          <div className="min-w-[120px]">
            <Select
              label="Statut"
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              placeholder="Tous"
              options={[
                { value: 'libre', label: 'Libre' },
                { value: 'occupe', label: 'Occupé' },
                { value: 'reserve', label: 'Réservé' }
              ]}
            />
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`btn btn-ghost btn-sm btn-square ${viewMode === 'grid' ? 'btn-active' : ''}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`btn btn-ghost btn-sm btn-square ${viewMode === 'list' ? 'btn-active' : ''}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-base-content/60">
        {filteredLots.length} lot(s) trouvé(s)
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLots.map(lot => (
            <div key={lot.id} className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
              <div className="card-body p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{lot.reference}</h3>
                    <p className="text-sm text-base-content/60">{lot.immeuble}</p>
                  </div>
                  <span className={`badge ${lot.statut === 'libre' ? 'badge-success' : lot.statut === 'occupe' || lot.statut === 'occupé' ? 'badge-neutral' : 'badge-warning'}`}>
                    {lot.statut || 'libre'}
                  </span>
                </div>
                <div className="divider my-2"></div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-base-content/50 block">Type</span>
                    <span className="font-medium">{lot.type}</span>
                  </div>
                  <div>
                    <span className="text-xs text-base-content/50 block">Étage</span>
                    <span className="font-medium">{lot.etage || 'RDC'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-base-content/50 block">Surface</span>
                    <span className="font-medium">{lot.superficie} m²</span>
                  </div>
                  <div>
                    <span className="text-xs text-base-content/50 block">Pièces</span>
                    <span className="font-medium">{lot.nbPieces}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-base-200 flex justify-between items-center">
                  <div>
                    <span className="text-lg font-bold text-primary">{lot.loyer?.toLocaleString()} FCFA</span>
                    <span className="text-xs text-base-content/50 block">/ mois</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingLot(lot); setShowModal(true); }} className="btn btn-ghost btn-sm btn-square">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(lot.id)} className="btn btn-ghost btn-sm btn-square text-error">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredLots.length === 0 && (
            <div className="col-span-full text-center py-10 opacity-50">Aucun lot trouvé.</div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Type</th>
                  <th>Immeuble</th>
                  <th>Surface</th>
                  <th>Loyer</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.map(lot => (
                  <tr key={lot.id}>
                    <td className="font-bold">{lot.reference}</td>
                    <td>{lot.type}</td>
                    <td>
                      <div className="font-medium">{lot.immeuble}</div>
                      <div className="text-xs opacity-50">Étage {lot.etage || 'RDC'}</div>
                    </td>
                    <td>{lot.superficie} m²</td>
                    <td className="font-mono">{lot.loyer?.toLocaleString()} FCFA</td>
                    <td>
                      <span className={`badge ${lot.statut === 'libre' ? 'badge-success' : 'badge-neutral'}`}>
                        {lot.statut || 'libre'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingLot(lot); setShowModal(true); }} className="btn btn-ghost btn-xs">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(lot.id)} className="btn btn-ghost btn-xs text-error">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLots.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-4 opacity-50">Aucun lot trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLot.id ? 'Modifier Lot' : 'Nouveau Lot'}
        footer={
          <Button variant="primary" className="w-full" onClick={handleSave}>
            Enregistrer
          </Button>
        }
      >
        <div className="space-y-4">
          <Select
            label="Immeuble de rattachement"
            value={editingLot.building_id}
            onChange={(e) => setEditingLot({...editingLot, building_id: parseInt(e.target.value)})}
            placeholder="Sélectionner un immeuble"
            options={immeubles.map(b => ({
              value: b.id,
              label: b.nom
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Référence (ex: A01)" value={editingLot.reference} onChange={(e) => setEditingLot({...editingLot, reference: e.target.value})} />
            <Select
              label="Type"
              value={editingLot.type}
              onChange={(e) => setEditingLot({...editingLot, type: e.target.value})}
              options={[
                { value: 'Appartement', label: 'Appartement' },
                { value: 'Studio', label: 'Studio' },
                { value: 'Chambre', label: 'Chambre' },
                { value: 'Boutique', label: 'Boutique' },
                { value: 'Bureau', label: 'Bureau' }
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Loyer (FCFA)" type="number" value={editingLot.loyer} onChange={(e) => setEditingLot({...editingLot, loyer: parseFloat(e.target.value)})} />
            <Input label="Charges (FCFA)" type="number" value={editingLot.charges} onChange={(e) => setEditingLot({...editingLot, charges: parseFloat(e.target.value)})} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Étage" value={editingLot.etage} onChange={(e) => setEditingLot({...editingLot, etage: e.target.value})} />
            <Input label="Surface (m²)" type="number" value={editingLot.superficie} onChange={(e) => setEditingLot({...editingLot, superficie: parseFloat(e.target.value)})} />
            <Input label="Nb Pièces" type="number" value={editingLot.nbPieces} onChange={(e) => setEditingLot({...editingLot, nbPieces: parseInt(e.target.value)})} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LotsPage;
