import React from 'react';
import { Link } from 'react-router-dom';
import LegalPlaceholder from './LegalPlaceholder';

// Corps des CGU, partagé entre la page publique (CguPage) et le garde-fou de consentement
// (CguGate). Deux corrections de forme par rapport au document source (sans changer le fond) :
// la numérotation dupliquait "4-" pour deux sections distinctes (renumérotée 1→8 en séquence),
// et la négation "présente aucun cookie" manquait son "ne".
const CguArticles: React.FC = () => (
    <>
        <p>
            La société SKILLEXIE S.E.P, ci-après « l'éditeur », édite le site internet Hope Gestion
            Immobilière (Hope Immo Local), ci-après le « site ».
        </p>

        <h2>1. Propriété intellectuelle</h2>
        <p>
            <strong>Propriété littéraire et artistique</strong> : la société SKILLEXIE est titulaire de
            tous les droits de propriété intellectuelle relatifs au site.
        </p>
        <p>
            L'accès au site ne confère à l'utilisateur aucun droit sur les droits de propriété
            intellectuelle relatifs au site, qui restent la propriété exclusive de SKILLEXIE S.E.P.
        </p>
        <p>
            Sont notamment protégés par les lois béninoises et internationales relatives à la propriété
            intellectuelle :
        </p>
        <ul>
            <li>La charte graphique (logo, jeux de police, code couleurs, contenu rédactionnel, choix et positionnement des illustrations) ;</li>
            <li>L'aspect navigation (ensemble des fonctionnalités permettant à l'utilisateur de parcourir le site) ;</li>
            <li>
                L'aspect d'ensemble du site. Conformément à la législation nationale, l'exploitation non
                préalablement autorisée par SKILLEXIE S.E.P à quelque titre que ce soit, de tout ou
                partie du site pourra faire l'objet de toute action appropriée, notamment d'une action en
                contrefaçon.
            </li>
        </ul>
        <p>
            <strong>Droit du nom commercial</strong> : la société est titulaire du nom commercial
            SKILLEXIE S.E.P tel qu'il résulte de son enregistrement au RCCM numéro{' '}
            <LegalPlaceholder>numéro RCCM</LegalPlaceholder>.
        </p>

        <h2>2. Liens hypertextes</h2>
        <p>
            Les liens hypertextes présents sur le site envoient vers des sites appartenant ou
            partenaires de la société SKILLEXIE S.E.P. Toutefois, lesdits sites sont régis par leurs
            propres CGU et les utilisateurs y sont liés.
        </p>
        <p>
            Les actions de paiement sur le site redirigent vers un site de notre agrégateur de paiement
            partenaire.
        </p>
        <p>
            Le site peut contenir des liens hypertextes vers d'autres sites présents sur le réseau
            internet. Les liens vers ces autres ressources vous font quitter le site. L'éditeur décline
            toute responsabilité relative au contenu de ces sites tiers et ne saurait être tenu
            responsable de l'usage qui pourra en être fait par les utilisateurs. Il est possible de créer
            un lien vers la page de présentation du site sans autorisation expresse de l'éditeur.
        </p>
        <p>
            Aucune autorisation ou demande d'information préalable ne peut être exigée par l'éditeur à
            l'égard d'un site tiers qui souhaite établir un lien vers le site de l'éditeur. Il convient
            toutefois d'afficher ce site dans une nouvelle fenêtre du navigateur. Cependant, l'éditeur se
            réserve le droit de demander la suppression d'un lien qu'il estime non conforme à l'objet du
            site ou si ledit lien procède d'une démarche délibérée et malicieuse, entreprise en toute
            connaissance de cause par l'exploitant du site d'origine.
        </p>
        <p>
            Enfin, toute création d'un lien hypertexte qualifié de « profond » ou le recours au «
            framing » ou au « inline linking », entre autres, requiert l'autorisation préalable expresse
            de l'éditeur.
        </p>

        <h2>3. Responsabilité de l'éditeur</h2>
        <p>
            Les informations et/ou documents figurant sur ce site sont susceptibles de contenir des
            inexactitudes techniques et des erreurs typographiques. L'éditeur se réserve le droit de les
            corriger, dès que ces erreurs sont portées à sa connaissance. L'éditeur ne pourra en aucun
            cas être tenu responsable de tout dommage de quelque nature qu'il soit résultant de
            l'interprétation ou de l'utilisation des informations et/ou documents disponibles sur ce
            site.
        </p>

        <h2>4. Limitation contractuelle sur les données</h2>
        <p>
            Les informations contenues sur ce site sont aussi précises que possible et le site est remis
            à jour à différentes périodes de l'année, mais peut toutefois contenir des inexactitudes ou
            des omissions. Si vous constatez une lacune, une erreur ou ce qui paraît être un
            dysfonctionnement, merci de bien vouloir le signaler par email, à l'adresse{' '}
            <a href="mailto:10xsuperieur@gmail.com" className="text-primary hover:underline">10xsuperieur@gmail.com</a>,
            en décrivant le problème de la manière la plus précise possible (page posant problème, type
            d'ordinateur et de navigateur utilisé…).
        </p>
        <p>
            Tout contenu téléchargé se fait aux risques et périls de l'utilisateur et sous sa seule
            responsabilité. En conséquence, l'éditeur ne saurait être tenu responsable d'un quelconque
            dommage subi par l'ordinateur de l'utilisateur ou d'une quelconque perte de données
            consécutives au téléchargement. De plus, l'utilisateur du site s'engage à accéder au site en
            utilisant un matériel récent, ne contenant pas de virus et avec un navigateur de dernière
            génération mis à jour.
        </p>

        <h2>5. Accès au site</h2>
        <p>
            L'éditeur s'engage à fournir les meilleurs efforts pour rendre et maintenir accessibles
            tous les services disponibles sur le site.
        </p>
        <p>
            À cet égard, l'éditeur n'est tenu qu'à une obligation de moyens à l'égard de l'utilisateur,
            sa responsabilité ne saurait en aucun cas être recherchée dans les cas suivants :
        </p>
        <ul>
            <li>Interruptions momentanées d'une durée de quelques minutes pour la mise à jour de certains fichiers ;</li>
            <li>Difficultés de fonctionnement ou interruption momentanée de ces services indépendamment de la volonté de l'éditeur, notamment en cas d'interruption des services d'électricité ou de télécommunication ;</li>
            <li>Interruptions momentanées des services nécessaires à leurs évolutions ou maintenance ;</li>
            <li>Défaillance ou dysfonctionnements du réseau Internet dans la transmission de messages ou documents.</li>
        </ul>

        <h2>6. Modification des CGU</h2>
        <p>
            Les CGU du site, ici définies, ont été mises en ligne le{' '}
            <LegalPlaceholder>date de première mise en ligne</LegalPlaceholder>. L'éditeur se réserve le
            droit de les modifier à tout moment et sans préavis.
        </p>

        <h2>7. Politique de cookies</h2>
        <p>
            Le site hopegestion.com dépose un cookie strictement nécessaire à l'authentification
            (maintien de la connexion), qui ne requiert pas de consentement conformément aux
            usages en vigueur pour les cookies indispensables au fonctionnement du service. Le
            site n'utilise aujourd'hui aucun cookie de mesure d'audience ou publicitaire. Si de
            tels cookies optionnels venaient à être introduits, un bandeau de consentement
            recueillerait votre choix avant leur dépôt.
        </p>

        <h2>8. Litiges</h2>
        <p>
            Les présentes conditions du site hopegestion.com sont régies par les lois béninoises et
            toute contestation ou litige qui pourrait naître de l'interprétation ou de l'exécution de
            celles-ci sera de la compétence exclusive des tribunaux dont dépend le siège social de la
            société. La langue de référence, pour le règlement de contentieux éventuels, est le
            français.
        </p>

        <div className="mt-10 pt-6 border-t border-base-200 text-sm text-base-content/70 space-y-1">
            <p className="font-semibold text-base-content">CGU SKILLEXIE S.E.P</p>
            <p>Carré <LegalPlaceholder>adresse précise</LegalPlaceholder>, Cotonou, Bénin</p>
            <p>Tél : (229) 0161280346 / 0166962026</p>
            <p>E-mail : 10xsuperieur@gmail.com</p>
            <p>RCCM : <LegalPlaceholder>numéro RCCM</LegalPlaceholder></p>
            <p>IFU : <LegalPlaceholder>numéro IFU</LegalPlaceholder></p>
        </div>

        <p className="mt-6 text-sm text-base-content/60">
            Voir aussi les <Link to="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</Link>,
            {' '}les <Link to="/mentions-legales" className="text-primary hover:underline">Mentions Légales</Link>
            {' '}et les <Link to="/conditions-reservation" className="text-primary hover:underline">Conditions de Réservation</Link>.
        </p>
    </>
);

export default CguArticles;
