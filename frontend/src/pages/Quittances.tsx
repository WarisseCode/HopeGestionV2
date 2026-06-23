// frontend/src/pages/Quittances.tsx
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Download,
  Eye,
  RefreshCw,
  CheckCircle,
  Clock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { generateQuittancePDF } from '../utils/pdfGenerator';
import { financeApi } from '../api/financeApi';
import { quittanceApi } from '../api/quittanceApi';
import type { ManualQuittance } from '../api/quittanceApi';
import { getLocataires, getLocataireDetails } from '../api/locataireApi';
import type { Locataire } from '../api/locataireApi';
import type { BailSummary } from '@hopegestion/shared-types';
import toast from 'react-hot-toast';
import { useUser } from '../contexts/UserContext';

const Quittances: React.FC = () => {
  const { user } = useUser();
  const canWrite = !['proprietaire', 'locataire'].includes(user?.userType || '');

  const [activeTab, setActiveTab] = useState<'liste' | 'generer'>('liste');
  const [showModal, setShowModal] = useState(false);

  // Quittances issues des paiements (onglet "Liste des quittances")
  const [quittances, setQuittances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quittances générées manuellement (onglet "Générer manuel", persistées en base)
  const [manualQuittances, setManualQuittances] = useState<ManualQuittance[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);

  // Sélection liée aux vraies données (locataire → baux → auto-remplissage Bien/Montant).
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [baux, setBaux] = useState<BailSummary[]>([]);
  const [selectedLocataireId, setSelectedLocataireId] = useState('');
  const [selectedBailId, setSelectedBailId] = useState('');

  const emptyForm = {
    locataire: '',
    bien: '',
    periode: '',
    montant: 0,
    dateEmission: new Date().toISOString().split('T')[0],
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchQuittances();
  }, []);

  useEffect(() => {
    if (!canWrite) return;
    // Locataires (pour le formulaire) + liste des quittances manuelles déjà enregistrées.
    getLocataires('Locataire').then(setLocataires).catch(() => {/* non bloquant */});
    loadManual();
  }, [canWrite]);

  const fetchQuittances = async () => {
    try {
      setLoading(true);
      const data = await financeApi.getPayments();
      const formatted = data.map((p: any) => ({
        id: p.id,
        numero: p.reference || `QUI-${new Date(p.payment_date).getFullYear()}-${p.id.toString().padStart(3, '0')}`,
        locataire: `${p.locataire_prenoms || ''} ${p.locataire_nom || ''}`.trim() || 'Locataire sc.',
        bien: p.reference_bail || 'Bail inconnu',
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

  const loadManual = async () => {
    try {
      setLoadingManual(true);
      const data = await quittanceApi.list();
      setManualQuittances(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingManual(false);
    }
  };

  // Référence "Bien" lisible à partir d'un bail (lot + immeuble, repli sur la réf. de bail).
  const bailToBien = (b: BailSummary) =>
    [b.ref_lot, b.building_name].filter(Boolean).join(' · ') || b.reference_bail || b.ref_bail || `Bail #${b.id}`;

  // Applique un bail au formulaire : remplit Bien + Montant (modifiables ensuite).
  const applyBail = (bail?: BailSummary) => {
    setSelectedBailId(bail ? String(bail.id) : '');
    setFormData(prev => ({
      ...prev,
      bien: bail ? bailToBien(bail) : '',
      montant: bail?.loyer_actuel ?? prev.montant,
    }));
  };

  // Sélection d'un locataire → charge ses baux et pré-sélectionne le bail actif.
  const handleLocataireSelect = async (id: string) => {
    setSelectedLocataireId(id);
    setSelectedBailId('');
    if (!id) {
      setBaux([]);
      setFormData(prev => ({ ...prev, locataire: '', bien: '', montant: 0 }));
      return;
    }
    const loc = locataires.find(l => String(l.id) === id);
    const nom = `${loc?.prenoms || ''} ${loc?.nom || ''}`.trim();
    setFormData(prev => ({ ...prev, locataire: nom }));
    try {
      const details = await getLocataireDetails(parseInt(id));
      const list = details.baux || [];
      setBaux(list);
      applyBail(list.find(b => b.statut === 'actif') || list[0]);
    } catch {
      toast.error("Impossible de charger les baux de ce locataire");
      setBaux([]);
    }
  };

  const openModal = () => {
    setFormData(emptyForm);
    setSelectedLocataireId('');
    setSelectedBailId('');
    setBaux([]);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  // Convertit la période 'YYYY-MM' (input month) en libellé lisible "juin 2026".
  const periodeLabel = (ym: string) =>
    ym ? new Date(`${ym}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';

  const handleGenerate = async () => {
    if (!selectedBailId) return toast.error("Sélectionnez un locataire et son bail");
    if (!formData.locataire.trim()) return toast.error("Sélectionnez un locataire");
    if (!formData.montant || formData.montant <= 0) return toast.error("Le montant doit être supérieur à 0");
    if (!formData.periode) return toast.error("Indiquez la période");
    try {
      const saved = await quittanceApi.create({
        lease_id: parseInt(selectedBailId),
        locataire: formData.locataire,
        bien: formData.bien,
        periode: periodeLabel(formData.periode),
        montant: formData.montant,
        date_emission: formData.dateEmission,
      });
      // Génère le PDF à partir de la quittance enregistrée (numéro officiel).
      await generateQuittancePDF({
        id: String(saved.id),
        numero: saved.numero,
        locataire: saved.locataire_name,
        bien: saved.bien,
        periode: saved.periode,
        montant: Number(saved.montant),
        datePaiement: saved.date_emission,
      });
      toast.success("Quittance enregistrée et PDF généré");
      closeModal();
      loadManual();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    }
  };

  const downloadManual = async (q: ManualQuittance, mode: 'preview' | 'download') => {
    await generateQuittancePDF({
      id: String(q.id),
      numero: q.numero,
      locataire: q.locataire_name,
      bien: q.bien,
      periode: q.periode,
      montant: Number(q.montant),
      datePaiement: q.date_emission,
    }, mode);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content/90">Quittances de Loyer</h1>
          <p className="text-base-content/60">Gestion et génération des reçus de paiement</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex items-center gap-2" onClick={() => { fetchQuittances(); loadManual(); }}>
            <RefreshCw size={18} />
            Actualiser
          </Button>
          {canWrite && <Button
            variant="primary"
            onClick={openModal}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Nouvelle quittance
          </Button>}
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-300">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'liste'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content/80'
          }`}
          onClick={() => setActiveTab('liste')}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Liste des quittances
          </div>
        </button>
        {canWrite && <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'generer'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content/80'
          }`}
          onClick={() => setActiveTab('generer')}
        >
          <div className="flex items-center gap-2">
            <Plus size={18} />
            Générer manuel
          </div>
        </button>}
      </div>

      {/* Onglet : Quittances issues des paiements */}
      {activeTab === 'liste' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-100 text-teal-600 rounded-full"><FileText size={24} /></div>
                <div>
                  <p className="text-sm text-base-content/60">Total quittances</p>
                  <p className="text-2xl font-bold text-base-content/90">{quittances.length}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-full"><CheckCircle size={24} /></div>
                <div>
                  <p className="text-sm text-base-content/60">Payées</p>
                  <p className="text-2xl font-bold text-base-content/90">{quittances.length}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full"><Clock size={24} /></div>
                <div>
                  <p className="text-sm text-base-content/60">Ce mois</p>
                  <p className="text-2xl font-bold text-base-content/90">
                      {quittances.filter(q => new Date(q.datePaiement).getMonth() === new Date().getMonth()).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card title="Historique des paiements & quittances">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" /></div>
            ) : quittances.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-base-content/40 mb-4" />
                <p className="text-base-content/60 mb-4">Aucun paiement enregistré pour générer des quittances.</p>
                <div className="text-sm text-base-content/50">Allez dans Finances pour enregistrer un paiement.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="text-left text-base-content/60 uppercase text-xs tracking-wider">
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
                      <tr key={quittance.id} className="hover:bg-base-200">
                        <td className="p-4 font-mono text-sm">{quittance.numero}</td>
                        <td className="p-4 font-medium">{quittance.locataire}</td>
                        <td className="p-4 text-sm text-base-content/60">{quittance.bien}</td>
                        <td className="p-4 text-sm">{quittance.periode}</td>
                        <td className="p-4 font-bold text-green-600">{quittance.montant.toLocaleString()} F</td>
                        <td className="p-4 text-sm text-base-content/60">{new Date(quittance.dateEmission).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                           <Button variant="ghost" size="sm" title="Voir la quittance"
                            onClick={async () => { await generateQuittancePDF(quittance, 'preview'); }}
                            className="text-teal-600 hover:bg-teal-50">
                            <Eye size={18} />
                           </Button>
                           <Button variant="ghost" size="sm" title="Télécharger PDF"
                            onClick={async () => { await generateQuittancePDF(quittance, 'download'); toast.success(`Quittance pour ${quittance.locataire} téléchargée !`); }}
                            className="text-primary hover:bg-primary/10">
                            <Download size={18} />
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
      )}

      {/* Onglet : Quittances générées manuellement (persistées) */}
      {activeTab === 'generer' && canWrite && (
        <div className="space-y-6">
          <Card title="Quittances générées manuellement">
            {loadingManual ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" /></div>
            ) : manualQuittances.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-base-content/40 mb-4" />
                <p className="text-base-content/60 mb-2">Aucune quittance manuelle enregistrée.</p>
                <div className="text-sm text-base-content/50">Cliquez sur <strong>« Nouvelle quittance manuelle »</strong> pour en créer une.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="text-left text-base-content/60 uppercase text-xs tracking-wider">
                      <th className="p-4">Numéro</th>
                      <th className="p-4">Locataire</th>
                      <th className="p-4">Bien</th>
                      <th className="p-4">Période</th>
                      <th className="p-4">Montant</th>
                      <th className="p-4">Émission</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {manualQuittances.map((q) => (
                      <tr key={q.id} className="hover:bg-base-200">
                        <td className="p-4 font-mono text-sm">{q.numero}</td>
                        <td className="p-4 font-medium">{q.locataire_name}</td>
                        <td className="p-4 text-sm text-base-content/60">{q.bien}</td>
                        <td className="p-4 text-sm">{q.periode}</td>
                        <td className="p-4 font-bold text-green-600">{Number(q.montant).toLocaleString()} F</td>
                        <td className="p-4 text-sm text-base-content/60">{q.date_emission ? new Date(q.date_emission).toLocaleDateString() : '—'}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                           <Button variant="ghost" size="sm" title="Voir la quittance"
                            onClick={() => downloadManual(q, 'preview')}
                            className="text-teal-600 hover:bg-teal-50">
                            <Eye size={18} />
                           </Button>
                           <Button variant="ghost" size="sm" title="Télécharger PDF"
                            onClick={async () => { await downloadManual(q, 'download'); toast.success(`Quittance ${q.numero} téléchargée !`); }}
                            className="text-primary hover:bg-primary/10">
                            <Download size={18} />
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
      )}

      {/* Modal : Générer une quittance manuelle */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Générer une nouvelle quittance"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Annuler</Button>
            <Button variant="primary" className="flex items-center gap-2" onClick={handleGenerate}>
              <Download size={18} /> Enregistrer & Générer PDF
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Locataire : liste réelle. La sélection auto-remplit le bail, le bien et le montant. */}
          <Select
            label="Locataire"
            value={selectedLocataireId}
            onChange={(e) => handleLocataireSelect(e.target.value)}
            options={[
              { value: '', label: 'Choisir un locataire...' },
              ...locataires.map(l => ({ value: String(l.id), label: `${l.prenoms || ''} ${l.nom || ''}`.trim() })),
            ]}
          />

          {/* Bail : utile quand le locataire a plusieurs logements. Sinon pré-rempli automatiquement. */}
          <Select
            label="Bail / Logement"
            value={selectedBailId}
            onChange={(e) => applyBail(baux.find(b => String(b.id) === e.target.value))}
            disabled={baux.length === 0}
            options={[
              { value: '', label: baux.length ? 'Choisir un bail...' : 'Sélectionnez d’abord un locataire' },
              ...baux.map(b => ({
                value: String(b.id),
                label: `${bailToBien(b)}${b.statut !== 'actif' ? ` (${b.statut})` : ''}`,
              })),
            ]}
          />

          <div>
            <label className="block text-sm font-medium mb-2">Bien</label>
            <Input
              value={formData.bien}
              onChange={(e) => setFormData({ ...formData, bien: e.target.value })}
              placeholder="Auto-rempli depuis le bail (modifiable)"
            />
          </div>

          <Input
            label="Montant (FCFA)"
            type="number"
            value={formData.montant}
            onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) || 0 })}
          />

          <Input
            label="Période"
            type="month"
            value={formData.periode}
            onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
          />

          <Input
            label="Date d'émission"
            type="date"
            value={formData.dateEmission}
            onChange={(e) => setFormData({ ...formData, dateEmission: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Quittances;
