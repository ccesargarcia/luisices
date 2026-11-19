# Abrir mensagens de e-mail em nova aba

- **ID:** `email-open-new-tab`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-19
- **Referências:** `src/app/pages/Emails.tsx`, `src/app/pages/EmailMessageWindow.tsx`, `src/app/routes.tsx`, `docs/FUNCIONALIDADES.md`

## Problema e contexto

Atualmente, clicar numa mensagem seleciona-a no painel de leitura da Central de E-mails. A pessoa pediu que a mensagem abra numa nova janela. A decisão de UX adotada é abrir uma nova aba do navegador com uma página própria para leitura.

## Objetivos

- Abrir a mensagem clicada em uma nova aba, com URL direta que possa ser atualizada sem perder o contexto da mensagem.
- Carregar mensagens recebidas antigas diretamente pelo ID, sem depender de a mensagem estar na primeira página da lista.
- Preservar as permissões existentes, a leitura do corpo privado no Storage e a sanitização/isolamento do HTML.

## Fora de escopo

- Alterar API de envio/recebimento, webhook, regras de acesso ou compartilhamento público de mensagens.
- Tornar anexos sem URL de download temporária baixáveis.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário autenticado com `emails.view` | Abrir e ler mensagens que as regras Firestore permitem consultar | Sem `emails.view`, a rota protegida bloqueia o acesso; as regras Firestore continuam aplicadas |

## Requisitos funcionais

- **RF-1:** O clique na linha da mensagem abre `/emails/mensagem/:type/:id` em nova aba sem transferir corpo ou dados pessoais pela URL.
- **RF-2:** A página consulta o registro no Firestore sob sessão e autorização existentes; mensagens recebidas externalizadas carregam o corpo pelas referências privadas do Storage.
- **RF-3:** A página mostra metadados e anexos disponíveis e permite voltar à Central de E-mails.
- **RF-4:** O HTML usa o mesmo visualizador sanitizado e isolado já usado na Central.

## Critérios de aceitação

- **CA-1 (RF-1):** Clicar numa linha abre uma aba com o ID na rota; a aba original continua na Central.
- **CA-2 (RF-2):** Uma mensagem antiga não carregada na lista inicial é consultada por ID; mensagens não encontradas e erros mostram estados claros.
- **CA-3 (RF-2):** Usuário sem permissão de leitura não consegue abrir conteúdo via rota ou Firestore.
- **CA-4 (RF-3/RF-4):** Assunto, remetente, destinatários, data, anexos com URL disponível e corpo são renderizados; HTML mantém isolamento e sanitização.

## Requisitos não funcionais e integridade

- Segurança/privacidade: nenhum corpo é colocado na URL; rota usa sessão, PermissionRoute e regras Firestore/Storage existentes.
- Integridade/idempotência: somente leitura; mensagem recebida é marcada como lida quando o usuário também tem permissão de edição, sem impedir a visualização se essa atualização falhar.
- Acessibilidade/desempenho: estado de carregamento e erro anunciados; controles com alvo mínimo adequado em telas móveis.
- Compatibilidade de API/dados: nenhuma alteração de schema ou contrato externo.

## Erros e casos-limite

- ID inválido ou documento removido exibe mensagem compreensível.
- Falha de Storage mantém o tratamento de erro existente, sem expor corpo na URL.
- Anexo sem URL de download é listado como metadado sem oferecer link falso.

## Dados e contratos afetados

- Leitura das coleções `receivedEmails`/`sentEmails` e dos objetos referenciados em `bodyStoragePaths`; nenhum campo novo.

## Impacto na documentação

- Guias/specs existentes revisados: skill de design system, skill de documentação, `specs/features/resend-receiving-webhook-resilience/`, `docs/FUNCIONALIDADES.md` e Help Center.
- Documentação que precisará ser atualizada: documentação da funcionalidade e Help Center descrevem a nova aba.
- Copiloto (Gemini): não impactado; não consulta nem renderiza esta rota.
- MCP/ChatGPT: não impactado; nenhum schema, ferramenta ou permissão MCP muda.
- Diferenças de comportamento Copiloto/MCP: não aplicável.

## Decisões e dúvidas

- **Confirmado:** “nova janela” será implementada como nova aba do navegador; a página utiliza a autenticação atual e fica isolada do Layout para leitura focada.
- **Em aberto:** nenhuma.

## Validação

- `npm run typecheck` obrigatório.
- Conferência de diff, rota, proteção de acesso e compatibilidade dos caminhos de leitura de texto/HTML/anexos.

## Evidências de conclusão

- A preencher após validação.
