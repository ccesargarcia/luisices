# Plano — gallery-media-beta-gateway

## Abordagem

Encaminhar a Function de mídia privada da Vercel pelo Worker Beta, preservando a resposta em stream e a política de CORS por origem. Adicionar o guard de origem antes da inicialização Firebase no Vercel e trocar somente a URL do caminho Vercel da galeria no host Beta.

Fazer rollout em duas etapas: publicar primeiro allowlist e binding dedicado no Worker; após confirmar que a rota responde via `api.beta`, publicar em Vercel o guard e a mudança do cliente juntos. O fluxo GCP e `api.dev` ficam fora do escopo.

## Componentes existentes

| Área | Arquivos/módulos | Alteração |
|---|---|---|
| Gateway Beta | `cloudflare/api-beta-worker/src/index.js`, `wrangler.toml` | Rota GET/HEAD, CORS restrito por origem, rate limit dedicado e preservação do stream |
| Function Vercel | `api/gallery-media.ts`, `api/_firebaseAdmin.ts` | Exigir segredo Beta antes de inicializar Admin e manter status 403 sem alterar erros de mídia existentes |
| Cliente | `src/services/firebaseGalleryImageService.ts`, `src/app/utils/betaHost.ts` | Usar `api.beta` somente no caminho Vercel e somente no host Beta |
| Testes | `tests/unit/api-beta-worker.test.ts`, `tests/unit/gallery-media.test.ts` e teste novo para guard/API URL | Cobrir CORS, forwarding, stream, rate limit, origem e regressão de autorização |
| Documentação/spec | `docs/VERCEL_BETA_ROUTING.md`, `specs/features/gallery-media-beta-gateway/*`, `specs/features/README.md` | Registrar rota, limites, sequência de rollout e evidências |

## Segurança e integridade

- Autorização final permanece em `functions/media/galleryCore.js`; o Worker não decide ownership/permissões.
- Segredo Beta validado antes de obter Firebase Admin; segredo não é enviado pelo navegador.
- Bearer e query são encaminhados. CORS da galeria é específico por origem e `Vary: Origin` deve permanecer.
- Resposta é um stream privado. Não cachear, converter para JSON, materializar em `arrayBuffer()` ou mudar `Content-Type`/tamanho.
- Rate limit próprio de 240/min/IP/path para não aplicar os 30/min usados no checkout/rastreamento.
- Reversão: o flag `galleryMedia` pode voltar a `gcp`; Worker route pode ser removida numa alteração Beta isolada sem modificar `api.dev`.

## Validação

- `npm run typecheck`
- `CI=true ./node_modules/.bin/vitest run --reporter=verbose tests/unit/api-beta-worker.test.ts tests/unit/gallery-media.test.ts tests/unit/gallery-media-api.test.ts tests/unit/beta-host.test.ts`
- `git diff --check`
- Verificação remota depois de cada etapa e confirmação que o workflow de Dev não publicou Cloudflare Worker ou Cloud Functions.

## Impacto em IA e documentação

- Copiloto (Gemini): nenhum; fluxo e ferramentas não chamam esta URL de mídia por esse serviço.
- MCP/ChatGPT: nenhum; schema, OAuth, ferramentas e autorizações MCP não mudam.
- Nenhuma alteração de UI/design é prevista; somente o transporte HTTP do serviço de galeria muda no host Beta.
