// frontend/src/pages/Alertes.tsx
import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Users,
  Home,
  FileText,
  Mail,
  MessageCircle,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

const Alertes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alertes' | 'notifications' | 'parametres'>('alertes');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'alerte' | 'notification' | 'parametre'>('alerte');

  // Données de démonstration
  const [alertes] = useState([
    {
      id: 1,
      reference: 'ALT-2025-001',
      titre: 'Loyer en retard',
      description: 'Le loyer du lot A01 est en retard de 5 jours',
      destinataire: 'Gestionnaire',
      type: 'Paiement',
      priorite: 'Haute',
      dateCreation: '2025-01-15',
      statut: 'Active',
      frequence: 'Quotidienne',
      dateEcheance: '2025-01-20'
    },
    {
      id: 2,
      reference: 'ALT-2025-002',
      titre: 'Intervention requise',
      description: 'Fuite d\'eau détectée dans le lot A02',
      destinataire: 'Technicien',
      type: 'Intervention',
      priorite: 'Urgente',
      dateCreation: '2025-01-16',
      statut: 'Active',
      frequence: 'Hebdomadaire',
      dateEcheance: '2025-01-18'
    },
    {
      id: 3,
      reference: 'ALT-2025-003',
      titre: 'Contrat expirant',
      description: 'Le contrat du lot B01 expire dans 30 jours',
      destinataire: 'Propriétaire',
      type: 'Contrat',
      priorite: 'Moyenne',
      dateCreation: '2025-01-17',
      statut: 'Active',
      frequence: 'Mensuelle',
      dateEcheance: '2025-02-17'
    }
  ]);

  const [notifications] = useState([
    {
      id: 1,
      titre: 'Nouveau paiement reçu',
      message: 'Paiement de 150 000 FCFA reçu de KOFFI Jean pour le lot A01',
      date: '2025-01-15',
      statut: 'Non lu',
      type: 'Finance',
      destinataire: 'Gestionnaire'
    },
    {
      id: 2,
      titre: 'Intervention terminée',
      message: 'L\'intervention sur le lot A02 a été terminée avec succès',
      date: '2025-01-16',
      statut: 'Lu',
      type: 'Intervention',
      destinataire: 'Locataire'
    },
    {
      id: 3,
      titre: 'Demande d\'intervention',
      message: 'Nouvelle demande d\'intervention pour le lot A01',
      date: '2025-01-17',
      statut: 'Non lu',
      type: 'Intervention',
      destinataire: 'Technicien'
    }
  ]);

  const [parametres] = useState([
    {
      id: 1,
      nom: 'Rappel de loyer',
      description: 'Rappel automatique 3 jours avant la date d\'échéance',
      type: 'Paiement',
      actif: true,
      canal: ['Email', 'WhatsApp']
    },
    {
      id: 2,
      nom: 'Alerte intervention',
      description: 'Notification en cas de panne ou besoin d\'intervention',
      type: 'Intervention',
      actif: true,
      canal: ['Email', 'SMS', 'WhatsApp']
    },
    {
      id: 3,
      nom: 'Échéance contrat',
      description: 'Alerte 30 jours avant l\'expiration d\'un contrat',
      type: 'Contrat',
      actif: false,
      canal: ['Email']
    }
  ]);

  const [alerteForm, setAlerteForm] = useState({
    reference: '',
    titre: '',
    description: '',
    destinataire: 'Gestionnaire',
    type: 'Paiement',
    priorite: 'Moyenne',
    frequence: 'Mensuelle',
    dateEcheance: '',
    canal: ['Email']
  });

  const [notificationForm, setNotificationForm] = useState({
    titre: '',
    message: '',
    destinataire: 'Gestionnaire',
    type: 'Général',
    canal: ['Email', 'WhatsApp']
  });

  const [parametreForm, setParametreForm] = useState({
    nom: '',
    description: '',
    type: 'Général',
    actif: true,
    canal: ['Email']
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Alertes et Notifications</h1>
          <p className="text-base-content/70">Gestion des alertes, notifications et paramètres</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setFormType(activeTab === 'alertes' ? 'alerte' : activeTab === 'notifications' ? 'notification' : 'parametre');
            setShowForm(true);
          }}
        >
          <Plus size={18} className="mr-2" />
          {activeTab === 'alertes' ? 'Nouvelle alerte' : 
           activeTab === 'notifications' ? 'Nouvelle notification' : 'Nouveau paramètre'}
        </Button>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'alertes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('alertes')}
        >
          <div className="flex items-center gap-2">
            <Bell size={18} />
            Alertes
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'notifications'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('notifications')}
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={18} />
            Notifications
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'parametres'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('parametres')}
        >
          <div className="flex items-center gap-2">
            <Settings size={18} />
            Paramètres
          </div>
        </button>
      </div>

      {/* Formulaire pour ajouter/modifier */}
      {showForm && (
        <Card title={
          formType === 'alerte' ? 'Création / Modification d\'une alerte' :
          formType === 'notification' ? 'Création / Modification d\'une notification' :
          'Création / Modification d\'un paramètre'
        }>
          {formType === 'alerte' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence de l'alerte" 
                  placeholder="Ex: ALT-2025-001" 
                  value={alerteForm.reference}
                  onChange={(e) => setAlerteForm({...alerteForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Titre de l'alerte" 
                  placeholder="Entrez le titre de l'alerte" 
                  value={alerteForm.titre}
                  onChange={(e) => setAlerteForm({...alerteForm, titre: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Description" 
                  placeholder="Décrivez l'alerte"
                  value={alerteForm.description}
                  onChange={(e) => setAlerteForm({...alerteForm, description: e.target.value})}
                  className="h-24"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Destinataire</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={alerteForm.destinataire}
                  onChange={(e) => setAlerteForm({...alerteForm, destinataire: e.target.value})}
                >
                  <option value="Gestionnaire">Gestionnaire</option>
                  <option value="Locataire">Locataire</option>
                  <option value="Propriétaire">Propriétaire</option>
                  <option value="Technicien">Technicien</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type d'alerte</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={alerteForm.type}
                  onChange={(e) => setAlerteForm({...alerteForm, type: e.target.value})}
                >
                  <option value="Paiement">Paiement</option>
                  <option value="Intervention">Intervention</option>
                  <option value="Contrat">Contrat</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Priorité</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={alerteForm.priorite}
                  onChange={(e) => setAlerteForm({...alerteForm, priorite: e.target.value})}
                >
                  <option value="Basse">Basse</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Haute">Haute</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Fréquence</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={alerteForm.frequence}
                  onChange={(e) => setAlerteForm({...alerteForm, frequence: e.target.value})}
                >
                  <option value="Quotidienne">Quotidienne</option>
                  <option value="Hebdomadaire">Hebdomadaire</option>
                  <option value="Mensuelle">Mensuelle</option>
                  <option value="Ponctuelle">Ponctuelle</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Date d'échéance" 
                  type="date"
                  value={alerteForm.dateEcheance}
                  onChange={(e) => setAlerteForm({...alerteForm, dateEcheance: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Canaux de notification</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={alerteForm.canal.includes('Email')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAlerteForm({...alerteForm, canal: [...alerteForm.canal, 'Email']});
                        } else {
                          setAlerteForm({...alerteForm, canal: alerteForm.canal.filter(c => c !== 'Email')});
                        }
                      }}
                    />
                    <Mail size={16} className="mr-1" />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={alerteForm.canal.includes('SMS')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAlerteForm({...alerteForm, canal: [...alerteForm.canal, 'SMS']});
                        } else {
                          setAlerteForm({...alerteForm, canal: alerteForm.canal.filter(c => c !== 'SMS')});
                        }
                      }}
                    />
                    <span>SMS</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={alerteForm.canal.includes('WhatsApp')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAlerteForm({...alerteForm, canal: [...alerteForm.canal, 'WhatsApp']});
                        } else {
                          setAlerteForm({...alerteForm, canal: alerteForm.canal.filter(c => c !== 'WhatsApp')});
                        }
                      }}
                    />
                    <span>WhatsApp</span>
                  </label>
                </div>
              </div>
            </div>
          ) : formType === 'notification' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Titre de la notification" 
                  placeholder="Entrez le titre de la notification" 
                  value={notificationForm.titre}
                  onChange={(e) => setNotificationForm({...notificationForm, titre: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Destinataire</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={notificationForm.destinataire}
                  onChange={(e) => setNotificationForm({...notificationForm, destinataire: e.target.value})}
                >
                  <option value="Gestionnaire">Gestionnaire</option>
                  <option value="Locataire">Locataire</option>
                  <option value="Propriétaire">Propriétaire</option>
                  <option value="Technicien">Technicien</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type de notification</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value})}
                >
                  <option value="Général">Général</option>
                  <option value="Paiement">Paiement</option>
                  <option value="Intervention">Intervention</option>
                  <option value="Contrat">Contrat</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Message" 
                  placeholder="Entrez le message de la notification"
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                  className="h-24"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Canaux de notification</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={notificationForm.canal.includes('Email')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNotificationForm({...notificationForm, canal: [...notificationForm.canal, 'Email']});
                        } else {
                          setNotificationForm({...notificationForm, canal: notificationForm.canal.filter(c => c !== 'Email')});
                        }
                      }}
                    />
                    <Mail size={16} className="mr-1" />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={notificationForm.canal.includes('SMS')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNotificationForm({...notificationForm, canal: [...notificationForm.canal, 'SMS']});
                        } else {
                          setNotificationForm({...notificationForm, canal: notificationForm.canal.filter(c => c !== 'SMS')});
                        }
                      }}
                    />
                    <span>SMS</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={notificationForm.canal.includes('WhatsApp')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNotificationForm({...notificationForm, canal: [...notificationForm.canal, 'WhatsApp']});
                        } else {
                          setNotificationForm({...notificationForm, canal: notificationForm.canal.filter(c => c !== 'WhatsApp')});
                        }
                      }}
                    />
                    <span>WhatsApp</span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Nom du paramètre" 
                  placeholder="Entrez le nom du paramètre" 
                  value={parametreForm.nom}
                  onChange={(e) => setParametreForm({...parametreForm, nom: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type d'alerte</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={parametreForm.type}
                  onChange={(e) => setParametreForm({...parametreForm, type: e.target.value})}
                >
                  <option value="Général">Général</option>
                  <option value="Paiement">Paiement</option>
                  <option value="Intervention">Intervention</option>
                  <option value="Contrat">Contrat</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Description" 
                  placeholder="Décrivez le paramètre"
                  value={parametreForm.description}
                  onChange={(e) => setParametreForm({...parametreForm, description: e.target.value})}
                  className="h-24"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Actif</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    className="toggle"
                    checked={parametreForm.actif}
                    onChange={(e) => setParametreForm({...parametreForm, actif: e.target.checked})}
                  />
                  <span>{parametreForm.actif ? 'Oui' : 'Non'}</span>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Canaux de notification</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={parametreForm.canal.includes('Email')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setParametreForm({...parametreForm, canal: [...parametreForm.canal, 'Email']});
                        } else {
                          setParametreForm({...parametreForm, canal: parametreForm.canal.filter(c => c !== 'Email')});
                        }
                      }}
                    />
                    <Mail size={16} className="mr-1" />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={parametreForm.canal.includes('SMS')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setParametreForm({...parametreForm, canal: [...parametreForm.canal, 'SMS']});
                        } else {
                          setParametreForm({...parametreForm, canal: parametreForm.canal.filter(c => c !== 'SMS')});
                        }
                      }}
                    />
                    <span>SMS</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={parametreForm.canal.includes('WhatsApp')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setParametreForm({...parametreForm, canal: [...parametreForm.canal, 'WhatsApp']});
                        } else {
                          setParametreForm({...parametreForm, canal: parametreForm.canal.filter(c => c !== 'WhatsApp')});
                        }
                      }}
                    />
                    <span>WhatsApp</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowForm(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="primary"
              onClick={() => {
                // Traitement de la soumission du formulaire
                setShowForm(false);
              }}
            >
              {formType === 'alerte' ? 'Enregistrer l\'alerte' :
               formType === 'notification' ? 'Envoyer la notification' :
               'Enregistrer le paramètre'}
            </Button>
          </div>
        </Card>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'alertes' && (
        <div className="space-y-6">
          {/* Résumé des alertes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-warning/10 text-warning rounded-full w-12">
                    <Bell size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-info/10 text-info rounded-full w-12">
                    <Bell size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Actives</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-error/10 text-error rounded-full w-12">
                    <XCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Urgentes</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-success/10 text-success rounded-full w-12">
                    <CheckCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Haute priorité</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des alertes */}
          <Card title="Liste des alertes">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Titre</th>
                    <th>Type</th>
                    <th>Priorité</th>
                    <th>Destinataire</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alertes.map((alerte) => (
                    <tr key={alerte.id}>
                      <td>
                        <div className="font-medium">{alerte.reference}</div>
                        <div className="text-sm text-base-content/60">{new Date(alerte.dateCreation).toLocaleDateString()}</div>
                      </td>
                      <td>
                        <div className="font-medium">{alerte.titre}</div>
                        <div className="text-sm text-base-content/60 line-clamp-1">{alerte.description}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{alerte.type}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          alerte.priorite === 'Urgente' ? 'badge-error' : 
                          alerte.priorite === 'Haute' ? 'badge-warning' : 
                          'badge-info'
                        }`}>
                          {alerte.priorite}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {alerte.destinataire}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${alerte.statut === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                          {alerte.statut}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setFormType('alerte');
                              setAlerteForm({
                                reference: alerte.reference,
                                titre: alerte.titre,
                                description: alerte.description,
                                destinataire: alerte.destinataire,
                                type: alerte.type,
                                priorite: alerte.priorite,
                                frequence: alerte.frequence,
                                dateEcheance: alerte.dateEcheance,
                                canal: ['Email'] // Valeur par défaut
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Résumé des notifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12">
                    <MessageCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-warning/10 text-warning rounded-full w-12">
                    <MessageCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Non lues</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-success/10 text-success rounded-full w-12">
                    <CheckCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Lues</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des notifications */}
          <Card title="Liste des notifications">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Message</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => (
                    <tr key={notification.id}>
                      <td>
                        <div className={`font-medium ${notification.statut === 'Non lu' ? 'text-primary font-bold' : ''}`}>
                          {notification.titre}
                        </div>
                        <div className="text-sm text-base-content/60">{notification.destinataire}</div>
                      </td>
                      <td>
                        <div className="text-sm">{notification.message}</div>
                      </td>
                      <td>{new Date(notification.date).toLocaleDateString()}</td>
                      <td>
                        <span className="badge badge-secondary">{notification.type}</span>
                      </td>
                      <td>
                        <span className={`badge ${notification.statut === 'Non lu' ? 'badge-warning' : 'badge-success'}`}>
                          {notification.statut}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setFormType('notification');
                              setNotificationForm({
                                titre: notification.titre,
                                message: notification.message,
                                destinataire: notification.destinataire,
                                type: notification.type,
                                canal: ['Email'] // Valeur par défaut
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'parametres' && (
        <div className="space-y-6">
          {/* Liste des paramètres */}
          <Card title="Paramètres des alertes et notifications">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Canaux</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parametres.map((parametre) => (
                    <tr key={parametre.id}>
                      <td>
                        <div className="font-medium">{parametre.nom}</div>
                      </td>
                      <td>
                        <div className="text-sm">{parametre.description}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{parametre.type}</span>
                      </td>
                      <td>
                        <span className={`badge ${parametre.actif ? 'badge-success' : 'badge-neutral'}`}>
                          {parametre.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {parametre.canal.map((canal, idx) => (
                            <span key={idx} className="badge badge-secondary text-xs">{canal}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setFormType('parametre');
                              setParametreForm({
                                nom: parametre.nom,
                                description: parametre.description,
                                type: parametre.type,
                                actif: parametre.actif,
                                canal: parametre.canal
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          {/* Configuration des canaux */}
          <Card title="Configuration des canaux de notification">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <Mail size={48} className="mx-auto text-primary mb-2" />
                <h3 className="font-semibold">Email</h3>
                <p className="text-sm text-base-content/60 mb-2">Configuration SMTP</p>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input type="checkbox" className="toggle" defaultChecked />
                    <span className="label-text">Activé</span>
                  </label>
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" className="mx-auto text-green-500 mb-2">
                  <path fill="currentColor" d="M17.501 3.5c2.332 0 4.373.872 5.92 2.296c.112.103.17.246.17.392c0 .146-.058.289-.17.392c-1.547 1.424-3.588 2.296-5.92 2.296c-2.332 0-4.373-.872-5.92-2.296c-.112-.103-.17-.246-.17-.392c0-.146.058-.289.17-.392c1.547-1.424 3.588-2.296 5.92-2.296ZM3.5 9.5c2.332 0 4.373.872 5.92 2.296c.112.103.17.246.17.392c0 .146-.058.289-.17.392c-1.547 1.424-3.588 2.296-5.92 2.296c-2.332 0-4.373-.872-5.92-2.296c-.112-.103-.17-.246-.17-.392c0-.146.058-.289.17-.392c1.547-1.424 3.588-2.296 5.92-2.296ZM20.5 15.5c2.332 0 4.373.872 5.92 2.296c.112.103.17.246.17.392c0 .146-.058.289-.17.392c-1.547 1.424-3.588 2.296-5.92 2.296c-2.332 0-4.373-.872-5.92-2.296c-.112-.103-.17-.246-.17-.392c0-.146.058-.289.17-.392c1.547-1.424 3.588-2.296 5.92-2.296Z"/>
                </svg>
                <h3 className="font-semibold">SMS</h3>
                <p className="text-sm text-base-content/60 mb-2">Service SMS</p>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input type="checkbox" className="toggle" defaultChecked />
                    <span className="label-text">Activé</span>
                  </label>
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" className="mx-auto text-green-600 mb-2">
                  <path fill="currentColor" d="M17.504 2.5c3.718 0 6.928 1.389 9.392 3.656c.179.164.273.393.273.628c0 .235-.094.464-.273.628c-2.464 2.267-5.674 3.656-9.392 3.656c-3.718 0-6.928-1.389-9.392-3.656c-.179-.164-.273-.393-.273-.628c0-.235.094-.464.273-.628c2.464-2.267 5.674-3.656 9.392-3.656ZM5.504 15.5c3.718 0 6.928 1.389 9.392 3.656c.179.164.273.393.273.628c0 .235-.094.464-.273.628c-2.464 2.267-5.674 3.656-9.392 3.656c-3.718 0-6.928-1.389-9.392-3.656c-.179-.164-.273-.393-.273-.628c0-.235.094-.464.273-.628c2.464-2.267 5.674-3.656 9.392-3.656Z"/>
                </svg>
                <h3 className="font-semibold">WhatsApp</h3>
                <p className="text-sm text-base-content/60 mb-2">API WhatsApp</p>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input type="checkbox" className="toggle" defaultChecked />
                    <span className="label-text">Activé</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Alertes;
