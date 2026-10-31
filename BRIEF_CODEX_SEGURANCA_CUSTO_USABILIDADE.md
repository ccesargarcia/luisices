# Brief para o Codex: Segurança, Custo e Usabilidade

Repositório: `ccesargarcia/luisices` (Firebase + Vite/React + Cloud Functions + Cloudflare Workers).
Branch de trabalho: criar a partir de `develop` (`develop` e `main` estão alinhadas na v1.0.5).

## Regras gerais para o Codex

- Trabalhe **uma tarefa por vez**, um commit (e idealmente um PR para `develop`) por tarefa.
- Não altere comportamento funcional não citado. Não faça refactors oportunistas.
- Nunca commite segredos, `.env`, logs ou o `Screenshot_*.jpg` da raiz.
- Antes de cada PR, rode: `npm run typecheck`, `npm test`, `npm run lint:functions`. Para regras: `npm run test:integration`. Para fluxos críticos: `npm run test:critical`.
- Escreva mensagens de commit em estilo convencional (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`).
- Atualize `CHANGELOG.md` e a documentação em `docs/` quando a mudança afetar deploy, segurança ou operação.
- Se algo for ambíguo, pare e pergunte antes de implementar.

## Ordem sugerida

| # | Tarefa | Área | Risco | Esforço |
|---|--------|------|-------|---------|
| 1 | Atualizar dependências vulneráveis (vite, functions) | Segurança | Baixo | Baixo |
| 2 | CSP em modo Report-Only + limpar `X-XSS-Protection` | Segurança | Baixo | Médio |
| 3 | Restringir CORS dos callables | Segurança | Médio | Médio |
| 4 | Allowlist de tipos de imagem no Storage (bloquear SVG) | Segurança | Baixo | Baixo |
| 5 | Firebase App Check (começando por pedido público) | Segurança | Médio | Alto |
| 6 | Cotas e dimensionamento das funções de IA | Custo | Baixo | Médio |
| 7 | Reduzir leituras `firestore.get()` nas rules via custom claims | Custo | Alto | Alto |
| 8 | Cache do catálogo público e TTL de coleções de log | Custo | Baixo | Médio |
| 9 | Alertas de orçamento (documentação/runbook) | Custo | Baixo | Baixo |
| 10 | Auditoria de usabilidade (a11y, loading/erro, rate limit) | Usabilidade | Baixo | Médio |

---

## Tarefa 1: Dependências vulneráveis

**Problema**
- `npm audit --omit=dev` na raiz: 1 high em `vite <= 6.4.3` (advisories GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22 e `launch-editor`).
- `functions/`: 5 vulnerabilidades (2 moderate, 3 high), incluindo `ip-address`/`sprintf-js` via `geoip-lite`. O `npm audit fix` sugere `geoip-lite@2.0.3`, que é breaking.
- Já existe a branch do Dependabot `dependabot/npm_and_yarn/vite-6.4.4`.

**O que fazer**
1. Aplicar `vite` ≥ 6.4.4 (via merge/cherry-pick da branch do Dependabot ou `npm install vite@^6.4.4`). Validar `npm run build` e `npm run dev`.
2. Em `functions/`, rodar `npm audit` e identificar onde `geoip-lite` é usado (`grep -rn geoip functions --include=*.js --exclude-dir=node_modules`). Avaliar atualizar para a versão sugerida e testar o fluxo que o usa; se o uso for trivial, considerar alternativa. Não use `npm audit fix --force` às cegas.
3. Registrar o resultado final do `npm audit` no PR.

**Aceite**
- `npm audit --omit=dev` sem high/critical na raiz; em `functions/`, sem high ou com justificativa documentada.
- Build, testes unitários e `lint:functions` verdes.

---

## Tarefa 2: Content-Security-Policy e headers

**Contexto**
`firebase.json` (seção `headers`, ~linhas 26-70) já define HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy e COOP. **Não há `Content-Security-Policy`.** `X-XSS-Protection: 1; mode=block` é obsoleto.

**O que fazer**
1. Levantar as origens realmente usadas pelo app: Firebase Auth/Firestore/Storage/Functions, Google Fonts (se houver), Cloudflare CDN/API workers (`cloudflare/`), Resend/Evolution (apenas backend, não entram), reCAPTCHA (se a tarefa 5 for feita), imagens `data:`/`blob:`.
2. Adicionar `Content-Security-Policy-Report-Only` primeiro, com `default-src 'self'`, `script-src` sem `unsafe-eval` se possível, `connect-src` com as origens levantadas, `img-src 'self' data: blob: https://firebasestorage.googleapis.com <CDN>`, `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`.
3. Trocar `X-XSS-Protection` para `0` (ou remover).
4. Documentar como promover de Report-Only para enforcing após validar no console do navegador (ex.: rodando `npm run test:e2e:emulator` e verificando violações).

**Aceite**
- Nenhuma violação de CSP nos fluxos: login, dashboard, pedidos, catálogo público, upload de imagem.
- Documentação em `docs/` explicando a promoção para enforcing.

---

## Tarefa 3: Restringir CORS dos callables

**Contexto**
Todos os `onCall` usam `cors: true` (ex.: `functions/ai/callables.js:35`, `functions/email/index.js:48`, `functions/mcp/callables.js:85`, `functions/orders/index.js:279`, `functions/mcp/endpoint.js:228`).

**O que fazer**
1. Criar uma constante compartilhada em `functions/common/` (ex.: `allowedOrigins.js`) exportando a lista de origens: domínio de produção (ver `CNAME`), domínio de dev/hosting do Firebase, `localhost:3000` apenas fora de produção.
2. Substituir `cors: true` por essa lista nos callables de usuário. **Não** alterar endpoints que precisam aceitar chamadas externas por desenho (webhooks Resend, Alexa, endpoint MCP consumido por clientes de IA): para esses, manter e documentar o motivo.
3. Adicionar teste unitário simples garantindo que a lista não contém `*` e inclui produção/dev.

**Aceite**
- App em produção/dev continua chamando os callables normalmente.
- Origem não listada recebe erro CORS.

---

## Tarefa 4: Allowlist de imagens no Storage

**Contexto**
`storage.rules` usa `request.resource.contentType.matches('image/.*')` (inclui `image/svg+xml`, que pode conter script) em `store/{folder}/{fileName}` (leitura pública) e em pastas de usuário.

**O que fazer**
1. Trocar por `matches('image/(png|jpeg|webp|gif|avif)')` (ajustar conforme o que o app realmente envia; verificar `src/` para o fluxo de upload e o `optimize-login-bg`).
2. Garantir que o tamanho máximo continua validado em todas as regras de escrita.
3. Adicionar/ajustar testes em `tests/` das regras de Storage (`npm run test:integration`) cobrindo: PNG permitido, SVG negado.

**Aceite**
- Upload de logo/banner/produto continua funcionando; SVG é rejeitado.

---

## Tarefa 5: Firebase App Check

**Contexto**
Nenhuma referência a App Check no repositório. Callables públicos ou de alto custo ficam sujeitos a abuso por bots (rate limit por IP existe, mas é contornável).

**O que fazer (incremental)**
1. Fase A: inicializar App Check no cliente (`src/lib/` onde o Firebase é inicializado) com reCAPTCHA Enterprise (ou v3), com *debug token* para dev/emulador e flag de ambiente (`VITE_APPCHECK_SITE_KEY`; adicionar em `.env.example`). Em `VITE_USE_FIREBASE_EMULATOR=true`, não exigir.
2. Fase B: ativar `enforceAppCheck: true` primeiro em `submitPublicCatalogOrder` (`functions/orders/index.js:279`) e nos callables de IA/e-mail. **Rodar em modo monitoramento (métricas no console) antes de enforcar.**
3. Não habilitar enforcement em Firestore/Storage nesta tarefa.
4. Ajustar testes E2E/emulador para não quebrar e documentar o procedimento em `docs/`.

**Aceite**
- Pedido público funciona com token válido e falha sem token em produção/dev (com enforcement).
- Dev local e testes E2E seguem verdes.

---

## Tarefa 6: Custo da IA (Gemini)

**Contexto**
`functions/ai/callables.js`: `aiAgentChat` usa `memory: '1GiB'`, `timeoutSeconds: 120`, `maxInstances: 10`; outras variantes usam `1GiB`/`maxInstances: 5`. Existe `getAiUsage` (cota/consumo).

**O que fazer**
1. Verificar em `functions/ai/` se há cota por usuário e teto global **realmente aplicados** antes de chamar o modelo (não apenas exibidos). Se não, implementar: limite diário/mensal por usuário e teto global configurável em Firestore/config, retornando `resource-exhausted`.
2. Limitar tamanho de entrada (tamanho de mensagem, histórico, nº de anexos) e `maxOutputTokens`.
3. Avaliar reduzir memória para `512MiB` e `maxInstances` para um valor menor (ex.: 3-5) usando métricas reais; se não houver dados, deixar como `TODO` documentado em vez de chutar.
4. Registrar tokens consumidos por chamada para auditoria de custo.

**Aceite**
- Testes unitários cobrindo: cota excedida, entrada grande rejeitada.
- Nenhuma regressão nos testes existentes de IA.

---

## Tarefa 7: Reduzir leituras nas rules (custom claims)

**Contexto**
`storage.rules` (linhas 5-40) e `firestore.rules` chamam `firestore.get(.../userProfiles/$(uid))` repetidamente em `isActiveUser()`, `isAdmin()`, `getEmployeePermissions()`. Cada avaliação cobra leituras.

**Atenção:** esta é a mudança de maior risco. **Só começar após um design curto aprovado por mim.**

**Proposta de design a produzir primeiro (sem implementar)**
1. Como `role`, `active` e `permissions` poderiam virar custom claims, mantendo revogação imediata (hoje há `tokensValidAfterTime`).
2. Estratégia de sincronização (Cloud Function ao alterar `userProfiles`) e de fallback.
3. Plano de migração em fases e rollback.
4. Impacto em testes de regras (`tests/`, `firebase.test.json`).

Entregar o design em `docs/` e aguardar aprovação.

---

## Tarefa 8: Cache de leituras públicas e TTL

**O que fazer**
1. Mapear como o catálogo público lê `storeProducts`/`storeSettings` (regras permitem `read: if true`, `firestore.rules` ~757-768) e se passa pelo `cloudflare/api-worker`. Se há leitura direta pelo cliente, propor/implementar cache no worker (`Cache-Control`, `stale-while-revalidate`) para reduzir leituras do Firestore.
2. Identificar coleções de logs/auditoria/rate limit (MCP audit, rate limiters, e-mails enviados) e configurar **TTL policies** do Firestore (campo `expiresAt`), documentando em `firestore.indexes.json`/docs o que for configurado.
3. Confirmar que `functions/email/cleanup.js` (timeout 540s) já cobre parte da retenção e evitar duplicar.

**Aceite**
- Menos leituras diretas do catálogo (evidência via teste/medida local).
- Retenção documentada.

---

## Tarefa 9: Alertas de orçamento

Criar `docs/` runbook (sem segredos) com: como criar budget alerts no GCP (50/80/100%), alertas de erro/latência das functions, monitoramento de uso do Gemini e Resend, e checklist mensal de custo. Apenas documentação.

---

## Tarefa 10: Usabilidade

**O que fazer**
1. Rodar os testes existentes: `npm run test:audit`, `npm run test:responsive`, `npm run test:store-checkout`. Listar falhas.
2. Revisar o catálogo público e o checkout: estados de loading, erro de rede, carrinho vazio, mensagem amigável quando o rate limit bloquear um pedido (`functions/orders/index.js` linhas ~30-40: tratar o erro e exibir "tente novamente em alguns minutos" no cliente).
3. Acessibilidade básica: labels em formulários, foco visível, contraste, `alt` em imagens, navegação por teclado nos diálogos. Sugerir/aplicar correções pontuais.
4. Entregar um relatório curto com achados priorizados antes de grandes mudanças visuais.

**Aceite**
- Relatório + correções pequenas e seguras; testes E2E relevantes verdes.

---

## Formato de entrega esperado em cada PR

- Descrição: problema, solução, riscos, como testar, como reverter.
- Resultado dos comandos de validação.
- Lista de arquivos alterados e qualquer configuração manual necessária no console Firebase/GCP/Cloudflare (listar explicitamente, sem valores secretos).

## Fora de escopo

- Reescrever o modelo de permissões inteiro.
- Mudar provedores (Resend, Evolution, Gemini, SuperFrete).
- Alterar o histórico git ou apagar branches de backup (`backup/history-purge-*`).
