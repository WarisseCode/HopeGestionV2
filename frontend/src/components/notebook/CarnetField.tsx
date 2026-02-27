import React, { useState, useEffect } from 'react';
import { MapPin, Camera, Plus, CheckCircle, Clock } from 'lucide-react';
import { notebookApi, type FieldAction } from '../../api/notebookApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { toast } from 'react-hot-toast';

const CarnetField: React.FC = () => {
    const [actions, setActions] = useState<FieldAction[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    
    // Form
    const [type, setType] = useState<'visite' | 'intervention' | 'check'>('visite');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
    const [address, setAddress] = useState('');

    useEffect(() => {
        loadActions();
    }, []);

    const loadActions = async () => {
        const data = await notebookApi.getFieldActions();
        setActions(data);
    };

    const handleLocate = () => {
        setLoadingLocation(true);
        if (!navigator.geolocation) {
            toast.error("Géolocalisation non supportée");
            setLoadingLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
                setAddress(`Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
                setLoadingLocation(false);
                toast.success("Position acquise");
            },
            (err) => {
                toast.error("Erreur géolocalisation");
                setLoadingLocation(false);
            }
        );
    };

    const handleCreate = async () => {
        if (!description) return;
        try {
            await notebookApi.createFieldAction({
                type,
                description,
                location_lat: location?.lat,
                location_lng: location?.lng,
                location_address: address,
                status: 'pending' // Default
            });
            toast.success("Action enregistrée");
            setIsCreating(false);
            setDescription('');
            setLocation(null);
            setAddress('');
            loadActions();
        } catch (error) {
            toast.error("Erreur enregistrement");
        }
    };

    const getTypeColor = (t: string) => {
        switch(t) {
            case 'visite': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'intervention': return 'bg-red-100 text-red-800 border-red-200';
            case 'check': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Journal Terrain</h2>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    <Plus size={18} className="mr-2" /> Nouvelle Action
                </Button>
            </div>

            {isCreating && (
                <Card className="p-4 border-2 border-green-500/20 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                        <MapPin size={20}/> Enregistrement Terrain
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'action</label>
                                <select 
                                    className="w-full border rounded-lg p-2"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                >
                                    <option value="visite">Visite</option>
                                    <option value="intervention">Intervention</option>
                                    <option value="check">Vérification</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        className="w-full border rounded-lg p-2 bg-gray-50 text-xs"
                                        value={address || "Non localisé"}
                                    />
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={handleLocate}
                                        disabled={loadingLocation}
                                    >
                                        <MapPin size={16} className={loadingLocation ? "animate-bounce" : ""} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Constat</label>
                            <textarea 
                                className="w-full border rounded-lg p-3 min-h-[80px]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Qu'avez-vous fait ou constaté ?"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsCreating(false)}>Annuler</Button>
                            <Button onClick={handleCreate}>Valider l'action</Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                {actions.map((action, index) => (
                    <div key={action.id} className="relative pl-8">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white ${
                            action.type === 'visite' ? 'bg-blue-500' : 
                            action.type === 'intervention' ? 'bg-red-500' : 'bg-green-500'
                        }`}></div>
                        
                        <Card className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getTypeColor(action.type)} uppercase`}>
                                        {action.type}
                                    </span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock size={12}/> {new Date(action.created_at).toLocaleString()}
                                    </span>
                                </div>
                                {action.location_address && (
                                    <span className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                        <MapPin size={12}/> {action.location_address}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-800 text-sm whitespace-pre-wrap">{action.description}</p>
                            
                            {/* Photo placeholder */}
                            {action.photo_url && (
                                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                    <Camera size={12}/> Photo jointe
                                </div>
                            )}
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CarnetField;
