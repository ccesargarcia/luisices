# Vulnerabilidades Conhecidas e Análise de Risco

## Status Atual

O projeto possui **5 vulnerabilidades de alta severidade** reportadas pelo npm audit:

### 1. serialize-javascript (≤7.0.2) - Cadeia vite-plugin-pwa

**CVE:** GHSA-5c6j-r48x-rmvq  
**Tipo:** RCE via RegExp.flags e Date.prototype.toISOString()  
**Severidade:** Alta  
**Status:** Sem correção não-breaking disponível

**Análise de Risco:**
✅ **BAIXO RISCO** - Esta dependência é usada apenas durante o **build time** pelo vite-plugin-pwa para gerar o service worker. Não é executada em runtime no navegador do usuário nem no servidor.

**Cadeia de dependência:**
```
vite-plugin-pwa@1.2.0
└── workbox-build@7.4.0
    └── @rollup/plugin-terser@0.4.4
        └── serialize-javascript@7.0.2
```

**Opções de mitigação:**
- ❌ Downgrade para vite-plugin-pwa@0.19.8 (breaking change, perde features PWA)
- ✅ Manter versão atual (risco aceitável - build time only)
- ⏳ Aguardar correção upstream

**Decisão:** Manter versão atual. A vulnerabilidade não afeta usuários finais.

---

### 2. xlsx (todas as versões)

**CVE:** 
- GHSA-4r6h-8v6p-xvw6 (Prototype Pollution)
- GHSA-5pgg-2g8v-p4x9 (ReDoS)

**Severidade:** Alta  
**Status:** Sem correção disponível

**Análise de Risco:**
✅ **BAIXO RISCO** - Biblioteca usada **exclusivamente no lado do cliente** para exportar dados para Excel.

**Contexto de uso:**
- Exportação de dados de clientes, pedidos e orçamentos
- Executa apenas no navegador do usuário
- Não processa dados de fontes não confiáveis
- Não há inputs externos sendo passados para a biblioteca

**Vetores de ataque mitigados:**
- ❌ Prototype Pollution: Não usamos Object.keys() ou similar em dados exportados do xlsx
- ❌ ReDoS: Não processamos nomes de arquivos ou sheets vindos de fontes externas
- ✅ Dados exportados vêm do Firestore (nossa fonte confiável)

**Alternativas avaliadas:**
- `exceljs` - Mais pesada (~800KB vs 286KB)
- `SheetJS Community Edition` - Mesma biblioteca base
- Implementação custom - Complexidade não justificada

**Decisão:** Manter xlsx. Uso é seguro dentro do nosso contexto.

---

## Configuração do Dependabot

O arquivo `.github/dependabot.yml` foi configurado para:

✅ Monitorar atualizações semanalmente  
✅ Agrupar atualizações por tipo (production/development)  
✅ Limitar PRs simultâneos a 5  
⚠️ Silenciar avisos sobre xlsx (sem correção disponível)

---

## Recomendações

### Curto Prazo (Implementado)
- ✅ Documentar vulnerabilidades e análise de risco
- ✅ Configurar Dependabot para não criar PRs desnecessários
- ✅ Adicionar notas de segurança no README

### Médio Prazo
- 🔄 Monitorar vite-plugin-pwa para novas versões que atualizem serialize-javascript
- 🔄 Revisar alternativas ao xlsx trimestralmente

### Longo Prazo
- 📋 Considerar migração para alternativas se vulnerabilidades críticas surgirem
- 📋 Implementar CSP (Content Security Policy) para camadas adicionais de proteção

---

## Para Auditores de Segurança

**Pergunta:** "Por que não corrigir as vulnerabilidades de alta severidade?"

**Resposta:** As vulnerabilidades identificadas são de baixo risco no nosso contexto:

1. **serialize-javascript**: Usado apenas em build time, não afeta runtime
2. **xlsx**: Usado apenas client-side com dados confiáveis (nosso banco)

Ambos os casos não permitem exploração pelos vetores descritos nas CVEs.

**Pergunta:** "Quando as vulnerabilidades serão corrigidas?"

**Resposta:** 
- serialize-javascript: Aguardando atualização upstream no vite-plugin-pwa
- xlsx: Sem correção disponível; biblioteca é segura no nosso uso específico

---

*Última atualização: 6 de março de 2026*
