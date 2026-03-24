import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Search, 
  File,
  Image as ImageIcon,
  Download,
  LayoutTemplate,
  Wand2 // For generate
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { documentApi, type Document } from '../api/documentApi';
import DocumentTemplates from './DocumentTemplates';
import DocumentGenerator from '../components/documents/DocumentGenerator';
import ConfirmModal from '../components/ui/ConfirmModal';

import { API_BASE } from '../config';
const API_BASE_URL = API_BASE;

const Documents: React.FC = () => {
  // Main Tabs
  const [viewMode, setViewMode] = useState<'files' | 'templates'>('files');

  // Files State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tous');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('autre');
  const [uploadDesc, setUploadDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      type: 'danger' | 'warning' | 'info';
      action: () => Promise<void>;
  }>({
      isOpen: false,
      title: '',
      message: '',
      type: 'danger',
      action: async () => {}
  });

  useEffect(() => {
    if (viewMode === 'files') fetchDocuments();
  }, [viewMode]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentApi.getDocuments({});
      setDocuments(docs);
    } catch (error) {
      console.error(error);
      toast.error("Erreur chargement documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      await documentApi.uploadDocument({
        file: uploadFile,
        categorie: uploadCategory,
        description: uploadDesc
      });
      toast.success("Document uploadé !");
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDesc('');
      fetchDocuments(); // Refresh
    } catch (error) {
      console.error(error);
      toast.error("Erreur upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmConfig({
        isOpen: true,
        title: 'Supprimer ce document',
        message: 'Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.',
        type: 'danger',
        action: async () => {
            try {
              await documentApi.deleteDocument(id);
              toast.success("Document supprimé");
              setDocuments(documents.filter(d => d.id !== id));
            } catch (error) {
              console.error(error);
              toast.error("Erreur suppression");
            }
        }
    });
  };

  const getFileUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  const formatSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (isNaN(size)) return '-';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon size={20} className="text-purple-500" />;
    if (type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    return <File size={20} className="text-base-content/60" />;
  };

  // Filter logic
  const filteredDocuments = documents.filter(doc => {
    const matchTab = activeTab === 'tous' || doc.categorie === activeTab;
    const matchSearch = doc.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabs = [
    { id: 'tous', label: 'Tous' },
    { id: 'baux', label: 'Baux' },
    { id: 'quittances', label: 'Quittances' },
    { id: 'identite', label: 'Identité' },
    { id: 'generated', label: 'Générés' }, // New tab for generated docs
    { id: 'autre', label: 'Autre' }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      {/* Header with Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-content/90">Gestion Documentaire</h1>
          <p className="text-base-content/60">Centralisez, générez et gérez vos documents</p>
        </div>
        
        <div className="flex gap-2">
             {viewMode === 'files' ? (
                 <>
                    <Button variant="secondary" onClick={() => setShowGenerator(true)}>
                        <Wand2 size={18} className="mr-2" /> Générer
                    </Button>
                    <Button onClick={() => setShowUploadModal(true)}>
                        <Upload size={18} className="mr-2" /> Importer
                    </Button>
                 </>
             ) : null}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-base-300">
          <button 
            onClick={() => setViewMode('files')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${viewMode === 'files' ? 'border-primary text-primary' : 'border-transparent text-base-content/60 hover:text-base-content/80'}`}
          >
              <FileText size={18}/> Mes Documents
          </button>
          <button 
            onClick={() => setViewMode('templates')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${viewMode === 'templates' ? 'border-primary text-primary' : 'border-transparent text-base-content/60 hover:text-base-content/80'}`}
          >
              <LayoutTemplate size={18}/> Mes Modèles
          </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'files' ? (
            <motion.div
                key="files"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
            >
                <Card>
                    {/* Tabs & Search */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                    <div className="flex space-x-1 bg-base-300 p-1 rounded-lg overflow-x-auto w-full md:w-auto">
                        {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'bg-base-100 text-brand-600 shadow-sm' 
                                : 'text-base-content/70 hover:text-base-content'
                            }`}
                        >
                            {tab.label}
                        </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" size={18} />
                        <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-base-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    </div>

                    {/* List */}
                    <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-base-200 text-left">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-base-content/60 uppercase tracking-wider">Nom</th>
                            <th className="px-6 py-3 text-xs font-semibold text-base-content/60 uppercase tracking-wider">Catégorie</th>
                            <th className="px-6 py-3 text-xs font-semibold text-base-content/60 uppercase tracking-wider">Taille</th>
                            <th className="px-6 py-3 text-xs font-semibold text-base-content/60 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-xs font-semibold text-base-content/60 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {filteredDocuments.map((doc) => (
                            <tr key={doc.id} className="hover:bg-base-200 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-base-300 rounded-lg">
                                    {getIcon(doc.type)}
                                    </div>
                                    <div className="ml-4">
                                    <div className="text-sm font-medium text-base-content">{doc.nom}</div>
                                    <div className="text-xs text-base-content/60">{doc.description}</div>
                                    </div>
                                </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${doc.categorie === 'generated' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {doc.categorie}
                                </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content/60">
                                {formatSize(doc.taille)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content/60">
                                {new Date(doc.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                    <a 
                                    href={getFileUrl(doc.url)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-base-content/50 hover:text-brand-600 transition-colors"
                                    title="Voir"
                                    >
                                    <Eye size={18} />
                                    </a>
                                    <a 
                                    href={getFileUrl(doc.url)} 
                                    download
                                    className="text-base-content/50 hover:text-brand-600 transition-colors"
                                    title="Télécharger"
                                    >
                                        <Download size={18} />
                                    </a>
                                    <button 
                                    onClick={() => handleDelete(doc.id)}
                                    className="text-base-content/50 hover:text-red-600 transition-colors"
                                    title="Supprimer"
                                    >
                                    <Trash2 size={18} />
                                    </button>
                                </div>
                                </td>
                            </tr>
                        ))}
                        {filteredDocuments.length === 0 && !loading && (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-base-content/60">Aucun document trouvé.</td></tr>
                        )}
                        </tbody>
                    </table>
                    </div>
                </Card>
            </motion.div>
        ) : (
            <motion.div
                key="templates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
            >
                <DocumentTemplates />
            </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-base-100 rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold mb-4">Nouveau Document</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1">Fichier</label>
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-base-300 border-dashed rounded-lg cursor-pointer bg-base-200 hover:bg-base-300">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-base-content/50" />
                            <p className="text-sm text-base-content/60">
                                {uploadFile ? uploadFile.name : "Cliquez pour upload"}
                            </p>
                            <p className="text-xs text-base-content/60">PDF, PNG, JPG (Max 10MB)</p>
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                    </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1">Catégorie</label>
                <select 
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full border border-base-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="autre">Autre</option>
                  <option value="baux">Bail</option>
                  <option value="quittances">Quittance</option>
                  <option value="identite">Identité</option>
                  <option value="facture">Facture</option>
                </select>
              </div>

              <div>
                 <Input 
                   label="Description (Optionnel)"
                   value={uploadDesc}
                   onChange={(e) => setUploadDesc(e.target.value)}
                   placeholder="Ex: Facture électricité Janvier"
                 />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="secondary" onClick={() => setShowUploadModal(false)} type="button">Annuler</Button>
                <Button type="submit" disabled={!uploadFile || isUploading}>
                  {isUploading ? 'Upload...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

        {/* Generator Wizard */}
        {showGenerator && (
            <DocumentGenerator 
                onClose={() => setShowGenerator(false)} 
                onSuccess={() => {
                    fetchDocuments();
                }} 
            />
        )}

      {/* Dynamic Confirm Modal */}
      <ConfirmModal
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
          onConfirm={() => {
              confirmConfig.action();
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
      />

    </div>
  );
};

export default Documents;
