# Plano de implementação — password-reset-fallback-idempotency

## Abordagem

Gerar uma chave por submissão no serviço de autenticação e fechar o payload sobre essa mesma chave nos dois caminhos existentes. A callable aceita o campo opcional, reserva uma tentativa transacional no Firestore e passa uma chave derivada ao Resend. Estados concluídos são devolvidos sem reenviar; estados ambíguos após contato potencial com provedor bloqueiam a repetição. Falhas anteriores a esse ponto podem liberar a reserva.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Cliente | `src/services/firebaseAuthService.ts` | Gerar UUID uma vez e incluir em Beta e GCP |
| Backend de usuários | `functions/users/index.js` | Aplicar o rate limiter existente antes de gravar a tentativa, validar chave opcional, controlar estados e passar chave ao Resend |
| Idempotência de reset | `functions/users/passwordResetIdempotency.js` | Novo helper isolado com transações e hashes |
| Testes | `tests/unit/users-service-routing.test.ts` | Confirmar mesma chave em Beta e fallback |
| Testes | `tests/unit/password-reset-idempotency.test.ts` | Confirmar replay, concorrência, incerteza, retry pré-provedor e privacidade |
| Documentação | `specs/features/README.md` e esta pasta | Registrar escopo, decisão, impacto de IA e validações |

## Contratos, dados e compatibilidade

- Contratos/API/schema: campo `idempotencyKey` opcional em `sendPasswordResetEmail`; resposta e campos atuais são preservados também em replay.
- Dados/migração: cria documentos futuros em `passwordResetRequests`; sem migração de documentos existentes.
- Integrações/ambientes: mesma coleção do Firebase Admin usada em Beta/GCP; nenhum endpoint, Worker, segredo, DNS ou workflow de publicação será modificado.

## Segurança e integridade

- Autorização e ownership: callable continua pública como já é hoje; chave não autentica nem autoriza.
- Validação/redação/limites: valida sintaxe de 8–128 caracteres; guarda hashes em vez de email/chave/token; mantém rate limiter e resposta anti-enumeração; remove o e-mail do log de rate limit.
- Transações/idempotência/valores: registro Firestore com owner, lease de 2 minutos e states `processing`, `failed`, `uncertain`, `completed`; marcar antes da chamada ao Resend; Resend recebe chave derivada. Uma falha depois da marcação bloqueia repetição automática.
- Ameaças/casos de abuso: duas execuções concorrentes, timeout depois de o provedor aceitar, repetição entre runtimes Beta/GCP, colisão/reuso de chave para outro e-mail e tentativa com chave malformada.

## UX e documentação

- UI/acessibilidade/design system: nenhuma mudança visual; formulário preserva mensagem neutra.
- Documentação viva: spec atualizada e catálogo de specs.
- Índices e links: conferir link da spec no catálogo.
- Copiloto (Gemini): sem impacto, pois não participa da recuperação de senha.
- MCP/ChatGPT: sem impacto, pois nenhuma ferramenta MCP invoca essa callable.
- Compatibilidade/paridade: não aplicável; não há integração Copiloto/MCP nesse domínio.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Testes: `npm --prefix functions run lint` e testes focados de idempotência/roteamento.
- Risco e mitigação: resultado incerto pode exigir que a pessoa verifique caixa de entrada/spam em vez de reenviar automaticamente; nova submissão explícita cria nova chave e preserva a ação deliberada do usuário.

## Reversão

O código aceita clientes antigos sem a chave, então o rollback do frontend/backend mantém compatibilidade. A coleção de registros não é apagada; contém somente valores derivados e estados operacionais. Nenhum recurso Beta publicado é removido nem substituído por esta implementação local.
