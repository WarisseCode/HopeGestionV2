import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter, FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { financeApi, Expense } from '../../api/financeApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { toast } from 'react-hot-toast';

const FinanceExpenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<{id:number, name:string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState<Partial<Expense>>({
        date_expense: new Date().toISOString().split('T')[0],
        amount: 0,
        category: '',
        description: '',
        supplier_name: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [expData, catData] = await Promise.all([
                financeApi.getExpenses(),
                financeApi.getExpenseCategories()
            ]);
            setExpenses(expData);
            setCategories(catData);
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
            await financeApi.createExpense(formData);
            toast.success("Dépense enregistrée");
            setShowForm(false);
            setFormData({
                date_expense: new Date().toISOString().split('T')[0],
                amount: 0,
                category: '',
                description: '',
                supplier_name: ''
            });
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
                <h2 className="text-xl font-bold text-gray-800">Gestion des Dépenses</h2>
                <Button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Ajouter Dépense
                </Button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full bg-white relative">
                        <h3 className="text-lg font-bold mb-4">Nouvelle Dépense</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Catégorie</label>
                                <select 
                                    className="select select-bordered w-full bg-gray-50 border p-2 rounded"
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
                                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                <textarea 
                                    className="textarea textarea-bordered w-full bg-gray-50 border p-2 rounded"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows={2}
                                />
                            </div>

                            <div className="bg-blue-50 p-3 rounded text-sm text-blue-700 flex items-center gap-2 cursor-pointer border border-blue-200 border-dashed justify-center">
                                <Upload size={16} /> Ajouter un justificatif (Optionnel)
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
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
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Catégorie</th>
                            <th className="p-4">Description</th>
                            <th className="p-4">Montant</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {expenses.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucune dépense enregistrée</td></tr>
                        ) : (
                            expenses.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="p-4 whitespace-nowrap">{format(new Date(item.date_expense), 'dd/MM/yyyy')}</td>
                                    <td className="p-4">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-gray-800">{item.supplier_name}</div>
                                        <div className="text-xs text-gray-500">{item.description}</div>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-red-600">
                                        -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Number(item.amount))}
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
