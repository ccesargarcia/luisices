# Migração de `userProfiles.createdAt` para Timestamp

## Objetivo

Normalizar perfis antigos que armazenam `createdAt` como texto ISO para o tipo Timestamp do Firestore. A tela de usuários consulta `orderBy('createdAt')`; valores Timestamp e texto são ordenados por tipo, então a mistura dos dois formatos não representa uma ordem cronológica global.

O script `scripts/migrate-user-profile-created-at.mjs` é idempotente, pagina por ID do documento e, por padrão, executa somente uma simulação. Ele converte apenas datas no formato canônico produzido por `Date.toISOString()` (`YYYY-MM-DDTHH:mm:ss.sssZ`). Valores ausentes, inválidos ou de outros tipos são preservados e contabilizados. Cada gravação confirma transacionalmente que o valor ainda é o mesmo observado na leitura.

## Testar localmente

Os testes de unidade validam o parser sem conectar ao Firebase. O teste de integração usa uma coleção isolada no emulador e confirma simulação, conversão, preservação de inválidos, ordenação e reexecução idempotente:

```bash
npx vitest run tests/unit/user-profile-created-at-migration.test.ts
npx firebase emulators:exec --config firebase.test.json --project demo-luisices-review --only firestore "npx vitest run --config vitest.integration.config.ts tests/integration/user-profile-created-at-migration.test.ts --reporter=verbose"
```

## Operação em um projeto Firebase

Comece sempre com simulação no projeto explicitamente selecionado:

```bash
npm run migrate:user-profile-created-at -- --project=luisices-dev
```

Revise `Conversões previstas`, `Formato inválido/não suportado` e `Falhas`. O script não imprime IDs nem dados pessoais. Antes de aplicar, faça ou confirme um backup/exportação do projeto e execute primeiro em desenvolvimento.

Para gravar em desenvolvimento, é necessário confirmar o mesmo projeto:

```bash
npm run migrate:user-profile-created-at -- --project=luisices-dev --apply --confirm-project=luisices-dev
```

Produção exige confirmação adicional explícita:

```bash
npm run migrate:user-profile-created-at -- --project=papelaria-dashboard
npm run migrate:user-profile-created-at -- --project=papelaria-dashboard --apply --confirm-project=papelaria-dashboard --confirm-production
```

O script exige credenciais ADC do projeto selecionado para execução remota. No emulador, use exclusivamente `demo-luisices-review`; a presença de `FIRESTORE_EMULATOR_HOST` impede usar um project ID real acidentalmente.

Depois da aplicação, rode novamente em modo de simulação. O resultado esperado é `Conversões previstas: 0`. Confira também a ordenação da tela de usuários no ambiente migrado. A migração é segura para repetição: perfis que já têm Timestamp não são alterados.

## Reversão

Não há motivo para reverter a representação após concluir a migração; Timestamp é o tipo canônico para o campo usado em `orderBy`. Se a operação precisar ser desfeita por incidente, restaure os valores do backup/exportação anterior. Não converta Timestamp de volta em string como procedimento normal de rollback, pois isso recria a mistura de tipos.
