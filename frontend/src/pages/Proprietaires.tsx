// frontend/src/pages/Proprietaires.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2,
  Eye,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  UserPlus,
  X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useMobile } from '../hooks/useMobile';
import ProprietaireForm from '../components/proprietaires/ProprietaireForm';
import { accountApi } from '../api/accountApi';

interface Owner {
  id: number;
  type: 'individual' | 'company';
  name: string;
  first_name?: string;
  phone: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  id_number?: string;
  photo?: string;
  mobile_money_number?: string;
  management_mode: 'direct' | 'delegated';
  is_active: boolean;
  total_properties?: number;
  total_lots?: number;
}

const Proprietaires: React.FC = () => {
  const isMobile = useMobile();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      const data = await accountApi.getProprietaires();
      
      // Map backend data (French keys) to frontend interface (English keys)
      const mappedOwners: Owner[] = data.map((o: any) => ({
        id: o.id,
        type: o.type,
        name: o.nom || o.name,
        first_name: o.prenom || o.first_name,
        phone: o.telephone || o.phone,
        phone_secondary: o.telephoneSecondaire || o.phone_secondary,
        email: o.email,
        address: o.adresse || o.address,
        city: o.ville || o.city,
        country: o.pays || o.country,
        id_number: o.numeroPiece || o.id_number || o.rccmNumber,
        photo: o.photo || o.photo_url,
        mobile_money_number: o.mobileMoney || o.mobile_money_number,
        management_mode: o.modeGestion || o.management_mode || 'direct',
        is_active: true,
        total_properties: o.total_properties || 0,
        total_lots: o.total_lots || 0
      }));

      setOwners(mappedOwners);
    } catch (error) {
      console.error('Error fetching owners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce propriétaire ?')) {
      return;
    }

    try {
      await accountApi.deleteProprietaire(id);
      fetchOwners();
    } catch (error) {
      console.error('Error deleting owner:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Chargement...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Propriétaires</h1>
          <p className="text-base-content/70">Gestion des propriétaires et multi-agences</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setEditingOwner(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau propriétaire
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="avatar placeholder">
              <div className="bg-primary/10 text-primary rounded-full w-12 flex items-center justify-center">
                <Users size={24} />
              </div>
            </div>
            <div>
              <p className="text-sm text-base-content/60">Total propriétaires</p>
              <p className="text-2xl font-bold">{owners.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="avatar placeholder">
              <div className="bg-success/10 text-success rounded-full w-12 flex items-center justify-center">
                <Building2 size={24} />
              </div>
            </div>
            <div>
              <p className="text-sm text-base-content/60">Total biens</p>
              <p className="text-2xl font-bold">
                {owners.reduce((sum, o) => sum + (o.total_properties || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="avatar placeholder">
              <div className="bg-warning/10 text-warning rounded-full w-12 flex items-center justify-center">
                <UserPlus size={24} />
              </div>
            </div>
            <div>
              <p className="text-sm text-base-content/60">Gestion déléguée</p>
              <p className="text-2xl font-bold">
                {owners.filter(o => o.management_mode === 'delegated').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Wizard Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowForm(false);
                setEditingOwner(null);
              }}
              className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X size={24} className="text-gray-600" />
            </button>

            <ProprietaireForm
              owner={editingOwner || undefined}
              onSave={async (data) => {
                try {
                  await accountApi.saveProprietaire(data);
                  setShowForm(false);
                  setEditingOwner(null);
                  await fetchOwners();
                } catch (err) {
                  console.error('Error saving owner:', err);
                  const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
                  alert(errorMessage);
                }
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingOwner(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Liste des propriétaires */}
      <Card title="Liste des propriétaires">
        {owners.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/60 mb-4">Aucun propriétaire enregistré</p>
            <Button 
              variant="primary"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 mx-auto"
            >
              <Plus size={18} />
              Ajouter un propriétaire
            </Button>
          </div>
        ) : (
          isMobile ? (
            <div className="space-y-4">
              {owners.map((owner) => (
                <div key={owner.id} className="bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                             <div className="avatar placeholder">
                                <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center">
                                    <Users size={20} />
                                </div>
                             </div>
                             <div>
                                <div className="font-bold">{owner.name} {owner.first_name}</div>
                                <div className="text-xs text-base-content/60">{owner.type === 'individual' ? 'Particulier' : 'Société'}</div>
                             </div>
                        </div>
                        <span className={`badge ${
                            owner.management_mode === 'direct' ? 'badge-primary' : 'badge-secondary'
                        } badge-sm`}>
                            {owner.management_mode === 'direct' ? 'Direct' : 'Délégué'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 text-sm pl-1 border-l-2 border-base-200 ml-2">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-base-content/60" />
                          {owner.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-base-content/60" />
                          <span className="text-base-content/80">{owner.total_properties || 0} Biens</span>
                          <span className="text-base-content/40">•</span>
                          <MapPin size={14} className="text-base-content/60" />
                          <span className="text-base-content/80">{owner.address || owner.city || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-base-200 pt-2 mt-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(owner)}>
                          <Edit3 size={16} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-error"
                          onClick={() => handleDelete(owner.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                    </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Propriétaire</th>
                  <th>Contact</th>
                  <th>Adresse</th>
                  <th>Biens</th>
                  <th>Mode</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-primary/10 text-primary rounded-full w-12 flex items-center justify-center">
                            <Users size={20} />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">
                            {owner.name} {owner.first_name}
                          </div>
                          <div className="text-sm text-base-content/60">
                            {owner.type === 'individual' ? 'Personne physique' : 'Personne morale'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={14} className="text-base-content/60" />
                          {owner.phone}
                        </div>
                        {owner.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail size={14} className="text-base-content/60" />
                            {owner.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-base-content/60" />
                        <span className="text-sm">{owner.address || owner.city || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-base-content/60" />
                        <span className="font-medium">{owner.total_properties || 0}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        owner.management_mode === 'direct' ? 'badge-primary' : 'badge-secondary'
                      }`}>
                        {owner.management_mode === 'direct' ? 'Direct' : 'Délégué'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(owner)}>
                          <Edit3 size={16} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-error"
                          onClick={() => handleDelete(owner.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )
        )}
      </Card>
    </div>
  );
};

export default Proprietaires;
