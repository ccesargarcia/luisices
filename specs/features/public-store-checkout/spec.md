# Pedido público da loja

- **ID:** `public-store-checkout`
- **Status:** Pronta (baseline do comportamento atual)
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-12
- **Referências:** `docs/FUNCIONALIDADES.md`; `docs/MODELAGEM_AMEACAS_SEGURANCA.md`; `functions/README.md`; `functions/orders/catalog.js`; `functions/orders/index.js`; `functions/common/rateLimiters.js`; `src/app/pages/PublicCatalog.tsx`; `src/app/pages/StoreOrders.tsx`; `src/services/firebaseCatalogOrderService.ts`; `firestore.rules`; `tests/unit/public-checkout-callable.test.ts`; `tests/e2e/store-checkout.spec.ts`.

## Problema e contexto

A vitrine pública permite consultar produtos publicados, montar uma sacola e solicitar uma encomenda. O backend persiste uma entrada em `catalogOrders` após recalcular os valores a partir do catálogo e verificar as configurações da loja. A interface então apresenta um texto de WhatsApp pré-preenchido para o cliente.

Esta spec consolida o fluxo existente, incluindo o recebimento e a conversão administrativa da encomenda em pedido interno. Não propõe mudanças funcionais. Código local e testes não comprovam que Workers, secrets, regras WAF ou Functions estejam publicados em determinado ambiente.

## Objetivos

- Registrar o caminho entre vitrine, confirmação da sacola, histórico da loja, contato via WhatsApp e conversão para produção.
- Definir critérios de regressão para preço oficial, disponibilidade, pedido mínimo, limites de abuso, idempotência e autorização.
- Evitar que a interface ou o texto de WhatsApp sejam tratados como fonte de verdade financeira ou confirmação de compra.

## Fora de escopo

- Pagamento online, cobrança, confirmação de venda ou reserva/baixa de estoque.
- Edição/publicação de produtos e personalização completa da loja, salvo as configurações que governam disponibilidade e pedido mínimo.
- Pedido da loja criado por outros canais, como Alexa/MCP, e integrações de frete.
- Redesenho da política de rate limiting, configuração de Cloudflare/WAF, migração de documentos ou publicação remota.

## Atores e permissões

| Ator | Ações no fluxo | Restrições observadas |
|---|---|---|
| Visitante público | Consultar a projeção pública do catálogo, enviar uma encomenda e abrir uma conversa preparada no WhatsApp. | Não precisa de perfil de usuário Firebase para submeter; não grava `catalogOrders` diretamente no Firestore. O envio do formulário não comprova que a mensagem foi enviada no WhatsApp. |
| Administrador/gestor da loja | Consultar, acompanhar, atualizar e excluir encomendas da loja; converter uma encomenda em pedido de produção. | A leitura e gestão do histórico exigem perfil ativo e papel/permissão autorizados pelas Rules. A conversão também valida autorização no caminho oficial de criação de pedido. |
| Funcionário autorizado | Consultar e gerir pedidos da loja quando a permissão ampla `store` estiver habilitada. | A regra de `catalogOrders` usa a permissão `store`; uma permissão somente de `storeProducts` não concede acesso ao histórico de encomendas. |

## Requisitos funcionais observados

- **RF-1 — Projeção pública:** `getPublicCatalogProducts` devolve uma allowlist de campos necessários à vitrine; não entrega documentos completos de `storeProducts`. Produtos publicados como `active` ou `paused` podem aparecer na projeção; somente `active` é aceito para nova encomenda. Produtos ocultos/ inválidos ficam fora do resultado.
- **RF-2 — Disponibilidade da vitrine:** se `storeSettings/public` não existe ou a loja tem `storePublished === false`, a callable de leitura devolve lista vazia. A configuração pública é legível pelas Rules, portanto esse documento só pode conter campos destinados a leitura pública.
- **RF-3 — Sacola e confirmação:** a página mantém sacola no `localStorage` e observações da encomenda na sessão do navegador. Ao confirmar, registra primeiro a encomenda via `submitPublicCatalogOrder`; somente após sucesso mostra o código oficial e monta/abre um link `wa.me`. Se o popup for bloqueado, oferece o link para abertura manual. Uma encomenda registrada não prova que o visitante enviou a mensagem ou concluiu a compra.
- **RF-4 — Dados recebidos:** a submissão persiste itens verificados, quantidades, personalização aceita, observações, subtotal oficial, subtotal submetido, código, status e indicadores de verificação. O endpoint atual não persiste nome ou telefone do visitante. Dados de contato são preenchidos no fluxo interno quando a equipe converte a encomenda.
- **RF-5 — Preço e item oficiais:** o cliente envia IDs e quantidades; o backend relê `storeProducts`, exige produto existente e ativo e usa nome/preço/imagem oficiais. Preços e nomes enviados pelo cliente não determinam o registro. A quantidade por linha é inteiro entre 1 e 100; a submissão aceita de 1 a 50 linhas distintas. Valores são acumulados em centavos seguros.
- **RF-6 — Pedido mínimo e preço alterado:** o backend exige configuração existente da loja, respeita publicação e flags de desativação de encomendas, valida o mínimo configurado e compara `submittedSubtotal` com o total recalculado. Se o preço mudou desde a exibição, rejeita com conflito e solicita revisão da sacola; não grava uma encomenda com total diferente sem confirmação do cliente.
- **RF-7 — Sanitização:** notas do cliente são limitadas e caracteres de controle são removidos antes de persistir. Personalização textual aceita também é limitada e sanitizada. O backend compõe a imagem a partir do produto oficial, não da URL fornecida pelo cliente.
- **RF-8 — Idempotência:** a interface deriva uma chave da intenção da sacola/observações e guarda a tentativa em `sessionStorage`. No backend, chave válida cria ID determinístico por hash da chave e a gravação usa transação; repetição compatível retorna o registro existente e conteúdo diferente com a mesma chave é recusado. Sem chave válida, é criado ID aleatório, sem a mesma garantia de replay determinístico.
- **RF-9 — Limite de abuso:** antes de consultar/gravar dados da encomenda, a callable consome um limitador de 10 tentativas por 15 minutos, por IP confiável, usando `RateLimiterMemory`. Esse estado é local à instância e não é compartilhado de forma distribuída. A documentação/configuração disponível não comprova rate limit Cloudflare/WAF específico para o checkout; limites do endpoint de acompanhamento não devem ser atribuídos ao checkout.
- **RF-10 — Firestore:** regras negam criação direta em `catalogOrders` para anônimos e usuários autenticados. Leitura, atualização e exclusão do histórico exigem perfil ativo e admin ou permissão da loja. A gravação pública passa pela callable com Admin SDK.
- **RF-11 — Gestão e estados:** a tela interna lista/escuta o histórico, permite atualizar status (`received`, `in_contact`, `converted`, `cancelled`) e excluir o registro. A exclusão é definitiva no fluxo atual. A disponibilidade dos controles depende da autorização da tela e das Rules.
- **RF-12 — Conversão em produção:** pessoa autorizada informa os dados de atendimento necessários (nome, telefone e entrega) e a equipe converte pelo caminho de `createOrder`, associando o `catalogOrderId`. A transação cria pedido/ledger e marca a encomenda como convertida com referência ao pedido. Pedidos legados sem `verifiedByServer` têm preço recalculado contra o catálogo antes da conversão; pedidos verificados usam os valores oficiais persistidos na submissão. Repetir conversão reconhece o vínculo existente em vez de criar outro pedido.

## Critérios de aceitação do baseline

- **CA-1 (RF-1, RF-2):** leitura pública não expõe campos internos do produto; loja ausente ou não publicada não apresenta produtos; produto `paused` pode ser exibido, mas não pode ser submetido.
- **CA-2 (RF-3, RF-4):** submissão bem-sucedida mostra o código retornado pelo servidor e apresenta o link WhatsApp; bloqueio do popup não perde a confirmação. Registro não é descrito como mensagem enviada nem como venda paga.
- **CA-3 (RF-5):** adulterar preço/nome/imagem enviados pelo cliente não altera o preço ou metadados oficiais persistidos; produto inativo/inexistente, quantidade inválida ou limites de carrinho excedidos são recusados sem documento criado.
- **CA-4 (RF-6):** loja desabilitada, configuração ausente/inválida, subtotal abaixo do mínimo ou total desatualizado impedem persistência; preço desatualizado exige revisão antes de nova confirmação.
- **CA-5 (RF-7):** caracteres de controle e strings excessivas não chegam sem sanitização ao registro; imagem persistida vem do produto oficial.
- **CA-6 (RF-8):** retry com mesma chave e payload confirmado devolve o mesmo ID/código sem duplicar; mesma chave com conteúdo diferente falha; uma nova intenção de compra gera chave diferente.
- **CA-7 (RF-9):** rate limiter é consumido antes de operações de Firestore e excesso resulta em rejeição. Documentação de produto não descreve o limitador em memória como distribuído nem garante proteção de borda para checkout sem configuração comprovada.
- **CA-8 (RF-10):** escrita direta em `catalogOrders` é negada a anônimos e autenticados; operador sem perfil ativo/permissão da loja não pode consultar ou gerir o histórico.
- **CA-9 (RF-11, RF-12):** status e exclusão só mudam pelo operador autorizado; conversão cria no máximo um pedido interno vinculado e persiste o vínculo de conversão. Dados legados sem verificação server-side são revalidados antes de virarem pedido de produção.
- **CA-10 (RF-4, RF-12):** dados de contato inseridos durante a conversão passam a compor o pedido interno, mas a submissão pública inicial não afirma armazenar o nome ou telefone do visitante.

## Requisitos não funcionais e integridade

- **Confiança:** o navegador não é fonte de verdade para preço, disponibilidade, subtotal final, dados de produto ou autorização de gravação.
- **Privacidade:** minimizar dados do visitante persistidos; notas e personalização são entrada não confiável e devem permanecer sanitizadas nos registros e mensagens.
- **Disponibilidade:** chamadas usam o caminho configurado do Firebase/Cloudflare conforme o cliente. Código local e CORS não provam configuração de gateway, `ORIGIN_SECRET`, WAF ou deployment.
- **Abuso/custo:** manter limites de tamanho/quantidade e medir o risco residual de `RateLimiterMemory` por instância. Se a arquitetura de proteção mudar, especificar controles distribuídos/edge e validar ambientes antes de anunciar cobertura.
- **Integridade:** o registro público e a conversão interna são operações distintas. A conversão não pode alterar a verdade financeira do pedido interno nem duplicar ledger/estatísticas.

## Erros e casos-limite

- Configuração pública inexistente ou com pedido desabilitado; mínimo inválido.
- Produto apagado, oculto, pausado, com preço inválido ou alterado após o carrinho ser exibido.
- Quantidade fracionária/zero/negativa/acima do máximo, ID inválido, sacola vazia ou acima de 50 linhas.
- Subtotal enviado em formato inválido ou divergente do total recalculado.
- Chave inválida, repetida com payload distinto, replay após falha de rede ou sessionStorage indisponível.
- Limitador excedido, IP não confiável, timeout, falha ao gravar e popup de WhatsApp bloqueado.
- Operador sem permissão, pedido já convertido, produto legado removido ou divergência de preço em documento antigo.
- Exclusão definitiva de um pedido da loja e risco de perder a trilha de atendimento antes da conversão.

## Dados e contratos afetados

- Leitura pública: callable `getPublicCatalogProducts`; escrita pública: callable `submitPublicCatalogOrder`.
- Firestore: `storeSettings/public`, `storeProducts/{productId}`, `catalogOrders/{orderId}`. Conversão cria `orders/{orderId}`, `salesLedger/{orderId}` e atualiza cliente/contador conforme o contrato de pedidos internos.
- Resposta de confirmação: `orderId`, `orderCode`, `subtotal`, `totalItems`, `verifiedByServer`, `isIdempotentReplay`.
- Estado de atendimento: `received | in_contact | converted | cancelled`.
- Mensagem WhatsApp é um link profundo gerado no navegador; seu envio depende de ação do usuário no serviço externo.

## Decisões e dúvidas

- **Confirmado:** checkout cria `catalogOrders` antes de abrir WhatsApp e não coleta/persiste nome/telefone nesse endpoint.
- **Confirmado:** `RateLimiterMemory` está configurado para 10 tentativas/15 minutos/IP no código, mas o estado não é distribuído.
- **Confirmado:** o skill Cloudflare e os documentos consultados identificam proteção edge para tracking; isso não comprova uma regra WAF para o checkout.
- **Confirmado:** cliente e telefone são fornecidos pela equipe ao converter para o pedido interno.
- **Em aberto:** política de retenção e prazo de exclusão dos registros não está estabelecida nesta spec.
- **Em aberto:** limites efetivos, regras WAF, estado de Secrets/Workers e rate limit remoto precisam ser verificados por ambiente antes de mudar ou anunciar postura operacional.
- **Em aberto:** a composição integral do documento público `storeSettings/public` deve continuar restrita a configurações que podem ser lidas anonimamente; alterações nesse schema requerem revisão de privacidade.

## Validação

- Revisão documental e das fontes de código listadas acima.
- `npm run typecheck` e `git diff --check` para esta alteração documental.
- Para mudanças futuras do checkout: `tests/unit/public-checkout-callable.test.ts`, `tests/unit/security-hardening.test.ts`, `tests/unit/security-attack-simulations.test.ts`, `tests/e2e/store-checkout.spec.ts` e validação no emulador/ambiente compatível conforme o domínio alterado.

## Evidências de conclusão

- `<preencher após validação desta baseline documental>`
