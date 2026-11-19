# Sessão compartilhada entre abas e expiração por inatividade

- **ID:** `cross-tab-session-idle-timeout`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-19
- **Referências:** `src/lib/firebase.ts`, `src/contexts/AuthContext.tsx`, `src/services/sessionInactivityService.ts`, `src/app/pages/Settings.tsx`, `.agents/skills/luisices-platform-security/SKILL.md`

## Problema e contexto

`browserSessionPersistence` mantém a autenticação por aba. A necessidade é compartilhar a autenticação entre abas da mesma origem e oferecer controle de expiração por inatividade, incluindo a opção de não expirar automaticamente.

## Objetivos

- Compartilhar login e atividade recente entre abas da mesma conta/origem.
- Permitir 15, 30 (padrão), 60 minutos ou desativar o encerramento automático por inatividade.
- Aplicar imediatamente alterações de prazo em abas abertas e verificar prazo ao reabrir o app.

## Fora de escopo

- Política administrativa obrigatória para todas as contas da organização.
- Alterar logout manual, revogação remota, status de conta ou autorização do servidor.
- Compartilhar sessão entre navegadores, dispositivos ou origens diferentes.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Conta autenticada | Definir seu próprio limite de inatividade em Configurações | Não altera preferências de outras contas nem controles remotos de acesso |

## Requisitos funcionais

- **RF-1:** Firebase Auth usa persistência `browserLocalPersistence`, que sincroniza login entre abas via localStorage.
- **RF-2:** Cada conta configura `sessionIdleTimeoutMinutes` como 15, 30, 60 ou 0; 0 significa “Desativado — sem limite”; ausência do campo significa 30 minutos.
- **RF-3:** Com limite ativo, interações em qualquer aba atualizam um marcador local compartilhado e renovam o prazo nas demais abas.
- **RF-4:** Sessões expiradas são encerradas por `signOut`, propagando logout a todas as abas. A expiração é verificada ao iniciar/retomar o app.
- **RF-5:** Com valor 0, não ocorre logout automático por inatividade; logout manual, revogação remota e validação de conta continuam ativos.
- **RF-6:** A preferência fica em `users/{uid}/settings/profile`, sob ownership existente, e a UI fica em Configurações > Avançado.

## Critérios de aceitação

- **CA-1:** Um login ou logout em uma aba atualiza as outras abas da mesma origem.
- **CA-2:** Atividade em uma aba reinicia o contador de todas as abas autenticadas dessa conta.
- **CA-3:** Passado o limite sem atividade, a sessão é encerrada em todas as abas.
- **CA-4:** Ao reabrir o app depois do limite, a sessão é encerrada antes de liberar o uso autenticado.
- **CA-5:** Com opção desativada, uma sessão não é encerrada por inatividade.
- **CA-6:** Valor ausente ou inválido usa 30 minutos, sem invalidar configurações antigas.

## Requisitos não funcionais e integridade

- Segurança/privacidade: o marcador em localStorage contém apenas timestamp e UID na chave; não é segredo nem fonte de autorização. O Auth em localStorage não é cifrado pela aplicação e persiste após fechamento do navegador; isto aumenta o risco em dispositivo compartilhado. Logout manual, revogação e Rules permanecem controles independentes. O modo sem limite mantém esse risco por tempo indeterminado até logout/revogação.
- IndexedDB: a funcionalidade não grava novos dados em IndexedDB. Firestore continua com cache em memória. O IndexedDB próprio de e-mail permanece AES-GCM conforme `email-body-local-cache`.
- Integridade/idempotência: não aplicável; nenhuma operação de negócio é alterada.
- Acessibilidade/desempenho: configuração usa Select/Button padrão; gravar marcador é limitado a uma vez a cada 2 segundos por aba.
- Compatibilidade: contas existentes sem o campo seguem o padrão de 30 minutos.

## Erros e casos-limite

- Leitura de settings indisponível: aplicar padrão de 30 minutos e observar atualizações.
- localStorage bloqueado: limite segue na aba corrente, mas sincronização de atividade entre abas pode não funcionar.
- Conta aberta em navegador/dispositivo separado tem estado de atividade separado; signOut remoto da aplicação não é garantido somente por este marcador.

## Dados e contratos afetados

- Campo opcional `users/{uid}/settings/profile.sessionIdleTimeoutMinutes` (`0 | 15 | 30 | 60`).
- Persistência Firebase Auth localStorage; não muda API pública, Functions ou schema MCP.

## Impacto na documentação

- Guias/specs existentes revisados: `browser-local-data-encryption`, `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md`, `README.md`, skill de segurança.
- Documentação atualizada: comportamento de persistência e expiração, escolha sem limite e riscos do localStorage.
- Índices, exemplos, comandos ou links: índice de specs atualizado; links desta spec apontam para arquivos ativos.
- Impacto no Copiloto (Gemini): não impactado; a sessão da aplicação é controlada pelo Auth compartilhado e a função não muda ferramentas, contexto ou permissões do Copiloto.
- Impacto no MCP/ChatGPT: não impactado; OAuth, tokens, ferramentas, escopos e autorização remota permanecem inalterados.
- Diferenças de comportamento Copiloto/MCP: não aplicável.

## Decisões e dúvidas

- **Confirmado:** “Desativado — sem limite” desativa exclusivamente logout automático por inatividade e é preferência da conta autenticada compartilhada entre suas abas, não política para toda a organização.
- **Confirmado:** `browserLocalPersistence` usa localStorage, não IndexedDB; `indexedDBLocalPersistence` é uma persistência distinta.
- **Em aberto:** validação autenticada em navegador após implementação.

## Validação

- Executar `npm run typecheck` e `git diff --check`.
- Revisar fluxo de atividade/expiração e documentação; testes automatizados não solicitados nesta etapa.

## Evidências de conclusão

- Implementação local concluída; `npm run typecheck` e `git diff --check` passaram.
- Validação autenticada em navegador e deploy continuam pendentes; não houve commit/publicação nesta etapa.
