// frontend/src/pages/DocumentsPage.tsx
import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  Upload, 
  Search, 
  Download, 
  Trash2, 
  Grid, 
  List,
  File,
  FileImage,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';

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
    if (mimeType.startsWith('image/')) return <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FileImage size={24} /></div>;
    if (mimeType === 'application/pdf') return <div className="p-3 bg-red-100 text-red-600 rounded-xl"><FileText size={24} /></div>;
    return <div className="p-3 bg-gray-100 text-gray-600 rounded-xl"><File size={24} /></div>;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="p-6 md:p-8 space-y-8 max-w-[1700px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Coffre-fort Numérique <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">Sécurisez et organisez tous vos documents immobiliers.</p>
        </div>
        <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => setShowUploadModal(true)}
        >
          <Upload size={18} className="mr-2" />
          Ajouter un document
        </Button>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <motion.div variants={itemVariants} className="lg:w-64 flex-shrink-0 space-y-6">
           <Card className="border-none shadow-lg bg-base-100 p-4">
                <Button variant="primary" className="w-full mb-6 rounded-xl" onClick={() => setShowUploadModal(true)}>
                    <Upload size={18} className="mr-2" />
                    Importer
                </Button>
                
                <h3 className="font-bold text-base-content/60 text-xs uppercase tracking-wider mb-3 px-2">Dossiers</h3>
                <nav className="space-y-1">
                    {categories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between text-sm transition-all ${
                            activeCategory === cat ? 'bg-primary/10 text-primary font-bold' : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                        }`}
                    >
                        <span className="flex items-center gap-3">
                            {cat === 'Tous' ? <Grid size={18} /> : <Folder size={18} />}
                            {cat}
                        </span>
                        {activeCategory === cat && <ChevronRight size={14} />}
                    </button>
                    ))}
                </nav>

                 <div className="mt-8 pt-6 border-t border-base-200">
                    <div className="flex items-center gap-3 mb-2 px-2">
                        <HardDrive size={16} className="text-base-content/40"/>
                        <span className="text-xs font-bold text-base-content/60">STOCKAGE</span>
                    </div>
                     <div className="bg-base-200 rounded-full h-2 w-full overflow-hidden">
                        <div className="bg-primary h-full w-[25%] rounded-full"></div>
                     </div>
                     <p className="text-xs text-base-content/40 mt-2 px-2">2.5 GB utilisés sur 10 GB</p>
                 </div>
           </Card>
        </motion.div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
             {/* Toolbar */}
            <motion.div variants={itemVariants}>
             <Card className="border-none shadow-sm bg-base-100 p-2">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input 
                        type="text" 
                        placeholder="Rechercher un fichier..." 
                        className="input input-sm h-10 w-full pl-11 bg-base-200/50 border-transparent focus:bg-base-100 focus:border-primary rounded-xl transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    </div>
                    <div className="flex bg-base-200 rounded-lg p-1">
                        <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/50 hover:text-base-content'}`}
                        >
                        <Grid size={18} />
                        </button>
                        <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/50 hover:text-base-content'}`}
                        >
                        <List size={18} />
                        </button>
                    </div>
                </div>
             </Card>
            </motion.div>

             {/* Files Display */}
             <motion.div variants={itemVariants}>
             {loading ? (
                 <div className="flex justify-center p-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
             ) : viewMode === 'grid' ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                     <AnimatePresence>
                     {filteredDocs.map(doc => (
                         <motion.div 
                            layout
                            initial={{opacity: 0, scale: 0.9}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0.9}}
                            key={doc.id} 
                            className="group bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative"
                         >
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} className="p-1.5 rounded-full bg-base-200 hover:bg-base-100 hover:text-primary hover:shadow-md transition-all"><Download size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-md transition-all dark:bg-red-900/30 dark:text-red-400"><Trash2 size={14} /></button>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center py-6" onClick={() => handleDownload(doc)}>
                                {getIcon(doc.type)}
                            </div>
                            <div className="text-center mt-2">
                                <h3 className="font-bold text-base-content text-sm truncate w-full" title={doc.nom}>{doc.nom}</h3>
                                <p className="text-xs text-base-content/40 mt-1 font-medium">{new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                             <div className="mt-4 pt-3 border-t border-base-200 flex justify-between items-center">
                                 <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider">{doc.categorie}</span>
                                 <span className="text-[10px] font-bold text-base-content/40">{(parseInt(doc.taille) / 1024 / 1024).toFixed(2)} MB</span>
                             </div>
                         </motion.div>
                     ))}
                     </AnimatePresence>
                     {filteredDocs.length === 0 && (
                         <div className="col-span-full py-20 flex flex-col items-center justify-center text-base-content/40">
                             <div className="p-6 bg-base-200 rounded-full mb-4">
                                <Folder size={48} className="opacity-20" />
                             </div>
                             <p className="text-lg font-medium">Aucun document trouvé</p>
                             <p className="text-sm opacity-60">Essayez de changer de catégorie ou importez un nouveau fichier.</p>
                         </div>
                     )}
                 </div>
             ) : (
                 <Card className="border-none shadow-lg bg-base-100 p-0 overflow-hidden">
                     <table className="table w-full">
                         <thead className="bg-base-200/50">
                             <tr>
                                 <th className="pl-6 py-4 text-base-content/60">Nom</th>
                                 <th className="text-base-content/60">Catégorie</th>
                                 <th className="text-base-content/60">Date</th>
                                 <th className="text-base-content/60">Taille</th>
                                 <th className="text-right pr-6 text-base-content/60">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-base-200">
                             {filteredDocs.map(doc => (
                                 <tr key={doc.id} className="hover:bg-base-200/50 transition-colors group">
                                     <td className="pl-6">
                                         <div className="flex items-center gap-4">
                                             {getIcon(doc.type)}
                                             <span className="font-bold text-base-content">{doc.nom}</span>
                                         </div>
                                     </td>
                                     <td><span className="badge badge-ghost badge-sm font-medium text-base-content/60">{doc.categorie}</span></td>
                                     <td className="text-sm text-base-content/60 font-medium">{new Date(doc.created_at).toLocaleDateString()}</td>
                                     <td className="text-sm text-base-content/60 font-mono">{(parseInt(doc.taille) / 1024 / 1024).toFixed(2)} MB</td>
                                     <td className="text-right pr-6">
                                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => handleDownload(doc)} className="btn btn-ghost btn-sm btn-square hover:bg-primary/10 hover:text-primary"><Download size={16} /></button>
                                             <button onClick={() => handleDelete(doc.id)} className="btn btn-ghost btn-sm btn-square hover:bg-error/10 hover:text-error"><Trash2 size={16} /></button>
                                         </div>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </Card>
             )}
             </motion.div>
        </div>
      </div>

      {/* Modern Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Ajouter un document"
      >
         <div className="space-y-6 pt-4">
            <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 relative ${selectedFile ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'}`}
            >
               <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
               />
               {selectedFile ? (
                   <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                       <div className="p-4 bg-white rounded-full shadow-lg mb-3 text-primary">
                            <FileText size={32} />
                       </div>
                       <span className="font-bold text-lg text-gray-800">{selectedFile.name}</span>
                       <span className="text-sm text-gray-500 font-mono mb-2">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                       <span className="text-xs font-bold text-primary uppercase tracking-wide">Fichier prêt à l'envoi</span>
                   </div>
               ) : (
                   <div className="flex flex-col items-center">
                       <div className="p-4 bg-gray-100 rounded-full mb-3 text-gray-400 group-hover:text-primary transition-colors">
                            <Upload size={32} />
                       </div>
                       <span className="font-bold text-lg text-gray-700">Cliquez ou déposez un fichier</span>
                       <span className="text-sm text-gray-400 mt-1">PDF, JPG, PNG (Max 5MB)</span>
                   </div>
               )}
            </div>

            <div className="grid gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie</label>
                    <select 
                        className="select select-bordered w-full bg-gray-50 focus:bg-white transition-colors"
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

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => setShowUploadModal(false)}>Annuler</Button>
                <Button 
                    variant="primary" 
                    onClick={handleUpload} 
                    disabled={!selectedFile || loading}
                    className="w-32"
                >
                    {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Importer'}
                </Button>
            </div>
         </div>
      </Modal>
    </motion.div>
  );
};

export default DocumentsPage;
