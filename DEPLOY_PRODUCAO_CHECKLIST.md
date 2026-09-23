# 🚀 Checklist e Plano de Deploy para Produção (Branch `main`)

> **Data da Análise:** 19/09/2026  
> **Status:** Pronto para deploy  
> **Branch de Origem:** `develop` (commit `19034df`)  
> **Branch de Destino:** `main` (produção — `luisices.com.br`)  
> **Projeto Firebase Prod:** `papelaria-dashboard`  
> **Status do Merge:** Testado localmente com **zero conflitos** (`Automatic merge went well`).

---

## 📦 1. Escopo das Entregas (O que está entrando em Produção)

| Módulo / Recurso | Principais Mudanças | Arquivos de Referência |
| :--- | :--- | :--- |
| **Central de Atendimento** | Nova tela `/atendimento`, sincronização de chats, envio e exclusão de mensagens via Evolution API, badge em tempo real. | `src/app/pages/WhatsAppChat.tsx`<br/>`src/services/firebaseWhatsAppService.ts` |
| **Copiloto IA & Visão Multimodal** | Copiloto interativo (pedidos, financeiro, clientes), auto-enriquecimento de fotos na galeria, monitoramento de cotas Gemini em Configurações. Remoção definitiva do gerador experimental antigo. | `src/app/components/AiCopilotSheet.tsx`<br/>`src/app/components/settings/AiSettingsSection.tsx` |
| **Lojinha & Catálogo Público** | Upload em lote por fotos, exclusão em massa, auditoria anti-adulteração de preços (`isPriceTampered`), travas anti-duplicação e alternador instantâneo da loja ativa. | `src/app/pages/StoreProducts.tsx`<br/>`src/app/components/store/BulkStoreProductsDialog.tsx` |
| **Design System & Mobile-First** | 100% dos modais padronizados com `DialogBody`, `size`, `noPadding`; eliminação total de `<select>` nativos; correção do gap de navegação em tablets (640px–767px). | `src/app/pages/Layout.tsx`<br/>`src/app/components/ui/dialog.tsx` |
| **Resiliência & Performance** | Escudo global contra o erro `b815` do Firestore, auto-cura de cache IndexedDB, auto-recuperação de chunks pós-deploy (`lazyWithRetry`), *dynamic imports* de `xlsx` e `jspdf`. | `src/main.tsx`<br/>`src/app/routes.tsx` |

---

## 🛡️ 2. Requisitos de Infraestrutura Firebase (`papelaria-dashboard`)

Antes ou imediatamente junto ao deploy do frontend, execute as etapas de infraestrutura abaixo:

### A. Índices Compostos do Firestore (`firestore.indexes.json`) — ⚠️ OBRIGATÓRIO
A tela de Atendimento faz consultas ordenadas por `chatId` + `timestamp` e `phone` + `timestamp`.  
Sem os índices, as consultas falham com o erro `FAILED_PRECONDITION: The query requires an index`.

**Comando CLI:**
```bash
firebase deploy --only firestore:indexes --project papelaria-dashboard
```
*(Ou acione o workflow manual do GitHub Actions: `.github/workflows/deploy-indexes.yml`)*

---

### B. Regras de Segurança do Firestore e Storage — ⚠️ OBRIGATÓRIO
Regras com a função `canAccessWhatsApp()` para blindar as coleções `whatsapp_chats` e `whatsapp_messages`, além da restrição de leitura da galeria no Storage.

**Comando CLI:**
```bash
firebase deploy --only firestore:rules,storage --project papelaria-dashboard
```

---

### C. Segredos no Firebase Secret Manager (Google Cloud)
As novas Cloud Functions no projeto `papelaria-dashboard` requerem as chaves no Secret Manager:

1. `GEMINI_API_KEY`: Necessária para o Copiloto e análise visual da galeria.
2. `EVOLUTION_API_KEY`: Necessária para conexão com a Evolution API (`wa.luisices.com.br`).
3. `RESEND_API_KEY`: Necessária para e-mails transacionais e redefinição de senhas.

**Comandos para configurar (caso ainda não configurados em prod):**
```bash
firebase functions:secrets:set GEMINI_API_KEY --project papelaria-dashboard
firebase functions:secrets:set EVOLUTION_API_KEY --project papelaria-dashboard
firebase functions:secrets:set RESEND_API_KEY --project papelaria-dashboard
```

---

### D. Deploy das Cloud Functions (`functions/index.js`)
Funções a serem publicadas no projeto `papelaria-dashboard`:
- **IA:** `aiAgentChat`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi`, `getAiUsage`, `syncAllOrdersToAiView`
- **WhatsApp:** `sendWhatsAppDirectMessage`, `deleteWhatsAppMessage`, `syncWhatsAppChatMessages`, `getWhatsAppInstanceStatus`, `evolutionWhatsAppWebhook`
- **Auth/E-mail:** `sendAdminPasswordReset`, `createUserInvitation`, `validateUserInvitation`, `completeUserInvitation`, `createUser`, `deleteUser`, `sendPasswordResetEmail`, `sendCustomEmail`, `getEmailUsage`, `resendReceivingWebhook`

**Comando CLI:**
```bash
firebase deploy --only functions --project papelaria-dashboard
```
*(Ou acione o workflow `.github/workflows/deploy-functions-manual.yml` selecionando o ambiente `prod`)*

---

## ⚙️ 3. Esteira de CI/CD do Frontend (GitHub Pages)

O workflow `.github/workflows/deploy.yml` é disparado automaticamente ao fazer `git push origin main`.

### Verificação de Secrets no GitHub Repository:
Certifique-se de que os segredos abaixo estão preenchidos para produção:
- `VITE_FIREBASE_PROJECT_ID` = `papelaria-dashboard`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET` = `papelaria-dashboard.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_STORAGE_CDN_URL` = `https://cdn.luisices.com.br`

---

## 📋 4. Roteiro Passo a Passo de Execução

```
[Passo 1] Deploy de Índices e Regras no Firebase
          firebase deploy --only firestore:rules,firestore:indexes,storage --project papelaria-dashboard

[Passo 2] Deploy das Cloud Functions no Firebase
          firebase deploy --only functions --project papelaria-dashboard

[Passo 3] Merge de develop para main e Push
          git checkout main
          git merge develop -m "release: deploy features de atendimento, copiloto ia, melhorias lojinha e design system"
          git push origin main

[Passo 4] Acompanhar Deploy do Frontend
          Acompanhar a execução do workflow 'Deploy to GitHub Pages (Production)' no GitHub Actions.
```

---

## 🧪 5. Smoke Tests Pós-Deploy (Validação em `luisices.com.br`)

Após a conclusão do workflow no GitHub Actions:
- [ ] **Login:** Acessar `https://luisices.com.br/login` e entrar com credenciais de administrador.
- [ ] **Atendimento (/atendimento):** Verificar se o painel de WhatsApp carrega as conversas sem erro de índice e se o status da instância é exibido.
- [ ] **Copiloto de IA:** Clicar no botão "Copiloto" no header e enviar uma pergunta teste (ex: "Quantos pedidos temos em aberto?").
- [ ] **Lojinha & Catálogo (/catalogo):** Acessar a vitrine pública, adicionar um produto e testar o fechamento de pedido simulado.
- [ ] **Gestão da Loja (/loja/produtos):** Abrir a tela de produtos da lojinha e verificar o carregamento e abertura do modal de produto.
- [ ] **Responsividade:** Redimensionar para tamanho tablet (700px) e verificar a presença da barra de navegação inferior.

---

## 🔄 6. Plano de Rollback (Em caso de imprevisto)

Caso ocorra qualquer instabilidade crítica no frontend:
```bash
git checkout main
git reset --hard 1387bbe # Commit anterior de produção
git push origin main --force
```
O GitHub Actions republicará instantaneamente a versão estável anterior em `luisices.com.br`.
