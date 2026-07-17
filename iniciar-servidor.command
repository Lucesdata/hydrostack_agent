#!/bin/bash
# Doble clic para iniciar HydroStack en modo desarrollo.
cd "$(dirname "$0")"
echo "Iniciando HydroStack en http://localhost:3000 ..."
( sleep 4 && open "http://localhost:3000" ) &
npm run dev
