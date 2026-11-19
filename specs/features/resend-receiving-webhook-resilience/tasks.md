# Tarefas — Resiliência do recebimento de e-mails

- [x] Implementar autenticação HMAC do encaminhamento interno entre ambientes.
- [x] Liberar claims e retornar falha quando o encaminhamento não concluir com sucesso.
- [x] Externalizar corpo grande para Storage e adicionar tamanho/estado explícitos no documento.
- [x] Carregar corpo externalizado na interface de e-mails e manter prévia para pesquisa.
- [x] Remover objetos de Storage em exclusões definitivas e manter compatibilidade com registros antigos.
- [x] Ajustar Storage Rules e adicionar cobertura de autorização.
- [x] Adicionar testes unitários de segurança e persistência; validar Rules no emulador.
- [x] Atualizar documentação e registrar impacto no Copiloto/MCP.
- [x] Executar typecheck, lint e testes focados; registrar resultados reais.

## Validação local

- `npm run typecheck` — passou.
- `npm --prefix functions run lint` — passou; 110 arquivos verificados.
- Testes unitários focados — 39 testes passaram; `functions-startup.test.ts` — 33 testes passaram.
- Emuladores Firestore/Storage, `email-permissions.test.ts` — 7 testes passaram.
- `git diff --check` — passou.
- Nenhum deploy, alteração de secrets ou chamada real ao Resend foi executada.

## Pré-requisitos externos antes de publicar

- Configurar `DEV_RESEND_WEBHOOK_SECRET` e `PROD_RESEND_WEBHOOK_SECRET` com o mesmo segredo vigente do endpoint único no painel Resend. Não compartilhar esse valor em chat ou commit.
- Publicar primeiro as Storage Rules e a Function `resendReceivingWebhook` em DEV; validar mensagem pequena, mensagem HTML grande e encaminhamento; só então avaliar produção.
