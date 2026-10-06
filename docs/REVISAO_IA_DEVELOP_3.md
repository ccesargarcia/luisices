# Terceira revisão da IA — develop

Data: 26/09/2026. Branch `develop`, HEAD `e1b9444` mais alterações locais. Revisão estática e execução de testes; nenhuma alteração na implementação.

## Parecer

Houve correções relevantes nas rodadas anteriores, mas ainda há riscos para produção, principalmente no controle de orçamento e no download de imagens. O relatório de implementação deve ser atualizado: os itens abaixo ainda não estão resolvidos.

## Correções confirmadas nesta rodada

- Chat carrega `MODEL_CONFIG` e não falha no caminho com telemetria.
- O agregado diário de uso consulta `ai_usage_daily`.
- Repositórios de clientes e galeria voltaram a considerar os vínculos adicionais de acesso.
- O cache exclui chamadas com ferramentas e resultados dinâmicos.
- O rascunho de cobrança vinculada a pedido usa o saldo oficial; texto livre não substitui esse saldo.
- O orçamento pessoal usa transação Firestore quando disponível.

## Pendências

### P1 — teto global de tokens não vale em produção

Em `functions/ai/budget.js`, o teto `DAILY_TOKENS_PROJECT_CEILING` só é verificado no fallback em memória. O caminho normal com Firestore verifica apenas o limite por usuário; portanto, o limite global pode ser excedido em produção. Além disso, o estado que associa reserva e reconciliação fica somente no `Map` do processo. Uma instância diferente ou reiniciada não consegue garantir idempotência da reconciliação/liberação.

**Correção:** reservar usuário e projeto atomicamente em documentos Firestore e persistir o identificador/estado da reserva, com reconciliação idempotente entre instâncias.

### P1 — URLs IPv6 privadas passam pela proteção contra SSRF

`isSafeImageUrl` bloqueia alguns hosts locais e faixas IPv4, mas não trata corretamente endereços IPv6. Reprodução com `http://[::1]/a`, `http://[fc00::1]/a` e `http://[::ffff:127.0.0.1]/a` retornou permitido. O downloader também chama `arrayBuffer()` antes de verificar o tamanho real; uma resposta sem `Content-Length` confiável pode alocar mais memória que o limite configurado.

**Correção:** aceitar apenas origens confiáveis de storage/CDN e ler o corpo em stream com limite de bytes aplicado durante a leitura.

### P1 — consultas de dados operacionais continuam truncadas

`functions/ai/repositories.js` limita pedidos, clientes, insumos, produtos e galeria (por exemplo, até 200 para admins e 50–100 por vínculo para usuários), sem paginação. Resumos e respostas podem ignorar registros além da amostra e retornar totais incompletos.

**Correção:** paginação no escopo autorizado; para agregados, calcular no servidor sobre o conjunto completo. Não apresentar contagens da amostra como total.

### P2 — painel declara estado e cotas sem fonte real

`functions/ai/usage.js` fixa limites de 1.500 requisições/dia e 45.000/mês e retorna `ONLINE`/HTTP 200 para modelos sem sondagem. Erros de leitura são convertidos em dados vazios, que podem parecer consumo zero. O segundo modelo também mostra zero sem agregar uso por modelo.

**Correção:** separar consumo observado de cotas configuradas pelo provedor; mostrar estado desconhecido quando a leitura/prova não ocorreu e agregar uso por modelo.

### P2 — telemetria pode subestimar tokens e custos

O cliente extrai `reasoningTokens`, mas os handlers não o passam para `recordAiUsage`. Nas falhas, o budget é liberado se o total registrado continuar zero, mesmo quando uma chamada ao provedor pode ter sido consumida sem retornar metadados. Tentativas de fallback também não ficam registradas individualmente.

**Correção:** passar todos os campos de tokens, registrar cada tentativa/modelo e não tratar consumo desconhecido como zero.

### P2 — arredondamento diverge entre preço unitário e total do lote

O tier arredonda `unitPrice` e calcula `totalPrice` a partir do valor não arredondado. O handler calcula o total multiplicando o `unitPrice` arredondado. Reprodução com setup de 30, quantidade 10 e demais custos zerados produziu total do handler `31,00`, enquanto o tier correspondente retorna `31,04`.

**Correção:** definir uma única regra de arredondamento e reutilizar o total calculado pelo tier na resposta e na interface.

## Validação executada

- `npm run typecheck` — passou.
- `npm run test:unit` — passou: 125 testes em 16 arquivos.
- `git diff --check` — passou.
- `node --check` em `functions/index.js`, `functions/ai/geminiClient.js`, `functions/ai/budget.js` e `functions/ai/usage.js` — passou.

Não executei testes de integração Firebase nem Playwright/E2E nesta rodada.
