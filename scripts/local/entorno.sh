#!/usr/bin/env bash
# Entorno local de AquaLicita sin Supabase — docs/entorno-local.md
#
#   scripts/local/entorno.sh preparar   crea la base (si no existe), migra y siembra
#   scripts/local/entorno.sh reiniciar  borra la base y la vuelve a preparar
#   scripts/local/entorno.sh dev        `next dev` contra la base local, con sesión local
#   scripts/local/entorno.sh parar      detiene el Postgres local
#   scripts/local/entorno.sh psql       abre psql contra la base local
#
# El Postgres vive en .local/pg (ignorado por git), en el puerto 54329, para no
# chocar con otro Postgres de la máquina. Requiere los binarios de Postgres 14+
# (initdb, pg_ctl, psql): en Mac, `brew install postgresql@16`.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RAIZ"
PUERTO="${AQ_PG_PUERTO:-54329}"
DATOS="$RAIZ/.local/pg"
BASE="aqualicita"
export DATABASE_URL="postgres://aqua@127.0.0.1:${PUERTO}/${BASE}"
export DATABASE_URL_SESSION="$DATABASE_URL"
export DB_DRIVER=node

# Binarios: PG_BIN, luego el PATH, luego las rutas de Debian/Ubuntu.
if [[ -z "${PG_BIN:-}" ]]; then
  if command -v pg_ctl >/dev/null 2>&1; then PG_BIN="$(dirname "$(command -v pg_ctl)")"
  else PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"; fi
fi
[[ -x "$PG_BIN/initdb" ]] || { echo "No encuentro initdb. Instala Postgres o define PG_BIN." >&2; exit 1; }

# Postgres no arranca como root: en un contenedor se usa el usuario postgres.
como_pg() {
  if [[ "$(id -u)" == "0" ]]; then su postgres -c "$*"; else bash -c "$*"; fi
}
psql_local() { "$PG_BIN/psql" -h 127.0.0.1 -p "$PUERTO" -U aqua "$@"; }

arrancar() {
  mkdir -p "$RAIZ/.local"
  if [[ ! -f "$DATOS/PG_VERSION" ]]; then
    [[ "$(id -u)" == "0" ]] && chown postgres "$RAIZ/.local"
    como_pg "'$PG_BIN/initdb' -D '$DATOS' -U aqua --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
  fi
  if ! "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PUERTO" -q; then
    como_pg "'$PG_BIN/pg_ctl' -D '$DATOS' -o '-p $PUERTO -k /tmp' -l '$RAIZ/.local/pg.log' -w start >/dev/null"
  fi
}

preparar() {
  arrancar
  if ! psql_local -d postgres -Atc "select 1 from pg_database where datname='$BASE'" | grep -q 1; then
    psql_local -d postgres -qc "create database $BASE"
  fi
  echo "· migraciones";        npx drizzle-kit migrate >/dev/null
  echo "· geografía";          npx tsx scripts/seed-geografia.ts | tail -1
  echo "· muestra de SECOP";   npx tsx scripts/load-sample-raw.ts | grep -E "procesos|contratos"
  echo "· transform";          npx tsx scripts/run-transform.ts | tail -1
  echo "· tipo de obra";       npx tsx scripts/backfill-tipo-proyecto.ts --todas | tail -1
  echo "· fechas y usuarios";  npx tsx scripts/local/sembrar.ts | grep -v "injected env"
  echo "Listo. Arranca la app con: scripts/local/entorno.sh dev"
}

case "${1:-}" in
  preparar) preparar ;;
  reiniciar)
    arrancar
    psql_local -d postgres -qc "drop database if exists $BASE with (force)"
    preparar ;;
  dev)
    arrancar
    echo "Entorno local: http://localhost:${PORT:-3000} · entra en /dev/sesion"
    AQ_SESION_LOCAL=1 exec npx next dev -p "${PORT:-3000}" ;;
  parar) como_pg "'$PG_BIN/pg_ctl' -D '$DATOS' -m fast stop" ;;
  psql) arrancar; psql_local -d "$BASE" ;;
  *) sed -n '2,12p' "$0"; exit 1 ;;
esac
