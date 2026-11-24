# scripts/nginx-uploads-prives.py — étape 3 des fichiers privés (docs/suivi/FICHIERS_PRIVES_ETAPE3.md).
# Remplace l'unique bloc « location ^~ /uploads/ { alias … } » d'un fichier de site nginx par :
# /uploads/properties/ servi directement + le reste de /uploads/ transmis à Node.
# S'arrête sans rien modifier si le bloc attendu n'est pas trouvé exactement une fois.
# Usage : sudo python3 scripts/nginx-uploads-prives.py /chemin/du/site
import sys, re
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
starts = [m.start() for m in re.finditer(r'^[ \t]*location \^~ /uploads/ \{', src, re.M)]
if '/uploads/properties/' in src:
    sys.exit("Déjà modifié (bloc /uploads/properties/ présent) : rien à faire.")
if len(starts) != 1:
    sys.exit(f"Arrêt : {len(starts)} bloc(s) « location ^~ /uploads/ » trouvé(s), 1 attendu. Fichier inchangé.")
start = starts[0]
depth, i = 0, src.index('{', start)
while True:
    c = src[i]
    if c == '{': depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0: end = i + 1; break
    i += 1
old = src[start:end]
if 'alias /var/www/hopegestion/backend/uploads/' not in old or 'proxy_pass' in old:
    sys.exit("Arrêt : le bloc trouvé ne ressemble pas à l'ancien bloc attendu. Fichier inchangé.")
indent = re.match(r'[ \t]*', src[start:]).group(0)
new = """# Photos des biens : publiques (annonces des lots vacants), servies directement.
location ^~ /uploads/properties/ {
    alias /var/www/hopegestion/backend/uploads/properties/;
    expires 30d;
    add_header Cache-Control "public";
}

# Autres fichiers (pièces d'identité, quittances, baux…) : transmis à Node, qui vérifie
# la signature du lien quand FILE_URLS_ENFORCE=true.
location ^~ /uploads/ {
    proxy_pass         http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}"""
new = "\n".join((indent + l) if l else l for l in new.split("\n"))
open(path, 'w', encoding='utf-8').write(src[:start] + new + src[end:])
print("Bloc /uploads/ remplacé. Ancien bloc :\n" + old)
