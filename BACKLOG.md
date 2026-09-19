# 📌 Backlog e Histórico de Pendências — Luisices

Documento de acompanhamento com pendências técnicas, diagnósticos de testes, débitos de segurança e histórico de melhorias concluídas.

---

## 🔒 1. Débito Técnico e Segurança (Pendente)

Itens mapeados na auditoria de segurança para serem abordados em próximas etapas:

### Severidade Média (🟡)
- [ ] **`storage.rules` (L24):** Restringir leitura irrestrita (`allow read: if true`) em pastas privadas para exigir usuário autenticado (`request.auth != null`).
- [ ] **`firebase.json` (L22-53):** Adicionar headers de `Content-Security-Policy` (CSP) para proteção contra injeção e clickjacking no hosting.
- [ ] **`functions/index.js`:** Migrar limitadores de taxa baseados em memória (`RateLimiterMemory`) para controle distribuído no Firestore, prevenindo bypass em múltiplas instâncias de Cloud Functions concorrentes.

### Severidade Baixa / Qualidade (🔵)
- [ ] **`validationSchemas.ts`:**
  - Padronizar regra de tamanho de senha (atualmente 6 chars no login vs 8 no registro).
  - Adicionar validação de complexidade de senha no registro (maiúscula, minúscula, número).
  - Padronizar obrigatoriedade do campo `phone` entre schema e serviço de clientes.
- [ ] **`.github/workflows/deploy.yml`:** Atualizar action `peaceiris/actions-gh-pages@v3` para `@v4` (evitar runtime Node depreciado).

---

## ✅ 2. Concluído Recentemente (Histórico)

### 📦 Gestão em Massa de Produtos da Lojinha & UI Mobile-First
- **Cadastro em Massa por Fotos (`BulkStoreProductsDialog.tsx`):** Upload simultâneo de múltiplos arquivos de imagem com inferência automática de título comercial a partir do nome do arquivo e replicação em lote de preço, categoria e prazo.
- **Exclusão em Massa (`BulkDeleteStoreProductsDialog.tsx`):** Diálogo de confirmação com exibição visual dos itens selecionados antes da exclusão.
- **Batching no Firestore (`firebaseStoreProductService.ts`):** Métodos `bulkToggleActive` e `bulkDeleteStoreProducts` particionados em blocos de até 400 documentos via `writeBatch`.
- **Barra Flutuante Mobile-First (`StoreProducts.tsx`):** Barra de ações em lote com layout responsivo para smartphones e alternador instantâneo do status geral da loja (Online 🟢 / Fora do Ar 🔴).

### 🛡️ Blindagem de Segurança e Auditoria de Preços
- **Auditoria Anti-adulteração de Preços (`firebaseCatalogOrderService.ts`):** Validação automática no backend dos preços de pedidos recebidos via lojinha pública contra a coleção oficial `storeProducts`. Em caso de divergência > R$ 0,05, ativa a flag `isPriceTampered = true` e exibe alerta para os operadores.
- **Lock Anti-duplicação:** Bloqueio a nível de transação para impedir cliques duplos na conversão de pedidos da lojinha para pedidos oficiais de produção.
- **Validação de Remetentes e Mascaramento LGPD (`functions/index.js`):** Validação estrita do domínio de remetente (`@luisices.com.br` e `@dev.luisices.com.br`) na função `sendCustomEmail` e mascaramento de e-mails em logs.
- **Webhook Svix:** Validação estrita de assinatura e tolerância máxima de 5 minutos contra replay attacks no recebimento de e-mails via Resend.

### ⚡ Resiliência de Aplicação e Auto-Cura
- **Carregador de Rotas Quádruplo (`lazyWithRetry` em `routes.tsx`):** Suporte a named e default exports, retentativa em memória de 800ms, auto-recuperação com limpeza de cache para evitar telas brancas pós-deploy e Error Boundary.
- **Escudo Global do Firestore (`main.tsx` + `firebase.ts`):** Interceptação de asserções assíncronas do Firestore (como o erro `b815`) e auto-recuperação do IndexedDB via `recoverFirestorePersistence()` sem quebrar a aplicação React.
- **Performance com Dynamic Imports:** Carregamento sob demanda (*code splitting*) de `xlsx` e `jspdf` para redução de bundle inicial.

### 🛍️ Segregação de WhatsApp e Desacoplamento da Lojinha
- **Segregação de Contatos:** Separação total entre o WhatsApp de vendas da vitrine pública (`catalogWhatsappPhone`) e o WhatsApp institucional do ateliê (`whatsappPhone`) em configurações e serviços.

### 🔐 Blindagem de Permissões (RBAC) & Eliminação de Bypasses
- **Eliminação de `allowUserRole`:** Removidos todos os bypasses de papel em `Layout.tsx` e `routes.tsx` que impediam a revogação de módulos para contas `user`. Agora todo módulo (`whatsapp`, `aiCopilot`, `reports`, `pricing`, `exchanges`, `settings`, `store`) respeita os toggles de permissão no Firestore.
- **Regras do Firestore para Mensagens e Chats:** Criação da função `canAccessWhatsApp()` em `firestore.rules`, bloqueando acesso de usuários inativos ou sem permissão explícita e eliminando o backdoor via `customers.view`.

### 📱 Central de Atendimento Mobile-First & Design System
- **Resolução do Botão "Nova Conversa":** Cabeçalho responsivo com labels adaptáveis e botão flutuante (FAB) estilo WhatsApp no mobile, garantindo acesso instantâneo.
- **Modais Padronizados:** Refatoração de `newChatModalOpen` e modal de exclusão com componentes do Design System (`DialogContent size="md"`, `DialogHeader`, `DialogBody`, `DialogFooter`), adicionando abas de navegação entre clientes cadastrados e números avulsos.

### 🤖 Guardrails de Inteligência Artificial & Quota
- **Rate Limiters Dedicados:** Implementação de `galleryAiLimiter` (20 req/min) em `enrichGalleryItemWithAi` e `aiAgentLimiter` (60 req/min) em `aiAgentChat`.
- **Validação de Inatividade:** Bloqueio de chamadas por usuários inativos (`active: false`) nas Cloud Functions de IA.
- **Ocultação de Interface:** Bloqueio e ocultação visual completa do Copiloto no header/sheet, análise visual na galeria, badge "IA" e checkbox de auto-enriquecimento no upload para perfis sem `aiCopilot`.
