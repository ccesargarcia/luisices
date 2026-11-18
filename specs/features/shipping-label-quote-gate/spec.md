# Bloqueio da emissão de etiqueta sem cotação válida

- **ID:** `shipping-label-quote-gate`
- **Status:** Concluída localmente
- **Responsável:** Não definido
- **Atualizado em:** 2026-11-18
- **Referências:** `docs/FUNCIONALIDADES.md`; `src/app/components/shipping/SuperfreteGenerateLabelDialog.tsx`; `specs/features/orders-beta-gateway/spec.md`

## Problema e contexto

O botão final de emissão de etiqueta podia ser acionado sem preço de frete cotado e selecionado. Uma cotação antiga também podia continuar visível ou habilitar a emissão depois de alterações nos dados usados para cotar.

## Objetivos

- Manter desabilitado o botão final de emissão até haver uma cotação selecionada, atual e com preço positivo.
- Invalidar a cotação quando mudar CEP de destino, CEP de origem ou dimensões do pacote.
- Revalidar a condição ao iniciar a emissão, além do estado visual do botão.

## Fora de escopo

- Alterações em API, Cloud Functions, Workers, regras de autorização, contratos, deploys ou ambientes de produção.
- Alterações ao botão que apenas abre o diálogo de emissão.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário já autorizado a emitir etiquetas | Consultar frete e emitir pelo fluxo existente | Não pode iniciar emissão sem cotação atual selecionada com preço positivo |

## Requisitos funcionais

- **RF-1:** O botão final de emissão permanece desabilitado enquanto a cotação estiver carregando ou não existir cotação selecionada válida para os dados atuais.
- **RF-2:** Alterações no CEP de destino, CEP de origem ou dimensões invalidam as cotações anteriores até a resposta da nova cotação.
- **RF-3:** O handler de emissão impede a chamada de criação de etiqueta se não houver cotação válida, mesmo que seja acionado fora do fluxo normal do botão.

## Critérios de aceitação

- **CA-1 (RF-1):** Sem cotação, durante carregamento, ou com preço ausente, inválido ou não positivo, o botão final fica desabilitado.
- **CA-2 (RF-1, RF-2):** Após uma cotação válida ser selecionada para o CEP e dimensões correntes, a emissão fica habilitada; alterar qualquer dado da chave da cotação volta a desabilitá-la até nova resposta válida.
- **CA-3 (RF-3):** Uma tentativa no handler sem cotação válida apresenta erro e não chama a criação de etiqueta.

## Requisitos não funcionais e integridade

- Segurança/privacidade: permissões e validações existentes no servidor permanecem inalteradas; o bloqueio no cliente não substitui autorização backend.
- Integridade/idempotência: nenhuma alteração às chaves ou ao contrato de emissão.
- Acessibilidade/desempenho/observabilidade: estado e instrução são expostos como texto de status; reuso da cotação atual e debounce já existentes.
- Compatibilidade de API/dados: sem alterações.

## Erros e casos-limite

- CEP inválido ou dimensões incompletas: limpar as cotações e manter o botão desabilitado.
- Cotação sem opções válidas ou falha do serviço: manter o botão desabilitado.
- Troca de serviço: habilitar apenas se o serviço selecionado existir na resposta válida e tiver preço positivo.

## Dados e contratos afetados

Nenhuma coleção, campo, API ou schema. A chave local associa cotação a CEP de origem, CEP de destino e dimensões.

## Impacto na documentação

- Guias/specs existentes revisados: `docs/FUNCIONALIDADES.md`, `specs/features/orders-beta-gateway/spec.md`, `docs/VERCEL_BETA_ROUTING.md` e código do diálogo.
- Documentação que precisará ser atualizada: `docs/FUNCIONALIDADES.md` e esta spec.
- Índices, exemplos, comandos ou links afetados: incluir esta spec no catálogo `specs/features/README.md`.
- Impacto no Copiloto (Gemini): não impactado; não usa este diálogo de emissão.
- Impacto no MCP/ChatGPT: não impactado; não altera ferramentas, escopos ou contratos MCP.
- Diferenças de comportamento Copiloto/MCP a preservar ou alterar: não aplicável; os dois canais permanecem inalterados.

## Decisões e dúvidas

- **Confirmado:** preço deve ser finito e maior que zero e a cotação deve corresponder aos dados correntes.
- **Proposto:** não aplicável.
- **Em aberto:** publicação e validação manual na interface Beta não foram solicitadas nesta etapa.

## Validação

- `npm run typecheck` para validar tipos após a mudança.
- `git diff --check` para verificar formatação do patch.
- Revisão do handler e do estado desabilitado para confirmar ausência de chamada à emissão sem cotação.

## Evidências de conclusão

- `npm run typecheck` concluído sem erros.
- `git diff --check` concluído sem erros.
- Revisão do handler confirmou guarda anterior à chamada de criação da etiqueta.
- Alterações permanecem locais; não houve commit, push, deploy ou alteração de API.
