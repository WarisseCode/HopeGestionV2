import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  File,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { documentApi, type Document } from '../api/documentApi';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tous');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('autre');
  const [uploadDesc, setUploadDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

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
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      await documentApi.deleteDocument(id);
      toast.success("Document supprimé");
      setDocuments(documents.filter(d => d.id !== id));
    } catch (error) {
      console.error(error);
      toast.error("Erreur suppression");
    }
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
    return <File size={20} className="text-gray-500" />;
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
    { id: 'autre', label: 'Autre' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
          <p className="text-gray-500">Gérez tous vos fichiers centralisés</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload size={20} className="mr-2" />
          Nouveau Document
        </Button>
      </div>

      <Card>
        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Taille</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <AnimatePresence>
                {filteredDocuments.map((doc) => (
                  <motion.tr 
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-lg">
                          {getIcon(doc.type)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.nom}</div>
                          <div className="text-xs text-gray-500">{doc.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {doc.categorie}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatSize(doc.taille)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <a 
                          href={getFileUrl(doc.url)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-brand-600 transition-colors"
                          title="Voir"
                        >
                          <Eye size={18} />
                        </a>
                        <a 
                           href={getFileUrl(doc.url)} 
                           download
                           className="text-gray-400 hover:text-brand-600 transition-colors"
                           title="Télécharger"
                        >
                            <Download size={18} />
                        </a>
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredDocuments.length === 0 && !loading && (
                 <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                        Aucun document trouvé.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold mb-4">Nouveau Document</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier</label>
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="text-sm text-gray-500">
                                {uploadFile ? uploadFile.name : "Cliquez pour upload"}
                            </p>
                            <p className="text-xs text-gray-500">PDF, PNG, JPG (Max 10MB)</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select 
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
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
                <Button variant="secondary" onClick={() => setShowUploadModal(false)} type="button">
                  Annuler
                </Button>
                <Button type="submit" disabled={!uploadFile || isUploading}>
                  {isUploading ? 'Upload...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Documents;
