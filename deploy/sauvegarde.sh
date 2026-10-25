#!/bin/sh
# Sauvegarde de la base de Hopla, à lancer chaque nuit sur le VPS (voir deploy/README.md, « Sauvegarde »).
#
# 1. Une copie cohérente de /data/liens.db, prise par le conteneur lui-même (VACUUM INTO : la base reste
#    ouverte et servie pendant la copie).
# 2. Compressée dans /opt/linkinbio/sauvegardes, 14 nuits gardées.
# 3. Envoyée hors du VPS si HOPLA_SAUVEGARDE_DISTANTE est posée (une destination rclone, par exemple
#    `r2:hopla-sauvegardes`), 30 nuits gardées là-bas.
# 4. Vérifiée : la copie s'ouvre et contient des comptes, sinon le script échoue (cron l'écrit dans le journal).
#
# La clé LIENS_CLE_INTEGRATIONS n'est jamais copiée avec la base : sans elle, les clés d'API et les inscrits
# chiffrés d'une sauvegarde sont illisibles, et c'est voulu. Elle se garde à part, dans un gestionnaire de
# mots de passe.
set -eu

CONTENEUR=${HOPLA_CONTENEUR:-linkinbio-app}
DOSSIER=${HOPLA_SAUVEGARDES:-/opt/linkinbio/sauvegardes}
JOUR=$(date -u +%Y-%m-%d)
NOM="liens-$JOUR.db"

mkdir -p "$DOSSIER"

docker exec "$CONTENEUR" node --disable-warning=ExperimentalWarning -e "
  const { DatabaseSync } = require('node:sqlite');
  const { rmSync } = require('node:fs');
  rmSync('/data/$NOM', { force: true });
  new DatabaseSync('/data/liens.db').exec(\"VACUUM INTO '/data/$NOM'\");
"
docker cp "$CONTENEUR:/data/$NOM" "$DOSSIER/$NOM"
docker exec "$CONTENEUR" node -e "require('node:fs').rmSync('/data/$NOM', { force: true })"

# La copie s'ouvre et contient le compte principal : sinon, rien ne la remplace.
docker run --rm -v "$DOSSIER:/s:ro" node:24-alpine node --disable-warning=ExperimentalWarning -e "
  const { DatabaseSync } = require('node:sqlite');
  const n = new DatabaseSync('/s/$NOM', { readOnly: true }).prepare(\"SELECT count(*) AS n FROM comptes WHERE id = 'principal'\").get().n;
  if (n !== 1) { console.error('sauvegarde illisible'); process.exit(1); }
"

gzip -f "$DOSSIER/$NOM"
find "$DOSSIER" -name 'liens-*.db.gz' -mtime +14 -delete

if [ -n "${HOPLA_SAUVEGARDE_DISTANTE:-}" ]; then
  rclone copy "$DOSSIER/$NOM.gz" "$HOPLA_SAUVEGARDE_DISTANTE/"
  rclone delete --min-age 30d "$HOPLA_SAUVEGARDE_DISTANTE/"
fi

echo "sauvegarde $NOM.gz ($(du -h "$DOSSIER/$NOM.gz" | cut -f1))"
