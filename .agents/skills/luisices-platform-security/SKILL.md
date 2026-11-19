---
name: luisices-platform-security
description: Arquitetura de segurança da plataforma Luisices (RBAC multi-tenant, Firestore/Storage Rules, OAuth/MCP scopes, integridade transacional, matemática financeira em centavos, checkout público e simulações adversariais Red Team). Use ao criar, revisar ou auditar funcionalidades de backend, regras de segurança, ferramentas MCP ou serviços frontend.
---

# Segurança da Plataforma — Luisices (`papelaria-dashboard`)

Esta skill consolida os invariantes de segurança, controles de acesso, proteção de dados financeiros, integridade transacional e testes adversariais (Red Team) da plataforma Luisices.

## 0. Armazenamento local no navegador e IndexedDB

- **Regra obrigatória:** qualquer dado da aplicação persistido em IndexedDB deve ser cifrado antes de ser gravado. Texto, HTML, tokens, PII, anexos, metadados sensíveis e chaves de conteúdo não podem ser persistidos em claro.
- Prefira Web Crypto AES-GCM com IV aleatório por gravação, validação autenticada na leitura, chaves não exportáveis e separação por UID/tenant quando houver dados de conta. Defina expiração, limites de tamanho/quantidade, limpeza em logout/troca de conta e fallback seguro quando IndexedDB/Web Crypto falhar.
- Uma chave não exportável armazenada no mesmo perfil/origem reduz exposição em leitura direta do banco exportado, mas **não** é uma fronteira contra XSS, script comprometido na origem, malware ou usuário com sessão ativa. Registre essa limitação; cache local nunca substitui autorização do servidor.
- Firestore `persistentLocalCache()` usa IndexedDB interno sem cifra configurável; mantenha `memoryLocalCache()` salvo se houver cifra suportada. No Firebase Auth Web SDK, `browserLocalPersistence` usa `localStorage` e sincroniza abas (não usa IndexedDB); `browserSessionPersistence` usa `sessionStorage` isolado por aba. `localStorage` de Auth não é cifrado pela aplicação e persiste após fechar o navegador, portanto avalie explicitamente esse risco e, se adotado, aplique expiração por inatividade, incluindo verificação ao reabrir. A persistência `indexedDBLocalPersistence` é uma opção distinta e deve permanecer desativada sem cifra configurável. Quando migrar de persistência local sem criptografia, remova o banco legado quando for seguro e documente limitações de abas antigas/dispositivos offline.
- E2E e ferramentas de desenvolvimento não devem extrair/restaurar bancos IndexedDB internos com tokens em claro. Use sessão de teste de curta duração fora do IndexedDB e mantenha os arquivos de estado ignorados pelo Git.
- Toda spec que introduzir ou tocar em IndexedDB deve declarar o mecanismo criptográfico, localização/escopo da chave, limites/expiração, limpeza, fallback e ameaça residual. Se o SDK controla o IndexedDB sem opção de cifra, desative essa persistência e registre a consequência funcional (por exemplo, ausência de leitura offline).

---

## 1. Modelo de Autorização Multi-Tenant e RBAC

Toda operação de leitura ou escrita deve respeitar simultaneamente o **isolamento de tenant** (`userId` / `createdBy` / `ownerUid`), o **papel do perfil** (`role` em `userProfiles/{uid}`) e as **permissões granulares por módulo** (`permissions.<module>.<action>`).

### 1.1 Perfis e Estado de Sessão (`userProfiles/{uid}`)
- **`active == true`**: Contas desativadas (`active == false`) devem ter acesso negado imediatamente em todas as camadas (`firestore.rules`, `storage.rules`, Cloud Functions e MCP).
- **`tokensValidAfterTime`**: Qualquer token cujo `request.auth.token.auth_time <= tokensValidAfterTime` é considerado revogado e deve ser bloqueado em `isActiveUser()`.
- **Papéis (`role`)**:
  - `admin`: Acesso total administrativo.
  - `funcionario`: Acesso **deny-by-default**; exige permissão explícita `permissions.<module>.<action> == true` (ou `permissions.<module> == true`) para cada módulo e ação (`view`, `create`, `edit`, `delete`).
  - `user` (proprietário/tenant): Acesso aos próprios documentos (`userId == uid`), desde que a ação do módulo **não** tenha sido revogada explicitamente pelo administrador (`userHasPerm(module, action)` em `firestore.rules` e `ownerHasPerm(userId, module, action)` em `storage.rules`).

### 1.2 Paridade Obrigatória entre Camadas
Qualquer alteração na matriz de permissões deve manter paridade estrita entre as **5 camadas**:
1. **`firestore.rules`**: Helpers `userHasPerm(module, action)` e `employeeHasModulePerm(module, action)`.
   - Exemplo crítico: atualização na coleção `/gallery/{itemId}` utiliza `canUpdateGalleryItem`: transições de soft-delete (`deletedAt`) exigem permissão `'delete'`, enquanto edição de metadados exige `'edit'`.
2. **`storage.rules`**: O proprietário (`request.auth.uid == userId`) **não** pode dar curto-circuito em regras de escrita sem validar `ownerHasPerm(userId, module, action)`. As permissões de `create` e `update` devem ficar em regras separadas e verificar `resource == null` na criação e `resource != null` na atualização. A criação exige `'create'`; a atualização de metadados existentes exige `'edit'`. Substituir o conteúdo exige apagar o objeto e fazer novo upload, portanto exige as permissões correspondentes de delete e create. Até migrar perfis existentes, perfis legados sem `gallery.edit` têm compatibilidade via `gallery.create` apenas para não funcionários; `edit: false` explícito continua negando a edição de metadados. Remover essa compatibilidade após concluir a migração.
3. **Frontend Services (`src/services/*.ts`)**: Validação de ownership no cliente deve permitir acesso legítimo de `admin` e `funcionario` ativo com a permissão do módulo (ex.: `hasCrossUserQuotePermission` em `src/services/firebaseQuoteService.ts`).
4. **Cloud Functions (`functions/orders/index.js`, `functions/ai/handlers.js`)**: Validação de escopo via `getCallerScope` e `validateAiAccess`.
5. **MCP & Copiloto (`functions/ai/tools.js`, `functions/mcp/endpoint.js`)**: Validação de escopo OAuth (`TOOL_SCOPE_MAP`) + permissão de módulo no perfil (`requireMcpModulePermission` / `requireMcpModuleReadPermission`).

---

## 2. Segurança MCP, OAuth 2.1 e Redação de Dados Sensíveis

### 2.1 Escopos OAuth e Permissões de Módulo
- Todo tool MCP listado em `TOOL_SCOPE_MAP` (`functions/mcp/constants.js`) valida:
  1. Se o token OAuth possui o escopo exigido (ou se o perfil do usuário continua autorizado via `moduleAllowsMcpScope` em `functions/mcp/profilePermissions.js`).
  2. Se o `scope` do usuário possui a permissão do módulo correspondente em `AiToolsExecutor` (`functions/ai/tools.js`), tanto em ferramentas de **escrita** (`create`, `edit`, `delete`) quanto em ferramentas de **leitura/cálculo** (`executeQueryQuotes` -> `quotes.view`; `executeListSupplies`, `executeListPricingModels`, `executeGetPricingModel`, `executeCalculateArtisanPricing` -> `pricing.view`).

### 2.2 Redação Obrigatória de Campos Financeiros (Field-Level Redaction)
Quando uma requisição MCP **não** possui `financial:read` nem `payments:read`:
- **`query_orders_view`**: Remover `totalPrice`, `paidAmount`, `remainingAmount`, `paymentStatus` de cada pedido.
- **`query_customers`**: Remover `totalSpent` de cada cliente.
- **`daily_briefing`**: Remover `pendingPaymentCount`, `pendingPaymentTotal`, `realizedRevenue`, `totalReceived` e redigir `delayedOrders` e `todayDeliveries`.
- **`get_user_summary`**: Quando não houver `financial:read`, remover `totalSpent` de `customers`, filtrar métricas financeiras de `metrics` (`volumeTotalEmitido`, `grossIssuedVolume`, `faturamentoRealizado`, `realizedRevenue`, `totalReceived`, `totalRecebido`, `pendingReceivables`, `totalPendenteReceber`, `averageTicket`, `ticketMedio`) **e redigir os campos financeiros (`totalPrice`, `price`, `paidAmount`, `remainingAmount`, `payment`) de `sampleOrders`**.

### 2.3 Proteção de PII de Colaboradores
- `sanitizeCollaboratorInfo` (`functions/ai/authorization.js`) nunca deve expor `email` de outro colaborador se o chamador não for `admin`, o próprio colaborador (`isSelf`), ou um `funcionario` ativo com o escopo `team:read`.

### 2.4 Paridade entre Schema MCP Publicado e Valores Persistidos
- Todo enum aceito em `functions/mcp/openapi.js` deve ser normalizado para o valor canônico **antes** de gravar no Firestore. Aliases legados ou em pt-BR continuam aceitos na entrada para não quebrar clientes MCP existentes.
  - Forma de pagamento: `normalizePaymentMethod` (`functions/ai/financialMath.js`) mapeia `cartao`, `dinheiro`, `transferencia`, `outro` etc. para `pix | cash | credit | debit | transfer` em pedidos, ledger e orçamentos (`createQuote`).
  - Status de orçamento: `cancelled` → `rejected`; filtro `pending` em `query_quotes` corresponde a `draft` + `sent`.
- Ao restringir um enum na validação, atualize o schema publicado na mesma PR (e vice-versa). Adicione um teste unitário cobrindo cada alias anunciado.

---

## 3. Integridade Transacional, Idempotência e Matemática Financeira

### 3.1 Ordem de Verificação de Idempotência (Replay Safety)
Em operações mutáveis com `idempotencyKey` (`executeRegisterOrderPayment`, `executeUpdateOrder`, `executeAddOrderItem`, `executeUpdateDeliveryDetails`, `handleUpdateComplexOrder`, `handleCreateComplexOrder`):
1. **Sempre** verificar o recibo de idempotência (`idempotency/{key}` ou `mcpIdempotency/{key}`) **antes** de validar pré-condições que mudam após a primeira execução (`expectedVersion`, `amount > remainingAmount`, status de conclusão).
2. Nunca converter um `idempotencyKey` ausente (`undefined`) em string literal concatenada (ex.: evitar `` `${args.idempotencyKey}:delivery` `` quando `args.idempotencyKey` for vazio — validar `args.idempotencyKey ? `${args.idempotencyKey}:delivery` : ''`).
3. Confirmar mutações críticas exigindo `confirmed === true` e validando `expectedVersion` contra a versão atual do documento.

### 3.2 Consistência Atômica entre Coleções Financeiras
- **Criação de Pedido (`executeCreateOrder`, `handleCreateComplexOrder`, `commitOrderFromDraft`)**:
  - Deve gravar `paymentStatus` exclusivamente no conjunto permitido pelas regras (`'pending' | 'partial' | 'paid'`, **nunca** `'completed'`).
  - Deve gravar `paymentMethod` no formato canônico aceito pelo backend: `'pix' | 'cash' | 'credit' | 'debit' | 'transfer' | null` (**nunca** `'completed'` ou `'sinal'` como método). O MCP pode aceitar aliases localizados, mas deve normalizá-los antes de persistir.
  - Deve sincronizar atomicamente `orders/{orderId}`, `salesLedger/{orderId}` e, quando já associado, `customers/{customerId}` (`totalOrders`, `totalSpent`, `lastOrderDate`), exceto quando `isExchange === true` (permutas não alteram `salesLedger` nem `totalSpent`). `verifiedByServer` é marcador dos pedidos públicos em `catalogOrders`; não é parte do contrato atual do `salesLedger`.
- **Atualização de Preço/Itens (`executeUpdateOrder`, `executeAddOrderItem`, `handleUpdateComplexOrder`)**:
  - Deve recalcular `paidAmount`, `remainingAmount`, `paymentStatus`, atualizar `salesLedger/{orderId}` (incluindo `items`, `pricingMode`, `unitPrice`, `notes`, `tags`) e aplicar o delta exato em `customers/{customerId}.totalSpent`.
- **Exclusão de Pedidos/Permutas no Frontend**:
  - Antes de chamar `decrementCustomerStats(customerName, price)` ao excluir um registro, verificar obrigatoriamente `if (!order.isExchange)` para impedir que a exclusão de uma permuta subtraia valores de `totalOrders` e `totalSpent` do cliente.

### 3.3 Matemática Exata em Centavos para Orçamentos (`quotes`)
- `firestore.rules` (`isValidQuoteMath`) e o frontend (`validateQuoteMath`) exigem igualdade exata em centavos:
  $$\text{subtotalCents} = \sum (\text{quantity} \times \text{round}(\text{unitPrice} \times 100))$$
  $$\text{totalPriceCents} = \text{subtotalCents} - \text{discountValueCents} + \text{shippingValueCents}$$
- Ao criar orçamentos via MCP (`createQuote` em `functions/ai/repositories.js`) a partir de `totalPrice` e `quantity` cuja divisão não seja exata em centavos (ex.: `R$ 100,00` para `3` unidades):
  - Calcular `unitPriceCents = Math.ceil(totalPriceCents / quantity)` e registrar a diferença `(quantity * unitPriceCents) - totalPriceCents` como `discount` com `discountType: 'fixed'`, garantindo que o documento seja aceito em edições subsequentes pelas regras do Firestore.
  - Status inicial de orçamento deve ser `'draft'` (conjunto válido: `'draft' | 'sent' | 'approved' | 'rejected' | 'expired'`).
- Ao converter um orçamento aprovado em pedido (`executeUpdateQuoteStatus` com `convertToOrder: true`), preservar todos os itens estruturados do orçamento (`buildOrderPricingFromQuoteItems`) e gravar `orderId`/`orderNumber` de volta no orçamento.

---

## 4. Hardening de Endpoints Públicos e Sanitização de Entrada

- **`submitPublicCatalogOrder` (`functions/orders/index.js`)**:
  - **Rate Limiting**: Protegido por `publicCatalogOrderLimiter` por IP antes de tocar no Firestore.
  - **Server-Side Price Truth**: Ignorar preços enviados pelo cliente; buscar o preço oficial em `storeProducts/{productId}` e validar `submittedSubtotal` contra a soma em centavos calculada no servidor.
  - **Sanitização de Strings e Caracteres de Controle**: Remover caracteres de controle ASCII (`[\u0000-\u001F\u007F]`) de `customName`, `customTheme` e `customerNotes` antes de persistir em `catalogOrders`, evitando injeção de sequências ANSI/null-bytes em logs, comprovantes ou prompts. `customerName` e `customerPhone` não fazem parte do payload persistido por este endpoint atualmente.
- **Proteção de Origem (`validateOriginSecret`)**:
  - Endpoints HTTP expostos atrás do Cloudflare Worker devem validar o header `x-origin-secret` em produção usando comparação em tempo constante.

---

## 5. Simulação Adversarial de Falhas de Segurança (Red Team Runbook)

Sempre que alterar regras de autorização, redação MCP, regras do Firestore/Storage ou endpoints públicos, execute e expanda a suíte de simulação adversarial:

```bash
# 1. Executar a suíte de simulação de ataques (Red Team) e verificação de correções de auditoria
npx vitest run tests/unit/security-attack-simulations.test.ts tests/unit/security-audit-fixes-verification.test.ts tests/unit/backend-mcp-authorization.test.ts

# 2. Executar typecheck e lint das Cloud Functions
npm run typecheck
npm --prefix functions run lint

# 3. Executar a suíte unitária completa
npm run test:unit
```

### Como escrever um novo teste de simulação adversarial (`tests/unit/security-attack-simulations.test.ts`)
1. **Modelar o atacante**: Construir um `scope` ou `request` com privilégios mínimos ou revogados (ex.: token OAuth apenas com `team:read`, funcionário com `permissions.<module>.view = false`, payload público com caracteres de controle `\u0000\u001B`).
2. **Atestar a falha antes do patch (Red)**: Executar o teste contra o código sem correção para provar que o vetor é explorável.
3. **Aplicar a correção mínima e defensiva (Green)**: Corrigir a validação na camada correspondente mantendo compatibilidade com os fluxos legítimos.
4. **Verificar ausência de regressões**: Rodar toda a suíte unitária e de regras.

---

## 6. Guardrails de Código Seguro, CI/CD e SAST (CodeQL & Semgrep)

Para impedir a reintrodução de vulnerabilidades já mitigadas em auditorias SAST (CodeQL e Semgrep), toda alteração de código, script ou workflow deve seguir estes padrões obrigatórios:

### 6.1 Validação de URL e Hostname (nunca usar `.includes()` em URLs)
- **Proibido:** validar domínios com `url.includes('firebasestorage.googleapis.com')`, `url.includes('cloudfunctions.net')` ou `url.includes('run.app')` (vulnerável a `https://evil.com/firebasestorage.googleapis.com` ou `https://cloudfunctions.net.evil.com`).
- **Obrigatório:** parsear com `new URL(rawUrl)` e validar `parsed.hostname` (igualdade exata ou sufixo com ponto `.endsWith('.cloudfunctions.net')`) e `parsed.protocol` (`https:` / `http:`).

### 6.2 Prevenção de XSS no DOM (`href`, `<img src>` e sanitização)
- **Links externos (`href`) e previews de imagem (`<img src>`):** usar obrigatoriamente `sanitizeExternalHttpUrl` e `sanitizeImagePreviewUrl` de `src/app/utils/safeMediaUrl.ts`, aceitando apenas `https:`, `http:`, `blob:` ou `data:image/(png|jpeg|jpg|webp|gif|avif);base64,...` e bloqueando `javascript:`, `data:text/html` e `data:image/svg+xml`.
- **Sanitização parcial proibida:** nunca usar `.replace(/<.*?>/, '')` para limpar strings com `<...>` (alerta `js/incomplete-multi-character-sanitization`). Para extrair nome/endereço de cabeçalhos de e-mail (`Nome <email>`), usar parsing explícito por índice (`indexOf('<')`).

### 6.3 Criptografia (AES-GCM) e Aleatoriedade Segura
- **AES-GCM no backend (Node.js):** especificar sempre `{ authTagLength: 16 }` em `crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 })` e validar o tamanho do IV e da auth tag antes de decifrar.
- **Aleatoriedade:** nunca usar `Math.random()` para IDs, tokens ou chaves de idempotência. Usar `secureRandomId` / `secureRandomNumber` de `src/app/utils/random.ts` (fail-closed sobre Web Crypto API, sem fallback para `Math.random()`).
- **Hashes não-senha:** SHA-256 é permitido apenas para tokens criptográficos de alta entropia (ex.: lookup de OAuth access token) ou chaves de idempotência — nunca para senhas de usuário.

### 6.4 Segredos e PII no Navegador (`sessionStorage` / `localStorage`)
- **Chaves de API one-time (MCP):** nunca gravar `rawKey` nem `keyId` recém-criado em `sessionStorage` ou `localStorage` em texto claro; manter exclusivamente em memória volátil da aba (`Map` em escopo de módulo, conforme `src/app/utils/mcpRawKeySessionStorage.ts`).
- **Buffers temporários de retry:** antes de gravar payloads de formulário no `sessionStorage` (`src/services/pendingOrderOperations.ts`), remover explicitamente campos PII sensíveis (`birthDate`, `birthday`, `birthdayCustomer`, `cpf`, `cnpj`, `document`, `password`, `token`).

### 6.5 Logs sem Vazamento de Credenciais (`clear-text-logging`)
- Nunca despejar objetos de erro brutos de requisições autenticadas (`console.error(err)`) nem referenciar variáveis de segredo (`API_TOKEN`, `FIREBASE_SERVICE_ACCOUNT`, etc.) em expressões passadas a `console.log`/`console.error`.
- Em scripts CLI e migrações (`scripts/*.mjs`), registrar apenas códigos HTTP numéricos (`err.statusCode`) e nomes de recursos/buckets validados por regex estrita (ex.: `sanitizeBucketName`).

### 6.6 CORS em Endpoints HTTP
- Nunca refletir `req.headers.origin` diretamente em `Access-Control-Allow-Origin`. Sempre resolver a origem canônica (`new URL(origin).origin`) via função de allowlist estrita de protocolo + hostname (ex.: `resolveAllowedCorsOrigin` em `functions/media/galleryCore.js`) e definir `Vary: Origin`.

### 6.7 Hardening de Workflows GitHub Actions (`.github/workflows/*.yml`)
- **Zero `run-shell-injection`:** nunca interpolar `${{ github.* }}` ou `${{ inputs.* }}` dentro de blocos `run:`. Passar sempre via `env:` do step e referenciar entre aspas duplas (`"$VAR"`).
- **Zero `secrets: inherit`:** nunca usar `secrets: inherit` ao invocar workflows reutilizáveis. Declarar explicitamente `on.workflow_call.secrets` (com `required: false` para opcionais/fallbacks, sem duplicatas case-insensitive) no workflow chamado e repassar apenas os secrets mínimos necessários no chamador.
- **Menor privilégio de `GITHUB_TOKEN`:** todo workflow deve declarar bloco `permissions:` explícito (mínimo `contents: read`).

### 6.8 Higiene de Supply Chain e Lockfiles
- Manter apenas os lockfiles oficiais do gerenciador usado no repositório (`package-lock.json` na raiz e em `functions/`). Não commitar lockfiles órfãos de outros gerenciadores (ex.: `bun.lock`) para evitar alertas falsos de Supply Chain.
