# Diagnóstico de falhas nos testes

## Primeiro, identifique qual etapa falhou

No GitHub Actions, abra a execução do commit e veja o primeiro job ou step que falhou. Build, lint, integração com regras e E2E têm causas diferentes. Baixe o relatório, trace ou vídeo anexado ao job quando estiver disponível.

## E2E e autenticação

O CI executa os E2E com Firebase Emulator Suite e carrega dados de teste usando `scripts/seed-emulator.mjs`. Uma conta real do Firebase DEV ou de produção não deve ser necessária para essa execução.

Se o login de teste falhar:

1. Confirme que a etapa de inicialização dos emuladores terminou sem erro.
2. Confirme que a configuração local aponta para os emuladores e que `VITE_USE_FIREBASE_EMULATOR=true`.
3. Veja se `node scripts/seed-emulator.mjs` concluiu antes do Playwright.
4. Abra o trace do teste para identificar a primeira resposta ou mensagem de erro.

## Falhas locais

Os emuladores Firebase precisam iniciar sem conflito de portas; as suítes de integração usam Java 21 ou superior. Se uma porta estiver ocupada, encerre a execução antiga do emulador ou escolha outra porta na configuração de teste.

Para reproduzir um cenário, siga [tests/e2e/README.md](../tests/e2e/README.md) e use o emulador. Evite apontar testes que criam ou alteram dados para o Firebase de produção.

## Permissões negadas

Uma resposta `permission-denied` no emulador pode indicar que o perfil carregado pelo seed não tem a permissão esperada ou que a regra do Firestore/Storage bloqueou corretamente a operação. Confira o perfil de teste, as regras carregadas e a asserção do cenário antes de alterar qualquer regra.

## Credenciais e secrets

Não coloque senhas, JSON de service account ou tokens nos logs, issues ou documentação. Para falhas de deploy, verifique apenas se a secret necessária existe e se o workflow usa o projeto correto; não copie seu conteúdo para a saída do terminal.

Veja [SETUP_SECRETS.md](SETUP_SECRETS.md) para os grupos de configuração atuais.
