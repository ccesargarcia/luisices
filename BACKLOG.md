# 📌 Backlog e Histórico de Pendências — Luisices

Documento de acompanhamento com pendências técnicas, diagnósticos de testes e roadmap de melhorias.

---

## 🚨 1. Prioridade Imediata: Teste Intermitente (*Flaky Test*) no CI

* **Teste afetado:** `tests/e2e/orders.spec.ts:119:3`
  * *Descrição:* `Pedidos - CRUD › deve criar pedido com cliente novo e refletir na tela de clientes`
* **Status no CI:** 1 flaky (falhou na primeira tentativa com timeout de 15s e passou no retry). Total: 81 passed, 1 flaky.
* **Linha da falha:**
  ```typescript
  const customerCard = page.locator('[data-slot="card"]').filter({ hasText: customerName }).first();
  await expect(customerCard).toBeVisible({ timeout: 15000 });
  ```

### 🔍 Diagnóstico
1. No fluxo do teste, um novo cliente (`Cliente Teste <timestamp>`) é cadastrado *inline* durante a criação de um pedido.
2. Imediatamente após submeter o pedido, o teste navega para a rota `/customers`.
3. A página de clientes utiliza um listener em tempo real do Firestore (`subscribeToCustomers`). Em ambientes de CI (máquinas virtuais com latência de rede variável):
   - O documento do cliente pode levar alguns segundos a mais para propagar no Firestore e emitir o snapshot atualizado para a listagem.
   - Caso haja muitos clientes ou o snapshot inicial chegue antes do commit do novo documento, o card não fica visível dentro da janela de 15s da primeira execução.

### 💡 Soluções Propostas
1. **Filtro de busca ativo no teste:**
   Preencher o campo de busca com o nome do cliente gerado (`page.fill('input[placeholder*="Buscar"]', customerName)`) antes de aguardar o card.
2. **Reload / Espera resiliente:**
   Se o card não estiver visível em 5s, dar um `page.reload()` ou aguardar evento de rede/Firestore antes da asserção final.
3. **Verificação de sincronização:**
   Garantir que a resposta da criação do pedido/cliente foi concluída antes da chamada `page.goto('/customers')`.

---

## 🔒 2. Débito Técnico e Segurança (Pendente)

Itens mapeados na auditoria de segurança para serem abordados em próximas etapas:

### Severidade Média (🟡)
- [ ] **`storage.rules` (L24):** Restringir leitura irrestrita (`allow read: if true`) para exigir usuário autenticado (`request.auth != null`).
- [ ] **`firebase.json` (L22-53):** Adicionar headers de `Content-Security-Policy` (CSP) para proteção contra injeção e clickjacking no hosting.
- [ ] **`functions/index.js` (L506):** Validar se o domínio do campo `from` na função `sendCustomEmail` pertence exclusivamente a `luisices.com.br` / `dev.luisices.com.br`.
- [ ] **`functions/index.js` (L12-21):** Migrar limitadores de taxa baseados em memória (`RateLimiterMemory`) para controle distribuído no Firestore, prevenindo bypass em múltiplas instâncias de Cloud Functions.

### Severidade Baixa / Qualidade (🔵)
- [ ] **`validationSchemas.ts`:**
  - Padronizar regra de tamanho de senha (atualmente 6 chars no login vs 8 no registro).
  - Adicionar validação de complexidade de senha no registro (maiúscula, minúscula, número).
  - Padronizar obrigatoriedade do campo `phone` entre schema e serviço de clientes.
- [ ] **`functions/index.js`:** Mascarar e-mails e tokens em saídas de `console.log` para conformidade com LGPD.
- [ ] **`.github/workflows/deploy.yml`:** Atualizar action `peaceiris/actions-gh-pages@v3` para `@v4` (evitar runtime Node depreciado).

---

## ✅ 3. Concluído Recentemente (Histórico)

### Lojinha Online & Catálogo Público (Separação, Layout e Isolamento de Tema)
- **Separação de Catálogos (`storeProducts` vs `products`):** Criação de módulo exclusivo para produtos da vitrine comercial (`/produtos-lojinha`), permitindo controlar quem pode gerenciar a vitrine e separando os insumos/produtos internos do ateliê.
- **Submenu Lojinha Online:** Agrupamento em submenu retrátil na barra lateral (`Layout.tsx`) para *Produtos da Lojinha* e *Personalizar Loja*, com ritmo vertical compacto (`py-2`, `gap-0.5`) que eliminou a barra de rolagem vertical indesejada no desktop.
- **Persistência de visualização e responsividade:** Implementação da alternância entre modo Galeria (Cards) e Lista detalhada com persistência em `localStorage` (`StoreProducts.tsx` e `Products.tsx`) e adaptação responsiva de colunas (`flex-col sm:flex-row`), eliminando rolagem horizontal.
- **Segurança no Firestore:** Adição de regras granulares para a coleção `/storeProducts/{productId}` em `firestore.rules` (leitura pública para o catálogo e escrita permitida a usuários autenticados).
- **Isolamento de tema e padrão claro:** Resolução de interferência de tema entre o catálogo público e o painel administrativo. O catálogo público adota estritamente o tema claro como default em todos os carregamentos; o alternador do catálogo não sobrescreve a chave de tema do painel administrativo e restaura a preferência original do usuário ao retornar ao painel.
- **Permissões RBAC:** Adição do módulo `storeProducts` na matriz de permissões do usuário em `Users.tsx`.
- **Hardening de Segurança da Lojinha Online:**
  - *`firestore.rules`:* Bloqueio de gravação em `storeSettings/public` para usuários sem permissão explícita de loja (`permissions.store == true` ou `isAdmin()`), prevenindo sequestro do WhatsApp de vendas; remoção da brecha `!exists(...)` em `storeProducts` e restrição de exclusão/edição exigindo propriedade ou permissão.
  - *`storage.rules`:* Restrição de exclusão de imagens públicas na pasta `store/**` atrelando metadados de upload ao `userId` do operador.
  - *Sanitização de URLs (`PublicCatalog.tsx` e `BannerCarousel.tsx`):* Higienização contra esquemas perigosos (`javascript:`) nos links de site oficial, Instagram e banners rotativos.
- **Segregação de WhatsApp (Lojinha vs Institucional):**
  - Segregação completa entre o WhatsApp de recebimento de pedidos da vitrine pública (`catalogWhatsappPhone`) e o WhatsApp institucional de orçamentos e contato interno do ateliê (`whatsappPhone`).
  - Campo específico com ícone e texto explicativo adicionado à tela de Personalizar Loja (`StoreCustomization.tsx`) e na aba de Catálogo em Configurações (`CatalogSettingsSection.tsx`).
  - Atualização do serviço (`firebaseSettingsService.ts`) para sincronizar `storeSettings/public` priorizando o WhatsApp da loja sem sobrescrever o WhatsApp institucional, e impedindo que a alteração dos dados institucionais apague o WhatsApp da lojinha pública.
  - Catálogo público (`PublicCatalog.tsx`) consome prioritariamente o número dedicado da vitrine com fallback seguro.

### Commit `0c8a534` — *fix(tests): remover clique fora do viewport no teste de permissoes*
- Ajuste no teste `tests/e2e/permissions.spec.ts` removendo clique cego de fechamento de menu que estourava timeout em telas menores.

### Commit `0ed2eb8` — *fix(security): correcoes de vulnerabilidades, controle de acesso e atomicidade de dados*
- **Firebase Globals:** Remoção da exposição de instâncias no `window` em produção (`firebase.ts`).
- **Criação Segura de Usuários:** Migração da criação de usuários via REST aberta para Cloud Function com `isAdminRequest` (`firebaseUserService.ts` + `functions/index.js`).
- **Webhook Resend/Svix:** Exigência de assinatura criptográfica válida sem fallback para requisições não autenticadas (`functions/index.js`).
- **Proteção de Rotas:** Rota sensível `/corrigir-valores` protegida com `adminOnly` (`routes.tsx`).
- **Checagem de Ownership:** Validação de `userId` antes de `get`, `update` e `delete` em orçamentos (`firebaseQuoteService.ts`) e galeria (`firebaseGalleryService.ts`).
- **Atomicidade de Estatísticas:** Uso de `runTransaction` no recálculo e decremento de estatísticas de clientes (`firebaseCustomerService.ts`).
