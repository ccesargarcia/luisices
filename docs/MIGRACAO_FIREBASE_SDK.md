# Migração dos SDKs Firebase do backend

Etapa 1 concluída em **12/10/2026**. Este documento define o escopo e os critérios da migração; não autoriza publicação em produção nem afirma compatibilidade funcional já validada.

## Matriz de versões

| Componente | Resolvido atualmente em `functions` | Alvo para validação | Decisão |
|---|---|---|---|
| Node.js | 22 | 22 | Manter o runtime |
| Firebase Admin | 12.7.0 | 14.5.0 | Migrar os acessos para os módulos por serviço |
| Firebase Functions | 4.9.0 | 7.4.0 | Atualizar junto com Admin; esta versão declara suporte ao Admin 14 |
| Firebase Admin da raiz | 13.10.0 | Sem alteração nesta migração | Usado por ferramentas e scripts; possui instalação e lockfile separados |

O Functions 4.9.0 declara Admin `^10.0.0 || ^11.0.0 || ^12.0.0`. O Functions 6.6.0 aceita até Admin 13, portanto não resolve o alvo Admin 14. O Functions 7.4.0 declara Admin `^11.10.0 || ^12.0.0 || ^13.0.0 || ^14.0.0`; seus peers GraphQL/Apollo são opcionais e não justificam adicionar funcionalidades ao projeto.

Foi resolvido um lockfile temporário, em Node 22, com todas as dependências diretas atuais de `functions` e o par exato Admin 14.5.0/Functions 7.4.0, usando `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, sem forçar resolução de peers. Isso verifica a resolução das dependências, não o carregamento das Functions, a instalação completa ou seus contratos de execução. Os manifests e lockfiles do repositório permanecem inalterados nesta etapa.

## Inventário de consumidores

Há **18 arquivos JavaScript em `functions` que importam diretamente `firebase-admin`**, incluindo um import dentro de função. Arquivos com dependências injetadas também precisam ser revisados para preservar seus contratos.

| Área | Arquivos | Trabalho previsto |
|---|---|---|
| Inicialização | `functions/index.js` | Inicializar a aplicação uma vez e manter todos os exports públicos |
| Compartilhados | `functions/common/helpers.js` | Migrar obtenção do Firestore e preservar autorização e sessão |
| Usuários | `functions/users/index.js`, `functions/users/userSyncService.js` | Migrar Auth, Firestore, RTDB e sentinelas; preservar injeção de serviços |
| Pedidos | `functions/orders/index.js` | Migrar Firestore e Timestamp; preservar transações e payloads |
| E-mails | `functions/email/index.js`, `functions/email/cleanup.js` | Migrar Firestore, Storage e sentinelas; preservar envio e limpeza |
| WhatsApp | `functions/whatsapp/index.js` | Migrar Firestore e sentinelas; preservar processamento e transações |
| IA | `functions/ai/callables.js`, `functions/ai/usage.js` | Migrar Firestore e o fallback de FieldValue, inclusive quando há serviço injetado |
| Alexa | `functions/alexa/index.js`, `authorization.js`, `callables.js`, `dialog.js`, `orderService.js`, `pairing.js`, `rateLimit.js`, `repository.js` | Migrar Auth, Firestore, Timestamp, FieldValue e verificação de aplicações inicializadas |

O workflow `deploy-functions-manual.yml` contém um trecho JavaScript que usa o namespace antigo e também deve migrar. Verificar a descoberta das Functions e a compatibilidade da CLI antes de publicar; a versão da CLI desse workflow é independente dos SDKs.

Scripts da raiz já possuem diversos imports por serviço, mas `scripts/migrate-legacy-claims-markers.mjs` ainda usa o namespace antigo. Esse script usa a instalação da raiz, que permanecerá no Admin 13; registrar sua conversão antes de uma futura atualização desse SDK, sem executar migrações de dados nesta entrega.

## Contratos a preservar

| Uso atual | Destino |
|---|---|
| `admin.initializeApp()` e `admin.apps` | `initializeApp()` e `getApps()` de `firebase-admin/app` |
| `admin.auth()` | `getAuth()` de `firebase-admin/auth` |
| `admin.firestore()` | `getFirestore()` de `firebase-admin/firestore` |
| `admin.firestore.FieldValue` e `admin.firestore.Timestamp` | `FieldValue` e `Timestamp` de `firebase-admin/firestore` |
| `admin.storage()` | `getStorage()` de `firebase-admin/storage` |
| `admin.database()` | `getDatabase()` de `firebase-admin/database` |
| `functions.https.HttpsError` | Import explícito de `HttpsError` em `firebase-functions/v2/https`, inclusive verificações com `instanceof` |

Os módulos por serviço oferecem imports CommonJS: a migração não exige converter todo o backend para ESM. Manter nomes de Functions, geração, regiões, opções de execução, formatos de resposta, códigos de erro, dados gravados e comportamento das transações. Não trocar decisões de autorização por fallbacks silenciosos ao adaptar `admin.apps`.

Functions 6 mudou o entrypoint padrão de v1 para v2. Functions 7 removeu `functions.config()` e alterou o tratamento de erros assíncronos no emulador. Não foi encontrado uso de `functions.config()` nem declaração de triggers via namespace v1 nos arquivos JavaScript do backend; ainda é necessário testar imports, serialização de erros e descoberta das Functions.

## Validação da etapa 2

1. Registrar o resultado das suítes atuais com as versões instaladas e separar falhas anteriores à migração.
2. Criar verificação de carregamento de `functions/index.js` com o SDK real, sem substituir o Admin por mocks; conferir os exports e suas definições de trigger.
3. Validar no Auth Emulator criação e consulta de usuário, claims e revogação; usar somente projeto fictício e dados de teste.
4. Validar com Admin no Firestore Emulator leituras, gravações, transações, Timestamp e sentinelas de atualização. Cobrir conversão/criação de pedido e concorrência/idempotência relevantes.
5. Validar operações de mídia no Storage Emulator e sincronização no RTDB Emulator com o Admin real.
6. Preservar testes unitários de Alexa, usuários, anexos, limpeza de e-mails, WhatsApp e IA. Adaptar mocks somente após estabelecer os contratos reais esperados.
7. Verificar códigos de erro enviados ao cliente, autenticação das callables e tratamento de falhas em HTTP no Functions Emulator. Simular provedores externos sem enviar mensagens reais.

Os testes atuais de integração de regras usam principalmente SDKs cliente e `rules-unit-testing`; não substituem testes do Admin. O Admin utiliza autorização administrativa, portanto ambas as categorias são necessárias. A falha de Storage identificada anteriormente deve ser reproduzida e classificada antes de usar a suíte completa como critério de aprovação.

## Sequência e conclusão

- **Etapa 1:** inventário e matriz de versões — concluída.
- **Etapa 2:** base atual registrada e suíte de contratos reais do Admin implementada; ver execução abaixo.
- **Etapa 3:** migrar primeiro inicialização/utilitários, depois usuários, pedidos, e-mails, WhatsApp, IA e Alexa. Os imports por serviço podem ser preparados com o Admin atual; promover a troca dos SDKs somente após adaptar os consumidores.
- **Etapa 4:** publicar e observar em DEV. Exigir instalação completa com `npm ci` sem ignorar conflitos de peers, descoberta das Functions, testes e verificações dos fluxos afetados.
- **Etapa 5:** preparar reversão ao conjunto anterior de código e lockfiles; promover à `main` e publicar Functions pelo workflow separado após validação explícita da entrega.

A PR #105 não deve ser mesclada como está. Ela troca a versão do Admin sem adaptar os consumidores nem atualizar o SDK Functions. A migração pode reduzir dependências antigas, mas não implica zerar todos os alertas do projeto; dependências da integração Alexa permanecem em escopo separado.

## Execução da base de compatibilidade

Em Node 22, instalar as dependências de `functions` com `npm --prefix functions ci`. A suíte usa as versões desse diretório, não o SDK da raiz. Java 21+ e as portas locais 5001, 8080, 9000, 9099 e 9199 livres são necessários.

```sh
node scripts/run-firebase-sdk-tests.mjs
```

O runner inicia Auth, Firestore, Storage, RTDB e Functions no projeto fictício `demo-luisices-sdk`. Usa uma cópia temporária do código das Functions, ligada às dependências já instaladas, com valores de secrets exclusivos de teste. Não copia `.env` ou `.secret` existentes, não utiliza credenciais de conta de serviço e não publica recursos. O teste recusa execução sem projeto fictício e hosts de emuladores em loopback.

Para ambientes que proíbem sockets Unix internos do Functions Emulator, existe uma alternativa explícita:

```sh
node scripts/run-firebase-sdk-tests.mjs --http-wrapper
```

Esse modo usa os wrappers HTTP reais exportados pelo SDK, atendidos por Express local, mantendo os quatro emuladores de dados. Não substitui a execução do Functions Emulator: o modo utilizado deve acompanhar o resultado informado. Em ambientes com proxy, baixar previamente os binários dos emuladores; a CLI instalada força proxy inclusive em chamadas de RTDB local, por isso o runner remove as variáveis HTTP de proxy do processo filho.

O workflow manual **Playwright Tests**, no alvo `backend-sdk` e ref `develop`, executa o modo completo em Node 22/Java 21 sem secrets de DEV ou produção. A instalação da raiz mantém a opção de peers já utilizada pelas ferramentas existentes; a instalação do backend não ignora conflitos de peers. O job publica o relatório de testes como artefato e não executa deploy.

Base anterior à migração, verificada em 12/10/2026:

| Verificação | Resultado |
|---|---|
| Unitários existentes | 907 aprovados |
| Integração de pedidos e regressões Firestore/Storage | 91 aprovados e 1 falha existente de Storage |
| Presença e autorização RTDB existentes | 6 aprovados |
| Contratos novos com Admin real e wrappers HTTP locais | 17 aprovados |
| Functions Emulator completo | Execução local bloqueada por restrição de socket Unix; verificar no workflow manual |

Os novos testes verificam os 40 exports e suas definições de trigger, operações reais de Auth/Firestore/Storage/RTDB, mudança de perfil e reconciliação de sessões, criação atômica de pedido Alexa com confirmação concorrente, rejeição de conta desativada e serialização HTTP das respostas. O contrato de triggers foi capturado antes da migração. Qualquer diferença durante a atualização deve ser revisada, não aceita automaticamente regenerando a referência.

A execução de Storage pelo Admin passou; isso não corrige nem substitui a falha anterior no teste de regras cliente. O agendamento da limpeza de e-mails é conferido no contrato de trigger; a suíte não simula o disparo do Scheduler nem integrações reais com provedores externos.

## Fontes

- [Release notes do Firebase Admin](https://firebase.google.com/support/release-notes/admin/node)
- [Functions 6.0.0: mudança do entrypoint padrão](https://github.com/firebase/firebase-functions/releases/tag/v6.0.0)
- [Functions 7.0.0: mudanças incompatíveis](https://github.com/firebase/firebase-functions/releases/tag/v7.0.0)
- Metadados oficiais npm: `npm view firebase-functions@7.4.0 peerDependencies peerDependenciesMeta engines --json`.
- [PR #105](https://github.com/ccesargarcia/luisices/pull/105)
