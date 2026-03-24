import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, LayoutTemplate, Tags, ChevronRight, FileText, Receipt, AlertTriangle, File, Info } from 'lucide-react';
import { templateApi, type DocumentTemplate } from '../api/templateApi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { toast } from 'react-hot-toast';

interface VariableItem {
    variable: string;
    label: string;
}

const DocumentTemplates: React.FC = () => {
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<Partial<DocumentTemplate> | null>(null);
    const [variables, setVariables] = useState<VariableItem[]>([]);
    
    // Available types with icons and colors
    const types = [
        { id: 'lease', label: 'Contrat de Bail', icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' },
        { id: 'receipt', label: 'Quittance / Reçu', icon: Receipt, color: 'text-green-600 bg-green-50 border-green-200' },
        { id: 'notice', label: 'Avis / Relance', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
        { id: 'other', label: 'Autre', icon: File, color: 'text-base-content/70 bg-base-200 border-base-200' }
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
            // Handle both old format (string[]) and new format ({variable, label}[])
            if (vars.length > 0 && typeof vars[0] === 'string') {
                setVariables((vars as unknown as string[]).map(v => ({ variable: v, label: '' })));
            } else {
                setVariables(vars as unknown as VariableItem[]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (!editingTemplate?.name || !editingTemplate?.content) return toast.error("Nom et contenu requis");
        
        try {
            if (editingTemplate.id) {
                await templateApi.updateTemplate(editingTemplate.id, editingTemplate);
                toast.success("Modèle mis à jour avec succès !");
            } else {
                await templateApi.createTemplate(editingTemplate);
                toast.success("Nouveau modèle créé avec succès !");
            }
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            toast.error("Erreur lors de la sauvegarde");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;
        try {
            await templateApi.deleteTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
            toast.success("Modèle supprimé");
        } catch (error) {
            toast.error("Erreur lors de la suppression");
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
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + v.length, start + v.length);
            }, 50);
        }
    };

    const getTypeInfo = (typeId: string) => types.find(t => t.id === typeId) || types[3];

    // ============================================
    // EDITOR VIEW
    // ============================================
    if (editingTemplate) {
        return (
            <div className="space-y-6 h-full flex flex-col">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-base-content">
                        <Edit2 size={20} className="text-primary" /> {editingTemplate.id ? 'Modifier le Modèle' : 'Nouveau Modèle'}
                    </h2>
                    <div className="flex gap-2">
                         <Button variant="ghost" onClick={() => setEditingTemplate(null)}>Annuler</Button>
                         <Button variant="primary" onClick={handleSave}><Save size={16} className="mr-2"/> Enregistrer</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <Card className="p-5 space-y-4 border border-base-200">
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Nom du modèle" 
                                    value={editingTemplate.name || ''} 
                                    onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                                    placeholder="Ex: Contrat de bail standard"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">Type de document</label>
                                    <select 
                                        className="w-full border border-base-300 bg-base-100 text-base-content rounded-xl p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={editingTemplate.type || 'other'}
                                        onChange={e => setEditingTemplate({...editingTemplate, type: e.target.value})}
                                    >
                                        {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </Card>
                        <Card className="flex-1 flex flex-col p-5 border border-base-200">
                             <label className="block text-sm font-bold text-base-content/80 mb-2">Contenu du document</label>
                             <textarea 
                                id="template-editor"
                                className="flex-1 w-full bg-base-200/50 border border-base-300 rounded-xl p-4 text-sm leading-relaxed focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none transition-all"
                                value={editingTemplate.content || ''}
                                onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
                                placeholder="Rédigez votre modèle ici...&#10;&#10;Utilisez les variables du panneau de droite pour insérer des données dynamiques.&#10;Exemple : Le locataire {{Nom du Locataire}} habitant au {{Adresse du Bien}}..."
                             />
                        </Card>
                    </div>

                    {/* Variables Panel */}
                    <div className="lg:col-span-1">
                        <Card className="h-full bg-primary/5 border border-primary/15 p-5">
                            <h3 className="font-bold text-primary mb-1 flex items-center gap-2">
                                <Tags size={18} /> Champs Dynamiques
                            </h3>
                            <p className="text-xs text-base-content/60 mb-4">
                                Cliquez sur un champ pour l'insérer à la position du curseur dans votre texte.
                            </p>

                            <div className="bg-primary/10 rounded-lg p-3 mb-4 flex items-start gap-2">
                                <Info size={14} className="text-primary mt-0.5 shrink-0" />
                                <p className="text-xs text-primary/80">
                                    Ces champs seront automatiquement remplacés par les vraies données lors de la génération du document PDF.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px]">
                                {variables.length > 0 ? variables.map(v => (
                                    <button 
                                        key={v.variable}
                                        onClick={() => insertVariable(v.variable)}
                                        className="text-left px-3 py-2.5 bg-base-100 rounded-lg border border-base-300 hover:border-primary hover:bg-primary/5 hover:shadow-sm transition-all text-sm group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-primary">{v.variable.replace(/\{\{|\}\}/g, '')}</span>
                                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                        </div>
                                        {v.label && (
                                            <p className="text-xs text-base-content/50 mt-0.5">{v.label}</p>
                                        )}
                                    </button>
                                )) : (
                                    <p className="text-base-content/60 italic text-sm text-center py-4">Sélectionnez un type de document pour voir les champs disponibles.</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // LIST VIEW
    // ============================================
    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-base-content/90">Mes Modèles</h2>
                    <p className="text-base-content/60 text-sm">Créez et personnalisez vos documents types pour générer des PDF en un clic.</p>
                </div>
                <Button onClick={() => setEditingTemplate({ type: 'lease', content: '' })}>
                    <Plus size={18} className="mr-2" /> Nouveau Modèle
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : templates.length === 0 ? (
                <Card className="p-12 text-center border border-dashed border-base-300">
                    <LayoutTemplate size={48} className="mx-auto text-base-content/20 mb-4" />
                    <h3 className="text-lg font-bold text-base-content/70 mb-2">Aucun modèle créé</h3>
                    <p className="text-base-content/50 text-sm mb-6 max-w-md mx-auto">
                        Les modèles vous permettent de créer des documents types (contrats, quittances, avis) qui seront automatiquement remplis avec les données de vos locataires et biens.
                    </p>
                    <Button onClick={() => setEditingTemplate({ type: 'lease', content: '' })}>
                        <Plus size={18} className="mr-2" /> Créer mon premier modèle
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(t => {
                        const typeInfo = getTypeInfo(t.type);
                        const TypeIcon = typeInfo.icon;
                        return (
                            <Card key={t.id} className="group hover:shadow-lg transition-all duration-300 relative border border-base-200 hover:border-primary/30">
                                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => setEditingTemplate(t)} 
                                        className="p-2 text-base-content/50 hover:text-primary bg-base-100 rounded-lg shadow-sm border border-base-200 hover:border-primary/30 transition-colors"
                                        title="Modifier"
                                    >
                                        <Edit2 size={15}/>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(t.id)} 
                                        className="p-2 text-base-content/50 hover:text-red-500 bg-base-100 rounded-lg shadow-sm border border-base-200 hover:border-red-200 transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={15}/>
                                    </button>
                                </div>
                                
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`p-3 rounded-xl border ${typeInfo.color}`}>
                                        <TypeIcon size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base-content/90 truncate">{t.name}</h3>
                                        <span className="text-xs px-2 py-0.5 bg-base-200 rounded-full text-base-content/60 mt-1 inline-block">
                                            {typeInfo.label}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-base-content/60 line-clamp-2 mb-3">
                                    {t.content ? t.content.substring(0, 120) + (t.content.length > 120 ? '...' : '') : 'Aucun contenu'}
                                </p>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-base-200">
                                    <p className="text-xs text-base-content/60">
                                        Créé le {new Date(t.created_at).toLocaleDateString('fr-FR')}
                                    </p>
                                    <button 
                                        onClick={() => setEditingTemplate(t)}
                                        className="text-xs text-primary font-medium hover:underline"
                                    >
                                        Éditer →
                                    </button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DocumentTemplates;
