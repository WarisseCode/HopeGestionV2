import React from 'react';
import PublicLayout from '../../layout/PublicLayout';
import LegalDocument from '../../components/legal/LegalDocument';

const CgvPage: React.FC = () => (
    <PublicLayout>
        <LegalDocument title="Conditions Générales de Vente">
            <h2>Article 1 : Objet</h2>
            <p>
                Les présentes Conditions Générales de Vente (CGV) régissent la commercialisation des
                services SaaS proposés par SKILLEXIE via la plateforme Hope Immo Local.
            </p>

            <h2>Article 2 : Services proposés</h2>
            <p>
                SKILLEXIE propose des abonnements mensuels ou annuels permettant l'accès aux
                fonctionnalités de gestion immobilière numérique (centralisation des données, génération
                de documents, maintenance technique).
            </p>

            <h2>Article 3 : Prix</h2>
            <p>
                Les prix sont indiqués en monnaie locale (FCFA) et hors taxes. SKILLEXIE se réserve le
                droit de modifier ses tarifs, avec préavis aux clients.
            </p>

            <h2>Article 4 : Modalités de paiement</h2>
            <p>
                Le paiement s'effectue en ligne par carte bancaire, mobile money ou virement. L'accès au
                service est conditionné au règlement intégral.
            </p>

            <h2>Article 5 : Durée et renouvellement</h2>
            <p>
                Les abonnements sont conclus pour une durée déterminée (mensuelle ou annuelle) et se
                renouvellent tacitement sauf résiliation par le client.
            </p>

            <h2>Article 6 : Droit de rétractation</h2>
            <p>
                Conformément au droit OHADA, le client professionnel n'a pas de droit de rétractation.
                Pour les particuliers, un délai de 7 jours peut être accordé.
            </p>

            <h2>Article 7 : Obligations du client</h2>
            <p>
                Le client s'engage à utiliser le service conformément aux CGU et à régler les sommes
                dues. Tout retard de paiement entraîne la suspension du service.
            </p>

            <h2>Article 8 : Responsabilité</h2>
            <p>
                SKILLEXIE n'est responsable que des dommages directs liés à une défaillance avérée du
                service. Les dommages indirects (perte de données, perte de chiffre d'affaires) ne sont
                pas couverts.
            </p>

            <h2>Article 9 : Résiliation</h2>
            <p>
                En cas de manquement grave du client, SKILLEXIE peut résilier le contrat sans préavis. Le
                client peut résilier son abonnement à tout moment, sans remboursement des sommes déjà
                versées.
            </p>

            <h2>Article 10 : Litiges</h2>
            <p>
                Tout litige sera réglé à l'amiable. À défaut, il sera soumis à l'arbitrage conformément
                aux règles OHADA.
            </p>
        </LegalDocument>
    </PublicLayout>
);

export default CgvPage;
