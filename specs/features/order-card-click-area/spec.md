# Área de clique do card de pedido

- **ID:** `order-card-click-area`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-19
- **Referências:** `src/app/components/OrderCard.tsx`, `docs/FUNCIONALIDADES.md`, `.agents/skills/luisices-design-system/SKILL.md`

## Contexto e objetivo

O card de pedido abre os detalhes ao ser tocado/clicado. A área vazia ao redor do controle “Compartilhar link” não fazia isso porque um contêiner amplo interrompia a propagação do clique. Corrigir o alvo interativo sem permitir que o botão de compartilhamento abra os detalhes do card.

## Requisitos e critérios de aceitação

- **RF-1:** Toques/cliques no espaço livre próximo ao botão de compartilhamento abrem os detalhes do pedido.
- **RF-2:** Ativar “Compartilhar link” ou “Copiar link gerado” executa somente a ação do controle, sem abrir os detalhes do pedido.
- **CA-1:** A interrupção de propagação fica restrita aos controles clicáveis; o contêiner flex não captura a área vazia.

## Segurança e integrações

- Nenhuma mudança em autorização, dados, API, Functions ou regras.
- Copiloto (Gemini): não impactado; nenhuma ferramenta ou ação do assistente é alterada.
- MCP/ChatGPT: não impactado; nenhum contrato, escopo ou fluxo OAuth muda.
- IndexedDB e armazenamento local: não aplicável.

## Validação

- `npm run typecheck` obrigatório e revisão do diff; validação manual autenticada após publicação.

## Evidências

- Correção publicada em DEV/Beta no commit `fc9ba6c`; `npm run typecheck` e `git diff --check` passaram.
- Workflows Firebase DEV `44532002744`, Vercel Beta `44532002584` e CodeQL `44532002588` concluíram com sucesso; DEV e Beta responderam HTTP 200.
- Validação autenticada do toque/clique no dispositivo do usuário ainda pendente.
