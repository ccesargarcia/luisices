# Abrir mensagens de e-mail em modal

- **ID:** `email-message-modal`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-19
- **Referências:** `src/app/pages/Emails.tsx`, `src/app/components/ui/dialog.tsx`, `docs/FUNCIONALIDADES.md`

## Problema e contexto

O painel de leitura em coluna lateral não atendeu à preferência visual da pessoa usuária, que pediu um modal dentro da Central de E-mails. A implementação anterior em nova aba foi publicada em DEV/Beta e está sendo substituída após o retorno explícito de UX.

## Objetivos

- Abrir a mensagem clicada em modal, mantendo a caixa de entrada visível no contexto da mesma página.
- Reaproveitar o painel de leitura existente, incluindo ações, corpo privado no Storage, anexos e sanitização/isolamento do HTML.

## Fora de escopo

- Alterar API de envio/recebimento, webhook, regras de acesso ou compartilhamento público de mensagens.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário autenticado com `emails.view` | Abrir e ler mensagens no modal de leitura | Sem `emails.view`, a rota existente bloqueia a Central; as regras Firestore/Storage continuam aplicadas |

## Requisitos funcionais

- **RF-1:** O clique na linha abre o modal compartilhado de leitura na própria Central.
- **RF-2:** O modal usa o estado/serviço existente; mensagens recebidas externalizadas carregam o corpo pelas referências privadas do Storage.
- **RF-3:** O modal mostra metadados, ações e anexos disponíveis e pode ser fechado sem perder a caixa/pasta atual.
- **RF-4:** O HTML usa o mesmo visualizador sanitizado e isolado já usado na Central.

## Critérios de aceitação

- **CA-1 (RF-1):** Clicar numa linha abre modal sem criar nova aba ou janela.
- **CA-2 (RF-2):** Corpos armazenados no Storage mantêm prévia progressiva, timeout e diagnóstico.
- **CA-3 (RF-2):** Usuário sem permissão de leitura não consegue abrir a Central nem ler dados via Firestore/Storage.
- **CA-4 (RF-3/RF-4):** Ações atuais, metadados, anexos e corpo continuam disponíveis no modal; HTML mantém isolamento e sanitização.

## Requisitos não funcionais e integridade

- Segurança/privacidade: nenhuma nova rota ou exposição de dados; permissão da Central e regras Firestore/Storage existentes continuam aplicadas.
- Integridade/idempotência: comportamento de leitura e marcação de status continua usando as funções já existentes.
- Acessibilidade/desempenho: estado de carregamento e erro anunciados; controles com alvo mínimo adequado em telas móveis.
- Compatibilidade de API/dados: nenhuma alteração de schema ou contrato externo.

## Erros e casos-limite

- Fechar o modal limpa a mensagem selecionada e retorna à lista no mesmo filtro.
- Falha de Storage mantém prévia e tratamento de erro existente.

## Dados e contratos afetados

- Nenhum contrato ou dado novo; só muda a apresentação do painel de leitura existente.

## Impacto na documentação

- Guias/specs existentes revisados: skill de design system, skill de documentação, spec de resiliência do recebimento, `docs/FUNCIONALIDADES.md` e Help Center.
- Documentação que precisará ser atualizada: documentação da funcionalidade e Help Center descrevem o modal.
- Copiloto (Gemini): não impactado; não consulta nem renderiza esta rota.
- MCP/ChatGPT: não impactado; nenhum schema, ferramenta ou permissão MCP muda.
- Diferenças de comportamento Copiloto/MCP: não aplicável.

## Decisões e dúvidas

- **Confirmado:** preferência corrigida: abrir modal na própria Central, sem nova aba.
- **Em aberto:** nenhuma.

## Validação

- `npm run typecheck` obrigatório.
- Conferência de diff, Dialog compartilhado, proteção de acesso e preservação do carregamento de texto/HTML/anexos.
- Após publicação, conferir HTTP 200 e presença da rota nos bundles de DEV/Beta; ainda é necessário validar o clique e o carregamento autenticado no navegador.

## Evidências de conclusão

- Histórico: a opção anterior foi publicada por `206003d` e substituída conforme preferência confirmada no commit `d03bf80`.
- `npm run typecheck` e `git diff --check` passaram antes da publicação.
- Firebase Hosting DEV: workflow [44450685560](https://github.com/ccesargarcia/luisices/actions/runs/44450685560) passou; somente frontend foi implantado.
- Vercel Dev/Beta: workflow [44450685473](https://github.com/ccesargarcia/luisices/actions/runs/44450685473) passou.
- CodeQL [44450685484](https://github.com/ccesargarcia/luisices/actions/runs/44450685484) passou. `dev.luisices.com.br` e `beta.luisices.com.br` responderam HTTP 200.
- Os jobs de Firebase Functions, Rules, índices e Cloudflare Workers foram ignorados. Falta a validação visual autenticada por uma pessoa usuária.
