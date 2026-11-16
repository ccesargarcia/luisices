# Galeria privada pelo gateway Beta

- **ID:** `gallery-media-beta-gateway`
- **Status:** Concluída (validação sem stream autenticado remoto)
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-16
- **Referências:** `docs/VERCEL_BETA_ROUTING.md`; `functions/media/gallery.js`; `functions/media/galleryCore.js`; `api/gallery-media.ts`; `src/services/firebaseGalleryImageService.ts`; `src/services/backendRoutingService.ts`; `tests/unit/gallery-media.test.ts`; `cloudflare/api-beta-worker/src/index.js`.

## Problema e contexto

No host Beta, quando `galleryMedia` é roteada à Vercel, a interface chama `GET /api/gallery-media` no próprio domínio Beta. A Function Vercel usa o núcleo da galeria privada, mas atualmente permite origem direta e não passa pelo rate limit ou CORS do Worker `functions-beta`.

## Objetivos

- Fazer a rota Vercel de mídia privada passar por `api.beta.luisices.com.br` no host Beta.
- Impedir bypass direto da Function Vercel com segredo de origem.
- Preservar streaming, autenticação Firebase, perfil ativo, permissão `gallery.view`, ownership e cache privado.
- Preservar a lista de origens CORS autorizadas; o Worker não deve substituir CORS da galeria por `Access-Control-Allow-Origin: *`.
- Manter roteamento GCP/fallback e `api.dev` sem alterações.

## Fora de escopo

- Alterar permissões, regras do Firestore/Storage ou formato de URL dos arquivos.
- Migrar o endpoint da galeria de `api.dev` ou alterar qualquer Worker/Function de Dev compartilhado.
- Mudar a política de armazenamento ou exposição de imagens.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário autenticado | Ler imagem que possa acessar segundo perfil e regra de ownership/permissão | Perfil inativo, token inválido/revogado ou ausência de `gallery.view` resultam em negação |
| Worker Beta | Encaminhar GET/HEAD com segredo de origem, bearer token e query original | Não autentica o usuário nem contorna a autorização do núcleo da galeria |
| Acesso direto à Vercel | Nenhum | Sem segredo de origem, recebe 403 antes de inicializar Firebase Admin |

## Requisitos funcionais

- **RF-1 — Roteamento:** quando `galleryMedia` usar Vercel em `beta.luisices.com.br` ou `loja.beta.luisices.com.br`, o cliente chama `https://api.beta.luisices.com.br/api/gallery-media` preservando `itemId`/`path` e `Authorization: Bearer`. Fora do Beta, o roteamento GCP atual permanece.
- **RF-2 — Allowlist e métodos:** o Worker Beta encaminha somente `GET` e `HEAD` em `/api/gallery-media`; os demais métodos recebem 405 e rotas não listadas permanecem negadas.
- **RF-3 — Proteção da origem:** o Worker injeta `x-beta-edge-secret`; a Function Vercel valida `BETA_VERCEL_ORIGIN_SECRET` em tempo constante antes de inicializar Firebase Admin. A chamada direta sem segredo recebe 403.
- **RF-4 — Autorização da mídia:** o núcleo existente continua verificando bearer token Firebase, revogação, status ativo, permissão de galeria, ownership e caminho do Storage.
- **RF-5 — Stream e cache:** respostas mantêm o stream sem buffering, `Content-Type`, `Content-Length`, `X-Content-Type-Options`, `Cross-Origin-Resource-Policy` e `Cache-Control: private, no-store`.
- **RF-6 — CORS:** para a rota de galeria, o Worker preserva `Vary: Origin` e ACAO apenas para origens aceitas pelo núcleo (`*.luisices.com.br`, previews Vercel cujo hostname contém `luisices` e localhost HTTP); nunca usa wildcard nessa rota. Preflight não autorizado não recebe ACAO.
- **RF-7 — Limite de borda:** a galeria usa binding próprio de 240 requisições por minuto por IP/caminho, separado do limite de 30/minuto das APIs de pedidos; o contador Cloudflare é aproximado por localização.

## Critérios de aceitação

- **CA-1 (RF-1, RF-2):** URL Beta usa `api.beta`; URL fora do Beta continua no caminho atual; Worker encaminha GET/HEAD, query, Authorization e stream, e nega método/rota não allowlisted.
- **CA-2 (RF-3):** acesso direto à Function Vercel sem segredo ou com segredo incorreto falha em 403 antes de inicializar Firebase Admin.
- **CA-3 (RF-4):** os testes existentes continuam negando token ausente/inválido, perfil inativo, acesso sem permissão e caminhos que não pertencem ao item/usuário.
- **CA-4 (RF-5):** o stream e cabeçalhos de mídia/cache são preservados, sem converter o corpo em buffer.
- **CA-5 (RF-6):** origens Beta e localhost autorizados recebem ACAO exato; origem externa e respostas de erro não recebem wildcard.
- **CA-6 (RF-7):** binding da galeria é separado e responde 429 ao exceder o limite, sem compartilhar o bucket de 30/minuto.
- **CA-7:** deploy modifica somente `functions-beta` e a associação `api.beta`; `api.dev` e contratos Copiloto/MCP permanecem sem alterações.

## Compatibilidade e impactos

- O payload é binário de imagem e não muda. O cliente mantém `Blob`, cache LRU por sessão e deduplicação de chamadas.
- O fallback existente continua apontando para o endpoint GCP de Dev quando aplicável; nenhum endereço de `api.dev` será editado.
- Copiloto (Gemini): sem impacto; ferramentas, payloads, permissões e dados permanecem iguais.
- MCP/ChatGPT: sem impacto; endpoints, schema, escopos OAuth e permissões permanecem iguais.

## Validação e evidências

- Testes focados do Worker Beta e do guard Vercel, mais `tests/unit/gallery-media.test.ts`.
- `npm run typecheck` e `git diff --check`.
- Publicar primeiro a allowlist/binding Beta e validar a resposta sem autenticação no gateway; depois publicar o guard Vercel e o cliente Beta.
- Após os deploys, confirmar CORS, status 401 pelo gateway sem bearer, 403 direto na Vercel, e os workflows com deploy de Worker/Function `api.dev` skipped.
- Não executar leitura de imagem real em produção sem um token Firebase de teste e uma imagem de teste autorizados.

## Decisões e dúvidas

- **Confirmado:** o núcleo existente já verifica token, status ativo, permissão, ownership e formato do caminho antes de abrir o stream.
- **Confirmado:** o CORS atual é uma allowlist de origens e a resposta é `private, no-store`.
- **Decisão:** o gateway Beta manterá CORS restrito e usará binding próprio de rate limit; o IP é usado apenas como bucket de abuso edge, com limite alto para reduzir falsos positivos em redes compartilhadas.
- **Estado do rollout:** Worker publicado no workflow `43979971225`; Function Vercel e cliente Beta publicados no workflow `43980295334` (sucesso). Pós-deploy: preflight em `api.beta` retornou 204 com ACAO exato para `https://beta.luisices.com.br`; origem externa recebeu 403 sem ACAO; GET sem bearer retornou 401 pelo gateway; acesso direto a `https://beta.luisices.com.br/api/gallery-media` sem segredo retornou 403. O workflow de Dev `43980295217` marcou os jobs `Deploy Cloudflare Workers (Dev)` e `Deploy Firebase Functions (Dev)` como skipped; o build/deploy do Frontend (Dev) rodou por mudanças em `src`, sem publicar Worker/Function de `api.dev`. Não foi solicitada uma imagem nem token de teste, então o stream autenticado não foi validado remotamente. O build Vite registrou `vendor-firebase` com 1.113,91 kB não comprimidos (266,56 kB gzip); o limite de aviso foi ajustado de 1.000 para 1.200 kB, sem alterar o código de divisão de chunks.
