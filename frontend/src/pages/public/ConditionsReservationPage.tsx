import React from 'react';
import PublicLayout from '../../layout/PublicLayout';
import LegalDocument from '../../components/legal/LegalDocument';

const ConditionsReservationPage: React.FC = () => (
    <PublicLayout>
        <LegalDocument title="Conditions de Réservation des Biens Immobiliers" subtitle="Plateforme Hope Gestion Immobilière">
            <h2>Article 1 : Objet</h2>
            <p>
                Les présentes conditions ont pour objet de définir les modalités et règles applicables à
                toute réservation d'un bien immobilier effectuée via la plateforme Hope Gestion
                Immobilière. Elles encadrent les droits et obligations des candidats à la réservation
                ainsi que les engagements de la société SKILLEXIE, exploitante de la plateforme.
            </p>

            <h2>Article 2 : Procédure de réservation</h2>
            <p>Pour effectuer une réservation, le candidat doit obligatoirement :</p>
            <ul>
                <li>Sélectionner le bien immobilier souhaité sur la plateforme ;</li>
                <li>Cliquer sur le bouton « Réserver » ;</li>
                <li>
                    Procéder au paiement immédiat d'un acompte correspondant à 5 % du montant total du
                    bien, exclusivement par moyens de paiement électroniques disponibles sur la
                    plateforme (mobile money, carte bancaire, virement en ligne ou tout autre moyen
                    digital sécurisé).
                </li>
            </ul>
            <p>
                La réservation n'est considérée comme valide qu'après confirmation effective du paiement
                par la plateforme.
            </p>
            <p>
                Toutes les opérations financières (paiement, recouvrement, réservation et recettes) sont
                effectuées par des moyens de transaction digitale grâce à la plateforme.
            </p>

            <h2>Article 3 : Confirmation et document d'engagement</h2>
            <p>
                Après validation du paiement, le candidat reçoit automatiquement un document
                d'engagement électronique précisant notamment :
            </p>
            <ul>
                <li>L'identité du candidat ;</li>
                <li>La description du bien réservé ;</li>
                <li>Le montant payé (5 %) ;</li>
                <li>La date d'échéance convenue pour finaliser la transaction ;</li>
                <li>Les obligations des parties.</li>
            </ul>
            <p>
                Ce document électronique vaut preuve de réservation et d'engagement contractuel entre le
                candidat et la société.
            </p>

            <h2>Article 4 : Engagement du candidat</h2>
            <p>Le candidat s'engage à :</p>
            <ul>
                <li>Respecter strictement la date d'échéance convenue ;</li>
                <li>Finaliser la transaction à cette date, soit par la signature du contrat définitif, soit par le paiement du solde restant dû ;</li>
                <li>Fournir l'ensemble des documents requis pour la finalisation de la transaction.</li>
            </ul>

            <h2>Article 5 : Non-respect de l'échéance</h2>
            <p>
                En cas de non-respect de la date d'échéance par le candidat, sans motif valable ou
                justificatif, le montant versé au titre de la réservation est définitivement acquis à la
                société et non remboursable.
            </p>
            <p>
                Cette disposition vise à protéger la société contre les annulations abusives et à
                garantir la fiabilité des engagements pris via la plateforme.
            </p>

            <h2>Article 6 : Cas de remboursement exceptionnel</h2>
            <p>Le remboursement de l'acompte ne peut être envisagé que dans les cas suivants :</p>
            <ul>
                <li>Indisponibilité du bien réservé ;</li>
                <li>Informations erronées ou trompeuses fournies par la plateforme ;</li>
                <li>Cas de force majeure dûment justifiée (catastrophe naturelle, impossibilité légale ou administrative).</li>
            </ul>
            <p>
                Toute demande de remboursement devra être formulée par écrit et accompagnée de
                justificatifs probants. La société se réserve le droit de vérifier la validité des motifs
                invoqués avant d'accorder le remboursement.
            </p>

            <h2>Article 7 : Acceptation</h2>
            <p>
                Toute réservation effectuée sur la plateforme vaut acceptation pleine et entière des
                présentes conditions par le candidat.
            </p>
            <p>
                En procédant à la réservation et au paiement de l'acompte, le candidat reconnaît avoir
                pris connaissance des conditions de réservation et s'engage à les respecter.
            </p>

            <h2>Article 8 : Dispositions communes</h2>
            <p>
                Toutes les opérations financières liées aux réservations (paiement des acomptes,
                recouvrements, recettes) sont exclusivement réalisées par des moyens de transaction
                digitale sécurisés intégrés à la plateforme Hope Gestion Immobilière.
            </p>
            <p>
                La société SKILLEXIE garantit la traçabilité et la sécurité des transactions effectuées
                par voie électronique.
            </p>
        </LegalDocument>
    </PublicLayout>
);

export default ConditionsReservationPage;
