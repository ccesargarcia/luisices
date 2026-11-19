# Tarefas — Resiliência do recebimento de e-mails

- [x] Implementar autenticação HMAC do encaminhamento interno entre ambientes.
- [x] Liberar claims e retornar falha quando o encaminhamento não concluir com sucesso.
- [x] Externalizar corpo grande para Storage e adicionar tamanho/estado explícitos no documento.
- [x] Carregar corpo externalizado na interface de e-mails e manter prévia para pesquisa.
- [x] Mostrar texto/prévia antes de esperar pelo HTML, limitar espera do Storage e expor código da falha para diagnóstico; publicado em DEV/Beta.
- [x] Remover objetos de Storage em exclusões definitivas e manter compatibilidade com registros antigos.
- [x] Ajustar Storage Rules e adicionar cobertura de autorização.
- [x] Configurar CORS do bucket DEV somente para GET de `dev.luisices.com.br` e `beta.luisices.com.br`; incluir aplicação idempotente no workflow.
- [x] Adicionar testes unitários de segurança e persistência; validar Rules no emulador.
- [x] Atualizar documentação e registrar impacto no Copiloto/MCP.
- [x] Executar typecheck, lint e testes focados; registrar resultados reais.

## Validação local

- `npm run typecheck` — passou.
- `npm --prefix functions run lint` — passou; 110 arquivos verificados.
- Testes unitários focados — 39 testes passaram; `functions-startup.test.ts` — 33 testes passaram.
- Emuladores Firestore/Storage, `email-permissions.test.ts` — 7 testes passaram.
- `git diff --check` — passou.
- Reprocessamento real dos eventos de 29/10 e 05/11 em DEV: objetos HTML/texto persistidos. O print autenticado de 05/11 mostrou erro de leitura do Storage no cliente.
- Revisão do incidente: Storage Rules publicadas correspondem ao arquivo versionado, os bundles DEV/Beta apontam para o bucket DEV correto e os objetos existem. A causa específica da rejeição na sessão ainda precisa do código real do Firebase, agora exposto pela interface.
- Diagnóstico do timeout: a chamada usa `getBytes()` no navegador, que exige CORS no bucket. O bucket DEV estava sem política CORS; a política restrita foi aplicada e a leitura de configuração confirmou apenas `https://dev.luisices.com.br` e `https://beta.luisices.com.br` com GET. A confirmação final será o carregamento autenticado na interface.
- Correção da tela: `npm run typecheck` passou e `npx vitest run --reporter=verbose tests/unit/email-service.test.ts` passou com 21 testes.
- Commit `4518390` publicado em `develop`; [workflow Firebase DEV](https://github.com/ccesargarcia/luisices/actions/runs/44443889719) e [workflow Vercel Dev/Beta](https://github.com/ccesargarcia/luisices/actions/runs/44443892694) passaram. Os bundles em ambos os endereços foram conferidos e contêm a leitura progressiva e o diagnóstico.

## Deploy anterior em DEV

- Commit `eefce967f547977fd949fcc50d3aa43834281a21` publicado em `develop`.
- [Workflow Firebase DEV](https://github.com/ccesargarcia/luisices/actions/runs/44439048710) — sucesso; publicou Hosting, Functions e Storage Rules.
- [Workflow Vercel Dev/Beta](https://github.com/ccesargarcia/luisices/actions/runs/44439048730) — sucesso.
- Deploy não alterou produção, Cloudflare Workers, Functions nem Storage Rules nesta segunda publicação.
