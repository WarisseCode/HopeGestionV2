import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Printer, Edit, ArrowLeft, Calendar, User, 
    ClipboardList, Building, Warehouse, CheckCircle 
} from 'lucide-react';
import { getToken } from '../api/authApi';

const InventoryDetails: React.FC = () => {
    const { id } = useParams();
    const [inventory, setInventory] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const token = getToken();
            const res = await fetch(`http://localhost:5000/api/inventories/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInventory(data);
                setItems(data.items || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center">Chargement...</div>;
    if (!inventory) return <div className="p-12 text-center">Introuvable</div>;

    const groupItemsByCategory = () => {
        const groups: {[key: string]: any[]} = {};
        items.forEach(item => {
            if (!groups[item.categorie]) groups[item.categorie] = [];
            groups[item.categorie].push(item);
        });
        return groups;
    };

    const groupedItems = groupItemsByCategory();

    return (
        <div className="p-6 lg:p-12 max-w-4xl mx-auto print:p-0">
            {/* Nav & Actions */}
            <div className="flex items-center justify-between mb-8 print:hidden">
                <Link to="/dashboard/inventories" className="flex items-center gap-2 text-base-content/60 hover:text-base-content">
                    <ArrowLeft size={20} /> Retour
                </Link>
                <div className="flex gap-3">
                    <button 
                        onClick={() => window.print()} 
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Printer size={18} /> Imprimer
                    </button>
                    <Link 
                        to={`/dashboard/inventories/${id}/edit`} 
                        className="btn-primary flex items-center gap-2"
                    >
                        <Edit size={18} /> Modifier
                    </Link>
                </div>
            </div>

            {/* Document Layout */}
            <div className="bg-base-100 p-8 rounded-2xl shadow-sm border border-base-200 print:shadow-none print:border-none">
                {/* Header */}
                <div className="border-b border-base-200 pb-6 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-base-content mb-2">État des Lieux</h1>
                        <p className="text-base-content/60 uppercase tracking-widest font-medium text-sm">
                            {inventory.type_inventaire}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="inline-block px-3 py-1 bg-base-300 rounded text-sm font-mono mb-2">
                             Réf: INV-{inventory.id.toString().padStart(4, '0')}
                        </div>
                        <p className="text-sm text-base-content/60">{new Date(inventory.date_realisation).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-8 bg-base-200 p-6 rounded-xl print:bg-base-100 print:border print:border-base-300">
                    <div>
                        <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider mb-3">Contexte</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Building size={16} className="text-teal-500" />
                                <span className="font-medium text-base-content capitalize">{inventory.entity_type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Warehouse size={16} className="text-teal-500" />
                                <span className="text-base-content/80">ID: {inventory.entity_id}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider mb-3">Réalisé par</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-teal-500" />
                                <span className="font-medium text-base-content">{inventory.agent_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-teal-500" />
                                <span className="text-base-content/80">Le {new Date(inventory.date_realisation).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="space-y-8">
                    {Object.entries(groupedItems).map(([category, items]) => (
                        <div key={category}>
                            <h3 className="flex items-center gap-2 text-lg font-bold text-base-content border-b border-base-300 pb-2 mb-4">
                                <ClipboardList className="text-teal-500" size={20} /> 
                                {category}
                            </h3>
                            <div className="grid grid-cols-1 gap-2"> {/* Table-like grid */}
                                <div className="grid grid-cols-12 text-xs uppercase font-bold text-base-content/50 px-4 mb-1">
                                    <div className="col-span-1">Qté</div>
                                    <div className="col-span-4">Élément</div>
                                    <div className="col-span-2">État</div>
                                    <div className="col-span-5">Observations</div>
                                </div>
                                {items.map((item: any) => (
                                    <div key={item.id} className="grid grid-cols-12 items-start py-3 px-4 bg-base-200/50 rounded-lg hover:bg-base-200 transition print:bg-base-100 print:border-b">
                                        <div className="col-span-1 font-mono text-base-content/60">{item.quantite}x</div>
                                        <div className="col-span-4 font-medium text-base-content">
                                            {item.nom}
                                            {item.description && <div className="text-xs text-base-content/50 font-normal">{item.description}</div>}
                                            
                                            {/* Photos - Only show first 2 for spacing */}
                                            {item.photos && JSON.parse(JSON.stringify(item.photos)).length > 0 && (
                                                <div className="flex gap-1 mt-2">
                                                    {JSON.parse(JSON.stringify(item.photos)).slice(0, 3).map((src: string, idx: number) => (
                                                        <img key={idx} src={src} className="w-8 h-8 rounded border border-base-300 object-cover" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold capitalize 
                                                ${item.etat === 'neuf' ? 'bg-green-100 text-green-700 print:border print:border-green-200' : ''}
                                                ${item.etat === 'bon' ? 'bg-teal-100 text-teal-700 print:border print:border-teal-200' : ''}
                                                ${item.etat === 'usager' ? 'bg-yellow-100 text-yellow-700 print:border print:border-yellow-200' : ''}
                                                ${item.etat === 'mauvais' ? 'bg-orange-100 text-orange-700 print:border print:border-orange-200' : ''}
                                                ${item.etat === 'hs' ? 'bg-red-100 text-red-700 print:border print:border-red-200' : ''}
                                            `}>
                                                {item.etat}
                                            </span>
                                        </div>
                                        <div className="col-span-5 text-sm text-base-content/70">
                                            {item.observation || '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer / Signatures */}
                <div className="mt-12 pt-8 border-t border-base-300 grid grid-cols-2 gap-12 page-break-inside-avoid">
                    <div className="border rounded-xl h-32 p-4 relative">
                        <span className="text-xs text-base-content/50 uppercase font-bold absolute top-3 left-3">Signature Gestionnaire</span>
                        {/* Placeholder for Signature */}
                    </div>
                    <div className="border rounded-xl h-32 p-4 relative">
                        <span className="text-xs text-base-content/50 uppercase font-bold absolute top-3 left-3">Signature Locataire</span>
                    </div>
                </div>
                
                <div className="mt-8 text-center text-xs text-base-content/50 print:block hidden">
                    Document généré électroniquement via HopeGestion. Fait foi conformément aux CGU.
                </div>
            </div>
        </div>
    );
};

export default InventoryDetails;
