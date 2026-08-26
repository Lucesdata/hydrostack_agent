#!/bin/bash
# Doble clic para iniciar AquaLicita en modo desarrollo.
cd "$(dirname "$0")"
echo "Iniciando AquaLicita en http://localhost:3000 ..."
( sleep 4 && open "http://localhost:3000" ) &
npm run dev
