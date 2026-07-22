import React from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layout/PublicLayout';
import LegalDocument from '../../components/legal/LegalDocument';
import LegalPlaceholder from '../../components/legal/LegalPlaceholder';

const MentionsLegalesPage: React.FC = () => (
    <PublicLayout>
        <LegalDocument title="Mentions Légales">
            <h2>1. Éditeur de la plateforme</h2>
            <p>La plateforme Hope Gestion Immobilière (Hope Immo Local) est exploitée par :</p>
            <ul>
                <li><strong>SKILLEXIE</strong></li>
                <li>Siège social : Bohicon, <LegalPlaceholder>adresse précise</LegalPlaceholder></li>
                <li>Téléphone : 0161280346 / 0166962026</li>
                <li>Email : <a href="mailto:10xsuperieur@gmail.com" className="text-primary hover:underline">10xsuperieur@gmail.com</a></li>
            </ul>

            <h2>2. Directeur de la publication</h2>
            <p>Le directeur de la publication est M. Thomas DEBO, en qualité de CTO stratégique.</p>

            <h2>3. Hébergement</h2>
            <p>La plateforme est hébergée par :</p>
            <ul>
                <li>Nom : <LegalPlaceholder>hébergeur</LegalPlaceholder></li>
                <li>Adresse : <LegalPlaceholder>adresse hébergeur</LegalPlaceholder></li>
                <li>Téléphone : <LegalPlaceholder>téléphone hébergeur</LegalPlaceholder></li>
                <li>Site web : <LegalPlaceholder>site hébergeur</LegalPlaceholder></li>
            </ul>

            <h2>4. Propriété intellectuelle</h2>
            <p>
                L'ensemble des éléments de la plateforme (code source, design, fonctionnalités, textes,
                images, logos, marques) est la propriété exclusive de SKILLEXIE ou de ses partenaires.
                Toute reproduction, représentation, modification ou exploitation non autorisée est
                strictement interdite et peut donner lieu à des poursuites judiciaires.
            </p>

            <h2>5. Données personnelles</h2>
            <ul>
                <li>Les données collectées via la plateforme sont traitées par SKILLEXIE conformément à la législation en vigueur et à sa Politique de Confidentialité.</li>
                <li>Finalités : gestion des comptes utilisateurs, amélioration du service, transactions immobilières.</li>
                <li>Droits des utilisateurs : accès, rectification, suppression, opposition.</li>
            </ul>
            <p>
                Toute demande relative aux données personnelles peut être adressée à :{' '}
                <a href="mailto:10xsuperieur@gmail.com" className="text-primary hover:underline">10xsuperieur@gmail.com</a>.
            </p>

            <h2>6. Responsabilité</h2>
            <p>
                SKILLEXIE s'efforce d'assurer la disponibilité et la sécurité de la plateforme.
                Toutefois, elle ne saurait être tenue responsable :
            </p>
            <ul>
                <li>Des interruptions temporaires liées à la maintenance ou aux mises à jour ;</li>
                <li>Des dommages indirects (perte de données, perte de chiffre d'affaires) ;</li>
                <li>Des contenus externes accessibles via des liens hypertextes.</li>
            </ul>

            <h2>7. Conditions d'utilisation et de vente</h2>
            <p>
                L'utilisation de la plateforme est régie par les{' '}
                <Link to="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</Link>{' '}
                et les <Link to="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</Link>{' '}
                disponibles en ligne.
            </p>
            <p>
                Toute réservation immobilière est encadrée par les{' '}
                <Link to="/conditions-reservation" className="text-primary hover:underline">Conditions de Réservation</Link>{' '}
                spécifiques.
            </p>

            <h2>8. Partenariats et confidentialité</h2>
            <p>
                Les relations de partenariat sont régies par un Accord de Confidentialité (NDA). Toute
                violation expose la partie fautive à des sanctions contractuelles et judiciaires.
            </p>

            <h2>9. Droit applicable et juridiction compétente</h2>
            <p>Les présentes mentions légales sont soumises au droit OHADA.</p>
            <p>
                En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le
                litige sera soumis à l'arbitrage conformément aux règles OHADA.
            </p>
        </LegalDocument>
    </PublicLayout>
);

export default MentionsLegalesPage;
