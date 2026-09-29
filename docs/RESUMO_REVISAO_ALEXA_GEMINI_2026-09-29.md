# Contexto para revisão independente do módulo Alexa

Copie este pedido para o Gemini depois de abrir o repositório atual. O objetivo é obter uma revisão baseada no código e separar falhas do backend de problemas de encaminhamento/configuração da Alexa.

---

## Pedido ao Gemini

Atue como engenheiro sênior com experiência em Alexa Skills Kit, Cloud Functions for Firebase, Firestore e segurança de aplicações por voz. Analise o estado atual do repositório, especialmente a branch `develop`, para investigar a falha descrita abaixo.

**Não altere arquivos, não faça deploy e não invente dados do Developer Console, Firebase ou Echo.** Primeiro inspecione o código e os workflows. Separe fatos confirmados de hipóteses. Se a evidência não permitir fechar a causa, indique exatamente qual observação ou log discrimina as hipóteses. Evite recomendações genéricas já tentadas pelo usuário.

### Sintoma que precisa ser explicado

- A interação funciona no simulador do Alexa Developer Console e chega à Firebase Function.
- Na Echo física, houve transcrição correta da frase de invocação, mas a skill não funciona de forma consistente. Uma resposta observada foi semelhante a “Papelaria de teste não é compatível com esse dispositivo”. Em uma tentativa anterior com outro nome, Alexa mencionou `smarthomedashboard`.
- Nas tentativas físicas anteriores, o usuário não encontrou chamada de `alexaWebhook` nos logs da Function. Confirme a ausência de chamada para a tentativa mais recente antes de tratá-la como fato atual.
- O usuário já informou que atualizou o modelo no Developer Console. Não responda apenas para salvar/construir o modelo, reativar a skill ou conferir novamente conta, estágio e endpoint sem apresentar uma razão nova e específica.
- O usuário está frustrado com sugestões repetidas. Priorize uma análise direta, evidência e um próximo passo que separe as causas com o mínimo de tentativas.

### Estado do repositório observado em 2026-09-29

- Branch: `develop`, sincronizada com `origin/develop` no commit `49f1e1c`.
- `49f1e1c`: muda o invocation name para **`papelaria de testes`** (plural), o título para “Papelaria de Testes” e as frases de exemplo.
- `c9244bb`: muda os slots `customer` de `AMAZON.Person` para `AMAZON.FirstName`, adiciona uma amostra `{customer}`, amplia a recuperação de rascunhos multi-turn e remapeia slots de cliente/produto segundo o contexto esperado. Também muda a disponibilidade do manifesto para mundial e remove `distributionCountries`.
- `a2f72d7` havia restaurado o singular **`papelaria de teste`**, mas `49f1e1c` alterou novamente para o plural. Logo, o conteúdo atual do repositório está no plural; não presuma que coincide com o pedido anterior do usuário ou com o Developer Console.
- Os commits recentes incluem `[skip tests]`. Em verificação local, `alexa-senior-audit.test.ts` e `natural-dialog.test.ts` passaram: 84 testes. Isso não testa ASR, encaminhamento Alexa, Developer Console, nem Echo física.

### Arquivos e pontos a inspecionar

- `alexa/skill-package/interactionModels/custom/pt-BR.json`
  - `invocationName` atual: `papelaria de testes`.
  - Intents e exemplos de frases para `CreateOrderIntent`, `ProvideCustomerIntent` e outros turnos.
  - Slots `customer` usando `AMAZON.FirstName`.
- `alexa/skill-package/skill.json`
  - Nome de exibição, endpoint, interfaces e `isAvailableWorldwide: true`.
- `functions/alexa/index.js`
  - Exportação/handler `alexaWebhook`, validação HTTP, assinatura, timestamp, Skill ID e logs.
- `functions/alexa/config.js` e `functions/alexa/verification.js`
  - Skill ID permitido em dev, configuração e condições que rejeitam uma requisição.
- `functions/alexa/dialog.js`
  - `findActiveDraftForUser` e lógica nova de retomada/remapeamento de slots.
- `.github/workflows/deploy-dev.yml`
  - Dispara por push em `develop`; com `[skip tests]`, pula o job de testes, mas ainda executa build e deploy de Hosting e regras/índices Firestore.
- `.github/workflows/deploy-functions-manual.yml`
  - Deploy de Functions é manual (`workflow_dispatch`), com opção de escolher `alexaWebhook` em dev.

### Fatos do código que precisam entrar na análise

1. O manifesto local aponta para `https://us-central1-luisices-dev.cloudfunctions.net/alexaWebhook`, e `functions/index.js` exporta `alexaWebhook`.
2. O código do backend não tem uma regra geral dizendo que Echo Show ou Echo é incompatível. Há restrição opcional por device ID para autorização de pedidos, mas a fala dessa rejeição no código é diferente da mensagem de incompatibilidade relatada.
3. O handler emite avisos para falhas de assinatura/timestamp/Skill ID, mas não parece emitir um log explícito de entrada antes dessas verificações. Considere que “não achei logs” pode depender do painel/filtro consultado. Sugira um sinal mínimo e seguro para distinguir chamada HTTP recebida, rejeitada antes do processamento e nenhuma chamada. Não registre o corpo completo nem dados pessoais.
4. O workflow automático de `develop` não implanta Functions nem sincroniza o pacote Alexa com o Developer Console. Não assuma que os commits recentes de `functions/alexa/dialog.js` ou dos JSON já estão ativos nos respectivos serviços.
5. A alteração para `AMAZON.FirstName` é compatível com pt-BR segundo a documentação da Amazon, mas revise a adequação para nomes completos de clientes e não trate teste unitário como teste de reconhecimento de voz.

### Revisão funcional e de segurança pedida

Além da causa do problema na Echo, examine estes riscos concretos:

- A recuperação nova pega o rascunho ativo mais recente do usuário quando uma intenção de continuação chega sem `draftId`. Avalie o caso de dois ou mais rascunhos ativos e se uma fala curta pode alterar o pedido errado. Considere se a busca deve exigir vínculo/ambiente explícitos e se deve pedir esclarecimento quando houver ambiguidade.
- O remapeamento de `product` para `customer` (e o inverso) depende de `expectedInput`; avalie falsos positivos e se a confirmação do pedido impede a gravação incorreta.
- A disponibilidade mundial no manifesto: explique o efeito no estágio DEV e o risco se a skill for publicada, considerando a intenção de uso privado/local no Brasil.
- Verifique se a mudança do nome de invocação pode afetar a resolução da Alexa. Diferencie nome falado (`invocationName`) de título exibido (`publishingInformation.locales.pt-BR.name`).
- Determine se a frase “não é compatível com esse dispositivo” pode sair do código existente ou se, na ausência de requisição HTTP, aponta para uma resposta anterior ao backend. Não conclua sem evidência.

### Formato da resposta

Entregue:

1. **Resumo do diagnóstico**, com a hipótese mais provável e o grau de confiança.
2. **Achados por prioridade** (P0/P1/P2), cada um com arquivo/linhas, cenário de falha, impacto e recomendação mínima.
3. **Tabela de evidência** separando confirmado no repositório, informado pelo usuário e ainda não verificado.
4. **Árvore curta de diagnóstico** baseada em um único teste físico e nos logs de requisição do Cloud Functions/Cloud Run:
   - como distinguir “Alexa não chamou endpoint” de “endpoint recebeu e rejeitou”;
   - quais campos seguros/logs observar;
   - que conclusão cada resultado permite.
5. **Validação recomendada** para o código, modelo e Echo. Não afirme compatibilidade ou sucesso em produção sem execução real.

Use documentação oficial da Amazon e Firebase para afirmações externas. Não sugira trocar o nome repetidamente como tentativa e erro. Se recomendar outra frase de invocação, explique a regra/documentação que justifica a troca e proponha uma única opção distintiva.

---

## Observação para quem for executar

Antes de aplicar qualquer recomendação, confira o estado atual de `develop`: este resumo retrata o checkout em 2026-09-29 e pode ficar desatualizado. Em especial, confirme o invocation name atual no Developer Console, o histórico do workflow manual de Functions e os logs da tentativa física mais recente.
