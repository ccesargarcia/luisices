# Plano de correções e evolução do Luisices

Data: 30/09/2026. Referência: `develop`, commit `001047e`.

Documento de origem: [revisão técnica](REVISAO_DEVELOP_2026-09-30.md). Os números de achados abaixo correspondem àquela revisão. Este é um plano de implementação; não representa correções já realizadas nem validação em produção.

## Objetivo e prioridades

Corrigir os riscos identificados preservando os contratos dos pedidos, pagamentos, estoque, permissões, loja pública, IA e Alexa. A ordem privilegia autorização e integridade de dados antes de desempenho e organização interna.

1. Fechar entrada sem convite e impedir reativação de contas removidas.
2. Fazer as regras refletirem as permissões reais de exclusão e produção.
3. Preservar pagamentos e sincronizar pedidos e financeiro de forma confiável.
4. Impedir duplicação de conversões e perda de movimentos de estoque.
5. Calcular pedidos públicos com preços e disponibilidade confiáveis no servidor.
6. Garantir consultas completas, datas corretas e recuperação segura do cliente.
7. Reduzir exposição de dados, tratar dependências e estabelecer bloqueios de qualidade na entrega.
8. Medir desempenho e decompor módulos grandes após estabilizar os contratos.

Não é possível garantir ausência absoluta de regressões. Cada etapa deve produzir evidência verificável, mudanças pequenas e uma estratégia de recuperação.

## Regras de execução

- Revalidar cada achado no código atual antes de alterá-lo; registrar os já resolvidos com evidências.
- Preservar alterações locais e trabalhar em branch derivada de `develop`, sem reset destrutivo. Registrar o SHA efetivamente utilizado.
- Inventariar os escritores de cada entidade: interface, serviços, Functions, IA, Alexa e scripts. Corrigir apenas a interface não estabelece uma garantia de integridade.
- Preservar formatos existentes durante transições. Mudanças de schema precisam de leitores compatíveis, migração idempotente em modo de simulação e ordem de publicação explícita.
- Não usar regras permissivas, permissões administrativas globais ou supressão de erros como solução.
- Executar testes proporcionais à etapa e a suíte completa ao final. Não remover testes ou enfraquecer expectativas para obter aprovação.
- Separar implementação local, validação em emuladores e validação remota. Publicação e migração de produção são operações posteriores, com autorização explícita.
- Atualizar `docs/PROGRESSO_MELHORIAS_DEVELOP.md` durante a execução, com achado, estado, arquivos, testes, resultados, bloqueios e próximo passo.

## Etapa 0 — Baseline e mapa dos contratos

**Dependências:** nenhuma. **Abrangência:** todos os achados; triagem inicial do 15.

1. Ler instruções do repositório, revisão e scripts de validação. Registrar branch, SHA, alterações locais, versões de Node e gerenciador de pacotes.
2. Conferir compatibilidade dos engines de frontend, ferramentas e Functions; não copiar a versão local antiga automaticamente.
3. Executar build e testes existentes. Inspecionar a configuração antes de executar integração/E2E, assegurando projeto `demo-*` e emuladores, sem acesso acidental a produção.
4. Mapear papéis, permissões legadas e atuais, convites, ownership, estados dos pedidos, histórico de pagamento, vínculo com ledger e escritores externos.
5. Atualizar a auditoria de dependências dos dois lockfiles e identificar alcance real das vulnerabilidades. Antecipar uma correção isolada se houver risco crítico alcançável comprovado.

**Saída:** baseline reproduzível e matriz dos 19 achados. A revisão registrou 340 testes passando em 31 arquivos, mas esse número é histórico e deve ser medido novamente. Integração/E2E não foram executados naquela revisão.

**Critério de conclusão:** falhas preexistentes estão distinguidas de falhas introduzidas; nenhum resultado remoto é presumido.

## Etapa 1 — Base de regressão e gates iniciais

**Dependência:** etapa 0. **Achado:** 17, primeira parte.

1. Integrar os testes de regras existentes ao CI, com CLI fixada, instalação pelo lockfile e isolamento dos dados.
2. Preparar testes de Auth/Functions quando necessários: o script atual `test:integration` cobre Firestore e Storage e não comprova sozinho o fluxo completo de identidade.
3. Substituir o lint fictício de Functions por verificação real adequada ao projeto. Manter análise sintática e testes existentes.
4. Incorporar reproduções dos bugs às suítes permanentes junto de cada correção, com cenários negativos e concorrentes. Evitar testes que apenas reproduzem a implementação.

**Validação:** uma alteração propositalmente inválida em uma regra deve falhar no teste relevante; executar isso somente em ambiente isolado e remover a alteração de demonstração.

**Conclusão:** comandos documentados e CI verificam efetivamente o comportamento anunciado, sem jobs verdes por testes ignorados.

## Etapa 2 — Convites e ciclo de vida de usuários

**Dependência:** etapa 1. **Achados:** 1 e 2.

**Áreas:** `Register.tsx`, `firebaseUserService.ts`, `functions/index.js`, regras e verificações de identidade de IA/Alexa.

1. Validar convite no servidor, incluindo destinatário, validade, uso e permissões autorizadas. Consumir convite e criar perfil autorizado atomicamente no Firestore.
2. Tratar conta Auth sem perfil como pendente/sem acesso operacional. Remover criação automática de perfil ativo e fallbacks equivalentes em handlers.
3. Definir política de e-mail verificado conforme o contrato do produto. Planejar compatibilidade para contas legítimas existentes, sem conceder privilégios automaticamente a contas desconhecidas.
4. Remover fallback de exclusão direta do perfil após erro da callable. Preservar bloqueios de autoexclusão administrativa previstos pelo sistema.
5. Implementar exclusão retomável: registrar desativação, negar acesso operacional, revogar sessões e acompanhar exclusão Auth/Firestore. Auth e Firestore não compartilham uma transação.
6. Considerar somente `user-not-found` como sucesso idempotente na exclusão Auth; demais falhas permanecem visíveis e retomáveis. Preservar tombstone/auditoria suficientes para impedir recriação indevida, respeitando a política de dados.

**Testes:** convite ausente, inválido, expirado, reutilizado e de outro e-mail; duas aceitações simultâneas; SDK direto; perfil ausente/inativo em web e handlers; falha de rede/IAM/Auth; repetição da exclusão; sessão antiga; conta legítima existente.

**Conclusão:** autenticar não equivale a obter autorização; exclusão parcial não retorna sucesso integral nem permite ressuscitar o perfil.

## Etapa 3 — Permissões granulares e produção

**Dependência:** etapa 2. **Achados:** 3 e 4.

1. Diferenciar edição, exclusão lógica e restauração nas regras usando campos alterados. Exigir autorização específica para `deletedAt` e proteger ownership/atribuição.
2. Definir regras explícitas de `productionTracking`, com escopo e schema coerentes com os serviços de precificação.
3. Compatibilizar representações legadas de permissões quando necessário, sem interpretar ausência como autorização.

**Testes em emuladores:** editar sem excluir; tentativa direta de alterar `deletedAt`; restaurar sem permissão; trocar proprietário; leitura/escrita de produção por cada papel; payload inválido; usuário inativo e anônimo.

**Conclusão:** ações legítimas funcionam e tentativas pelo SDK são negadas independentemente da interface.

## Etapa 4 — Pedidos, pagamentos e financeiro

**Dependência:** etapa 3. **Achados:** 5, 6 e 7.

1. Definir contrato de patch: `undefined` significa não alterar; `null`/remoção explícita limpa campo quando permitido; `false` e `[]` são valores persistentes.
2. Preservar histórico, data e notas de pagamento ao editar dados não financeiros. Mudanças financeiras devem ser intencionais e auditáveis.
3. Centralizar alterações de pedido e ledger em transação/batch quando cabível. Se houver processamento assíncrono necessário, modelar estado pendente, retry idempotente e reconciliação; não retornar sucesso financeiro antes da garantia correspondente.
4. Implementar concorrência otimista com versão capturada no início da edição. Ler a versão imediatamente antes de gravar não detecta edição sobre uma tela desatualizada.
5. Tratar ledger ausente de forma explícita, com reconstrução segura a partir de fonte confiável e sem apagar pagamentos existentes.
6. Revisar todos os escritores, inclusive status, duplicação, IA e Alexa. Preservar as transações de criação e atribuição que já funcionam.

**Testes:** editar nome preserva histórico/data; limpar notas/tags/cor; desmarcar troca; duas edições simultâneas geram conflito tratável; falha no ledger não confirma operação completa; retry não duplica efeitos; ledger ausente e dados legados; papéis sem acesso financeiro.

**Conclusão:** não existe sucesso silencioso com pedido/ledger divergentes; alterações não financeiras não apagam dados financeiros.

## Etapa 5 — Aprovação idempotente de orçamentos

**Dependência:** etapa 4. **Achado:** 8.

1. Unificar autorização, consumo do orçamento, contador, pedido, ledger e vínculo de conversão em operação transacional, respeitando os limites do Firestore.
2. Utilizar identidade estável da operação. O mesmo retry deve retornar o mesmo pedido; não gerar uma chave nova a cada tentativa.
3. Validar estado e snapshot financeiro do orçamento. Preservar a conversão da lojinha já protegida.

**Testes:** clique duplo, abas concorrentes, timeout após commit, retry, orçamento já convertido, expirado e acesso indevido.

**Conclusão:** uma aprovação lógica gera exatamente um pedido e um vínculo financeiro, com retorno consistente nas repetições.

## Etapa 6 — Compras e estoque

**Dependência:** etapa 3 e contratos de idempotência das etapas 4–5. **Achado:** 9.

1. Gravar movimento/histórico e saldo de estoque atomicamente; eliminar leitura seguida de soma fora de transação.
2. Associar chave estável à compra para impedir duplicação em retries e impedir sucesso após falha parcial.
3. Separar remover um registro histórico de cancelar uma movimentação. Preservar auditoria e definir explicitamente a semântica apresentada na interface.
4. Projetar estorno idempotente considerando consumo posterior e custo médio. Não subtrair quantidade ou restaurar preço anterior cegamente.

**Testes:** estoque 10 e duas compras simultâneas de 5 resultam em 20 e dois movimentos; retry da mesma compra gera um movimento; falha no saldo não deixa histórico confirmado; cancelamento repetido; compra parcialmente consumida; valores inválidos.

**Conclusão:** saldo e movimentos conciliam. Uma decisão de negócio não inferível sobre estorno deve ser registrada e esclarecida antes de aplicar efeitos destrutivos.

## Etapa 7 — Checkout público confiável

**Dependências:** etapas 2–5. **Achado:** 13.

1. Criar operação de servidor para receber identificadores/quantidades, consultar produtos e calcular preços e total confiáveis. Preservar compra como visitante quando esse for o fluxo vigente.
2. Validar publicação da loja, pedidos habilitados, disponibilidade, limites, quantidades inteiras finitas e campos permitidos. Campos internos e de conversão nunca vêm do cliente.
3. Definir comportamento de preço alterado entre exibição e confirmação. Exibir resultado atualizado quando houver mudança relevante.
4. Implementar idempotência com escopo seguro e proteção contra abuso adequada. App Check isoladamente não resolve todos os abusos; não expor dados de outros clientes por colisão de chave.
5. Revalidar pedidos públicos legados na conversão; flags calculadas no navegador não são prova de integridade.
6. Preparar transição: backend compatível, migração do frontend, confirmação do uso do novo caminho e restrição da criação direta pelas regras. Tratar clientes antigos explicitamente.

**Testes:** preço adulterado, produto oculto/inexistente, loja fechada, online desabilitado, quantidades negativas/fracionárias/excessivas, campos reservados, repetição concorrente, isolamento de recibos, preço alterado e pedido legado adulterado.

**Conclusão:** valores aceitos derivam do servidor; a regra final bloqueia criação direta não confiável. Não declarar o risco encerrado enquanto a transição remota não estiver concluída.

## Etapa 8 — Consultas completas e datas

**Dependências:** etapas 4–5. **Achados:** 10, 11 e parte do 18.

1. Separar consulta de pedidos operacionais da paginação de histórico. Pendências antigas não podem sumir por limite dos últimos 200 registros.
2. Implementar paginação/filtros no servidor e agregações completas para totais. Não substituir o limite 200 por outro limite arbitrário.
3. Revisar orçamentos, busca, calendário, alertas, relatórios e expiração; processar expiração sem depender apenas dos documentos carregados no navegador.
4. Criar índices necessários e preservar escopo de acesso da equipe.
5. Estabelecer contrato único para data civil, timestamp e fuso do negócio. Confirmar o fuso existente antes de adotar `America/Sao_Paulo`; não aplicar compensações manuais de horas.
6. Definir intervalos com limites claros, preferencialmente início inclusivo e próximo dia exclusivo quando adequado. Distinguir data do pagamento da criação do pedido.

**Testes:** pelo menos 201 e 500 registros, pendência antiga e entrega futura; paginação sem omissões/duplicação; totais completos por papel; orçamento vencido fora da página; UTC e São Paulo; virada de mês/ano e limites do intervalo.

**Conclusão:** telas e relatórios entregam o universo prometido, sem esconder registros silenciosamente.

## Etapa 9 — Recuperação do cliente e privacidade

**Dependência:** etapa 1; executar após estabilização dos fluxos principais. **Achados:** 12 e 14.

1. Corrigir o ciclo de vida do Firestore: não continuar usando instância terminada. Definir recuperação controlada por reinicialização segura ou recarga explícita.
2. Preservar gravações offline pendentes; tratar múltiplas abas, indisponibilidade e limites de tentativas. Não limpar persistência cegamente.
3. Registrar diagnóstico antes/depois sem conteúdo sensível e apresentar falha recuperável ao usuário.
4. Configurar Replay para mascarar textos e bloquear mídia por padrão, com exceções pequenas e verificadas apenas para elementos seguros.

**Testes:** instância terminada, modo offline com escrita pendente, abas simultâneas, recuperação falha sem loop; dados sintéticos de nome, telefone, e-mail e imagens não aparecem em replay de teste.

**Conclusão:** a recuperação não perde alterações nem deixa o aplicativo permanentemente desconectado; privacidade remota continua pendente até inspeção autorizada da configuração efetiva.

## Etapa 10 — Dependências e runtime

**Dependência:** etapa 0; antecipável conforme triagem. **Achado:** 15.

1. Reexecutar auditoria dos lockfiles raiz e Functions. Documentar dependência direta/transitiva, caminho, alcance browser/servidor e correção disponível.
2. Atualizar em grupos pequenos e compatíveis; evitar `npm audit fix --force`, downgrades automáticos e overrides incompatíveis apenas para zerar contagens.
3. Verificar engines de Node, SDK Firebase/Admin, Functions, assinaturas de webhooks/Alexa, envio de e-mail e exportação XLSX/PDF conforme o pacote afetado.
4. Se não houver correção segura, registrar mitigação concreta e risco residual, com revisão posterior; não esconder alertas.

**Validação:** instalação limpa pelo lockfile em ambiente compatível; testes dos caminhos afetados; build; comparação da auditoria com causas, não somente número bruto.

**Conclusão:** cada alerta relevante tem tratamento verificável ou pendência explícita. Ausência de alerta não prova ausência de vulnerabilidades.

## Etapa 11 — Desempenho e modularização incremental

**Dependências:** etapas 4, 7 e 8. **Achados:** 18 e 19.

1. Medir leituras Firestore, recriação de listeners, latência e carregamento inicial em dataset reproduzível.
2. Limitar consultas por intervalos e paginação com totais completos. Evitar recriar listeners em todo evento de visibilidade/online quando a conexão existente já se recupera.
3. Medir carregamento real antes de alterar chunks: PDF e outros módulos podem já ser carregados sob demanda.
4. Extrair gradualmente componentes, hooks e lógica de domínio de `StoreCustomization`, `PublicCatalog` e diálogo Alexa. Compartilhar contratos/validação entre web, IA e Alexa onde fizer sentido.
5. Separar refatoração estrutural de mudança comportamental. Não introduzir uma reescrita de arquitetura ou troca de framework como pré-requisito.

**Validação:** comparação antes/depois nas mesmas condições; ausência de listeners duplicados; nenhuma perda de registros/totais; testes e smoke visual dos fluxos extraídos.

**Conclusão:** ganhos medidos, comportamento preservado e módulos menores com responsabilidades claras.

## Etapa 12 — Entrega integrada e preparação de publicação

**Dependências:** etapas anteriores; pendências independentes devem ser identificadas. **Achados:** 16 e conclusão do 17.

1. Fazer os workflows exigirem build, testes relevantes, integração de regras e smoke dos fluxos críticos antes da entrega.
2. Definir matriz de ambientes e artefatos: Hosting/Pages, Functions, Firestore Rules, índices, Storage Rules e, quando afetado, modelo Alexa. Git push não sincroniza esses componentes automaticamente.
3. Diagnosticar a exclusão de Storage no deploy de desenvolvimento antes de reinseri-lo. Preparar a correção mínima de IAM/configuração; não ampliar privilégios globalmente.
4. Registrar versões por artefato, ordem de publicação e falhas parciais. Workflows não devem sinalizar entrega completa quando um componente essencial falhou.
5. Preparar reconciliação/migração com dry-run, escopo, contagem, backup, retomada e validação. Não executar em produção nesta fase de implementação local.
6. Preparar rollback compatível por etapa. Para dados, preferir reparação auditável; para segurança, não reabrir regras vulneráveis para reverter uma UI.

**Validação final local:** build, suíte unitária, integração em emuladores, testes relevantes de Functions/IA/Alexa e E2E dos fluxos críticos. Incluir cadastro por convite, permissões, pedido/pagamento, orçamento, estoque, loja, calendário e financeiro. Usar dados sintéticos.

**Conclusão:** relatório com comando e resultado reais, riscos residuais, mudanças incompatíveis evitadas, plano de publicação e verificações externas ainda necessárias. Não confundir “pronto para publicar” com “publicado e validado”.

## Rastreabilidade dos 19 achados

| Achado | Tema | Etapa principal |
| --- | --- | --- |
| 1 | Convite e perfil autorizado | 2 |
| 2 | Exclusão e recriação de usuário | 2 |
| 3 | Permissão de exclusão lógica | 3 |
| 4 | Regras de productionTracking | 3 |
| 5 | Atomicidade de pedido e ledger | 4 |
| 6 | Preservação de pagamentos | 4 |
| 7 | Limpeza de campos e troca | 4 |
| 8 | Conversão duplicada de orçamento | 5 |
| 9 | Concorrência de compras/estoque | 6 |
| 10 | Dados ocultos por limite de consulta | 8 |
| 11 | Datas e fuso | 8 |
| 12 | Recuperação do Firestore | 9 |
| 13 | Checkout público confiável | 7 |
| 14 | Privacidade do Replay | 9 |
| 15 | Dependências vulneráveis | 0 e 10 |
| 16 | Publicação inconsistente | 12 |
| 17 | Integração ausente no CI/lint fictício | 1 e 12 |
| 18 | Leituras e listeners | 8 e 11 |
| 19 | Módulos grandes | 11 |

## Formato de acompanhamento

Para cada achado, registrar: estado (`não iniciado`, `em execução`, `implementado`, `validado localmente`, `bloqueado` ou `já resolvido com evidência`), SHA de referência, evidência atual, arquivos alterados, cenários testados, comandos/resultados, compatibilidade, publicação pendente e próximo passo.

Ao terminar cada etapa, revisar o diff e registrar o resultado. Continuar nas etapas independentes quando um bloqueio externo impedir apenas parte da execução. Falha de teste relevante impede declarar aquela correção validada.
