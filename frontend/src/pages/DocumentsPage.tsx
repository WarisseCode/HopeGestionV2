// frontend/src/pages/DocumentsPage.tsx
import React, { useState, useRef } from 'react';
import { 
  Folder, 
  FileText, 
  Upload, 
  Search, 
  MoreVertical, 
  Download, 
  Trash2, 
  Eye, 
  Grid, 
  List,
  File,
  FileImage,
  Clock,
  X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useUser } from '../contexts/UserContext';

import { getDocuments, uploadDocument, deleteDocument, downloadDocument } from '../api/documentApi';
import type { Document } from '../api/documentApi';

const DocumentsPage: React.FC = () => {
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState('Autre');
  const [docDescription, setDocDescription] = useState('');

  // Data
  const [documents, setDocuments] = useState<Document[]>([]);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setSelectedFile(e.target.files[0]);
      }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('categorie', docCategory);
      formData.append('description', docDescription);
      
      await uploadDocument(formData);
      
      setShowUploadModal(false);
      setSelectedFile(null);
      setDocDescription('');
      fetchDocs();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'upload');
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if(!window.confirm('Supprimer ce document ? (L\'action est irréversible)')) return;
    try {
      await deleteDocument(id);
      fetchDocs();
    } catch (err) {
      alert('Erreur suppression');
    }
  };

  const handleDownload = async (doc: Document) => {
        try {
            await downloadDocument(doc.id, doc.nom);
        } catch (error) {
            console.error(error);
            alert("Erreur lors du téléchargement");
        }
  };

  const categories = ['Tous', 'Contrats', 'Quittances', 'Factures', 'États des lieux', 'Administratif', 'Locataires', 'Autre'];

  const filteredDocs = documents.filter(doc => {
    const matchSearch = doc.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = activeCategory === 'Tous' || doc.categorie === activeCategory;
    return matchSearch && matchCategory;
  });

  const getIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="text-blue-500" size={40} />;
    if (mimeType === 'application/pdf') return <FileText className="text-red-500" size={40} />;
    return <File className="text-gray-500" size={40} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Coffre-fort Numérique</h1>
          <p className="text-sm text-base-content/60">Gérez et sécurisez tous vos documents immobiliers</p>
        </div>
        <Button variant="primary" onClick={() => setShowUploadModal(true)}>
          <Upload size={18} className="mr-2" />
          Ajouter un document
        </Button>
      </div>

      {/* Toolbar - Unchanged */}
      <div className="bg-base-100 p-4 rounded-xl border border-base-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-64">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="input input-bordered w-full pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
           <div className="flex bg-base-200 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/60'}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/60'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Categories */}
        <div className="bg-base-100 rounded-xl border border-base-200 p-4 h-fit">
          <h3 className="font-bold mb-3 px-2">Dossiers</h3>
          <ul className="space-y-1">
            {categories.map(cat => (
              <li key={cat}>
                <button 
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-sm transition-colors ${activeCategory === cat ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-base-200 text-base-content/70'}`}
                >
                  <span className="flex items-center gap-2">
                    {cat === 'Tous' ? <Grid size={16} /> : <Folder size={16} />}
                    {cat}
                  </span>
                  <span className="text-xs opacity-50 bg-base-200 px-2 py-0.5 rounded-full">
                    {cat === 'Tous' ? documents.length : documents.filter(d => d.categorie === cat).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          
           {/* Space Usage Indicator (Static for now) */}
          <div className="mt-6 pt-6 border-t border-base-200">
             <div className="bg-base-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-bold text-base-content/70">STOCKAGE</span>
                   <span className="text-xs text-primary font-bold">Local</span>
                </div>
                <progress className="progress progress-primary w-full" value="25" max="100"></progress>
                <div className="text-xs text-base-content/50 mt-1">Fichiers stockés localement</div>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
           {loading ? (
               <div className="flex justify-center p-12"><span className="loading loading-spinner loading-lg"></span></div>
           ) : viewMode === 'grid' ? (
             <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {filteredDocs.map(doc => (
                 <div key={doc.id} className="group bg-base-100 p-4 rounded-xl border border-base-200 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer relative">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} className="btn btn-ghost btn-xs btn-square bg-base-100/80 shadow-sm"><Download size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="btn btn-ghost btn-xs btn-square bg-base-100/80 shadow-sm text-error"><Trash2 size={14} /></button>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-6" onClick={() => handleDownload(doc)}>
                      {getIcon(doc.type)}
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-sm truncate w-full" title={doc.nom}>{doc.nom}</h3>
                      <p className="text-xs text-base-content/50 mt-1">{(parseInt(doc.taille) / 1024 / 1024).toFixed(2)} MB • {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                 </div>
               ))}
               {filteredDocs.length === 0 && (
                 <div className="col-span-full py-12 flex flex-col items-center justify-center text-base-content/40 border-2 border-dashed border-base-200 rounded-xl">
                    <Folder size={48} className="mb-2 opacity-50" />
                    <p>Aucun document trouvé</p>
                 </div>
               )}
             </div>
           ) : (
             <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden">
                <table className="table w-full">
                   <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Catégorie</th>
                        <th>Date</th>
                        <th>Taille</th>
                        <th>Actions</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filteredDocs.map(doc => (
                        <tr key={doc.id} className="hover:bg-base-200/50">
                          <td>
                             <div className="flex items-center gap-3">
                                {getIcon(doc.type)}
                                <span className="font-medium text-sm">{doc.nom}</span>
                             </div>
                          </td>
                          <td><span className="badge badge-ghost badge-sm">{doc.categorie}</span></td>
                          <td className="text-sm opacity-70">{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td className="text-sm opacity-70">{(parseInt(doc.taille) / 1024 / 1024).toFixed(2)} MB</td>
                          <td>
                             <div className="flex gap-1">
                                <button onClick={() => handleDownload(doc)} className="btn btn-ghost btn-sm btn-square" title="Télécharger"><Download size={16} /></button>
                                <button onClick={() => handleDelete(doc.id)} className="btn btn-ghost btn-sm btn-square text-error" title="Supprimer"><Trash2 size={16} /></button>
                             </div>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           )}
        </div>
      </div>

      {/* Real Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Ajouter un document"
        footer={
          <Button variant="primary" className="w-full" onClick={handleUpload} disabled={!selectedFile || loading}>
            {loading ? 'Envoi en cours...' : 'Importer'}
          </Button>
        }
      >
         <div className="space-y-4">
            {/* File Drop Zone */}
            <div className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center hover:bg-base-200 transition-colors relative">
               <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
               />
               {selectedFile ? (
                   <div className="flex flex-col items-center text-success">
                       <FileText size={32} className="mb-2" />
                       <span className="font-medium">{selectedFile.name}</span>
                       <span className="text-xs opacity-70">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                       <button onClick={(e) => {e.preventDefault(); setSelectedFile(null);}} className="btn btn-xs btn-ghost text-error mt-2">Changer</button>
                   </div>
               ) : (
                   <div className="flex flex-col items-center">
                       <Upload size={32} className="mb-2 text-base-content/40" />
                       <span className="font-medium">Cliquez pour sélectionner un fichier</span>
                       <span className="text-xs opacity-50 mt-1">PDF, JPG, PNG (Max 5MB)</span>
                   </div>
               )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Catégorie</label>
              <select 
                className="select select-bordered w-full"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
              >
                 {categories.filter(c => c !== 'Tous').map(c => (
                   <option key={c} value={c}>{c}</option>
                 ))}
              </select>
            </div>

            <Input 
              label="Description (optionnel)" 
              value={docDescription} 
              onChange={(e) => setDocDescription(e.target.value)} 
              placeholder="Ex: Facture plomberie Janvier"
            />
         </div>
      </Modal>
    </div>
  );
};

export default DocumentsPage;
