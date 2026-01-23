import React, { useState, useEffect } from 'react';
import { Save, FileText, Calculator } from 'lucide-react';
import { financeApi, TaxSettings } from '../../api/financeApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { toast } from 'react-hot-toast';
import { getProprietaires } from '../../api/accountApi';

const FinanceTax: React.FC = () => {
    const [owners, setOwners] = useState<any[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<string>('');
    const [settings, setSettings] = useState<TaxSettings>({
        owner_id: 0,
        fiscal_regime: 'reel',
        tax_rate: 0,
        vat_subject: false,
        country: 'Côte d\'Ivoire'
    });
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadOwners();
    }, []);

    const loadOwners = async () => {
        try {
            const data = await getProprietaires();
            setOwners(data);
        } catch (error) {
            toast.error("Erreur chargement propriétaires");
        }
    };

    const handleOwnerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value);
        setSelectedOwner(e.target.value);
        setReport(null);
        if (id) {
            try {
                setLoading(true);
                const data = await financeApi.getTaxSettings(id);
                setSettings({ ...data, owner_id: id });
            } catch (error) {
                // Ignore if not found, use default
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSaveSettings = async () => {
        if (!selectedOwner) return toast.error("Sélectionnez un propriétaire");
        try {
            await financeApi.saveTaxSettings(settings);
            toast.success("Paramètres fiscaux enregistrés");
        } catch (error) {
            toast.error("Erreur sauvegarde");
        }
    };

    const generateReport = async () => {
        if (!selectedOwner) return toast.error("Sélectionnez un propriétaire");
        try {
            setLoading(true);
            const currentYear = new Date().getFullYear();
            const data = await financeApi.getTaxReport(parseInt(selectedOwner), currentYear);
            setReport(data);
        } catch (error) {
            toast.error("Erreur génération rapport");
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (val: any) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Number(val));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Settings */}
            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Calculator size={20} /> Configuration Fiscale
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Propriétaire / Entité</label>
                            <select 
                                className="select select-bordered w-full bg-gray-50 border p-2 rounded"
                                value={selectedOwner}
                                onChange={handleOwnerChange}
                            >
                                <option value="">Choisir...</option>
                                {owners.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedOwner && (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Régime Fiscal</label>
                                    <select 
                                        className="select select-bordered w-full bg-gray-50 border p-2 rounded"
                                        value={settings.fiscal_regime}
                                        onChange={(e) => setSettings({...settings, fiscal_regime: e.target.value})}
                                    >
                                        <option value="reel">Revenu Foncier Réel</option>
                                        <option value="micro">Micro-Foncier (Abattement 30%)</option>
                                        <option value="lmnp">LMNP (Meublé)</option>
                                        <option value="sci_ir">SCI à l'IR</option>
                                        <option value="sci_is">SCI à l'IS</option>
                                    </select>
                                </div>

                                <Input 
                                    label="Taux Imposition Moyen (%)" 
                                    type="number" 
                                    value={settings.tax_rate} 
                                    onChange={(e) => setSettings({...settings, tax_rate: parseFloat(e.target.value)})}
                                />

                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.vat_subject} 
                                        onChange={(e) => setSettings({...settings, vat_subject: e.target.checked})}
                                        className="checkbox checkbox-primary"
                                    />
                                    <span className="text-sm">Assujetti à la TVA/TVA ?</span>
                                </div>

                                <Button onClick={handleSaveSettings} className="w-full btn-primary mt-4">
                                    <Save size={16} className="mr-2" /> Enregistrer Configuration
                                </Button>
                            </>
                        )}
                    </div>
                 </Card>
            </div>

            {/* Right Col: Report */}
            <div className="lg:col-span-2">
                {!selectedOwner ? (
                    <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 p-12 text-gray-400">
                        <FileText size={48} className="mb-4" />
                        <p>Sélectionnez un propriétaire pour voir sa situation fiscale</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Card className="bg-gradient-to-br from-blue-900 to-blue-800 text-white border-none">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold">Situation Fiscale Estimée</h2>
                                    <p className="text-blue-200">Année {new Date().getFullYear()}</p>
                                </div>
                                <Button variant="secondary" onClick={generateReport} disabled={loading} className="bg-white/10 text-white hover:bg-white/20 border-none">
                                    {loading ? 'Calcul...' : 'Actualiser le calcul'}
                                </Button>
                            </div>

                            {report ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                            <span className="text-blue-200">Revenus Locatifs Bruts</span>
                                            <span className="font-bold text-xl text-green-400">+{formatMoney(report.income)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                            <span className="text-blue-200">Charges Déductibles</span>
                                            <span className="font-bold text-red-300">-{formatMoney(report.deductible_expenses)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                            <span className="text-blue-200">Intérêts d'Emprunt</span>
                                            <span className="font-bold text-red-300">-{formatMoney(report.loan_interest)}</span>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 p-6 rounded-xl flex flex-col justify-center items-center text-center">
                                        <span className="text-sm text-blue-200 uppercase tracking-wider mb-2">Base Imposable Estimée</span>
                                        <span className="text-4xl font-extrabold">{formatMoney(report.taxable_base)}</span>
                                        <div className="mt-4 pt-4 border-t border-white/10 w-full flex justify-between text-sm">
                                            <span>Impôt Estimé ({settings.tax_rate}%)</span>
                                            <span className="font-mono font-bold text-yellow-400">
                                                {formatMoney(report.taxable_base * (settings.tax_rate / 100))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-blue-200">
                                    Cliquez sur "Actualiser" pour générer le rapport
                                </div>
                            )}
                        </Card>

                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-sm text-yellow-800">
                            <strong>Note :</strong> Ce calcul est une estimation basée sur les flux financiers enregistrés dans la plateforme. 
                            Le régime fiscal choisi ({settings.fiscal_regime}) peut impliquer des règles spécifiques non prises en compte ici (amortissements comptables, déficits reportables, etc.).
                            Consultez toujours votre expert-comptable.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinanceTax;
