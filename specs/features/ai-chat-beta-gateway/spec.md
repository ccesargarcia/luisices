# Copiloto de IA pelo gateway Beta

- **ID:** `ai-chat-beta-gateway`
- **Status:** Concluída
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-16
- **Referências:** `api/ai-chat.ts`, `src/services/firebaseAiAgentService.ts`, `cloudflare/api-beta-worker/src/index.js`, `functions/ai/handlers.js`

## Problema e contexto

No Beta, o Copiloto usa `POST /api/ai-chat` na origem Vercel. As demais rotas já migradas passam pelo host `api.beta.luisices.com.br`. O Worker lê atualmente corpos POST completos na memória e a Vercel limita corpos de Functions a 4,5 MB. O upload de imagens do Copiloto aceita arquivos maiores que esse limite.

## Objetivos

- Encaminhar `POST /api/ai-chat` pelo Worker `api.beta` somente no host Beta.
- Exigir segredo de origem na Function Vercel para todas as requisições, inclusive preflight.
- Limitar em 4 MiB o corpo de chat encaminhado à Vercel e permitir fallback GCP apenas para esse limite específico.
- Preservar autenticação Firebase, autorização, cotas, prompt, ferramentas e contrato da Cloud Function.

## Fora de escopo

- Qualquer alteração em `api.dev`, Worker Dev, Cloud Functions ou regras Firebase.
- Alterações no MCP/ChatGPT, Alexa, ferramentas, prompt ou modelo do Copiloto.
- Alteração do limite de imagem aceito pelo backend.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário autenticado e ativo | Usar chat no Beta conforme permissões existentes | Token inválido/inativo continua negado |
| Worker Beta | Encaminhar a rota autorizada com segredo de origem | Host/path/método não permitidos e excesso de corpo são rejeitados |
| Acesso direto à origem Vercel | Nenhuma | Segredo ausente ou inválido retorna 403 |

## Requisitos funcionais

- **RF-1:** O Worker Beta permite somente POST em `/api/ai-chat`, aplica o limitador Beta existente por rota/IP e encaminha o bearer e o corpo.
- **RF-2:** O Worker encaminha à Vercel corpos de chat de até 4 MiB. Acima desse limite retorna HTTP 413 com código `vercel-payload-too-large`, sem buffer ilimitado.
- **RF-3:** O cliente trata exclusivamente esse código de 413 como falha de infraestrutura Vercel, permitindo o fallback já configurado para GCP. Erros de negócio, autenticação e `resource-exhausted` não acionam fallback.
- **RF-4:** A origem Vercel valida o segredo antes de OPTIONS, método, Firebase Admin ou processamento do chat.
- **RF-5:** Em host não Beta, a rota permanece Cloud Function direta conforme roteamento atual.

## Critérios de aceitação

- **CA-1 (RF-1):** POST autorizado pelo Worker alcança `beta.luisices.com.br/api/ai-chat` com segredo edge; GET retorna 405 e rota desconhecida 404.
- **CA-2 (RF-2):** Corpo maior que 4 MiB é cancelado/rejeitado com 413 específico; corpo dentro do limite é encaminhado sem alteração.
- **CA-3 (RF-3):** O código específico permite fallback automático; 429 e demais 4xx continuam inelegíveis.
- **CA-4 (RF-4):** Requisições diretas sem segredo, inclusive OPTIONS, recebem 403 sem inicializar Firebase.
- **CA-5 (RF-5):** `api.dev` e o roteamento fora do host Beta permanecem sem alteração.

## Requisitos não funcionais e integridade

- Segurança/privacidade: segredo comparado em tempo constante; bearer do usuário permanece exigido; nenhum dado de chat é registrado pelo Worker.
- Integridade/idempotência: não aplicável; chamadas do Copiloto mantêm semântica atual.
- Desempenho: Worker mantém o corpo de chat limitado a 4 MiB antes do encaminhamento à Vercel.
- Compatibilidade de API/dados: contrato JSON permanece `{message, history, image}`; payload grande dentro dos limites existentes do backend pode usar fallback GCP.

## Erros e casos-limite

- Rate limit 429, sessão 401, permissão 403 e validação 400 não usam fallback.
- Corpo acima de 4 MiB retorna o código especial de gateway e só então o mecanismo existente decide o fallback.
- Falha/ausência do segredo no Worker retorna 503; segredo inválido na origem retorna 403.

## Dados e contratos afetados

- Rota Beta `POST /api/ai-chat`; sem mudança no contrato callable `aiAgentChat`.

## Impacto na documentação

- Guias/specs existentes revisados: `docs/COPILOTO_IA.md`, `docs/FUNCIONALIDADES.md`, `docs/VERCEL_BETA_ROUTING.md`, `docs/README.md`, `functions/README.md` e documentação ativa do Worker.
- Documentação a atualizar: guia de roteamento, skill Cloudflare, catálogo de specs e esta spec.
- Impacto no Copiloto (Gemini): rota Beta e fallback para payload >4 MiB; prompt, ferramentas, permissões e cotas não mudam.
- Impacto no MCP/ChatGPT: nenhum; servidor, schema, ferramentas e escopos não mudam.
- Diferenças preservadas: limites e permissões da Cloud Function permanecem fonte de verdade para ambos os produtos, sem criar paridade de interface entre Copiloto e MCP.

## Decisões e dúvidas

- **Confirmado:** Worker Beta já usa segredo de origem e limite por rota/IP; roteamento frontend habilita Vercel somente no hostname Beta.
- **Confirmado:** Vercel limita corpo de Function a 4,5 MB; o limite interno adotado de 4 MiB deixa margem para a borda.
- **Decisão:** erro `vercel-payload-too-large` é elegível para fallback; o restante dos 4xx continua não elegível.

## Validação

- Teste unitário do Worker: rota, segredo, preservação do corpo, teto de 4 MiB e rejeição de método.
- Teste unitário da API: segredo verificado antes de OPTIONS e autenticação.
- Teste de roteamento/fallback: apenas erro específico de payload aciona fallback; typecheck obrigatório.
- Após publicação em Beta: confirmar HTTP público sem bearer (401), OPTIONS, GET e origem direta (403); validação autenticada do Copiloto pelo usuário.

## Evidências de conclusão

- Testes focados: 4 arquivos, 25 testes passaram; `npm run typecheck` passou.
- Fase 1: workflow [43992768696](https://github.com/ccesargarcia/luisices/actions/runs/43992768696) publicou Worker Beta; smoke check POST 401, GET 405 e OPTIONS 204.
- Fase 2: workflow [43993107372](https://github.com/ccesargarcia/luisices/actions/runs/43993107372) publicou Vercel Beta; workflow [43993107437](https://github.com/ccesargarcia/luisices/actions/runs/43993107437) passou testes e publicou apenas Hosting do frontend Dev. Worker Dev, Functions Dev, Rules e índices ficaram ignorados.
- Smoke check após fase 2: POST/OPTIONS direto em `beta.luisices.com.br/api/ai-chat` retornaram 403; via `api.beta`, POST sem bearer 401, GET 405 e OPTIONS 204.
- Validação autenticada confirmada pelo usuário: Copiloto respondeu a texto e imagem, e a Function apareceu nos logs da Vercel. O usuário também observou o log `[GeminiClient] Modelo gemini-3.6-flash restabelecido com sucesso`, indicando recuperação do contador de falhas do provedor.
- `api.dev` não foi alterada nem recebeu deploy. Critérios e validações da migração concluídos.
