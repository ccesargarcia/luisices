# Administração Alexa pelo gateway Beta

- **ID:** `alexa-beta-gateway`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-16
- **Referências:** `docs/VERCEL_BETA_ROUTING.md`; `docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md`; `api/alexa.ts`; `src/services/firebaseAlexaService.ts`; `functions/alexa/callables.js`; `cloudflare/api-beta-worker/src/index.js`.

## Problema e contexto

O painel Beta pode chamar a Function Vercel `POST /api/alexa` quando a rota `alexa` está efetiva para Vercel. Hoje o serviço chama o caminho relativo e a Function exige sessão Firebase ativa, delegando as sete ações administrativas/de usuário aos callables existentes, mas não exige que a origem passe pelo Worker Beta.

O webhook de voz Alexa e as rotas públicas da skill são implementações distintas e ficam fora desta mudança.

## Objetivos

- Encaminhar somente `POST /api/alexa` de `api.beta.luisices.com.br` para a Function Vercel Beta.
- Exigir o segredo de origem antes de OPTIONS, método, Firebase Admin ou autenticação no handler Vercel.
- Fazer o cliente chamar `api.beta` no host Beta, mantendo caminho relativo nos demais hosts e o fallback GCP.
- Preservar ações, payloads, respostas, erros e autorização existente dos callables Alexa.

## Fora de escopo

- Alterar Alexa Skill, webhook, verificação de assinatura Amazon, pareamento de voz, drafts, pedidos ou rate limits do fluxo de voz.
- Alterar os callables de `functions/alexa/`, as permissões, os documentos Firestore ou contratos existentes.
- Alterar Copiloto/Gemini, servidor MCP/OAuth, `api.dev`, `functions-dev` ou qualquer ambiente de produção.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário Firebase ativo | Consultar o próprio status, revogar o próprio vínculo e tratar drafts próprios quando autorizado | Sessão ausente/revogada ou perfil inativo é negado; ownership continua validado pelo callable |
| Administrador Firebase ativo | Ações administrativas de Alexa já previstas, inclusive status de terceiros, permissões, pareamento e chave global | Callables continuam exigindo papel admin nas ações globais/administrativas |
| Worker `functions-beta` | Encaminhar POST e injetar segredo de origem | Não autentica usuário nem substitui validações dos callables |
| Chamada direta à Function Vercel | Nenhuma | Sem segredo de origem recebe 403 antes de inicializar Firebase Admin |

## Requisitos funcionais

- **RF-1 — Allowlist:** o Worker aceita apenas `POST /api/alexa`; método não permitido retorna 405 e rota desconhecida retorna 404.
- **RF-2 — Encaminhamento:** preserva body e `Authorization`, injeta `x-beta-edge-secret` e usa binding de API Beta existente.
- **RF-3 — Proteção da origem:** a Function Vercel valida o segredo em tempo constante antes de OPTIONS, método, Firebase Admin ou sessão.
- **RF-4 — Cliente Beta:** `firebaseAlexaService` usa `https://api.beta.luisices.com.br/api/alexa` nos hosts Beta e caminho relativo fora deles.
- **RF-5 — Autorização:** manter sessão ativa e as verificações por ação nos callables para `getStatus`, `approvePairing`, `setPermission`, `revokeBinding`, `toggleGlobalIntegration`, `approveDraft` e `cancelDraft`.
- **RF-6 — Limites:** usar o binding Beta existente de 30 chamadas/minuto por IP e caminho; manter rate limits e validações internas de Alexa sem alterações.
- **RF-7 — Compatibilidade:** manter `executeWithGcpFallback`, chamadas GCP, payloads, respostas e erros atuais.
- **RF-8 — Isolamento:** não alterar webhook Alexa, servidores públicos, Worker/Functions Dev nem `api.dev`.

## Critérios de aceitação

- **CA-1:** testes do Worker cobrem POST, bearer/body/segredo, preflight, método 405 e 429.
- **CA-2:** testes do handler mostram 403 para segredo ausente/incorreto antes de inicializar Firebase Admin; segredo válido segue para a verificação de método/sessão.
- **CA-3:** teste do cliente comprova URL Beta e preservação do fallback GCP/caminho relativo fora do Beta.
- **CA-4:** revisão confirma que o handler continua chamando os mesmos callables e não altera as verificações de papel, ownership e permissões; testes existentes do domínio Alexa continuam aprovando.
- **CA-5:** deploy em duas fases: Worker Beta primeiro, depois Function/cliente; teste remoto confirma bypass 403, POST sem sessão pelo gateway 401, OPTIONS 204 e GET 405.
- **CA-6:** nenhum deploy de Worker/Functions Dev e nenhuma alteração em `api.dev`.
- **CA-7:** usuário autenticado abre Configurações → Alexa no Beta e consulta o status sem erro; usar somente a ação de leitura `getStatus` para a verificação manual.

## Requisitos não funcionais e integridade

- Segurança/privacidade: o segredo de origem apenas comprova passagem pelo Worker; Firebase Auth e autorização dos callables permanecem obrigatórios.
- Integridade/idempotência: nenhuma mudança em dados ou semântica de ações.
- Observabilidade: erros de autenticação/autorização não acionam fallback; falhas de infraestrutura seguem o fallback atual.
- Compatibilidade: nenhuma alteração ao endpoint público Alexa da skill nem aos clientes GCP.

## Erros e casos-limite

- Segredo ausente/incorreto: 403 sem inicializar Firebase Admin.
- Método inválido no Worker: 405 sem encaminhar.
- Bearer ausente/inválido ou perfil inativo: erros existentes 401/403.
- Ação inválida: erro atual 400.
- Limite Cloudflare excedido: 429 antes da origem.
- Vercel indisponível: fallback GCP pelo mecanismo atual.

## Dados e contratos afetados

- Transporte de `POST /api/alexa`; payload `{ action, ...payload }` e contratos dos sete métodos permanecem iguais.
- Nenhuma coleção, campo ou contrato Alexa de voz é migrado.

## Impacto na documentação

- Guias/specs revisados: `docs/VERCEL_BETA_ROUTING.md`, `docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md`, contratos de `functions/alexa/callables.js` e esta spec.
- Documentação a atualizar: guia de roteamento Beta, runbook Cloudflare e catálogo de specs.
- Copiloto (Gemini): sem impacto; não usa o serviço Alexa.
- MCP/ChatGPT: sem impacto; endpoint MCP e OAuth permanecem inalterados.
- Integração Alexa: somente transporte do painel administrativo Beta; skill, webhook, voz e contratos permanecem inalterados.

## Decisões e dúvidas

- **Confirmado:** `api/alexa.ts` autentica sessão e delega às sete ações; os callables fazem autorização granular e verificações de ownership.
- **Confirmado:** `functions/alexa/` mantém webhook/voz separado da Function Vercel administrativa.
- **Decisão:** compartilhar binding Beta existente de 30/min por path/IP, sem novo namespace.
- **Decisão:** rollout Worker e Function/cliente em dois pushes separados para não ativar o cliente antes do gateway.

## Validação

- `npm run typecheck` e `npm run build`.
- Testes focados do Worker, handler, host/client routing, callables Alexa e segurança.
- `git diff --check`, revisão dos workflows e testes remotos nos quatro cenários de CA-5.

## Evidências de conclusão

- `npm run typecheck` e `npm run build` passaram; 50 testes focados passaram em 8 arquivos; `git diff --check` passou.
- Worker Beta [publicado](https://github.com/ccesargarcia/luisices/actions/runs/43987633541) e Vercel [publicada](https://github.com/ccesargarcia/luisices/actions/runs/43987891619), ambos com sucesso.
- Verificações remotas: POST pelo gateway sem sessão `401`, bypass da origem `403`, OPTIONS `204` e GET `405`.
- Worker Dev e Functions Dev ficaram `skipped`; Firebase Hosting Dev publicou o frontend pela mudança em `src`. `api.dev` não foi alterada.
- Pendente: teste manual do painel Alexa com sessão autorizada (CA-7); a integração pública de voz não foi testada nem alterada.
