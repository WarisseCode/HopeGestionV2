import React, { useState, useEffect } from 'react';
import { Building2, Home, MapPin, Plus, Edit3, Trash2, LayoutGrid, List, Users, TrendingUp, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { getImmeubles, getLots, saveImmeuble, saveLot, deleteImmeuble, deleteLot } from '../api/propertyApi';
import type { Immeuble, Lot } from '../api/propertyApi';
import { getProprietaires } from '../api/accountApi';
import type { Proprietaire } from '../api/accountApi';

const BiensPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'immeubles' | 'lots'>('immeubles');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ... (rest of the state unchanged)
  // Data
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([]);

  // Modal State
  const [showImmeubleModal, setShowImmeubleModal] = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);

  // Edit State
  const [editingImmeuble, setEditingImmeuble] = useState<Partial<Immeuble>>({
    nom: '', type: 'Maison', adresse: '', ville: '', pays: 'Bénin', description: '', owner_id: 0, photo: ''
  });
  const [editingLot, setEditingLot] = useState<Partial<Lot>>({
    reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '', photos: []
  });

  const fetchData = async () => {
    try {
      if(immeubles.length === 0) setLoading(true);
      const [immeublesData, lotsData, propsData] = await Promise.all([
        getImmeubles(),
        getLots(),
        getProprietaires()
      ]);
      setImmeubles(immeublesData);
      setLots(lotsData);
      setProprietaires(propsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveImmeuble = async () => {
    try {
      setError(null);
      if (!editingImmeuble.owner_id) {
        throw new Error('Veuillez sélectionner un propriétaire');
      }
      await saveImmeuble(editingImmeuble);
      setSuccess('Immeuble enregistré avec succès');
      setShowImmeubleModal(false);
      setEditingImmeuble({ nom: '', type: 'Maison', adresse: '', ville: '', pays: 'Bénin', description: '', owner_id: 0, photo: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveLot = async () => {
    try {
      setError(null);
      if (!editingLot.building_id) {
        throw new Error('Veuillez sélectionner un immeuble');
      }
      await saveLot(editingLot);
      setSuccess('Lot enregistré avec succès');
      setShowLotModal(false);
      setEditingLot({ reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '', photos: [] });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteImmeuble = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet immeuble ?')) return;
    try {
      await deleteImmeuble(id);
      setSuccess('Immeuble supprimé');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteLot = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce lot ?')) return;
    try {
      await deleteLot(id);
      setSuccess('Lot supprimé');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading && immeubles.length === 0) {
    return <div className="p-8 flex justify-center"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des Biens</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => {
             setEditingImmeuble({ nom: '', type: 'Maison', adresse: '', ville: '', pays: 'Bénin', description: '', owner_id: 0, photo: '' });
             setShowImmeubleModal(true);
          }}>
            <Plus size={18} className="mr-2" />
            Nouvel Immeuble
          </Button>
          <Button variant="primary" onClick={() => {
             setEditingLot({ reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '', photos: [] });
             setShowLotModal(true);
          }}>
            <Plus size={18} className="mr-2" />
            Nouveau Lot
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* KPIs Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-base-100 rounded-xl border border-base-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{immeubles.length}</p>
              <p className="text-xs text-base-content/60">Immeubles</p>
            </div>
          </div>
        </div>
        <div className="bg-base-100 rounded-xl border border-base-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Home className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{lots.length}</p>
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
              <p className="text-2xl font-bold">{lots.filter(l => l.statut === 'occupe' || l.statut === 'occupé').length}</p>
              <p className="text-xs text-base-content/60">Lots occupés</p>
            </div>
          </div>
        </div>
        <div className="bg-base-100 rounded-xl border border-base-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <AlertCircle className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{lots.filter(l => l.statut === 'libre' || !l.statut).length}</p>
              <p className="text-xs text-base-content/60">Lots vacants</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'immeubles' ? 'text-primary border-b-2 border-primary' : 'text-base-content/60'}`}
          onClick={() => setActiveTab('immeubles')}
        >
          <div className="flex items-center gap-2"><Building2 size={18} /> Immeubles</div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'lots' ? 'text-primary border-b-2 border-primary' : 'text-base-content/60'}`}
          onClick={() => setActiveTab('lots')}
        >
          <div className="flex items-center gap-2"><Home size={18} /> Lots</div>
        </button>
        
        {/* View Mode Toggle */}
        <div className="ml-auto flex items-center gap-1 px-2">
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

      {activeTab === 'immeubles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {immeubles.map(building => (
            <div key={building.id} className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
              <figure className="h-48 bg-base-200 relative">
                {building.photo ? (
                  <img src={building.photo} alt={building.nom} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-base-content/30">
                    <Building2 size={48} />
                  </div>
                )}
                <div className="absolute top-2 right-2 badge badge-neutral">{building.type}</div>
              </figure>
              <div className="card-body p-4">
                <h2 className="card-title text-lg flex justify-between">
                  {building.nom}
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingImmeuble(building); setShowImmeubleModal(true); }} className="btn btn-ghost btn-xs btn-square"><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteImmeuble(building.id)} className="btn btn-ghost btn-xs btn-square text-error"><Trash2 size={14} /></button>
                  </div>
                </h2>
                <div className="text-sm text-base-content/70 flex items-center gap-1 mb-2">
                  <MapPin size={14} /> {building.ville}, {building.pays}
                </div>
                <div className="divider my-1"></div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                   <div>
                      <span className="text-xs uppercase text-base-content/50 block">Propriétaire</span>
                      <span className="font-medium">{building.owner_name || 'Inconnu'}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-xs uppercase text-base-content/50 block">Lots</span>
                      <span className="font-medium">{building.nbLots || 0} ({building.statut})</span>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {immeubles.length === 0 && (
             <div className="col-span-full text-center py-10 opacity-50">Aucun immeuble trouvé.</div>
          )}
        </div>
      )}

      {activeTab === 'lots' && (
        <Card title="Liste des Lots">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Type</th>
                  <th>Immeuble</th>
                  <th>Propriétaire</th>
                  <th>Loyer</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => (
                  <tr key={lot.id}>
                    <td className="font-bold">{lot.reference}</td>
                    <td>{lot.type}</td>
                    <td>
                        <div className="font-medium">{lot.immeuble}</div>
                        <div className="text-xs opacity-50">Etage {lot.etage}</div>
                    </td>
                    <td>{lot.owner_name}</td>
                    <td className="font-mono">{lot.loyer?.toLocaleString()} FCFA</td>
                    <td><span className={`badge ${lot.statut === 'libre' ? 'badge-success' : 'badge-neutral'}`}>{lot.statut || 'libre'}</span></td>
                    <td>
                       <div className="flex gap-2">
                          <button onClick={() => { setEditingLot(lot); setShowLotModal(true); }} className="btn btn-ghost btn-xs"><Edit3 size={14} /></button>
                          <button onClick={() => handleDeleteLot(lot.id)} className="btn btn-ghost btn-xs text-error"><Trash2 size={14} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
                {lots.length === 0 && <tr><td colSpan={7} className="text-center py-4 opacity-50">Aucun lot trouvé</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Immeuble */}
      <Modal
        isOpen={showImmeubleModal}
        onClose={() => setShowImmeubleModal(false)}
        title={editingImmeuble.id ? 'Modifier Immeuble' : 'Nouvel Immeuble'}
        footer={
          <Button variant="primary" className="w-full" onClick={handleSaveImmeuble}>
            Enregistrer
          </Button>
        }
      >
        <div className="space-y-4">
          <Select
            label="Propriétaire"
            value={editingImmeuble.owner_id}
            onChange={(e) => setEditingImmeuble({...editingImmeuble, owner_id: parseInt(e.target.value)})}
            placeholder="Sélectionner un propriétaire"
            options={proprietaires.map(p => ({
              value: p.id,
              label: p.type === 'individual' ? `${p.nom} ${p.prenom}` : p.nom
            }))}
          />
          <Input label="Nom de l'immeuble" value={editingImmeuble.nom} onChange={(e) => setEditingImmeuble({...editingImmeuble, nom: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={editingImmeuble.type}
              onChange={(e) => setEditingImmeuble({...editingImmeuble, type: e.target.value})}
              options={[
                { value: 'Maison', label: 'Maison' },
                { value: 'Immeuble', label: 'Immeuble' },
                { value: 'Résidence', label: 'Résidence' },
                { value: 'Commerce', label: 'Commerce' }
              ]}
            />
            <Input label="Ville" value={editingImmeuble.ville} onChange={(e) => setEditingImmeuble({...editingImmeuble, ville: e.target.value})} />
          </div>
          <Input label="Adresse" value={editingImmeuble.adresse} onChange={(e) => setEditingImmeuble({...editingImmeuble, adresse: e.target.value})} />
          <Input 
            label="Photo URL (ex: https://...)" 
            value={editingImmeuble.photo || ''} 
            onChange={(e) => setEditingImmeuble({...editingImmeuble, photo: e.target.value})} 
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </Modal>

      {/* Modal Lot */}
      <Modal
        isOpen={showLotModal}
        onClose={() => setShowLotModal(false)}
        title={editingLot.id ? 'Modifier Lot' : 'Nouveau Lot'}
        footer={
          <Button variant="primary" className="w-full" onClick={handleSaveLot}>
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
              label: `${b.nom} (${b.owner_name})`
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
            <Input label="Loyer" type="number" value={editingLot.loyer} onChange={(e) => setEditingLot({...editingLot, loyer: parseFloat(e.target.value)})} />
            <Input label="Charges" type="number" value={editingLot.charges} onChange={(e) => setEditingLot({...editingLot, charges: parseFloat(e.target.value)})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Superficie (m²)" type="number" value={editingLot.superficie} onChange={(e) => setEditingLot({...editingLot, superficie: parseFloat(e.target.value)})} />
            <Input label="Nb Pièces" type="number" value={editingLot.nbPieces} onChange={(e) => setEditingLot({...editingLot, nbPieces: parseInt(e.target.value)})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Photos (URLs)</label>
            <div className="space-y-2">
              {(editingLot.photos || []).map((photo, index) => (
                <div key={index} className="flex gap-2">
                  <input 
                    type="text" 
                    className="input input-bordered w-full text-sm" 
                    value={photo} 
                    onChange={(e) => {
                      const newPhotos = [...(editingLot.photos || [])];
                      newPhotos[index] = e.target.value;
                      setEditingLot({...editingLot, photos: newPhotos});
                    }}
                  />
                  <button 
                    className="btn btn-square btn-sm btn-ghost text-error"
                    onClick={() => {
                      const newPhotos = [...(editingLot.photos || [])];
                      newPhotos.splice(index, 1);
                      setEditingLot({...editingLot, photos: newPhotos});
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button 
                className="btn btn-sm btn-outline w-full border-dashed"
                onClick={() => setEditingLot({...editingLot, photos: [...(editingLot.photos || []), '']})}
              >
                <Plus size={16} className="mr-2" /> Ajouter une photo
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BiensPage;
