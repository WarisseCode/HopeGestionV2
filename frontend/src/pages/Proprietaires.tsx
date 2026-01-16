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
  UserPlus
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

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
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);

  const [formData, setFormData] = useState({
    type: 'individual' as 'individual' | 'company',
    name: '',
    first_name: '',
    phone: '',
    phone_secondary: '',
    email: '',
    address: '',
    city: '',
    country: 'Bénin',
    id_number: '',
    mobile_money_number: '',
    management_mode: 'direct' as 'direct' | 'delegated'
  });

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/owners', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setOwners(data.owners);
      }
    } catch (error) {
      console.error('Error fetching owners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingOwner 
        ? `/api/owners/${editingOwner.id}` 
        : '/api/owners';
      
      const method = editingOwner ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setShowForm(false);
        setEditingOwner(null);
        resetForm();
        fetchOwners();
      }
    } catch (error) {
      console.error('Error saving owner:', error);
    }
  };

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      type: owner.type,
      name: owner.name,
      first_name: owner.first_name || '',
      phone: owner.phone,
      phone_secondary: owner.phone_secondary || '',
      email: owner.email || '',
      address: owner.address || '',
      city: owner.city || '',
      country: owner.country || 'Bénin',
      id_number: owner.id_number || '',
      mobile_money_number: owner.mobile_money_number || '',
      management_mode: owner.management_mode
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce propriétaire ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/owners/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        fetchOwners();
      }
    } catch (error) {
      console.error('Error deleting owner:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'individual',
      name: '',
      first_name: '',
      phone: '',
      phone_secondary: '',
      email: '',
      address: '',
      city: '',
      country: 'Bénin',
      id_number: '',
      mobile_money_number: '',
      management_mode: 'direct'
    });
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
            resetForm();
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

      {/* Formulaire */}
      {showForm && (
        <Card title={editingOwner ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Type de propriétaire</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'individual' | 'company'})}
                >
                  <option value="individual">Personne physique</option>
                  <option value="company">Personne morale</option>
                </select>
              </div>

              <div>
                <Input 
                  label="Nom / Raison sociale" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {formData.type === 'individual' && (
                <div>
                  <Input 
                    label="Prénoms" 
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
              )}

              <div>
                <Input 
                  label="Téléphone principal (WhatsApp)" 
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div>
                <Input 
                  label="Téléphone secondaire" 
                  type="tel"
                  value={formData.phone_secondary}
                  onChange={(e) => setFormData({...formData, phone_secondary: e.target.value})}
                />
              </div>

              <div>
                <Input 
                  label="Email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <Input 
                  label="Numéro de pièce / RCCM" 
                  value={formData.id_number}
                  onChange={(e) => setFormData({...formData, id_number: e.target.value})}
                />
              </div>

              <div>
                <Input 
                  label="Mobile Money" 
                  type="tel"
                  value={formData.mobile_money_number}
                  onChange={(e) => setFormData({...formData, mobile_money_number: e.target.value})}
                />
              </div>

              <div>
                <Input 
                  label="Ville" 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mode de gestion</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={formData.management_mode}
                  onChange={(e) => setFormData({...formData, management_mode: e.target.value as 'direct' | 'delegated'})}
                >
                  <option value="direct">Gestion directe</option>
                  <option value="delegated">Gestion déléguée</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <Input 
                  label="Adresse complète" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="ghost" 
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOwner(null);
                  resetForm();
                }}
              >
                Annuler
              </Button>
              <Button variant="primary" type="submit">
                {editingOwner ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </Card>
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
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Propriétaire</th>
                  <th>Contact</th>
                  <th>Localisation</th>
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
                        <span className="text-sm">{owner.city || 'N/A'}</span>
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
        )}
      </Card>
    </div>
  );
};

export default Proprietaires;
