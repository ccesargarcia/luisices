#!/usr/bin/env bash

# Remove somente artefatos gerados dentro deste projeto.
# Uso: npm run clean:disk -- [--dry-run]
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DRY_RUN=false
if [[ $# -gt 1 ]] || [[ $# -eq 1 && "$1" != "--dry-run" ]]; then
  echo "Uso: $0 [--dry-run]" >&2
  exit 2
fi
if [[ $# -eq 1 ]]; then
  DRY_RUN=true
fi

for artifact in playwright-report test-results dist .vite-temp coverage; do
  target="$PROJECT_DIR/$artifact"
  if [[ -e "$target" || -L "$target" ]]; then
    if [[ "$DRY_RUN" == true ]]; then
      printf 'Seria removido: %s\n' "$target"
    else
      rm -rf -- "$target"
      printf 'Removido: %s\n' "$target"
    fi
  fi
done

if [[ "$DRY_RUN" == true ]]; then
  echo "Simulação concluída. Nenhum arquivo foi removido."
else
  echo "Limpeza dos artefatos do projeto concluída."
fi
