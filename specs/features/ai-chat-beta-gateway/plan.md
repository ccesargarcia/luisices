# Plano de implementação — ai-chat-beta-gateway

## Abordagem

Publicar a rota no Worker Beta isoladamente; depois endurecer a Function Vercel, apontar o cliente Beta ao gateway e mapear o 413 específico para `VercelInfraError`. O Worker limita a leitura incremental do corpo a 4 MiB, com rejeição antecipada por Content-Length quando disponível.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Gateway | `cloudflare/api-beta-worker/src/index.js` | Allowlist POST, limiter atual e limite de corpo 4 MiB |
| Function | `api/ai-chat.ts`, `api/_firebaseAdmin.ts` | Validar `assertBetaEdgeRequest` antes de qualquer outra operação |
| Cliente | `src/services/firebaseAiAgentService.ts`, `src/services/backendRoutingService.ts` | URL Beta pelo gateway e fallback somente no erro específico |
| Validação | `tests/unit/api-beta-worker.test.ts`, novos/atuais testes de API e routing | Cobrir limites, ordem de auth e fallback |
| Documentação | `docs/VERCEL_BETA_ROUTING.md`, guias relacionados e catálogo | Registrar caminho, limites, fallback e impactos de IA |

## Contratos, dados e compatibilidade

- API: mantém método, JSON, bearer e resposta atuais; erro edge 413 usa código único.
- Dados/migração: nenhuma.
- Integrações: Worker Beta e Vercel Beta; Worker Dev, `api.dev` e Functions ficam fora.

## Segurança e integridade

- Autorização: segredo edge protege origem; Firebase valida sessão ativa e permissões como antes.
- Limites: 4 MiB até Vercel, limite incremental na borda; fallback usa limites já existentes da callable.
- Abuso: limitador Beta atual por rota/IP permanece; não criar binding novo.

## UX e documentação

- UI: sem mudança visual; comportamento de imagem maior pode usar GCP fallback.
- Docs: atualizar roteamento Beta, documentação do Copiloto e Cloudflare.
- Copiloto: afetado na seleção de URL e fallback; prompt/ferramentas/permissões/budget preservados.
- MCP/ChatGPT: não afetado funcionalmente; guia MCP apenas conferido, sem alteração necessária.
- Paridade: nenhum contrato MCP novo; manter diferenças de interface existentes.

## Validação e riscos

- `npm run typecheck` e testes unitários do Worker, API e roteamento/fallback.
- Risco: 4 MiB é menor que o limite backend; erro especial leva ao GCP apenas quando fallback automático está habilitado.
- Risco de rate limit compartilhado por IP permanece igual às demais APIs Beta.

## Reversão

Remover a rota da allowlist reverte a fase Worker; reverter o commit cliente/API restaura a chamada Vercel direta. Em nenhuma fase alterar associação/domínio de `api.dev`.
