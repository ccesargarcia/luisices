#!/usr/bin/env bash

# ==============================================================================
# Script de Limpeza e Recuperação de Espaço em Disco - Luisices
# ==============================================================================
# Remove caches transitórios de compilação, pacotes e navegadores headless
# sem comprometer o código-fonte, branches ou configurações de ambiente.
# ==============================================================================

set -e

echo "🔍 [1/4] Verificando estado atual do disco..."
df -h /home/caiogarcia
echo ""

echo "🧹 [2/4] Limpando caches do NPM..."
npm cache clean --force 2>/dev/null || true
rm -rf "$HOME/.npm/_cacache" "$HOME/.npm/_logs" 2>/dev/null || true

echo "🧹 [3/4] Limpando caches de testes, navegadores e emuladores..."
rm -rf "$HOME/.cache/ms-playwright"
rm -rf "$HOME/.cache/firebase"
rm -rf "$HOME/.cache/typescript"

# Limpa relatórios e artefatos de testes locais no projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -rf "$PROJECT_DIR/playwright-report"
rm -rf "$PROJECT_DIR/test-results"
rm -rf "$PROJECT_DIR/dist"
rm -rf "$PROJECT_DIR/.vite-temp"

echo "✅ [4/4] Limpeza concluída com sucesso!"
echo ""
echo "📊 Estado final do disco:"
df -h /home/caiogarcia
echo ""
