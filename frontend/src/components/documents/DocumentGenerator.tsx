import React, { useState, useEffect } from 'react';
import { FileText, ArrowRight, Loader } from 'lucide-react';
import { templateApi, type DocumentTemplate } from '../../api/templateApi';
import { documentApi } from '../../api/documentApi';
import { locationApi } from '../../api/locationApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { toast } from 'react-hot-toast';

interface DocumentGeneratorProps {
    onClose: () => void;
    onSuccess: () => void;
}

const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
    const [entities, setEntities] = useState<any[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await templateApi.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    };

    const loadEntities = async (type: string) => {
        setLoading(true);
        try {
            if (type === 'lease') {
                const data = await locationApi.getLocations(); // Assuming this returns leases
                setEntities(data);
            }
            // Add other types logic here
        } catch (error) {
            toast.error("Erreur chargement données");
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateSelect = (t: DocumentTemplate) => {
        setSelectedTemplate(t);
        loadEntities(t.type);
        setStep(2);
    };

    const handleGenerate = async () => {
        if (!selectedTemplate || !selectedEntityId) return;
        setGenerating(true);
        try {
            await documentApi.generateDocument({
                templateId: selectedTemplate.id,
                entityId: parseInt(selectedEntityId),
                type: selectedTemplate.type
            });
            toast.success("Document généré !");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erreur lors de la génération");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full bg-base-100 h-[600px] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="text-blue-600" /> Générateur de Document
                    </h2>
                    <Button variant="ghost" onClick={onClose} size="sm">Fermer</Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-base-content/80">1. Choisissez un modèle</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templates.map(t => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => handleTemplateSelect(t)}
                                        className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="font-bold text-base-content/90">{t.name}</div>
                                            <div className="text-xs text-base-content/60 capitalize">{t.type}</div>
                                        </div>
                                        <ArrowRight size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                                {templates.length === 0 && (
                                    <div className="col-span-2 text-center text-gray-400 py-8">
                                        Aucun modèle disponible. Créez-en un dans l'onglet "Modèles".
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-sm text-base-content/60 mb-4 cursor-pointer hover:text-blue-600" onClick={() => setStep(1)}>
                                ← Retour aux modèles
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg mb-6">
                                <span className="text-xs font-bold uppercase text-blue-800 block mb-1">Modèle sélectionné</span>
                                <div className="font-bold text-blue-900 text-lg">{selectedTemplate?.name}</div>
                            </div>

                            <h3 className="font-bold text-base-content/80">2. Sélectionnez les données</h3>
                            
                            {loading ? (
                                <div className="flex justify-center py-8"><Loader className="animate-spin text-blue-500" /></div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-2">
                                        {selectedTemplate?.type === 'lease' ? 'Contrat de Bail concerné' : 'Entité concernée'}
                                    </label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-base-100"
                                        value={selectedEntityId}
                                        onChange={(e) => setSelectedEntityId(e.target.value)}
                                    >
                                        <option value="">-- Sélectionner --</option>
                                        {entities.map((e: any) => (
                                            <option key={e.id} value={e.id}>
                                                {e.locataire ? `Bail : ${e.locataire.prenoms} ${e.locataire.nom} (${e.bien.nom})` : `ID #${e.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t mt-auto flex justify-end">
                    {step === 2 && (
                        <Button 
                            variant="primary" 
                            onClick={handleGenerate} 
                            disabled={!selectedEntityId || generating}
                            className="w-full md:w-auto"
                        >
                            {generating ? <span className="flex items-center"><Loader size={16} className="animate-spin mr-2"/> Génération...</span> : 'Générer le Document'}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default DocumentGenerator;
