import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, Save, LayoutTemplate, Variable, ChevronRight } from 'lucide-react';
import { templateApi, DocumentTemplate } from '../api/templateApi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { toast } from 'react-hot-toast';

const DocumentTemplates: React.FC = () => {
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<Partial<DocumentTemplate> | null>(null);
    const [variables, setVariables] = useState<string[]>([]);
    
    // Available types
    const types = [
        { id: 'lease', label: 'Contrat de Bail' },
        { id: 'receipt', label: 'Quittance / Reçu' },
        { id: 'notice', label: 'Avis / Relance' },
        { id: 'other', label: 'Autre' }
    ];

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (editingTemplate?.type) {
            loadVariables(editingTemplate.type);
        }
    }, [editingTemplate?.type]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await templateApi.getTemplates();
            setTemplates(data);
        } catch (error) {
            toast.error("Erreur chargement modèles");
        } finally {
            setLoading(false);
        }
    };

    const loadVariables = async (type: string) => {
        try {
            const vars = await templateApi.getVariables(type);
            setVariables(vars);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (!editingTemplate?.name || !editingTemplate?.content) return toast.error("Nom et contenu requis");
        
        try {
            if (editingTemplate.id) {
                await templateApi.updateTemplate(editingTemplate.id, editingTemplate);
                toast.success("Modèle mis à jour");
            } else {
                await templateApi.createTemplate(editingTemplate);
                toast.success("Modèle créé");
            }
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            toast.error("Erreur sauvegarde");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Supprimer ce modèle ?")) return;
        try {
            await templateApi.deleteTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
            toast.success("Supprimé");
        } catch (error) {
            toast.error("Erreur suppression");
        }
    };

    const insertVariable = (v: string) => {
        if (!editingTemplate) return;
        const textarea = document.getElementById('template-editor') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = editingTemplate.content || '';
            const newText = text.substring(0, start) + v + text.substring(end);
            setEditingTemplate({...editingTemplate, content: newText});
            // Focus back logic could be added here
        }
    };

    if (editingTemplate) {
        return (
            <div className="space-y-6 h-full flex flex-col">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Edit2 size={20} /> Éditeur de Modèle
                    </h2>
                    <div className="flex gap-2">
                         <Button variant="ghost" onClick={() => setEditingTemplate(null)}>Annuler</Button>
                         <Button variant="primary" onClick={handleSave}><Save size={16} className="mr-2"/> Enregistrer</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <Card className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Nom du modèle" 
                                    value={editingTemplate.name || ''} 
                                    onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de document</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-lg p-2"
                                        value={editingTemplate.type || 'other'}
                                        onChange={e => setEditingTemplate({...editingTemplate, type: e.target.value})}
                                    >
                                        {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </Card>
                        <Card className="flex-1 flex flex-col p-4 bg-gray-50 border border-gray-200">
                             <label className="block text-sm font-bold text-gray-700 mb-2">Contenu du document</label>
                             <textarea 
                                id="template-editor"
                                className="flex-1 w-full bg-white border border-gray-300 rounded p-4 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                value={editingTemplate.content || ''}
                                onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
                                placeholder="Saisissez votre texte ici..."
                             />
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="h-full bg-blue-50 border-blue-100">
                            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                                <Variable size={18} /> Variables Dynamiques
                            </h3>
                            <p className="text-sm text-blue-700 mb-4">
                                Cliquez sur une variable pour l'insérer à la position du curseur.
                            </p>
                            <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px]">
                                {variables.length > 0 ? variables.map(v => (
                                    <button 
                                        key={v}
                                        onClick={() => insertVariable(v)}
                                        className="text-left px-3 py-2 bg-white rounded border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors text-sm font-mono text-blue-800 flex justify-between items-center group"
                                    >
                                        {v}
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                )) : (
                                    <p className="text-gray-400 italic text-sm">Sélectionnez un type pour voir les variables.</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Mes Modèles</h2>
                    <p className="text-gray-500">Créez et personnalisez vos documents types</p>
                </div>
                <Button onClick={() => setEditingTemplate({ type: 'other', content: '' })}>
                    <Plus size={18} className="mr-2" /> Nouveau Modèle
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(t => (
                    <Card key={t.id} className="group hover:shadow-md transition-shadow relative">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingTemplate(t)} className="p-1 text-gray-400 hover:text-blue-500 bg-white rounded-full shadow-sm"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete(t.id)} className="p-1 text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm"><Trash2 size={16}/></button>
                        </div>
                        
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <LayoutTemplate size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{t.name}</h3>
                                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 capitalize">{types.find(type => type.id === t.type)?.label || t.type}</span>
                            </div>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-4">
                            Modifié le {new Date(t.created_at).toLocaleDateString()}
                        </p>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default DocumentTemplates;
