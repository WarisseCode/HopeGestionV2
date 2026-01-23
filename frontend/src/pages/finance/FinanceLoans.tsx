import React, { useState, useEffect } from 'react';
import { Plus, Eye, Calendar, TrendingUp } from 'lucide-react';
import { financeApi } from '../../api/financeApi';
import type { Loan } from '../../api/financeApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { toast } from 'react-hot-toast';

const FinanceLoans: React.FC = () => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    // Form
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        interest_rate: '',
        duration_months: '',
        start_date: new Date().toISOString().split('T')[0],
        day_of_month: 5
    });

    useEffect(() => {
        loadLoans();
    }, []);

    const loadLoans = async () => {
        setLoading(true);
        try {
            const data = await financeApi.getLoans();
            setLoans(data);
        } catch (error) {
            toast.error("Erreur chargement prêts");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await financeApi.createLoan(formData);
            toast.success("Prêt créé avec succès");
            setShowForm(false);
            loadLoans();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleViewDetails = async (id: number) => {
        try {
            const detail = await financeApi.getLoanDetails(id);
            setSelectedLoan(detail);
        } catch (error) {
            toast.error("Impossible de charger le détail");
        }
    };

    const formatMoney = (val: any) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Number(val));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Prêts Bancaires & Financements</h2>
                <Button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Nouveau Prêt
                </Button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loans.map(loan => (
                    <Card key={loan.id} className="hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{loan.name}</h3>
                                <p className="text-sm text-gray-500">Début: {new Date(loan.start_date).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${loan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {loan.status === 'active' ? 'EN COURS' : loan.status}
                            </span>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Montant Emprunté</span>
                                <span className="font-bold">{formatMoney(loan.amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Mensualité</span>
                                <span className="font-bold text-orange-600">-{formatMoney(loan.monthly_payment)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Durée</span>
                                <span>{loan.duration_months} mois</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Taux</span>
                                <span>{loan.interest_rate}%</span>
                            </div>
                        </div>

                        {/* Progress Bar (Mocked for MVP) */}
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                        </div>

                        <Button 
                            variant="primary" 
                            className="w-full"
                            onClick={() => handleViewDetails(loan.id)}
                        >
                            <Eye size={16} className="mr-2" /> Voir l'amortissement
                        </Button>
                    </Card>
                ))}
            </div>

            {/* Create Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-lg w-full bg-white">
                        <h3 className="text-xl font-bold mb-6">Nouveau Prêt</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <Input label="Nom du prêt (Banque)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="ex: Banque Atlantique - Achat Immeuble Yopougon" />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Montant (Principal)" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                                <Input label="Taux Intérêt (%)" type="number" step="0.01" value={formData.interest_rate} onChange={e => setFormData({...formData, interest_rate: e.target.value})} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Durée (Mois)" type="number" value={formData.duration_months} onChange={e => setFormData({...formData, duration_months: e.target.value})} required />
                                <Input label="Date Début" type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                            </div>

                            <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                                ℹ️ Un tableau d'amortissement sera généré automatiquement et les échéances seront intégrées au prévisionnel de trésorerie.
                            </p>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                                <Button type="submit" variant="primary">Calculer & Créer</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Details Modal (Amortissement) */}
            {selectedLoan && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-4xl w-full bg-white h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <div>
                                <h3 className="text-xl font-bold">{selectedLoan.name}</h3>
                                <p className="text-sm text-gray-500">Tableau d'amortissement</p>
                            </div>
                            <Button variant="ghost" onClick={() => setSelectedLoan(null)} className="btn-circle">✕</Button>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="table w-full text-left">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3">Echéance</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3 text-right">Mensualité</th>
                                        <th className="p-3 text-right">Intérêts</th>
                                        <th className="p-3 text-right">Capital</th>
                                        <th className="p-3 text-center">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {selectedLoan.schedule?.map((row, idx) => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-mono text-gray-500">#{idx + 1}</td>
                                            <td className="p-3">{new Date(row.due_date).toLocaleDateString()}</td>
                                            <td className="p-3 text-right font-bold">{formatMoney(row.amount_total)}</td>
                                            <td className="p-3 text-right text-red-500">{formatMoney(row.amount_interest)}</td>
                                            <td className="p-3 text-right text-green-600">{formatMoney(row.amount_principal)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${row.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default FinanceLoans;
