import React, { useState, useEffect } from 'react';
import { Plus, Trash2, StickyNote, EyeOff, Eye, Search } from 'lucide-react';
import { notebookApi, type Note } from '../../api/notebookApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { toast } from 'react-hot-toast';

const CarnetNotes: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // New Note State
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newVisibility, setNewVisibility] = useState<'private' | 'shared'>('private');

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        const data = await notebookApi.getNotes();
        setNotes(data);
    };

    const handleCreate = async () => {
        if (!newTitle || !newContent) return;
        try {
            await notebookApi.createNote({
                title: newTitle,
                content: newContent,
                visibility: newVisibility,
                type: 'note'
            });
            toast.success("Note ajoutée");
            setNewTitle('');
            setNewContent('');
            setIsCreating(false);
            loadNotes();
        } catch (error) {
            toast.error("Erreur création");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Supprimer cette note ?")) return;
        try {
            await notebookApi.deleteNote(id);
            setNotes(notes.filter(n => n.id !== id));
            toast.success("Supprimé");
        } catch (error) {
            toast.error("Erreur suppression");
        }
    };

    const filteredNotes = notes.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        n.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" size={16} />
                    <input 
                        className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm"
                        placeholder="Rechercher une note..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    <Plus size={18} className="mr-2" /> Nouvelle Note
                </Button>
            </div>

            {isCreating && (
                <Card className="p-4 border-2 border-primary/20 animate-in fade-in slide-in-from-top-4">
                    <div className="space-y-3">
                        <Input 
                            label="Titre"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Sujet de la note"
                        />
                         <div>
                            <label className="block text-sm font-medium text-base-content/80 mb-1">Contenu</label>
                            <textarea 
                                className="w-full border rounded-lg p-3 min-h-[100px]"
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="Détails..."
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={newVisibility === 'private'} onChange={() => setNewVisibility('private')} />
                                    <span className="text-sm flex items-center gap-1"><EyeOff size={14}/> Privé</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={newVisibility === 'shared'} onChange={() => setNewVisibility('shared')} />
                                    <span className="text-sm flex items-center gap-1"><Eye size={14}/> Partagé</span>
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => setIsCreating(false)}>Annuler</Button>
                                <Button onClick={handleCreate}>Enregistrer</Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map(n => (
                    <Card key={n.id} className="relative group hover:shadow-md transition-shadow bg-yellow-50">
                        <button 
                            onClick={() => handleDelete(n.id)}
                            className="absolute top-2 right-2 text-base-content/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={16} />
                        </button>
                        <h3 className="font-bold text-base-content/90 mb-2 flex items-center gap-2">
                             <StickyNote size={16} className="text-yellow-600" />
                             {n.title}
                        </h3>
                        <p className="text-sm text-base-content/80 whitespace-pre-wrap">{n.content}</p>
                        <div className="mt-4 pt-4 border-t border-yellow-100 flex justify-between items-center text-xs text-base-content/60">
                             <span>{new Date(n.created_at).toLocaleDateString()}</span>
                             <span className="capitalize px-2 py-1 bg-base-100 rounded-full border border-yellow-200">
                                 {n.visibility === 'private' ? 'Privé' : 'Partagé'}
                             </span>
                        </div>
                    </Card>
                ))}
                {filteredNotes.length === 0 && !isCreating && (
                    <div className="col-span-full text-center text-base-content/50 py-10">Aucune note trouvée.</div>
                )}
            </div>
        </div>
    );
};

export default CarnetNotes;
