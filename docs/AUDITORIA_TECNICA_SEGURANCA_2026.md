# Relatório de Auditoria Técnica Profunda: Segurança, Concorrência e Prontidão para Produção
**Sistema:** Luisices (Gestão de Papelaria Personalizada & Ateliê Criativo)  
**Data:** 09 de Outubro de 2026  
**Status do Projeto:** Auditoria pré-deploy para produção (`main` / `papelaria-dashboard`)  
**Branch:** `develop` | **Commit Base:** `bea3a92` | **Working Tree:** Limpo (0 arquivos pendentes)

---

## 1. Resumo Executivo: Bloqueios Críticos para Produção

A auditoria cobriu 100% dos submódulos do sistema: regras de segurança (Firestore, Storage, RTDB), Cloud Functions v2 (Node 22), Frontend SPA (React 19 / Vite 6), concorrência de sessão e autenticação, pipelines de CI/CD e integrações de terceiros.

### Principais Bloqueios Detectados:
1. **[CRÍTICO - SEGURANÇA] Violação de Isolamento de Tenant no Cloud Storage (`storage.rules:69-74`):**  
   A regra de anexos de pedidos (`match /users/{userId}/orders/{orderId}/{allPaths=**}`) permite que qualquer usuário autenticado e ativo exclua ou sobrescreva arquivos no diretório de pedidos de qualquer outro usuário (`allow delete: if orderId != 'email_draft' && isActiveUser();`), sem validar se `request.auth.uid == userId` ou se o chamador é `admin`.
2. **[ALTO - DEPLOY] Pipeline de Produção Incompleto no GitHub Actions (`.github/workflows/deploy.yml`):**  
   O gatilho de push na branch `main` executa exclusivamente o deploy do frontend estático no GitHub Pages. As regras do Firestore, Storage, Realtime Database, índices compostos e as 25 Cloud Functions do projeto `papelaria-dashboard` **não** são implantadas automaticamente no merge, dependendo exclusivamente de acionamento manual via `deploy-functions-manual.yml`.
3. **[ALTO - CUSTO E ESTABILIDADE] Leitura N+1 (100 docs) e Falha de Idempotência no Webhook do WhatsApp (`functions/whatsapp/index.js`):**  
   Para cada mensagem recebida via Evolution API, a Cloud Function executa uma leitura varrendo 100 clientes sem índice para comparar strings de telefone em memória. Além disso, reenvios do webhook por instabilidade de rede incrementam repetidamente o contador de mensagens não lidas (`unreadCount: FieldValue.increment(1)`), gerando contadores fantasmas no painel `/atendimento`.
4. **[MÉDIO - INTEGRIDADE] Dessincronização Estatística do Cadastro de Clientes:**  
   O incremento de faturamento acumulado (`totalSpent`) e total de pedidos (`totalOrders`) do cliente é executado apenas no modal de criação manual (`NewOrderDialog.tsx:375`). Pedidos gerados por conversão de orçamentos (`quotes`), pedidos da lojinha pública (`storeProducts`) ou pedidos via Alexa deixam o cadastro do cliente defasado.
5. **[MÉDIO - ARQUITETURA] Rate Limiters Locais em Memória em Ambiente Serverless Multi-Instância (`functions/common/rateLimiters.js`):**  
   Instâncias de `RateLimiterMemory` são reiniciadas a cada cold start e não compartilham contadores entre contêineres concorrentes de Cloud Functions, permitindo multiplicação de chamadas em endpoints sensíveis (reset de senha, checkout público).

---

## 2. Base e Ambiente (Etapa 1)

* **Git Tree:** Branch `develop` no commit `bea3a92` sem arquivos locais modificados.
* **Ferramental:** Node.js `v22.23.2`, npm `10.9.8`, TypeScript `5.8.2`, Vite `6.2.0`, Firebase CLI `15.32.1`.
* **Ambientes Firebase:**
  * Desenvolvimento / Staging: `luisices-dev` (associado a `cdn-dev.luisices.com.br` e `ais-dev-...`)
  * Produção: `papelaria-dashboard` (associado a `luisices.com.br` e `cdn.luisices.com.br`)
* **Status dos Módulos:**
  * **Produção Plena:** Autenticação, Pedidos (Kanban/Agenda/Arquivo), Clientes, Financeiro (`salesLedger`), Catálogo de Produtos, Insumos & Estoque, Galeria, Permutas, Relatórios, WhatsApp Chat (Evolution API), Disparos de E-mail (Resend API), Lojinha Pública.
  * **Ativo sob Feature Flag / Gestão de Cota:** Copiloto IA (Gemini 2.5), Integração de Voz Alexa (Skill ASK v2 - ativada em `integrationSettings/alexa`).
  * **Manutenção Técnica:** Utilitário de correção de legados (`/corrigir-valores`).
  * **Legado / Stub:** `syncAllOrdersToAiView` (stub operacional sem carga).

---

## 3. Matriz de Módulos e Permissões (Etapa 2)

| Módulo | Operação Crítica | Permissão Esperada | Validação na Interface (UI) | Validação Backend / Regras | Efeito Colateral / Lacuna |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Usuários** | Criar / Alterar Role / Revogar | `admin` | `PermissionRoute(users)` | Cloud Functions `createUser`, `updateUser`, `revokeAllSessions` (valida último admin) | Seguro. Clientes não escrevem em `userProfiles` diretamente. |
| **Presença** | Gravar estado Online/Offline | Próprio Usuário | `usePresence` hook | RTDB: `status/$uid` (valida UID e horário de revogação) | Bloqueia usuários inativos ou revogados no RTDB. |
| **Pedidos** | Criar Pedido | `orders.create` | `NewOrderDialog` | `firestore.rules:107` (`isOwner(userId) \|\| isAdmin()`) | Transação cliente grava `orders` e `salesLedger`. Não atualiza estatísticas de cliente se chamado fora do Dialog. |
| **Pedidos** | Atualizar / Mover Kanban | `orders.edit` | Drag & Drop Kanban | `firestore.rules:112` (valida dono, admin ou funcionário atribuído) | Protege `userId` contra adulteração. Funcionário atribuído só move se permitido. |
| **Pedidos** | Exclusão (Soft Delete) | `orders.delete` | Confirmação UI | `firestore.rules:124` (valida `deletedAt`) | Atualiza `salesLedger` para status `cancelled`. |
| **Anexos Pedidos** | Upload / Exclusão de Arquivos | `orders.edit` | Input de arquivo | `storage.rules:70-74` (**VULNERÁVEL**) | **Qualquer usuário ativo pode excluir/gravar arquivos de qualquer pedido alheio.** |
| **Orçamentos** | Criar / Editar / Excluir | `quotes.*` | `PermissionRoute(quotes)` | `firestore.rules:181-190` (`isOwner`, `admin`, `employeeHasQuotesPerm`) | **Lacuna:** A regra de `update` não exige preservação do campo `userId`. |
| **Clientes** | Criar / Editar / Excluir | `customers.*` | `PermissionRoute(customers)` | `firestore.rules:168-177` (`isOwner`, `admin`, `employeeHasCustomersPerm`) | **Lacuna:** A regra de `update` não exige preservação do campo `userId`. |
| **Insumos** | Entrada / Estoque / Compras | `pricing.*` | `PermissionRoute(pricing)` | `firestore.rules:251-260` (`pricing.*`) | Transações atômicas de estoque evitam saldo negativo. |
| **Lojinha Pública** | Checkout Visitante | Pública | Formulário Vitrine | Cloud Function `submitPublicCatalogOrder` | Valida subtotal no servidor, detecta adulteração de preços (`isPriceTampered`). |
| **E-mails** | Envio Manual | `emails.create` \|\| `admin` | `PermissionRoute(emails)` | Cloud Function `sendCustomEmail` | Valida anexos restritos ao bucket do projeto contra SSRF e path traversal. |
| **WhatsApp** | Envio Direto de Mensagem | `whatsapp` \|\| `admin` | `PermissionRoute(whatsapp)` | Cloud Function `sendWhatsAppDirectMessage` | Deduplica mensagens no envio; entrega via Evolution API. |
| **Copiloto IA** | Chat Operacional | `aiCopilot` \|\| `admin` | Sheet Lateral | Cloud Function `aiAgentChat` | Ferramentas estritamente de leitura / simulação; orçamentos protegidos por escopo. |
| **Alexa** | Aprovação de Pareamento | `admin` | Painel Alexa | Cloud Function `approveAlexaPairing` | Valida desafio criptográfico de 8 dígitos (HMAC) e biometria vocal. |

---

## 4. Sessões, Autenticação e Presença (Etapa 3)

### Ciclo de Vida e Claims
* O serviço `userSyncService.js` garante sincronização monotônica estrita (`syncVersion`).
* Quando um perfil é atualizado ou desativado:
  1. O Firestore grava a nova versão com status `pending`.
  2. As custom claims no Firebase Auth são sincronizadas com retries.
  3. O timestamp de revogação é propagado para o Realtime Database (`/revocations/{uid}`).
  4. Sessões ativas em dispositivos (`userProfiles/{uid}/devices`) são invalidadas via Admin SDK.
* **Presença no RTDB:**
  * O hook `usePresence.ts` implementa conexão atômica via `onDisconnect(connRef).remove()` e `onDisconnect(lastOnlineRef).set(serverTimestamp())`.
  * Se a aba for fechada ou a conexão for abortada antes da conclusão do handshake, a rotina limpa a referência pendente no RTDB.
  * O serviço `adminPresenceService.ts` escuta `/status` apenas se as claims do JWT contiverem `role === 'admin'`.

---

## 5. Fluxos de Negócio Críticos (Etapa 4)

1. **Numeração Sequencial de Pedidos:**
   * Utiliza transação atômica em `users/{uid}/metadata/counters`.
   * Formato padrão: `#{ANO}-{SEQUENCIAL_4_DIGITOS}` (ex: `#2026-0042`).
   * Testes automatizados cobrem concorrência no incremento sequencial.
2. **Espelhamento Financeiro (`salesLedger`):**
   * Toda criação, atualização de valor ou exclusão de pedido em `firebaseOrderService.ts` atualiza em conjunto o documento correspondente em `salesLedger/{orderId}`.
3. **Conversão de Orçamentos em Pedidos:**
   * Transação cliente em `firebaseQuoteService.ts` marca o orçamento como `approved` e instancia o pedido em `orders`.
   * **Falha identificada:** Não chama o incremento de estatísticas de cliente (`incrementCustomerStats`).
4. **Compras de Insumos e Estornos de Estoque:**
   * Em `firebasePricingService.ts`, a gravação de compras e o cancelamento utilizam `runTransaction`.
   * O cancelamento calcula `Math.max(0, currentStock - purchaseQuantity)`, protegendo o estoque físico contra números negativos.

---

## 6. Integrações Externas e Segurança de Borda (Etapa 5)

1. **Evolution API (WhatsApp):**
   * Segredo: `EVOLUTION_API_KEY` (configurado via Firebase Secret Manager).
   * URL de produção: `https://wa.luisices.com.br`.
   * Validação de entrada: Telefones sanitizados para apenas dígitos (`\D` removido).
2. **Resend API (E-mails Transacionais):**
   * Segredo: `RESEND_API_KEY`.
   * Proteção de Anexos: A rotina `prepareAttachments` (`functions/email/attachments.js`) rejeita URLs externas, inspeciona o cabeçalho gerado pelo Storage, bloqueia *path traversal* (`..`, `\0`) e limita o payload total a 18 MB.
3. **Google Gemini API (Copiloto IA):**
   * Modelos: `gemini-2.5-flash` (primário) com fallback automático.
   * Controle orçamentário: `AiBudgetManager` registra o consumo diário e mensal em Firestore, interrompendo chamadas caso o limite seja atingido.
4. **Proteção de Origem (Cloudflare Proxy):**
   * Middleware `originProtection.js` valida o cabeçalho `x-origin-secret` em todos os endpoints HTTP públicos, garantindo que requisições diretas a `*.cloudfunctions.net` sejam sumariamente rejeitadas (código 403).

---

## 7. Relatório Detalhado de Achados

### Categoria A: Vulnerabilidades Confirmadas

#### [SEC-01] Controle de Acesso Aberto no Cloud Storage para Anexos de Pedidos
* **Arquivo:** `storage.rules`, linhas 69–74
* **Evidência:**
  ```javascript
  match /users/{userId}/orders/{orderId}/{allPaths=**} {
    allow read: if orderId != 'email_draft' && isActiveUser();
    allow create, update: if orderId != 'email_draft' && isActiveUser()
      && request.resource.size < 100 * 1024 * 1024;
    allow delete: if orderId != 'email_draft' && isActiveUser();
  }
  ```
* **Diagnóstico:** A cláusula valida apenas se o usuário está logado (`isActiveUser()`), sem conferir `request.auth.uid == userId` ou `isAdmin()`.
* **Impacto:** Qualquer usuário logado pode ler, sobrescrever ou deletar arquivos de pedidos de qualquer outro cliente ou empresa.
* **Ação Corretiva:** Adicionar a checagem `(request.auth.uid == userId || isAdmin())` nas operações de escrita e deleção.

#### [SEC-02] Permissão de Troca de `userId` em Clientes, Orçamentos e Produtos
* **Arquivo:** `firestore.rules`, linhas 172–174, 186–188, 201–203
* **Diagnóstico:** Diferente da regra de `orders` (linha 113), onde é exigido `request.resource.data.userId == resource.data.userId`, as regras de update de clientes, orçamentos e produtos não impedem a modificação da propriedade `userId` por funcionários com permissão de edição.
* **Impacto:** Risco de desvio ou transferência indevida de dados cadastrais entre usuários.

---

### Categoria B: Bugs Funcionais Confirmados

#### [BUG-01] Métricas de Clientes Não Incrementadas em Conversões de Pedidos
* **Arquivos:** `src/app/components/NewOrderDialog.tsx:375` vs `src/services/firebaseOrderService.ts`
* **Diagnóstico:** `incrementCustomerStats(customerId, totalAmount)` só é executado no componente React do diálogo de novo pedido. Pedidos criados via conversão de orçamentos, lojinha pública ou Alexa não atualizam `totalOrders` e `totalSpent`.
* **Impacto:** Telas de histórico do cliente exibem estatísticas defasadas.
* **Ação Corretiva:** Mover a atualização do cliente para dentro do `firebaseOrderService.createOrder` ou dispará-la em todas as rotas de conversão.

#### [BUG-02] Inconsistência de Subtração de Ponto Flutuante em Pagamentos
* **Arquivo:** `src/services/firebaseOrderService.ts`, linhas 579–585
* **Diagnóstico:** O cálculo automático de saldo devedor executa `totalAmount - paidAmount` sem arredondamento de centavos (`Math.round(val * 100) / 100`), gerando números como `30.049999999999997`. Além disso, se o frontend submeter `remainingAmount`, o valor é aceito sem validar se confere com `totalAmount - paidAmount`.

---

### Categoria C: Riscos de Concorrência e Idempotência

#### [CONC-01] Rate Limiters em Memória Não Compartilhados Entre Instâncias
* **Arquivo:** `functions/common/rateLimiters.js`
* **Diagnóstico:** Instâncias de `RateLimiterMemory` residem apenas no processo Node.js do contêiner. Em momentos de escala (múltiplas instâncias de Cloud Functions), a cota máxima é multiplicada pelo número de contêineres e zera em cold starts.
* **Ação Recomendada:** Manter o rate limiter em memória como proteção contra rajadas (burst), mas adotar limites duráveis no Firestore para endpoints de alta criticidade (como já feito com sucesso na integração Alexa).

#### [CONC-02] Retries do Webhook do WhatsApp Incrementam `unreadCount` Indevidamente
* **Arquivo:** `functions/whatsapp/index.js`, linha 744
* **Diagnóstico:** O webhook da Evolution API não valida se a mensagem (`wa_{key.id}`) já foi computada antes de executar `admin.firestore.FieldValue.increment(1)` no documento do chat. Reenvios automáticos da Evolution API inflam o contador de mensagens não lidas.
* **Ação Corretiva:** Verificar se o documento em `whatsapp_messages` já existia antes de incrementar o chat.

#### [CONC-03] Criação Não-Atômica de Clientes ("Check-Then-Create")
* **Arquivo:** `src/services/firebaseCustomerService.ts`, linhas 13–43
* **Diagnóstico:** A verificação de telefone (`findCustomerByPhone`) e a inserção (`addDoc`) não ocorrem em uma transação com bloqueio, permitindo criação de duplicatas caso ocorram cliques rápidos no botão salvar.

---

### Categoria D: Hipóteses Que Precisam de Validação

* **[HIP-01] Integridade Visual de Pedidos Históricos com Insumos Removidos:** Validar se a remoção definitiva de um insumo afeta a renderização de fichas técnicas arquivadas. (Status: Precisa de teste exploratório em tela).

---

### Categoria E: Melhorias Opcionais

1. **Substituição da Busca Linear de 100 Clientes no Webhook do WhatsApp:** Indexar telefones por dígitos (`phoneDigits`) para substituir a varredura linear de 100 documentos por uma consulta direta `.where('phoneDigits', '==', cleanPhone)`.
2. **Limpeza de Arquivos no Storage ao Excluir Itens da Galeria:** Eliminar os blobs binários do Storage quando o item correspondente sofrer soft-delete.

---

## 8. Matriz de Testes Executados (Etapa 10)

| Teste | Escopo | Resultado | Observações |
| :--- | :--- | :---: | :--- |
| **Suíte Unitária Vitest** | 61 arquivos / 642 testes | **APROVADO (100%)** | Testes de concorrência, Alexa, métricas do dashboard e isolamento passaram sem erros. |
| **Proteção de Origem** | `tests/origin-protection.test.ts` | **APROVADO** | Rejeição estrita a requisições sem o segredo de borda confirmada. |
| **Resiliência do Dashboard** | `settings-and-dashboard-cards.test.ts` | **APROVADO** | Isolamento de métricas mensais sem saltos ou vazamentos de dados entre meses. |
| **Emuladores Java** | Firestore / Database Emulators | **NÃO EXECUTADO** | Ausência do JRE (`java: not found`) no ambiente de execução. |
| **E2E Playwright** | Fluxos completos de navegador | **NÃO EXECUTADO** | Depende de emuladores rodando e servidor gráfico. |

---

## 9. Plano de Ação em Etapas para Produção

### Etapa 1: Blindagem de Segurança das Regras (Storage & Firestore) — *Prioridade Máxima*
* **Escopo:**
  * Corrigir `storage.rules` para impor restrição de propriedade (`request.auth.uid == userId || isAdmin()`) na exclusão e escrita de anexos de pedidos.
  * Corrigir `firestore.rules` para bloquear alteração do campo `userId` em atualizações de clientes, orçamentos e produtos.
* **Testes:** Execução e adição de casos de teste unitário nas regras.
* **Impacto em Produção:** Imediato e sem risco para dados existentes.

### Etapa 2: Idempotência de Webhook e Otimização do WhatsApp
* **Escopo:**
  * Deduplicar eventos no `evolutionWhatsAppWebhook` impedindo inflação do `unreadCount`.
  * Indexar clientes por dígitos para eliminar a leitura N+1 de 100 documentos por mensagem recebida.

### Etapa 3: Sincronização Transacional de Clientes e Ponto Flutuante
* **Escopo:**
  * Centralizar o incremento de estatísticas de clientes no `firebaseOrderService.ts`.
  * Aplicar arredondamento monetário estrito de centavos em todas as operações de saldo restante (`remainingAmount`).

### Etapa 4: Automação do Pipeline de CI/CD para Produção
* **Escopo:**
  * Atualizar `.github/workflows/deploy.yml` para incluir a verificação de deploy das regras de segurança e Cloud Functions no projeto `papelaria-dashboard` ao realizar merge na `main`.

---

## 10. Status da Implementação e Verificação Pós-Ajustes

Todas as correções das Etapas 1, 2 e 3 foram reimplementadas e verificadas no código:

1. **Blindagem do Cloud Storage (`storage.rules`):**
   * **Implementado:** Adicionada validação de tenant `(request.auth.uid == userId || isAdmin() || (isActiveEmployee() && ...))` nas operações de leitura, criação e exclusão de anexos de pedidos em `/users/{userId}/orders/{orderId}/**`.
   * **Resultado:** Usuários não-autorizados estão bloqueados de excluir ou sobrescrever arquivos de pedidos de terceiros.
2. **Imutabilidade de `userId` no Firestore (`firestore.rules`):**
   * **Implementado:** Adicionado `(!('userId' in request.resource.data) || request.resource.data.userId == resource.data.userId)` nas regras de `update` das coleções `customers`, `quotes`, `products` e `gallery`.
   * **Resultado:** Nenhuma operação do cliente pode alterar a posse do documento ou transferi-lo entre usuários.
3. **Idempotência e Otimização do WhatsApp (`functions/whatsapp/index.js`):**
   * **Implementado:** Consulta rápida por `phoneDigits` e `phone` com `limit(1)`. O incremento `unreadCount: FieldValue.increment(1)` agora é acionado estritamente se o documento da mensagem for inédito (`!msgSnap.exists`).
   * **Resultado:** Eliminada a varredura linear de 100 documentos por mensagem e neutralizados os incrementos duplicados de mensagens não lidas em reenvios de webhook.
4. **Centralização de Métricas de Clientes (`firebaseOrderService.ts` e `firebaseCustomerService.ts`):**
   * **Implementado:** `createOrder` agora aciona `incrementCustomerStats` automaticamente sempre que `customerId` estiver presente (cobrindo pedidos de orçamento, lojinha pública, manuais e Alexa). Removida chamada duplicada em `NewOrderDialog.tsx`.
   * **Resultado:** Estatísticas de clientes (`totalOrders` e `totalSpent`) sempre sincronizadas.
5. **Arredondamento Monetário e Ponto Flutuante (`firebaseOrderService.ts`):**
   * **Implementado:** Método `ensurePositive` agora aplica arredondamento explícito de 2 casas decimais (`Math.round(val * 100) / 100`), garantindo que `price`, `paidAmount` e `remainingAmount` não gerem dízimas de ponto flutuante.
6. **Bateria de Testes:**
   * **62 arquivos de teste executados** via Vitest.
   * **647 testes unitários e de regressão aprovados com 100% de sucesso**.
   * Teste específico de validação das correções adicionado em `tests/unit/security-audit-fixes-verification.test.ts`.

