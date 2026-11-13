# Plano de implementação — copilot-mcp-quality

## Abordagem

Entregar em etapas. Primeiro tornar contratos e documentação MCP verificáveis no CI; depois ampliar regressões offline do Copiloto; por último adicionar avaliação Gemini live manual e isolada. O CI obrigatório não fará chamadas externas a modelos, e o workflow live não terá permissão nem configuração para publicar/deploy.

**Progresso:** T1–T3 concluídas. O workflow/harness T4 e o guia de configuração estão implementados; a configuração da chave dedicada e a execução live ainda estão pendentes.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Declarações do Copiloto | `functions/ai/schemas.js`, `functions/ai/tools.js`, `functions/ai/handlers.js` | Criar/expandir harness offline e matriz de avaliação sintética; preservar executor e contratos de produção. |
| MCP publicado | `functions/mcp/openapi.js`, `functions/mcp/constants.js`, `functions/mcp/validation.js`, `functions/mcp/endpoint.js` | Validar igualdade entre nomes, escopos, schema e dispatcher; cobrir limites e erros do contrato. |
| Segurança | `functions/ai/authorization.js`, `functions/mcp/auth.js`, `functions/mcp/profilePermissions.js`, `tests/unit/backend-mcp-authorization.test.ts`, `tests/unit/mcp-oauth-security.test.ts` | Reutilizar e complementar regressões de perfil, tenant, escopos, redaction e confirmação. |
| Avaliação existente | `tests/unit/ai/synthetic-quality-eval.test.ts`, `tests/unit/ai/offline-regression-guardrails.test.ts`, `tests/unit/ai/response-contracts.test.ts` | Preservar os 40 cenários com relógio fixo; proteger autorização, prompt injection, ambiguidade e despacho inválido; classificar testes mockados como regressão determinística, sem inferir qualidade do modelo real. |
| Documentação | `docs/COPILOTO_IA.md`, `docs/INTEGRACAO_CHATGPT_MCP.md`, `docs/FUNCIONALIDADES.md`, `docs/README.md` | Corrigir 11/30 versus 31, reduzir duplicação do catálogo e documentar a distinção entre testes offline e avaliação live. |
| CI e avaliação live | `.github/workflows/pr-checks.yml`, `.github/workflows/test-actions.yml`, `.github/workflows/` | Incluir contrato/offline nos checks determinísticos e criar workflow separado `workflow_dispatch` para Gemini com chave dedicada e sem permissões de deploy. |

## Contratos, dados e compatibilidade

- Contratos/API/schema: sem mudança pública pretendida; se a auditoria detectar discrepância, abrir decisão específica antes de alterar o contrato.
- Dados/migração: não se aplica; datasets de avaliação serão fictícios e versionados.
- Integrações/ambientes: teste offline em PR; avaliação live manual com segredo exclusivo, modelo configurado explicitamente e saída sintética.

## Segurança e integridade

- Autorização e ownership: a suíte valida que scopes MCP e permissões do perfil continuam necessários; casos do Copiloto mantêm tenant, role e status ativo.
- Validação/redação/limites: schemas, rejeição de argumentos desconhecidos, output financial redaction, orçamento e rate limits continuam cobertos pelos testes existentes e novos.
- Transações/idempotência/valores: simular ferramentas mutáveis; validar cálculo financeiro contra fixtures conhecidas; nenhuma gravação real na execução de avaliação.
- Ameaças/casos de abuso: prompt injection, tentativa de obter dados de outro tenant, omissão de escopo, exposição financeira, confirmação falsa e instrução de gravar/enviar sem autorização.

## UX e documentação

- UI/acessibilidade/design system: sem impacto direto na interface nesta iniciativa.
- Documentação/specs existentes revisadas: `COPILOTO_IA.md`, `INTEGRACAO_CHATGPT_MCP.md`, `FUNCIONALIDADES.md` e fontes de schema/escopo/dispatch.
- Documentação viva a atualizar: catálogo MCP, contagens, processo de avaliação e interpretação do resultado do Copiloto.
- Índices, exemplos, comandos e links a conferir: índice do manual MCP, tabela de ferramentas e comandos da suíte de testes.
- Copiloto (Gemini): avaliação de prompt, ferramentas, grounding, resposta em pt-BR, limites, autorização e falhas.
- MCP/ChatGPT: validação de contrato, schemas, escopos, OAuth, tenant, redaction e idempotência.
- Compatibilidade/paridade entre Copiloto e MCP: manter catálogos distintos e documentar equivalências apenas quando verificadas.
- Sem alterações de documentação só poderão ser aceitas para guias comprovadamente não afetados, com justificativa registrada.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Contrato: teste Vitest comparando os conjuntos metadata/scope/dispatcher e validando o catálogo gerado ou verificável.
- Segurança: suítes unitárias MCP/OAuth/AI, testes de Rules/integração aplicáveis a qualquer mudança real de autorização.
- Avaliação live: workflow manual com fixtures sintéticas; revisar artefato e score; confirmar que ausência/falha de chave não expõe secrets nem altera recursos.
- Risco e mitigação: flutuação do modelo mitigada por workflow live não bloqueante, identificação de modelo/prompt, barreiras críticas e bloqueio de qualquer resposta truncada, além de revisão humana; custo mitigado por execução manual e dataset pequeno.

## Reversão

O workflow live e o relatório podem ser removidos sem alterar runtime. Os testes determinísticos permanecem como proteção. Reverter a validação de contrato só com justificativa e mantendo os testes de authorization/scope já existentes.
