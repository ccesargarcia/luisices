# Auditoria de higiene e exposição pública

Data: 2026-09-28  
Escopo: arquivos rastreados, documentação, workflows e histórico Git local.

## Achado crítico

### P0 — segredo HMAC hardcoded no workflow e no histórico

`/.github/workflows/deploy-functions-manual.yml` grava uma chave fixa em arquivo e publica essa chave no Secret Manager de desenvolvimento. O valor também está presente no commit histórico que inicializou esse comportamento (`19535de`). Como o repositório é público, a chave deve ser tratada como comprometida.

Ação imediata:

1. Rotacionar `ALEXA_IDENTITY_HMAC_KEY` no Secret Manager de desenvolvimento e em qualquer ambiente que tenha reutilizado o valor.
2. Remover a geração literal do workflow; exigir `secrets.ALEXA_IDENTITY_HMAC_KEY_DEV` ou Secret Manager já configurado e falhar se estiver ausente.
3. Invalidar/recriar vínculos Alexa e códigos de pareamento derivados da chave antiga.
4. Depois da rotação, remover o valor do histórico com `git filter-repo` ou BFG e fazer push forçado coordenado. Isso é uma operação destrutiva e não foi executada nesta revisão.

## Alta prioridade

### P1 — senhas padrão em workflows e scripts

Os workflows de Playwright, auditoria de telas e testes usam senha fixa quando `TEST_USER_PASSWORD` não existe. Isso permite que CI rode com uma credencial pública ou que uma pessoa tente a mesma senha no ambiente de testes.

Remover todos os fallbacks de senha/e-mail e fazer o job falhar com mensagem clara quando os secrets não estiverem configurados. Manter somente placeholders explícitos em templates que nunca são usados automaticamente.

### P1 — e-mail pessoal em documentação de troubleshooting

`.github/TROUBLESHOOT_TESTS.md` contém o e-mail pessoal do administrador em exemplos e comandos. Substituir por `admin@example.com` ou `TEST_USER_EMAIL` e revisar o histórico, pois o dado já foi versionado.

### P1 — segredos não devem ser recriados pelo pipeline

O workflow atual escreve secrets em arquivos no runner e usa `|| true` em comandos de atualização. Isso pode mascarar falha de rotação e deixar deploy parcialmente configurado. Remover `|| true` para operações de segredo e limpar arquivos temporários com `trap`.

## Média prioridade

### P2 — DSN do Sentry embutido em workflow

O DSN aparece como fallback literal em `.github/workflows/deploy.yml` e `deploy-dev.yml`. DSNs de browser normalmente não são equivalentes a chaves administrativas, mas expõem o projeto e permitem envio indevido de eventos. Remover o fallback e exigir secret/configuração explícita ou usar um DSN público deliberadamente documentado.

### P2 — documentação operacional excessiva para repositório público

Os seguintes arquivos expõem nomes de projetos Firebase, buckets, domínios, comandos de deploy, estrutura interna e procedimentos de produção. Não são segredos isoladamente, mas ampliam reconhecimento da superfície pública:

- `.github/SETUP_SECRETS.md`
- `.github/TROUBLESHOOT_TESTS.md`
- `DEPLOY_PRODUCAO_CHECKLIST.md`
- `REVERT_DEVELOP.md`
- `docs/DEPENDENCIAS_E_ARQUITETURA.md`
- `docs/RELATORIO_IMPLEMENTACAO_ALEXA.md`

Manter apenas se a operação pública exigir. Caso contrário, mover para documentação privada ou substituir identificadores reais por placeholders.

### P2 — links `file:///home/...` e caminhos locais

Relatórios de implementação contêm caminhos locais do desenvolvedor. Eles não são credenciais, mas revelam nomes de usuário, estrutura local e tornam a documentação pouco portátil. Trocar por links relativos do repositório.

## Baixa prioridade / lixo documental

Os documentos de trabalho abaixo são úteis para histórico interno, mas não precisam ficar no repositório público:

- `docs/ANALISE_ALEXA_2026-09-27.md`
- `docs/REVISAO_IMPLEMENTACAO_ALEXA_2026-09-27.md`
- `docs/REVISAO_ALEXA_RODADA_3_2026-09-27.md`
- `docs/REVISAO_ALEXA_RODADA_4_2026-09-28.md`
- `docs/REVISAO_ALEXA_RODADA_5_2026-09-28.md`
- `docs/REVISAO_ALEXA_RODADA_6_2026-09-28.md`
- `docs/REVISAO_ALEXA_RODADA_7_2026-09-28.md`
- `docs/PROMPT_ANTIGRAVITY_ALEXA.txt`
- `docs/PROMPT_ANTIGRAVITY_FLASH_3_8_ALEXA.txt`
- `docs/PROMPT_ANTIGRAVITY_FLASH_PRIORIDADES_ALEXA_2026-09-28.txt`
- `docs/AVALIACAO_IA.md`
- `docs/PLANO_IA_ANTIGRAVITY.md`
- `docs/RESULTADO_IMPLEMENTACAO_IA.md`
- `docs/REVISAO_IA_DEVELOP.md`
- `docs/REVISAO_IA_DEVELOP_2.md`
- `docs/REVISAO_IA_DEVELOP_3.md`
- `docs/PROMPT_CORRECOES_IA_ANTIGRAVITY.md`

Sugestão: preservar uma especificação técnica sanitizada e um changelog curto; mover o restante para um arquivo privado ou apagar do histórico após confirmar que não há necessidade de auditoria.

## Revisão de lixo gerado

Não encontrei `node_modules`, `dist`, `coverage`, relatórios Playwright ou credenciais JSON rastreados. Os `.gitignore` cobrem esses padrões e os arquivos de exemplo de ambiente não contêm valores reais.

## Alteração Alexa verificada

O commit `8156c0e` fechou o bypass de `db` ausente e passou a usar `REQUEST_DEDUPE_TTL_MS` tanto na reserva quanto na resposta concluída. Os 211 testes atuais passaram após essa alteração. O commit foi marcado como `skip tests`, portanto a execução local foi necessária.

## Limitações

Esta auditoria verificou o histórico Git local e não executou rotação de credenciais, limpeza histórica, force-push ou consulta ao Secret Manager. A ausência de um padrão encontrado não prova que nenhum segredo existiu fora deste clone.
