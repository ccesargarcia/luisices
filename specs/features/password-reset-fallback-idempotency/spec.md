# Idempotência na recuperação de senha com fallback Beta → GCP

- **ID:** `password-reset-fallback-idempotency`
- **Status:** Concluída (implementação local; sem publicação)
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-17
- **Referências:** `src/services/firebaseAuthService.ts`; `functions/users/index.js`; `functions/users/passwordResetIdempotency.js`; `api/users-admin.ts`; `src/services/backendRoutingService.ts`; `specs/features/users-beta-gateway/spec.md`.

## Problema e contexto

No host Beta, uma falha de transporte ou HTTP 5xx em `POST /api/users-admin` pode acionar a mesma recuperação de senha pela callable GCP. Se a primeira execução já tiver chegado ao Resend antes da falha, o fallback pode emitir outro link e uma segunda mensagem. O serviço de recuperação não possuía chave de repetição compartilhada entre os dois runtimes.

## Objetivos

- Reutilizar a mesma chave de tentativa no gateway Beta e no callable GCP.
- Deduplicar execuções com um registro transacional no Firestore, compartilhado por Vercel e Cloud Functions.
- Repassar ao Resend uma chave estável e não identificável para a tentativa.
- Bloquear repetição automática quando o estado do provedor for ambíguo, em vez de enviar uma segunda mensagem.
- Preservar a compatibilidade com clientes antigos que ainda não enviem a chave.

## Fora de escopo

- Alterar `api.beta`, Worker, DNS, segredo de origem, CORS, allowlist, domínio, configuração ou workflow de deploy Vercel/Cloudflare.
- Alterar `api.dev`, Functions Dev/produção, regras de acesso, formato de resposta pública ou fluxo de login.
- Mudar o rate limit atual ou a política de privacidade que evita enumeração de e-mails.
- Aplicar idempotência a outras ações do domínio de usuários.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Visitante solicitando recuperação | Enviar e-mail de recuperação pelo fluxo atual | Mantém validação/rate limit existentes; a chave só deduplica uma tentativa e não concede acesso |
| Gateway Beta / callable GCP | Compartilhar a mesma tentativa por um registro Firestore | Não pode repetir envio cuja chamada ao provedor já possa ter ocorrido |

## Requisitos funcionais

- **RF-1 — Chave de tentativa:** o cliente gera uma chave por submissão e envia o mesmo valor ao Beta e ao fallback GCP. Uma submissão intencional nova gera outra chave.
- **RF-2 — Registro compartilhado:** a callable valida a chave opcional e usa transação Firestore em `passwordResetRequests`; o identificador do documento é derivado por hash de e-mail normalizado e chave. Não persistir e-mail, token de redefinição ou chave bruta.
- **RF-3 — Replay concluído:** uma repetição com estado `completed` retorna o mesmo resultado armazenado sem gerar outro link ou chamar Resend/Evolution.
- **RF-4 — Replay concorrente/ambíguo:** chamada em processamento é rejeitada como `aborted`; depois de marcar a tentativa do provedor, falha ou timeout torna a operação `uncertain` e bloqueia novo envio para aquela chave.
- **RF-5 — Chamada segura ao Resend:** o valor derivado da chave também é enviado como chave de idempotência do Resend.
- **RF-6 — Compatibilidade:** ausência de `idempotencyKey` mantém o contrato e o comportamento de chamada legado.
- **RF-7 — Privacidade:** resposta de e-mail inexistente continua neutra, e mensagens/logs não passam a revelar o cadastro.

## Critérios de aceitação

- **CA-1 (RF-1):** teste comprova que Beta e GCP recebem a mesma chave numa tentativa com fallback.
- **CA-2 (RF-2, RF-3):** repetição concluída retorna o resultado sem incluir e-mail ou chave bruta no registro.
- **CA-3 (RF-4):** concorrência ativa e resultado incerto bloqueiam reenvio; erro anterior ao contato com provedor permite retry controlado.
- **CA-4 (RF-5):** chamada ao Resend recebe chave estável para a mesma tentativa.
- **CA-5 (RF-6, RF-7):** chamadas legadas sem chave continuam válidas e o resultado para e-mail não cadastrado não enumera contas.
- **CA-6:** typecheck, lint Functions, testes focados e `git diff --check` passam. Nenhum deploy ou alteração de configuração de roteamento é parte desta tarefa.

## Requisitos não funcionais e integridade

- Segurança/privacidade: persistir somente hashes, estado, timestamps, mensagem de resultado e ID do Resend; não persistir e-mail/token/chave bruta nem alterar autenticação pública/rate limits.
- Integridade/idempotência: a transação de reserva precisa preceder os efeitos externos; um resultado ambíguo após iniciar o provedor é tratado como incerto e não repetível com a mesma chave.
- Compatibilidade de API/dados: campo opcional aditivo; registros ficam na coleção `passwordResetRequests`, separados dos dados de perfil e convites.

## Erros e casos-limite

- Chave malformada: `invalid-argument`.
- Mesma chave/e-mail ainda em processamento: `aborted`.
- Tentativa anterior pode ter alcançado provedor: `failed-precondition`, com mensagem neutra orientando verificar o e-mail.
- Operação concluída: resposta neutra de sucesso e nenhum efeito externo novo.
- Falha antes de iniciar chamada ao provedor: liberar a reserva para retry do mesmo fluxo/chave.

## Dados e contratos afetados

- Callable `sendPasswordResetEmail`: aceita `idempotencyKey` opcional; campos de resposta existentes são preservados.
- Cliente `FirebaseAuthService.resetPassword`: adiciona chave ao payload Beta e callable GCP.
- Firestore: nova coleção `passwordResetRequests`; documento identificado por SHA-256 de e-mail normalizado + chave; campos sem PII bruta.

## Impacto na documentação

- Guias/specs revisados: `docs/VERCEL_BETA_ROUTING.md`, spec `users-beta-gateway`, fonte `backendRoutingService.ts` e código atual da callable.
- Documentação a atualizar: esta spec, plano, tarefas e índice `specs/features/README.md`.
- Índices, exemplos, comandos ou links afetados: catálogo de specs; sem alteração de guia público ou endpoint Worker.
- Impacto no Copiloto (Gemini): não impactado; fluxo de recuperação não usa o Copiloto, seus prompts, dados ou ferramentas.
- Impacto no MCP/ChatGPT: não impactado; MCP e escopos OAuth não chamam esta callable.
- Diferenças de comportamento Copiloto/MCP a preservar ou alterar: não aplicável.

## Decisões e dúvidas

- **Confirmado:** fallback Beta→GCP pode repetir operações após erro de transporte; o mesmo Firestore é acessível a ambos os runtimes.
- **Confirmado:** operações antigas sem chave permanecem suportadas para compatibilidade.
- **Proposto:** após marcar uma tentativa externa, qualquer resultado não concluído é considerado ambíguo e não permite retry com a mesma chave, para priorizar evitar duplicidade.
- **Em aberto:** nenhuma decisão bloqueante; validação autenticada/de produção não faz parte desta alteração local.

## Validação

- `npm run typecheck`
- `npm --prefix functions run lint`
- `npx vitest run tests/unit/password-reset-idempotency.test.ts tests/unit/users-service-routing.test.ts`
- `git diff --check`
- Revisar diffs para confirmar que Worker, `api/`, `.github/workflows/`, `vercel.json` e `api.dev` não foram alterados.

## Evidências de conclusão

- `npm run typecheck`: passou.
- `npm --prefix functions run lint`: passou; 108 arquivos JavaScript verificados.
- Suíte focada: 6 arquivos, 96 testes aprovados (`password-reset-idempotency`, roteamento/dispatcher de usuários, startup/coverage das Functions e Worker Beta).
- `git diff --check`: passou.
- Revisão do diff: nenhum arquivo em `api/`, `cloudflare/`, `.github/workflows/`, `vercel.json`, worker ou configuração de domínio/segredo foi alterado. Nenhum deploy, push ou publicação foi executado.
- Validação autenticada/remota não foi realizada; a mudança está apenas no workspace local.
