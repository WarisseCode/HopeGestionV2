import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import LocataireForm from '../components/locataires/LocataireForm';
import WhatsAppButton from '../components/ui/WhatsAppButton';
import { getLocataires, createLocataire, updateLocataire, deleteLocataire, Locataire } from '../api/locataireApi';
import { getLots } from '../api/bienApi';
import { Lot } from '../api/bienApi';
import toast from 'react-hot-toast';

const Locataires: React.FC = () => {
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocataire, setEditingLocataire] = useState<Locataire | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [locatairesData, lotsData] = await Promise.all([
        getLocataires(),
        getLots()
      ]);
      setLocataires(locatairesData);
      setLots(lotsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredLocataires = locataires.filter(l =>
    l.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.prenoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.telephone.includes(searchTerm)
  );

  const handleEdit = (locataire: Locataire) => {
    setEditingLocataire(locataire);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce locataire ?')) {
      try {
        await deleteLocataire(id);
        toast.success('Locataire supprimé avec succès');
        fetchData();
      } catch (error) {
        console.error('Error deleting locataire:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleSubmit = async (data: Partial<Locataire>) => {
    try {
      if (editingLocataire) {
        await updateLocataire(editingLocataire.id!, data);
        toast.success('Locataire modifié avec succès');
      } else {
        await createLocataire(data as Omit<Locataire, 'id'>);
        toast.success('Locataire créé avec succès');
      }
      setIsModalOpen(false);
      setEditingLocataire(null);
      fetchData();
    } catch (error) {
      console.error('Error saving locataire:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Locataires</h1>
        <Button onClick={() => { setEditingLocataire(null); setIsModalOpen(true); }}>
          <Plus size={20} className="mr-2" />
          Nouveau Locataire
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un locataire..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locataire</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordonnées</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot Occupé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-4">Chargement...</td></tr>
              ) : filteredLocataires.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4">Aucun locataire trouvé</td></tr>
              ) : (
                filteredLocataires.map((locataire) => (
                  <tr key={locataire.id} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden relative">
                            {/* Photo Hover Effect Logic can be added here */}
                            {locataire.photo ? (
                                <img src={locataire.photo} alt={locataire.nom} className="h-full w-full object-cover"/>
                            ) : (
                                locataire.nom.charAt(0)
                            )}
                            {/* Hover tooltip for larger photo */}
                            {locataire.photo && (
                                <div className="absolute hidden group-hover:block z-50 top-0 left-12 w-32 h-32 rounded-lg shadow-xl border-2 border-white overflow-hidden">
                                    <img src={locataire.photo} className="w-full h-full object-cover"/>
                                </div>
                            )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{locataire.nom} {locataire.prenoms}</div>
                          <div className="text-sm text-gray-500">{locataire.nationalite || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center gap-2">
                          {locataire.telephone}
                      </div>
                      <div className="text-sm text-gray-500">{locataire.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {locataire.lot_details?.ref_lot || 'Aucun'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        locataire.statut === 'Actif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {locataire.statut || 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-2">
                        {/* WhatsApp Quick Action */}
                        <WhatsAppButton phoneNumber={locataire.telephone} label="" size="sm" className="px-2" />

                        <button onClick={() => handleEdit(locataire)} className="text-indigo-600 hover:text-indigo-900 p-1">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(locataire.id!)} className="text-red-600 hover:text-red-900 p-1">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLocataire ? 'Modifier Locataire' : 'Nouveau Locataire'}
      >
        <LocataireForm
          initialData={editingLocataire || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          lots={lots} // Pass lots for selection
        />
      </Modal>
    </div>
  );
};

export default Locataires;
