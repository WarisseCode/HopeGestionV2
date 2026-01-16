// frontend/src/pages/Quittances.tsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  Trash2,
  Users,
  Home,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { generateQuittancePDF } from '../utils/pdfGenerator';
import { financeApi } from '../api/financeApi';
import toast from 'react-hot-toast';

const Quittances: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'liste' | 'generer'>('liste');
  const [showForm, setShowForm] = useState(false);

  // State pour les données réelles
  const [quittances, setQuittances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les paiements depuis l'API
  useEffect(() => {
    fetchQuittances();
  }, []);

  const fetchQuittances = async () => {
    try {
      setLoading(true);
      const data = await financeApi.getPayments();
      // Transformation des données API pour l'affichage
      const formatted = data.map((p: any) => ({
        id: p.id,
        numero: p.reference || `QUI-${new Date(p.payment_date).getFullYear()}-${p.id.toString().padStart(3, '0')}`,
        locataire: `${p.locataire_prenoms || ''} ${p.locataire_nom || ''}`.trim() || 'Locataire sc.',
        bien: p.reference_bail || 'Bail inconnu', // On utilise ref_bail faute de mieux pour l'instant
        periode: new Date(p.payment_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        montant: parseFloat(p.amount),
        dateEmission: p.payment_date,
        statut: 'Payé',
        datePaiement: p.payment_date
      }));
      setQuittances(formatted);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des quittances");
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    locataire: '',
    bien: '',
    periode: '',
    montant: 0,
    dateEmission: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quittances de Loyer</h1>
          <p className="text-gray-500">Gestion et génération des reçus de paiement</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex items-center gap-2" onClick={fetchQuittances}>
            <RefreshCw size={18} />
            Actualiser
          </Button>
          {/* Le bouton "Nouvelle quittance" ici est un raccourci pour générer un PDF manuellement */}
          <Button 
            variant="primary" 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Nouvelle quittance
          </Button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'liste'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('liste')}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Liste des quittances
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'generer'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('generer')}
        >
          <div className="flex items-center gap-2">
            <Plus size={18} />
            Générer manuel
          </div>
        </button>
      </div>

      {/* Formulaire de génération */}
      {(showForm || activeTab === 'generer') && (
        <Card title="Générer une nouvelle quittance (Manuel)">
            {/* Formulaire simplifié pour démo/manuel - en réalité on devrait lier aux données */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Locataire</label>
              <Input 
                value={formData.locataire}
                onChange={(e) => setFormData({...formData, locataire: e.target.value})}
                placeholder="Nom du locataire"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bien</label>
              <Input 
                value={formData.bien}
                onChange={(e) => setFormData({...formData, bien: e.target.value})}
                placeholder="Référence du bien"
              />
            </div>

            <div>
              <Input 
                label="Période" 
                type="month"
                value={formData.periode}
                onChange={(e) => setFormData({...formData, periode: e.target.value})}
              />
            </div>

            <div>
              <Input 
                label="Montant (FCFA)" 
                type="number"
                value={formData.montant}
                onChange={(e) => setFormData({...formData, montant: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div>
              <Input 
                label="Date d'émission" 
                type="date"
                value={formData.dateEmission}
                onChange={(e) => setFormData({...formData, dateEmission: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowForm(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="primary"
              className="flex items-center gap-2"
              onClick={() => {
                  generateQuittancePDF({
                      id: 'MANUAL-' + Date.now(),
                      numero: 'QUI-MANUAL-' + new Date().getFullYear(),
                      locataire: formData.locataire,
                      bien: formData.bien,
                      periode: formData.periode,
                      montant: formData.montant,
                      datePaiement: formData.dateEmission
                  });
                  toast.success("PDF généré !");
              }}
            >
              <Download size={18} />
              Générer PDF
            </Button>
          </div>
        </Card>
      )}

      {/* Liste des quittances */}
      {activeTab === 'liste' && (
        <div className="space-y-6">
          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <FileText size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total quittances</p>
                  <p className="text-2xl font-bold text-gray-800">{quittances.length}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                    <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payées</p>
                  <p className="text-2xl font-bold text-gray-800">{quittances.length}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
                    <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ce mois</p>
                  <p className="text-2xl font-bold text-gray-800">
                      {quittances.filter(q => new Date(q.datePaiement).getMonth() === new Date().getMonth()).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Table des quittances */}
          <Card title="Historique des paiements & quittances">
            {quittances.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">Aucun paiement enregistré pour générer des quittances.</p>
                <div className="text-sm text-gray-400">Allez dans Finances pour enregistrer un paiement.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="text-left text-gray-500 uppercase text-xs tracking-wider">
                      <th className="p-4">Numéro</th>
                      <th className="p-4">Locataire</th>
                      <th className="p-4">Bail</th>
                      <th className="p-4">Période</th>
                      <th className="p-4">Montant</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quittances.map((quittance) => (
                      <tr key={quittance.id} className="hover:bg-gray-50">
                        <td className="p-4 font-mono text-sm">{quittance.numero}</td>
                        <td className="p-4 font-medium">{quittance.locataire}</td>
                        <td className="p-4 text-sm text-gray-500">{quittance.bien}</td>
                        <td className="p-4 text-sm">{quittance.periode}</td>
                        <td className="p-4 font-bold text-green-600">{quittance.montant.toLocaleString()} F</td>
                        <td className="p-4 text-sm text-gray-500">{new Date(quittance.dateEmission).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                           <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Télécharger PDF"
                            onClick={() => {
                                generateQuittancePDF(quittance); // Assuming this utility function handles the object structure
                                toast.success(`Quittance pour ${quittance.locataire} générée !`);
                            }}
                            className="text-primary hover:bg-primary/10"
                           >
                            <Download size={18} />
                           </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Quittances;
