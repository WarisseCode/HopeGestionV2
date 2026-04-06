import React, { useState, useEffect } from 'react';
import { Plus, Phone, Mail, MapPin, User, Search } from 'lucide-react';
import { notebookApi, type Contact } from '../../api/notebookApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { toast } from 'react-hot-toast';

const CarnetContacts: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form State
    const [formData, setFormData] = useState<Partial<Contact>>({});

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        const res = await notebookApi.getContacts();
        setContacts(res.data);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await notebookApi.createContact(formData);
            toast.success("Contact ajouté");
            setShowModal(false);
            setFormData({});
            loadContacts();
        } catch (error) {
            toast.error("Erreur ajout contact");
        }
    };

    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" size={16} />
                    <input 
                        className="pl-9 pr-4 py-2 border rounded-lg w-full text-sm"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus size={18} className="mr-2" /> Nouveau Contact
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredContacts.map(c => (
                    <Card key={c.id} className="hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                                {c.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-base-content">{c.name}</h3>
                                <p className="text-sm text-blue-600 font-medium">{c.role}</p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-base-content/70">
                             {c.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-base-content/50"/> {c.phone}</div>}
                             {c.email && <div className="flex items-center gap-2"><Mail size={14} className="text-base-content/50"/> {c.email}</div>}
                             {c.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-base-content/50"/> {c.address}</div>}
                        </div>

                        <div className="mt-4 pt-4 border-t flex gap-2">
                             {c.phone && (
                                 <a 
                                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 py-1.5 text-center text-green-600 bg-green-50 rounded hover:bg-green-100 text-sm font-medium transition-colors"
                                 >
                                     WhatsApp
                                 </a>
                             )}
                             {c.phone && (
                                 <a 
                                    href={`tel:${c.phone}`} 
                                    className="flex-1 py-1.5 text-center text-blue-600 bg-blue-50 rounded hover:bg-blue-100 text-sm font-medium transition-colors"
                                 >
                                     Appeler
                                 </a>
                             )}
                        </div>
                    </Card>
                ))}
            </div>

             {/* Modal */}
             {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Nouveau Contact</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <Input label="Nom" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <Input label="Rôle (ex: Plombier)" required value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} />
                            <Input label="Téléphone" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            <Input label="Email" type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                            <Input label="Adresse" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                            
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Annuler</Button>
                                <Button type="submit">Enregistrer</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CarnetContacts;
