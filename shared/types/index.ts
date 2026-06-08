// Canonical entity types — single source of truth for frontend + backend.
// Backend: import type { Locataire } from '@hopegestion/shared-types'  (erased at compile time)
// Frontend: import type { Locataire } from '@hopegestion/shared-types'  (resolved via Vite alias)

// ─── Locataire ───────────────────────────────────────────────────────────────

export interface Locataire {
    id: number;
    nom: string;
    prenoms: string;
    email?: string;
    telephone_principal: string;
    telephone_secondaire?: string;
    nationalite?: string;
    type_piece?: string;
    numero_piece?: string;
    photo_piece_url?: string;
    photo_profil_url?: string;
    invitation_code?: string;
    type: 'Locataire' | 'Acheteur' | 'Prospect';
    statut: 'Actif' | 'Inactif' | 'Expiré' | 'Archivé' | 'En attente' | 'Rejeté';
    mode_paiement_preferentiel?: string;
    active_leases?: number;
    created_at?: string;
    adresse_actuelle?: string;
    date_expiration_piece?: string;
    paiement_echelonne?: boolean;
    owner_id?: number;
    // Joined via SQL LATERAL
    lot_nom?: string;
    loyer_actuel?: number;
    active_lease_id?: number;
    bail_statut?: string;
    // Legacy aliases
    lot?: string;
    loyer?: number;
    paiementEcheance?: boolean;
}

// Minimal bail shape returned in LocataireDetails — covers all accessed properties.
export interface BailSummary {
    id: number;
    statut: string;
    reference_bail?: string;
    ref_bail?: string;
    ref_lot?: string;
    building_name?: string;
    loyer_actuel?: number;
    date_debut?: string;
}

export interface LocataireDetails {
    locataire: Locataire;
    baux: BailSummary[];
    paiements: Record<string, unknown>[];
}

// ─── Biens ───────────────────────────────────────────────────────────────────

export interface Immeuble {
    id: number;
    nom: string;
    type: string;
    adresse: string;
    ville: string;
    pays: string;
    nbLots: number;
    occupation: number;
    statut: string;
    etatOccupation?: string;
    photo?: string | null;
    description?: string;
    proprietaire?: string;
    gestionnaire?: string;
    owner_id?: number;
    latitude?: number | null;
    longitude?: number | null;
    quartier?: string | null;
    gestionnaire_id?: number | null;
    gestionnaire_name?: string | null;
    photos?: string[];
    video_url?: string | null;
    plan_masse_url?: string | null;
    nombre_etages?: number;
    total_lots?: number;
}

export interface Lot {
    id: number;
    reference: string;
    type: string;
    immeuble: string;
    building_id?: number;
    etage: string;
    bloc?: string | null;
    superficie: number;
    nbPieces: number;
    loyer: number;
    charges: number;
    statut: string;
    description: string;
    periodicite?: string;
    caution?: number;
    avance?: number;
    prix_vente?: number | null;
    modalite_vente?: string | null;
    duree_echelonnement?: number | null;
    photos?: string[];
    date_disponibilite?: string | null;
    owner_id?: number;
    owner_name?: string;
}

// ─── Locations / Baux ────────────────────────────────────────────────────────

export interface Location {
    id: number;
    reference_bail: string;
    tenant_id: number;
    lot_id: number;
    owner_id: number;
    type_contrat?: 'location' | 'vente' | 'reservation';
    date_debut: string;
    date_fin?: string;
    duree_contrat?: number;
    loyer_mensuel: number;
    caution: number;
    avance: number;
    charges_mensuelles: number;
    devise: string;
    type_paiement: string;
    jour_echeance: number;
    penalite_retard: number;
    tolerance_jours: number;
    prix_vente?: number;
    apport_initial?: number;
    modalite_paiement?: string;
    date_expiration?: string;
    conditions_particulieres?: string;
    statut: string;
    contrat_genere: boolean;
    signature_url?: string;
    date_signature_electronique?: string;
    // Joined fields
    locataire_nom?: string;
    locataire_prenoms?: string;
    locataire_telephone?: string;
    locataire_photo?: string;
    ref_lot?: string;
    lot_type?: string;
    immeuble_nom?: string;
    proprietaire_nom?: string;
}

export interface PaymentScheduleItem {
    id: number;
    lease_id: number;
    numero_echeance: number;
    date_echeance: string;
    montant: number;
    montant_paye: number;
    statut: string;
    date_paiement?: string;
}

export interface CreateLocationData {
    tenant_id: number;
    lot_id: number;
    owner_id: number;
    type_contrat?: 'location' | 'vente' | 'reservation';
    date_debut: string;
    date_fin?: string;
    duree_contrat?: number;
    loyer_mensuel: number;
    caution?: number;
    avance?: number;
    charges_mensuelles?: number;
    type_charges?: string;
    devise?: string;
    type_paiement?: string;
    frequence_paiement?: string;
    nombre_echeances?: number;
    jour_echeance?: number;
    penalite_retard?: number;
    tolerance_jours?: number;
    prix_vente?: number;
    apport_initial?: number;
    modalite_paiement?: string;
    date_expiration?: string;
    conditions_particulieres?: string;
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface Payment {
    id: number;
    lease_id: number;
    schedule_id?: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference?: string;
    type: string;
    statut: string;
    description?: string;
    created_at: string;
    reference_bail: string;
    locataire_nom: string;
    locataire_prenoms: string;
    proprietaire_nom: string;
}

export interface Expense {
    id: number;
    building_id?: number;
    lot_id?: number;
    owner_id?: number;
    category: string;
    description?: string;
    amount: number;
    date_expense: string;
    supplier_name?: string;
    status: string;
    proof_url?: string;
    created_at: string;
    building_name?: string;
    ref_lot?: string;
    category_label?: string;
}

export interface Loan {
    id: number;
    name: string;
    amount: string;
    interest_rate: string;
    duration_months: number;
    start_date: string;
    end_date: string;
    monthly_payment: string;
    status: 'active' | 'paid' | 'cancelled';
    owner_name?: string;
    paid_installments?: number;
    capital_repaid?: number;
    schedule?: LoanSchedule[];
}

export interface LoanSchedule {
    id: number;
    loan_id: number;
    due_date: string;
    amount_total: string;
    amount_principal: string;
    amount_interest: string;
    status: 'pending' | 'paid' | 'late';
    payment_date?: string;
}
