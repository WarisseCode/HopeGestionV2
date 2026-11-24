# scripts/nginx-entetes-securite.py — en-têtes de sécurité des pages du site (audit S8).
# Procédure : docs/suivi/ENTETES_SECURITE_S8.md.
#
# Ajoute des en-têtes de sécurité aux réponses servies directement par nginx (la page du
# site, ses fichiers JS/CSS/images, les photos des biens). Les réponses de Node (API,
# fichiers privés) les ont déjà, via Helmet.
#
# Pourquoi répéter les en-têtes dans chaque bloc : dans nginx, un bloc « location » qui a
# son propre « add_header » n'hérite PAS de ceux du niveau supérieur. Les déclarer une seule
# fois au niveau « server » les ferait disparaître des blocs qui ajoutent déjà Cache-Control.
#
# Sûreté : le script s'arrête SANS RIEN MODIFIER s'il ne trouve pas exactement les blocs
# attendus, ou s'il a déjà été appliqué.
# Usage : sudo python3 scripts/nginx-entetes-securite.py /chemin/du/site
import re
import sys

MARQUEUR = "# En-têtes de sécurité (audit S8)"

# Politique de contenu en mode OBSERVATION : rien n'est bloqué ; les infractions sont
# envoyées à /api/csp-report et journalisées (« [CSP] » dans les journaux PM2).
# - script-src : le site, le petit script de thème d'index.html (empreinte sha256, à
#   recalculer si ce script change) et la connexion Google ;
# - img-src : https et data/blob (photos, drapeaux, avatars hébergés ailleurs) ;
# - frame-ancestors 'none' : le site ne peut pas être affiché dans un cadre d'un autre site.
CSP = ("default-src 'self'; "
       "script-src 'self' 'sha256-2TsBzjn30B3jBh9yoAA8EZ3d/IxXIaS0TmYaXiXc6I0=' https://accounts.google.com/gsi/client; "
       "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; "
       "img-src 'self' data: blob: https:; "
       "font-src 'self' data:; "
       "connect-src 'self' https://accounts.google.com/gsi/; "
       "frame-src https://accounts.google.com/gsi/; "
       "worker-src 'self' blob:; "
       "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; "
       "report-uri /api/csp-report")

PAGE = [
    MARQUEUR + " — page du site",
    'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
    'add_header X-Frame-Options "DENY" always;',
    'add_header X-Content-Type-Options "nosniff" always;',
    'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
    'add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self), payment=()" always;',
    f'add_header Content-Security-Policy-Report-Only "{CSP}" always;',
]
FICHIERS = [
    MARQUEUR + " — fichiers (bloc avec son propre add_header : rien n'est hérité)",
    'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
    'add_header X-Content-Type-Options "nosniff" always;',
]

# (motif d'ouverture du bloc, indice permettant de reconnaître le bon bloc, lignes à ajouter)
CIBLES = [
    (r"location / \{", "try_files $uri $uri/ /index.html", PAGE),
    (r"location ~\* \\\.\(js\|css\|png\|jpg", "try_files $uri =404", FICHIERS),
    (r"location \^~ /uploads/properties/ \{", "alias /var/www/hopegestion/backend/uploads/properties/", FICHIERS),
]


def bloc(src, start):
    """Fin (index exclu) du bloc dont l'accolade ouvrante suit `start`."""
    depth, i = 0, src.index("{", start)
    while True:
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1


def main(path):
    src = open(path, encoding="utf-8").read()
    if MARQUEUR in src:
        sys.exit("Déjà appliqué (marqueur présent) : rien à faire.")
    insertions = []
    for motif, indice, lignes in CIBLES:
        trouves = []
        for m in re.finditer(r"^[ \t]*" + motif, src, re.M):
            fin = bloc(src, m.start())
            if indice in src[m.start():fin]:
                trouves.append(m)
        if len(trouves) != 1:
            sys.exit(f"Arrêt : {len(trouves)} bloc(s) « {motif} » contenant « {indice} », 1 attendu. Fichier inchangé.")
        m = trouves[0]
        fin_ligne = src.index("\n", m.start()) + 1
        indent = re.match(r"[ \t]*", src[m.start():]).group(0) + "    "
        insertions.append((fin_ligne, "".join(indent + l + "\n" for l in lignes)))
    for pos, texte in sorted(insertions, reverse=True):
        src = src[:pos] + texte + src[pos:]
    open(path, "w", encoding="utf-8").write(src)
    print("En-têtes ajoutés dans 3 blocs : page du site, fichiers statiques, photos des biens.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage : python3 scripts/nginx-entetes-securite.py /chemin/du/site")
    main(sys.argv[1])
