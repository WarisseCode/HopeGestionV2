import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter, FileText, Upload, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { financeApi } from '../../api/financeApi';
import type { Expense } from '../../api/financeApi';
import { ownerApi } from '../../api/ownerApi';
import type { Owner } from '../../api/ownerApi';
import { getImmeubles } from '../../api/bienApi';
import type { Immeuble } from '../../api/bienApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { toast } from 'react-hot-toast';

const FinanceExpenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<{id:number, name:string}[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [buildings, setBuildings] = useState<Immeuble[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState<Partial<Expense>>({
        date_expense: new Date().toISOString().split('T')[0],
        amount: 0,
        category: '',
        description: '',
        supplier_name: '',
        building_id: undefined,
        owner_id: undefined
    });
    const [proofFile, setProofFile] = useState<File | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [expData, catData, ownerData, buildingData] = await Promise.all([
                financeApi.getExpenses(),
                financeApi.getExpenseCategories(),
                ownerApi.getOwners(),
                getImmeubles()
            ]);
            setExpenses(expData);
            setCategories(catData);
            setOwners(ownerData);
            setBuildings(buildingData);
        } catch (error) {
            console.error(error);
            toast.error("Erreur chargement données");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await financeApi.createExpense(formData, proofFile || undefined);
            toast.success("Dépense enregistrée");
            setShowForm(false);
            setFormData({
                date_expense: new Date().toISOString().split('T')[0],
                amount: 0,
                category: '',
                description: '',
                supplier_name: '',
                building_id: undefined,
                owner_id: undefined
            });
            setProofFile(null);
            loadData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Supprimer cette dépense ?")) return;
        try {
            await financeApi.deleteExpense(id);
            toast.success("Supprimé");
            setExpenses(expenses.filter(e => e.id !== id));
        } catch (error) {
            toast.error("Erreur suppression");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-base-content/90">Gestion des Dépenses</h2>
                <Button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Ajouter Dépense
                </Button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full bg-base-100 relative">
                        <h3 className="text-lg font-bold mb-4">Nouvelle Dépense</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Left Column: Core Info */}
                                <div className="space-y-4">
                                    <Input 
                                        label="Date" 
                                        type="date" 
                                        value={formData.date_expense} 
                                        onChange={(e) => setFormData({...formData, date_expense: e.target.value})}
                                        required
                                    />
                                    <Input 
                                        label="Montant (FCFA)" 
                                        type="number" 
                                        value={formData.amount} 
                                        onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                                        required
                                    />

                                    {/* Building Selection */}
                                    <div>
                                        <label className="block text-sm font-bold text-base-content/80 mb-1">Immeuble Concerné (Optionnel)</label>
                                        <select 
                                            className="select select-bordered w-full bg-base-200 border p-2 rounded"
                                            value={formData.building_id || ''}
                                            onChange={(e) => {
                                                const bId = e.target.value ? parseInt(e.target.value) : undefined;
                                                const selectedBuilding = buildings.find(b => b.id === bId);
                                                setFormData({
                                                    ...formData, 
                                                    building_id: bId,
                                                    // Auto-select owner if building is selected
                                                    owner_id: selectedBuilding?.owner_id || formData.owner_id
                                                });
                                            }}
                                        >
                                            <option value="">-- Aucun / Dépense Générale --</option>
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id}>{b.nom}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Owner Selection */}
                                    <div>
                                        <label className="block text-sm font-bold text-base-content/80 mb-1">Propriétaire Concerné</label>
                                        <select 
                                            className="select select-bordered w-full bg-base-200 border p-2 rounded"
                                            value={formData.owner_id || ''}
                                            onChange={(e) => setFormData({...formData, owner_id: e.target.value ? parseInt(e.target.value) : undefined})}
                                            required={!formData.building_id} // Required if no building selected
                                            disabled={!!formData.building_id} // Disabled if building determines owner
                                        >
                                            <option value="">-- Sélectionner un propriétaire --</option>
                                            {owners.map(o => (
                                                <option key={o.id} value={o.id}>{o.name} {o.first_name}</option>
                                            ))}
                                        </select>
                                        {!formData.building_id && (
                                            <p className="text-xs text-orange-600 mt-1">
                                                * Requis pour l'isolation des données
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Details & Proof */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-base-content/80 mb-1">Catégorie</label>
                                        <select 
                                            className="select select-bordered w-full bg-base-200 border p-2 rounded"
                                            value={formData.category}
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            required
                                        >
                                            <option value="">Sélectionner...</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <Input 
                                        label="Fournisseur / Bénéficiaire" 
                                        value={formData.supplier_name} 
                                        onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                                    />

                                    <div>
                                        <label className="block text-sm font-bold text-base-content/80 mb-1">Justificatif (Optionnel)</label>
                                        <label className={`flex flex-col items-center justify-center gap-2 p-6 rounded border-2 border-dashed cursor-pointer transition-colors text-sm h-32 ${
                                            proofFile 
                                                ? 'bg-green-50 border-green-300 text-green-700' 
                                                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                        }`}>
                                            <Upload size={24} />
                                            <span className="text-center">{proofFile ? proofFile.name : 'Cliquez pour ajouter un fichier'}</span>
                                            <input 
                                                type="file" 
                                                accept="image/*,.pdf" 
                                                className="hidden" 
                                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                            />
                                        </label>
                                        {proofFile && (
                                            <button 
                                                type="button" 
                                                className="text-xs text-red-500 mt-1 hover:underline w-full text-center"
                                                onClick={() => setProofFile(null)}
                                            >
                                                Retirer le fichier
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Full Width Description */}
                            <div>
                                <label className="block text-sm font-bold text-base-content/80 mb-1">Description</label>
                                <textarea 
                                    className="textarea textarea-bordered w-full bg-base-200 border p-2 rounded"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows={3}
                                    placeholder="Détails supplémentaires..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                                <Button type="submit" variant="primary">Enregistrer</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* List */}
            <Card className="overflow-hidden p-0 border-none shadow-sm">
                <table className="table w-full text-left">
                    <thead className="bg-base-200">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Catégorie</th>
                            <th className="p-4">Description</th>
                            <th className="p-4">Montant</th>
                            <th className="p-4">Justif.</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {expenses.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400">Aucune dépense enregistrée</td></tr>
                        ) : (
                            expenses.map(item => (
                                <tr key={item.id} className="hover:bg-base-200">
                                    <td className="p-4 whitespace-nowrap">{format(new Date(item.date_expense), 'dd/MM/yyyy')}</td>
                                    <td className="p-4">
                                        <span className="bg-base-300 px-2 py-1 rounded text-xs font-bold text-base-content/70">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-base-content/90">{item.supplier_name}</div>
                                        <div className="text-xs text-base-content/60">{item.description}</div>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-red-600">
                                        -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Number(item.amount))}
                                    </td>
                                    <td className="p-4">
                                        {item.proof_url ? (
                                            <a 
                                                href={item.proof_url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-blue-500 hover:text-blue-700"
                                                title="Voir le justificatif"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default FinanceExpenses;
