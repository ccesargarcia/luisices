# Inicialização das Functions: velocidade, segurança e custo

Revisão: **26/10/2026**. Descreve o código; a publicação e a latência remota precisam ser confirmadas no ambiente.

## Decisão

Reduzir o trabalho de inicialização, mantendo a escala para zero e a validação dos pedidos no backend. Esta mudança não adiciona serviço, dependência npm, instância mínima, chamada de aquecimento ou gravação de telemetria. Continuam existindo as cobranças normais por execução, Firestore, rede e demais serviços utilizados.

Cold start não desaparece: o provisionamento do container, a inicialização dos SDKs, autenticação e rede ainda fazem parte do primeiro acesso. Uma medição local de importação não prevê quanto dos aproximadamente cinco segundos percebidos pelo usuário será eliminado.

## Sentry: primeira chamada dos pedidos

`createOrder` e `updateComplexOrder` emitem um span `function.cold_start` na primeira chamada de cada processo. O span inclui o tempo do handler e atributos de baixo risco para identificar a função, a revisão e o tempo de avaliação do módulo `orders` (`runtime.module_init_ms`). Ele não inclui necessariamente o provisionamento do container ou toda a espera da plataforma antes de iniciar o handler.

No Sentry, filtre a operação `function.cold_start` e compare os spans com a operação normal do handler. A amostragem de tracing segue `SENTRY_TRACES_SAMPLE_RATE`, cujo padrão atual é **5%**; portanto, a ausência de um span não prova que não houve cold start. A instrumentação só acrescenta spans às duas Functions de pedidos e não faz chamada de rede síncrona nem mantém a resposta aberta para enviar telemetria.

Use as métricas e os logs do Cloud Run/Cloud Functions para confirmar o tempo de inicialização da plataforma. O Sentry serve para relacionar a primeira execução observada à latência e aos spans da aplicação; não substitui a métrica de inicialização do Google Cloud. A documentação do Google confirma que o carregamento de módulos contribui para cold starts e recomenda reduzir dependências e trabalho de inicialização ([boas práticas](https://docs.cloud.google.com/run/docs/tips/functions-best-practices?hl=en)); os logs da plataforma registram execuções e identificadores de execução ([platform logs](https://docs.cloud.google.com/logging/docs/api/platform-logs)).

## O que mudou

### 1. Carregamento por domínio

[functions/index.js](../functions/index.js) registra cada endpoint com um getter enumerável e um `require` de caminho literal. O Functions Framework resolve o export solicitado e carrega seu domínio. Ao acessar `createOrder` ou `updateComplexOrder`, os módulos de usuários, e-mail, WhatsApp, IA, Alexa, MCP e mídia deixam de ser importados pelo entrypoint.

O getter devolve o próprio trigger já protegido, sem recriar o wrapper ou chamar o handler. O cache do CommonJS reutiliza o módulo nas requisições seguintes. Não substituir esses registros por `Object.assign` ou spread de um objeto com getters: isso executaria todos os carregamentos imediatamente.

O Firebase CLI enumera os valores para descobrir o backend completo durante o deploy. Por isso, continua encontrando os 61 endpoints gerais e os dois de SuperFrete exclusivos de DEV/emulador, com os mesmos nomes, triggers, limites e secrets. Essa descoberta completa ainda carrega todos os domínios; a redução se destina ao processo que atende um endpoint.

### 2. Firestore Admin com preferência por REST

O entrypoint chama `initializeFirestore(app, { preferRest: true })` antes de qualquer domínio obter o banco. O SDK adia a carga do gRPC até uma operação que o exija, como `onSnapshot`. Transações, retries, autenticação pela service account e consistência continuam sob responsabilidade do Admin SDK. Não há implementação manual da API REST.

**Exceção local:** com `FIRESTORE_EMULATOR_HOST`, o entrypoint usa `preferRest: false`. Na versão instalada, o transporte REST tenta obter ADC mesmo com o emulador configurado. Preservar gRPC nesse ambiente mantém o CI/E2E sem necessidade de credenciais reais.

As suítes de criação e edição testam REST explicitamente com a versão do Admin instalada em `functions/`. O helper de teste só aceita o projeto fictício `demo-luisices-review` e `127.0.0.1`; usa o token reservado `owner` do emulador. Esse helper fica em `tests/`, fora do pacote publicado.

### 3. Deploy seletivo

[O seletor](../scripts/select-functions-deploy.mjs) reconhece os registros lazy e o formato anterior, pois o último SHA publicado pode usar imports imediatos. Caminhos continuam literais e a seleção não importa o backend nem consulta credenciais.

Alterar o entrypoint seleciona **todas as Functions** nesta entrega. Alterações posteriores em um domínio voltam a selecionar seus consumidores. Export desconhecido, registro duplicado ou caminho dinâmico interrompe a seleção.

## Controles preservados

- Origem obrigatória no gateway, autenticação, sessão ativa e autorização no backend.
- Validação de itens, valores, pagamentos, etiquetas e versão do pedido.
- Transações de pedido/ledger/estatísticas e recibos de idempotência.
- Sentry inicializado antes dos SDKs, com a sanitização existente.
- Escala mínima padrão zero; nenhum ajuste de região, memória, concorrência ou limite máximo de instâncias.

O cache usado aqui é de módulos e clientes SDK. Permissões de usuário e resultados de gravações não são armazenados em um novo cache.

## Medir sem acessar a nuvem

Com as dependências instaladas e Node 22, runtime declarado do backend:

```sh
node scripts/benchmark-functions-startup.mjs --target=createOrder --samples=7 --eager
node scripts/benchmark-functions-startup.mjs --target=createOrder --samples=7
node scripts/benchmark-functions-startup.mjs --target=updateComplexOrder --samples=7
```

Cada amostra usa um processo novo, projeto fictício e ambiente sem credenciais ou DSN. O modo `--eager` resolve todos os exports para comparar o custo dos domínios. Não reproduz provisionamento do Cloud Run, primeira consulta ao banco, Sentry ativo ou latência do gateway. Registre versão do Node, plataforma e revisão junto com os resultados; não imponha um limite de milissegundos em CI com hardware variável.

Na verificação inicial em Android/Node 24, o carregamento de pedidos passou de **1.400 para 1.191 módulos**. Use o script em Node 22 e as métricas do ambiente para avaliar o ganho real. Contagem de módulos também pode mudar com versões das dependências.

## Validação

```sh
node --test tests/scripts/functions-deploy-selection.test.mjs
npm run lint:functions
npx vitest run tests/unit/functions-startup.test.ts tests/unit/origin-fallback.test.ts tests/unit/origin-protection.test.ts tests/unit/sentry-sanitization.test.ts
npx firebase emulators:exec --config firebase.test.json --project demo-luisices-review --only firestore "npx vitest run --config vitest.integration.config.ts tests/integration/create-order-function.test.ts tests/integration/complex-order-function.test.ts"
```

Os testes de inicialização usam o SDK e o loader de manifest reais. Conferem isolamento de módulos, identidade do handler, secrets, escala para zero, descoberta em DEV/produção/emulador e rejeição de origem inválida/usuário anônimo. As 66 verificações de integração cobrem criação/edição de 1–10 itens, pagamentos, etiquetas, permissões, concorrência e recibos usando REST no emulador.

Antes de promover para produção, confirmar em DEV:

1. Todos os endpoints esperados publicados, inclusive os de pedidos; SuperFrete continua ausente de produção.
2. Criar e editar pedidos com 1, 4, 5 e 10 itens, conferir total e pagamento após recarregar; repetir uma operação com a mesma identidade e conferir que não há duplicação.
3. Comparar chamadas após início de uma instância com chamadas subsequentes, usando latência no navegador e métricas/logs já existentes do backend. Inatividade por um intervalo fixo não comprova que houve cold start.
4. Comparar mediana e percentil 95 de uma amostra representativa, com contagem de erros e timeouts. Não adicionar cron de aquecimento para produzir um resultado artificialmente melhor.

## Referências

- [Firebase: dependências e reutilização de objetos](https://firebase.google.com/docs/functions/tips).
- [Admin SDK: preferência REST e fallback para gRPC](https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore.firestoresettings).
- [Functions Framework: resolução do export pelo nome](https://github.com/GoogleCloudPlatform/functions-framework-nodejs/blob/main/src/loader.ts).
- [Procedimentos de operação e recuperação](OPERACAO_E_RECUPERACAO.md).
