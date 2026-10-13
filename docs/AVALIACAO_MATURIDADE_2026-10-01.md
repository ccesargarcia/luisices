# Avaliação de maturidade técnica — Luisices

Data: 2026-10-01  
Snapshot revisado: branch `develop`, commit `823df97` (`origin/develop`).  
Tipo: avaliação estática de repositório; sem execução de testes, deploy ou consulta a ambientes Firebase/Cloudflare/Alexa.

## Veredito direto

**Nota geral: 2,5/5 — produto real e funcional, com engenharia em transição de “artesanal” para “definida”.** Há trabalho acima da média em regras Firebase, transações, testes de regras, idempotência e funcionalidades de negócio. Ainda não há evidência suficiente no repositório para chamar a operação de madura ou previsível: releases de produção não demonstram gates de teste, partes críticas são publicadas por caminhos diferentes, recuperação operacional não está documentada e os próprios registros de validação divergem.

Isso não significa que o sistema seja ruim nem que esteja necessariamente instável em produção. Significa que o código mostra um produto de escopo amplo, mas a disciplina demonstrável de release e operação não acompanha esse escopo. A auditoria não acessou telemetria, backups ou configuração dos serviços; essas práticas podem existir fora do repositório.

## Nota por dimensão

| Dimensão | Nota | Avaliação |
|---|---:|---|
| Produto e domínio | 4/5 | Abrange pedidos, produção, clientes, orçamento, catálogo público, preço/estoque, WhatsApp, e-mail, IA e Alexa. O escopo entregue é substancial para um sistema de ateliê. |
| Arquitetura e manutenção | 2,5/5 | Há serviços e módulos bem separados em algumas áreas, mas o núcleo ainda concentra muita lógica: `functions/index.js` tem cerca de 2.052 linhas; `firebaseOrderService.ts` e `firebasePricingService.ts` têm mais de 900 linhas cada. O risco é acoplamento e regressão durante mudanças. |
| Segurança e integridade | 3/5 | Regras granulares, Storage privado, callable functions para fluxos sensíveis, transações e testes de regras são bons sinais. A superfície de acesso e integrações é grande e exige revisão contínua; a revisão estática não prova a configuração implantada. |
| Testes e qualidade | 3/5 | Existem testes unitários, de integração com emuladores e E2E Playwright, e CI os executa em PRs para `develop` e `main`. Não há limite de cobertura configurado; os números documentados para testes variam entre seções e não foram repetidos nesta avaliação. |
| Entrega e gestão de ambientes | 2/5 | Dev, produção, Functions, regras/índices e Alexa seguem fluxos distintos. O deploy de produção do frontend faz build, mas não executa a suíte de testes nesse workflow. Functions e alterações de regras de produção dependem de workflow manual. |
| Operação e recuperação | 2/5 | Há Sentry, Firebase Performance/Analytics declarados e mecanismos de resiliência no cliente. Não encontrei runbooks de incidente, metas SLO, critérios de rollback ou evidência versionada de ensaio de backup/restauração. A existência em serviços externos não foi verificada. |

## O que está bem encaminhado

- Segurança não está sendo tratada apenas como lógica de interface: há Firestore/Storage Rules e validação server-side para operações críticas.
- Pedidos, faturamento e compras possuem transações em fluxos importantes, reduzindo estados parciais e divergência de dados.
- A base de testes cobre vários domínios, inclusive autorização, regras, checkout, pedidos e cenários de concorrência.
- A CI inclui testes unitários, integração com emuladores, build e E2E; os resultados também são armazenados como artefatos.
- O backend de IA demonstra preocupação concreta com autorização, limite de orçamento, tentativas, telemetria de tokens e custo.
- A aplicação tem headers de segurança no Hosting, regras de acesso e separação entre ambientes de desenvolvimento e produção.

## O que impede uma nota maior

### 1. A publicação não é uma unidade verificável

O deploy de `develop` pode prosseguir quando os testes forem pulados pelo marcador `[skip tests]`. O deploy do frontend em `main` executa instalação e build, mas não roda testes nesse workflow. Cloud Functions e, em alguns caminhos, regras/índices são publicados por workflow manual; Alexa tem outro pipeline. Isso cria a possibilidade de frontend, backend, regras, skill e configuração estarem em versões incompatíveis. Push no Git não comprova que esses artefatos estão sincronizados.

### 2. A validação documentada não é uma fonte confiável única

`PROGRESSO_MELHORIAS_DEVELOP.md` registra contagens diferentes de testes em momentos/seções diferentes. A configuração do Vitest gera relatórios de cobertura, mas não define um mínimo que impeça regressão. Um número alto de testes, sem resultado associado ao commit exato e sem critérios de cobertura, não basta para afirmar prontidão.

### 3. Recuperação operacional está pouco demonstrada

Não localizei um procedimento versionado de incidente, recuperação de dados, restauração de backup, rollback coordenado de frontend/Functions/regras ou decisão de comunicação. Também não há SLOs documentados. Talvez existam no Firebase ou em conhecimento operacional, mas hoje não são auditáveis no repositório.

### 4. O sistema cresceu mais rápido que a modularização

Há dezenas de telas e integrações, com arquivos centrais grandes. A separação dos módulos de IA é um bom padrão a expandir. Quanto maior o sistema, mais caro fica alterar fluxos transversais concentrados em arquivos extensos e manter contratos consistentes entre frontend, Rules e Functions.

### 5. Carga e performance não estão demonstradas para o uso real

Existe workflow k6, mas o script mede principalmente respostas HTTP de `/`, `/login`, `/404.html` e um asset estático. Isso mede disponibilidade/latência básica do Hosting; não mede autenticação, consultas Firestore, checkout, Functions, IA, custo por operação nem comportamento sob carga representativa.

### 6. Documentação operacional tem sinais de deriva

O README descreve produção como GitHub Pages, enquanto dev usa Firebase Hosting e backend continua separado. Documentação de coleções e fluxos também pode ficar desatualizada frente às regras atuais. Para um conjunto de deploy tão distribuído, documentação imprecisa aumenta risco operacional.

## Prioridades que realmente elevariam a maturidade

1. **P1 — Gate de release de produção:** exigir testes unitários, regras/emuladores e build antes do deploy; restringir bypass de teste a uma exceção auditável. Criar uma release identificável e relacionar frontend, Functions, regras e índices ao mesmo commit.
2. **P1 — Recuperação comprovável:** documentar backup, RPO/RTO, restauração e rollback; executar pelo menos um ensaio de restauração e registrar o resultado.
3. **P1 — Verdade única de validação:** executar os gates no commit candidato e guardar resultado/revisão; reconciliar contagens e separar “testes adicionados” de “testes executados”.
4. **P2 — Modularizar Functions e serviços mais extensos:** extrair domínios com contratos claros e testes de integração por domínio, sem reescrita ampla de uma vez.
5. **P2 — Definir observabilidade operacional:** SLOs para login, criação/conversão de pedido, checkout e Functions; alertas acionáveis, dashboards e runbooks de resposta.
6. **P2 — Carga representativa:** exercitar fluxos autenticados e backend com dados sintéticos, limites de concorrência e acompanhamento de custo, usando ambiente de teste.
7. **P3 — Reduzir deriva e surpresa de dependências:** preferir `npm ci` onde viável, automatizar atualização/auditoria de dependências e manter documentação de ambientes, Rules e publicação junto dos workflows.

## Limites desta conclusão

Não executei testes, `npm audit`, load test nem build nesta avaliação. Também não verifiquei produção, Firebase Console, Secret Manager, Cloudflare, GitHub branch protection, backups reais, disponibilidade, incidentes ou custo. Portanto, as notas avaliam a maturidade demonstrável pelo código e pelos processos versionados, não a qualidade da operação externa nem a experiência dos usuários.
