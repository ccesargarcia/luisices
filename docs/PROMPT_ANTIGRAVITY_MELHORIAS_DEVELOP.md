# Prompt de execução no Antigravity

Selecione no seu ambiente o modelo solicitado, Gemini 3.8 Flash, caso esteja disponível. O nome foi fornecido pelo usuário; este documento não verifica a disponibilidade nem depende de recursos exclusivos desse modelo. Abra o repositório Luisices e envie o texto abaixo. Os arquivos referenciados precisam estar disponíveis nesse mesmo checkout.

## Prompt completo

Você atuará como engenheiro de software sênior responsável por corrigir e evoluir o Luisices preservando seus fluxos e contratos existentes. Execute o trabalho em etapas; não responda apenas com outro plano.

Leia primeiro:

1. As instruções aplicáveis do repositório, incluindo `AGENTS.md`, se houver.
2. `docs/REVISAO_DEVELOP_2026-09-30.md`.
3. `docs/PLANO_MELHORIAS_DEVELOP_2026-09-30.md`.

O relatório foi baseado em `develop`, SHA `001047e`, e contém 19 achados. Ele é uma referência para investigação, não uma verdade imutável. Revalide os problemas na versão atual; não refaça correções já existentes. Registre divergências e evidências.

### Escopo e autonomia

Implemente as etapas 0 a 12 do plano, em unidades pequenas e revisáveis. Preserve React/Vite, Firebase, os fluxos financeiros, a loja pública e as integrações IA/Alexa. Não faça uma reescrita geral nem adicione funcionalidades sem relação com os achados.

Inspecione branch, SHA e alterações locais antes de editar. Use uma branch de trabalho derivada de `develop`, preservando arquivos locais e documentos não rastreados. Se não puder obter a referência remota, informe qual referência local está usando. Nunca use reset destrutivo, sobrescreva trabalho alheio ou force push.

Tome decisões técnicas rotineiras autonomamente. Peça esclarecimento somente quando uma decisão de negócio essencial não puder ser inferida do código e dos testes, ou quando faltar autorização para uma operação externa. Continue nas partes independentes enquanto houver um bloqueio.

Este prompt autoriza implementação e testes locais, preparação de CI e de scripts de migração em modo de simulação. Não autoriza push, merge, deploy, migração em produção, exclusão de contas reais, alteração de IAM remoto ou mensagens externas. Prepare essas operações para revisão, sem executá-las. Não imprima credenciais ou dados reais de clientes.

### Ordem de trabalho

Siga as dependências e critérios detalhados no plano:

- Etapa 0: baseline, versões, contratos e triagem de dependências.
- Etapa 1: infraestrutura de regressão e gates iniciais de CI.
- Etapa 2: convite obrigatório no servidor e exclusão retomável de usuários.
- Etapa 3: exclusão lógica autorizada e regras de `productionTracking`.
- Etapa 4: atomicidade pedido/ledger, pagamentos e semântica de patches.
- Etapa 5: aprovação idempotente de orçamentos.
- Etapa 6: compras, movimentos e saldo de estoque consistentes.
- Etapa 7: checkout com validação e cálculo confiáveis no servidor.
- Etapa 8: consultas completas, paginação, agregações e datas.
- Etapa 9: recuperação segura do Firestore e privacidade de Replay.
- Etapa 10: atualizações compatíveis de dependências; antecipe risco crítico alcançável comprovado.
- Etapa 11: desempenho medido e extração gradual de módulos.
- Etapa 12: gates finais, coordenação dos artefatos de entrega e plano de publicação/recuperação.

### Restrições técnicas essenciais

1. **Autorização:** esconder botões não protege dados. Teste acesso direto pelo SDK e verificações no servidor. Conta Auth sem perfil ativo autorizado deve falhar de modo restritivo, inclusive em IA/Alexa. Não restaure criação automática de perfil autorizado como fallback.
2. **Usuários:** Auth e Firestore não compartilham transação. Use processo retomável com desativação, revogação e prevenção de recriação. Não transforme erros genéricos da exclusão Auth em sucesso; apenas usuário já inexistente pode ser tratado como conclusão idempotente daquela operação.
3. **Financeiro:** inventarie todos os escritores. Preserve as transações já existentes. Pedido e ledger não podem divergir silenciosamente. Controle otimista deve usar a versão da edição original, não uma versão recém-lida para aceitar escrita desatualizada.
4. **Patches:** ausência significa não alterar; remoção precisa ser explícita. Preserve `false`, listas vazias e histórico de pagamentos. Editar nome não deve alterar a data de pagamento.
5. **Idempotência:** reutilize a identidade da operação após timeout/retry. Teste concorrência real em emuladores quando aplicável; mocks isolados não provam atomicidade ou regras.
6. **Estoque:** histórico e saldo devem ser consistentes. Não implemente estorno ingênuo que desconsidere consumo posterior ou custo. Esclareça semântica de cancelamento quando não houver contrato estabelecido.
7. **Checkout:** derive preços e disponibilidade de fontes confiáveis no servidor; rejeite campos internos fornecidos pelo cliente. Preserve o fluxo de visitante. Prepare rollout compatível de backend, frontend e regras, incluindo clientes e pedidos legados.
8. **Consultas:** paginação não pode tornar totais parciais nem esconder pendências antigas. Não substitua 200 por outro teto arbitrário. Datas civis e timestamps precisam de contrato de fuso explícito, sem compensações manuais de horas.
9. **Recuperação:** não reutilize instância terminada do Firestore nem descarte escritas offline para limpar um erro. Evite loops de recarga e diagnostique sem expor dados.
10. **Dependências:** examine raiz e Functions separadamente. Não use `npm audit fix --force`, downgrade automático ou supressões para esconder alertas. Verifique engines e compatibilidade dos caminhos afetados.
11. **Entrega:** não resolva falha de deploy de Storage concedendo privilégios amplos. Separe Git, frontend, Functions, regras, índices e Alexa. Preparação de código não demonstra publicação nem comportamento de produção.

### Método por etapa

Antes de editar, resuma o problema confirmado, os contratos afetados e a solução mínima. Acrescente testes de regressão significativos para os riscos da etapa, implemente, execute as validações relevantes e revise o diff. Não modifique testes para esconder falhas.

Os scripts existentes incluem `npm run build`, `npm test` e `npm run test:integration`; confira as versões e configurações antes de executá-los. Integração atual de Firestore/Storage não substitui testes de Auth/Functions. Prepare o ambiente necessário para cada cenário sem apontar para produção.

A revisão anterior registrou 340 testes aprovados em 31 arquivos. Isso é histórico: reporte os números efetivamente obtidos agora. Não declare E2E ou emuladores aprovados se não os executou. Se ferramentas ou rede impedirem validação, registre a falha exata e a parte não comprovada.

Ao final, execute build, unitários, integração e E2E dos fluxos críticos conforme o plano. Preserve testes de IA/Alexa e valide exportações, assinaturas e outros caminhos quando mudanças de dependências os afetarem. Meça desempenho antes/depois nas mesmas condições; não invente ganho de custo ou latência.

### Continuidade e entrega

Crie e mantenha `docs/PROGRESSO_MELHORIAS_DEVELOP.md` com uma linha para cada um dos 19 achados e seções por etapa. Registre estado, evidência atual, arquivos, testes/comandos/resultados, riscos, mudanças de schema, publicação pendente e próximo passo. Diferencie implementado, validado localmente e bloqueado.

Atualize esse documento ao concluir cada etapa ou antes de uma interrupção. Se perder contexto, releia-o, confira o diff e continue do ponto registrado. Não reinicie a investigação inteira nem peça novamente decisões já registradas.

Na entrega final, informe:

- Achados corrigidos, já resolvidos e pendentes, com justificativas verificáveis.
- Mudanças principais e contratos preservados.
- Validações executadas e limitações reais.
- Migrações preparadas, ordem de publicação e recuperação segura.
- Arquivos alterados e próximos passos externos ainda necessários.

Comece agora pela etapa 0 e prossiga para implementação conforme o plano. Não pare após apresentar uma lista de intenções. Não declare todos os bugs eliminados: conclua apenas o que as evidências permitem afirmar.

## Mensagem curta para iniciar

Se preferir evitar copiar o prompt completo, envie esta mensagem ao Antigravity com os arquivos disponíveis no projeto:

```text
Leia e execute o prompt de docs/PROMPT_ANTIGRAVITY_MELHORIAS_DEVELOP.md, seção “Prompt completo”. Use docs/PLANO_MELHORIAS_DEVELOP_2026-09-30.md e docs/REVISAO_DEVELOP_2026-09-30.md como referências. Comece pelo baseline, revalide os achados e implemente por etapas com regressões, preservando os fluxos existentes. Mantenha docs/PROGRESSO_MELHORIAS_DEVELOP.md atualizado. Não publique nem altere produção.
```
