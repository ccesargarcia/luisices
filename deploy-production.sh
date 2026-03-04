#!/bin/bash
# Script de Deploy Seguro para Produção
# Execute: bash deploy-production.sh

set -e  # Para na primeira falha

echo "🚀 DEPLOY EM PRODUÇÃO - Sistema de Permissões"
echo "================================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para pausar e aguardar confirmação
pause() {
  echo ""
  echo -e "${YELLOW}Pressione ENTER para continuar ou Ctrl+C para cancelar${NC}"
  read
}

echo -e "${RED}⚠️  ATENÇÃO: Você está prestes a fazer deploy em PRODUÇÃO${NC}"
echo -e "${RED}⚠️  Certifique-se de ter lido DEPLOY_PRODUCAO.md${NC}"
pause

# Passo 1: Verificar projeto
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Passo 1: Verificando projeto Firebase${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
firebase use
echo ""
echo -e "${YELLOW}O projeto acima está correto? Deve ser 'papelaria-dashboard'${NC}"
echo "Se não estiver correto, rode: firebase use default"
pause

# Passo 2: Build
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔨 Passo 2: Fazendo build da aplicação${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build falhou! Corrija os erros antes de continuar.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Build concluído com sucesso${NC}"
pause

# Passo 3: Deploy das Firestore Rules
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 Passo 3: Deployando Firestore Rules (CRÍTICO)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Isso vai atualizar as regras de segurança do Firestore${NC}"
echo -e "${YELLOW}Incluindo a nova coleção 'userProfiles'${NC}"
pause

firebase deploy --only firestore:rules

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Deploy das rules falhou!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Firestore Rules deployadas com sucesso${NC}"
echo ""
echo "Verifique no console: https://console.firebase.google.com"
echo "Firestore Database > Regras"
pause

# Passo 4: Deploy do Hosting
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌐 Passo 4: Deployando aplicação (Hosting)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pause

firebase deploy --only hosting

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Deploy do hosting falhou!${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Acesse sua aplicação em produção"
echo "2. Faça LOGOUT (se estiver logado)"
echo "3. Faça LOGIN novamente com sua conta"
echo "   → Seu perfil será criado como ADMIN automaticamente"
echo "4. Verifique se o menu 'Usuários' aparece"
echo "5. Gerencie outros usuários pela interface"
echo ""
echo "📖 Leia DEPLOY_PRODUCAO.md para mais detalhes"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   - Todos os usuários existentes serão ADMIN no primeiro login"
echo "   - Ajuste as permissões deles depois pela página 'Usuários'"
echo ""
echo -e "${GREEN}🎉 Parabéns! Sistema de permissões está em produção!${NC}"
