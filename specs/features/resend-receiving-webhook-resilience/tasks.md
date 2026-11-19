# Tarefas — Resiliência do recebimento de e-mails

- [x] Implementar autenticação HMAC do encaminhamento interno entre ambientes.
- [x] Liberar claims e retornar falha quando o encaminhamento não concluir com sucesso.
- [x] Externalizar corpo grande para Storage e adicionar tamanho/estado explícitos no documento.
- [x] Carregar corpo externalizado na interface de e-mails e manter prévia para pesquisa.
- [x] Mostrar texto/prévia antes de esperar pelo HTML, limitar espera do Storage e expor código da falha para diagnóstico (implementado localmente; publicação DEV pendente).
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
- Reprocessamento real dos eventos de 29/10 e 05/11 em DEV: objetos HTML/texto persistidos; os dois continuam pendentes de validação visual autenticada. O print de 05/11 mostrou falha de leitura no cliente.
- Revisão do incidente: Storage Rules publicadas correspondem ao arquivo versionado e os objetos existem. A causa específica da falha na sessão ainda não foi identificada; este ajuste acrescenta prévia imediata, timeout e código de erro para facilitar o diagnóstico após a publicação.
- Correção da tela: `npm run typecheck` passou e `npx vitest run --reporter=verbose tests/unit/email-service.test.ts` passou com 21 testes.

## Deploy anterior em DEV

- Commit `eefce967f547977fd949fcc50d3aa43834281a21` publicado em `develop`.
- [Workflow Firebase DEV](https://github.com/ccesargarcia/luisices/actions/runs/44439048710) — sucesso; publicou Hosting, Functions e Storage Rules.
- [Workflow Vercel Dev/Beta](https://github.com/ccesargarcia/luisices/actions/runs/44439048730) — sucesso.
- Deploy não alterou produção nem Cloudflare Workers. A alteração atual na interface ainda não foi publicada.
