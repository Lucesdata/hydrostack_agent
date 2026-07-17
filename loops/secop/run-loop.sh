#!/usr/bin/env bash
# Loop Ralph para el módulo SECOP. Correr SIEMPRE desde una rama/worktree, nunca main.
# Uso: ./loops/secop/run-loop.sh [max_iteraciones]
set -euo pipefail

MAX_ITER="${1:-10}"
BRANCH="$(git branch --show-current)"

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo "✋ Estás en $BRANCH. Crea una rama primero: git checkout -b loop/secop"
  exit 1
fi

for i in $(seq 1 "$MAX_ITER"); do
  echo "════════ Iteración $i/$MAX_ITER ════════"

  claude -p "Lee loops/secop/PROMPT.md y ejecuta UNA iteración del loop. \
Si todas las tareas están HECHO/BLOQUEADA/ATASCADA en loops/secop/PROGRESS.md, \
responde exactamente LOOP_COMPLETO y no hagas nada más." \
    --allowedTools "Edit,Write,Read,Glob,Grep,Bash(npm test:*),Bash(npx tsc:*),Bash(npm run:*),Bash(git add:*),Bash(git commit:*)" \
    --output-format text | tee /tmp/loop-secop-iter.txt

  if grep -q "LOOP_COMPLETO" /tmp/loop-secop-iter.txt; then
    echo "✅ Backlog completado en $i iteraciones."
    break
  fi

  # Guardarraíl: si la iteración dejó el árbol roto, revertir cambios sin commit
  if ! npm test --silent > /dev/null 2>&1; then
    echo "⚠️  Tests rotos tras iteración $i — descartando cambios sin commitear."
    git checkout -- . && git clean -fd --exclude=loops
  fi
done

echo "Resumen:" && git log --oneline main..HEAD 2>/dev/null || git log --oneline -10
