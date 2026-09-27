# Relatório de Implementação: Pedidos por Alexa no Luisices

**Data:** 27 de setembro de 2026  
**Status da Implementação:** Concluída em ambiente de desenvolvimento local (`develop`).  
**Produção:** **Desativada** (`enabled: false`), sem implantação automática.  
**Referência da Especificação:** [`docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md`](file:///home/caiogarcia/luisices/docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md).

---

## 1. Prova de Viabilidade Técnica e Personalização em pt-BR

### 1.1 Invocação (Invocation Name)
- **Desenvolvimento:** `luisices de teste`
  - *Viabilidade:* Validado segundo as diretrizes oficiais da Amazon Alexa Skills Kit. Nomes compostos de 2 a 3 palavras são aceitos para skills customizadas. O nome é formado exclusivamente por letras minúsculas, sem caracteres especiais e sem palavras reservadas proibidas (`alexa`, `skill`, `app`, `amazon`).
- **Produção:** `ateliê luisices` (ou `luisices` se validado com comprovação de marca).
  - *Comportamento estrito:* O endpoint rejeita o processamento caso uma skill de desenvolvimento invoque o endpoint de produção ou vice-versa (`ENVIRONMENT_MISMATCH`). O texto falado nunca escolhe o banco de dados.

### 1.2 Personalização e Reconhecimento Biométrico de Voz (`personId`)
- A Amazon Alexa disponibiliza em `pt-BR` perfis de voz biométricos cadastrados no aplicativo Alexa no smartphone.
- O manifesto [`alexa/skill-package/skill.json`](file:///home/caiogarcia/luisices/alexa/skill-package/skill.json) solicita explicitamente o escopo:
  ```json
  "permissions": [
    { "name": "alexa::person_id:read" }
  ]
  ```
- Quando um perfil é reconhecido, a Alexa entrega o identificador seguro em `context.System.person.personId`.
- **Regra de Negação por Padrão:** Quando `personId` for ausente ou nulo (ex: visitante falando, perfil não treinado ou falha de reconhecimento), o backend **recusa imediatamente** a operação com a mensagem:
  > *"Não reconheci sua voz cadastrada. Configure seu perfil de voz no aplicativo Alexa e tente novamente."*
- **Nunca** se utiliza o `userId` da conta do aparelho ou o nome pronunciado como comprovação de identidade.

### 1.3 Pendência Manual Declarada (Validação Real de Hardware Echo)
> [!IMPORTANT]
> **A validação biométrica de voz com a Amanda e com uma segunda pessoa é uma pendência física obrigatória no dispositivo Echo real.**  
> Não foi simulada uma validação de hardware real. O reconhecimento depende da acústica do ambiente, calibração do perfil de voz da Amanda no app Alexa e hardware físico. Antes de ativar o modo automático em produção, o teste com duas pessoas deve ser executado no Echo físico conforme o roteiro operacional na Seção 6.

---

## 2. Arquitetura e Decisões de Engenharia

1. **Zero LLM / Baixo Custo e Alta Velocidade:**
   - O fluxo de criação de pedidos é 100% determinístico usando Custom Skill Alexa direta para Cloud Functions v2 (`onRequest`), sem chamada para Gemini, OpenAI ou qualquer serviço intermediário de automação (n8n, Zapier).
2. **Pareamento Supervisionado e Revogável (Sem OAuth Improvisado):**
   - Na presença do administrador, a pessoa autorizada diz *"vincular minha voz"*.
   - A Alexa fala um código aleatório de 8 dígitos (espaçado) com validade de 5 minutos.
   - O administrador digita o código na tela do Luisices e confirma o usuário de destino. O vínculo `alexaBindings` armazena a chave hash HMAC-SHA256:
     $$\text{bindingKey} = \text{HMAC-SHA256}(\text{environment} + \text{skillId} + \text{amazonUserId} + \text{personId})$$
   - A revogação pode ser feita a qualquer instante pelo administrador ou pelo próprio usuário no Luisices.
3. **Transação Única e Consistente:**
   - Criação atômica no Firestore garantindo:
     1. Incremento do contador sequencial em `users/{uid}/metadata/counters`.
     2. Geração do número de pedido sequencial compartilhado com a web (`#YYYY-XXXX`).
     3. Gravação em `orders/{orderId}` com `source: 'alexa'`, workflow de 7 etapas e status inicial `pending`.
     4. Gravação idêntica em `salesLedger/{orderId}` para controle financeiro.
     5. Consumo do rascunho em `alexaDrafts/{draftId}`.
     6. Emissão de recibo durável em `alexaCommits/{draftId}`.
4. **Idempotência Durável em Dois Níveis:**
   - Nível 1: Chave da requisição `(skillId, requestId)` deduplica reentregas da Amazon.
   - Nível 2: Recibo durável em `alexaCommits/{draftId}` impede duplicidade mesmo em caso de repetição de "Sim" ou perda de pacote de rede após o commit.
5. **Proteção Contra Troca de Pessoa Durante o Diálogo:**
   - Se o rascunho foi iniciado por uma pessoa e outra pessoa (ou convidado) disser "Sim", o commit é bloqueado imediatamente com aviso de segurança.
6. **Rate Limiting Distribuído:**
   - 30 requisições/minuto por vínculo;
   - 10 pedidos/hora e 50 pedidos/dia por pessoa;
   - 5 tentativas de pareamento/hora por aparelho Echo.

---

## 3. Arquivos Criados e Alterados

### 3.1 Backend Cloud Functions (`functions/`)
- [`functions/alexa/config.js`](file:///home/caiogarcia/luisices/functions/alexa/config.js): Leitura e validação de ambiente (`ALEXA_ENVIRONMENT`, `ALEXA_SKILL_ID`, `ALEXA_ENABLED`, `ALEXA_TIMEZONE`, `ALEXA_IDENTITY_HMAC_KEY`).
- [`functions/alexa/repository.js`](file:///home/caiogarcia/luisices/functions/alexa/repository.js): Constantes de coleções, funções criptográficas HMAC-SHA256 e auditoria estruturada sanitizada.
- [`functions/alexa/verification.js`](file:///home/caiogarcia/luisices/functions/alexa/verification.js): Verificação criptográfica de assinatura oficial da Amazon (`SkillRequestSignatureVerifier`), tolerância de timestamp (150s), tamanho de corpo (128 KiB) e Application ID.
- [`functions/alexa/authorization.js`](file:///home/caiogarcia/luisices/functions/alexa/authorization.js): Portão de autorização no servidor (valida `personId`, vínculo ativo, perfil ativo, Auth não desativado e permissão `orders.create`).
- [`functions/alexa/rateLimit.js`](file:///home/caiogarcia/luisices/functions/alexa/rateLimit.js): Rate limiter atômico distribuído no Firestore (`alexaRateLimits`).
- [`functions/alexa/pairing.js`](file:///home/caiogarcia/luisices/functions/alexa/pairing.js): Geração de desafio de 8 dígitos por voz e callable de aprovação supervisionada por administrador.
- [`functions/alexa/orderService.js`](file:///home/caiogarcia/luisices/functions/alexa/orderService.js): Transação Firestore única para criação do pedido, contador, ledger e recibo durável.
- [`functions/alexa/dialog.js`](file:///home/caiogarcia/luisices/functions/alexa/dialog.js): Máquina de estados de diálogo em pt-BR (`collecting -> awaiting_confirmation -> committed`), sanitização SSML, validação de datas e valores monetários.
- [`functions/alexa/callables.js`](file:///home/caiogarcia/luisices/functions/alexa/callables.js): Callables administrativos de status, permissão, pareamento, revogação e aprovação web.
- [`functions/alexa/index.js`](file:///home/caiogarcia/luisices/functions/alexa/index.js): Exportação do webhook `onRequest` v2 e dos callables `onCall`.
- [`functions/index.js`](file:///home/caiogarcia/luisices/functions/index.js): Registro e exportação das funções da Alexa.
- [`functions/package.json`](file:///home/caiogarcia/luisices/functions/package.json): Adicionadas dependências `ask-sdk-core` (v2.14.0) e `ask-sdk-express-adapter` (v2.14.0).

### 3.2 Pacote da Skill Alexa (`alexa/skill-package/`)
- [`alexa/skill-package/skill.json`](file:///home/caiogarcia/luisices/alexa/skill-package/skill.json): Manifesto com permissão de `personId`, endpoint HTTPS e metadados pt-BR.
- [`alexa/skill-package/interactionModels/custom/pt-BR.json`](file:///home/caiogarcia/luisices/alexa/skill-package/interactionModels/custom/pt-BR.json): Modelo de interação com intents (`CreateOrderIntent`, `ProvideCustomerIntent`, etc.), slots nativos e tipo customizado `PRODUCT_TYPE` com sinônimos do ateliê.

### 3.3 Frontend e Segurança
- [`src/app/types.ts`](file:///home/caiogarcia/luisices/src/app/types.ts): Extensão da interface `Order` (`source`, `voiceDraftId`, `voiceConfirmationMode`) e tipos da Alexa (`AlexaIntegrationStatus`, etc.).
- [`src/services/firebaseAlexaService.ts`](file:///home/caiogarcia/luisices/src/services/firebaseAlexaService.ts): Serviço cliente para comunicação com as Cloud Functions.
- [`src/app/components/settings/AlexaSettingsSection.tsx`](file:///home/caiogarcia/luisices/src/app/components/settings/AlexaSettingsSection.tsx): Seção administrativa de pareamento, desligamento global, rascunhos pendentes e auditoria.
- [`src/app/pages/Settings.tsx`](file:///home/caiogarcia/luisices/src/app/pages/Settings.tsx): Inclusão da `AlexaSettingsSection`.
- [`src/app/pages/Users.tsx`](file:///home/caiogarcia/luisices/src/app/pages/Users.tsx): Controles de autorização de voz e modo de confirmação por usuário.
- [`src/app/components/OrderCard.tsx`](file:///home/caiogarcia/luisices/src/app/components/OrderCard.tsx): Exibição do selo visual "Alexa" nos pedidos criados por voz.
- [`src/app/components/orders/OrderInfoView.tsx`](file:///home/caiogarcia/luisices/src/app/components/orders/OrderInfoView.tsx): Detalhes de auditoria visual de origem Alexa.
- [`firestore.rules`](file:///home/caiogarcia/luisices/firestore.rules): Bloqueio estrito de leitura/escrita direta pelo SDK cliente em todas as 9 coleções técnicas da Alexa.

---

## 4. Testes Executados

### 4.1 Testes Unitários Automatizados (`vitest`)
Executados com `npm run test:unit`:
- **Total de Suítes Executadas:** 23 arquivos (incluindo todas as suítes existentes da aplicação).
- **Total de Testes:** **179 testes aprovados (100% sucesso)**.
- **Suítes Específicas da Alexa:**
  1. `tests/unit/alexa/verification.test.ts`: 6 testes (método POST, limite 128 KiB, timestamp máximo 150s, cabeçalhos de assinatura, Application ID da skill).
  2. `tests/unit/alexa/authorization.test.ts`: 7 testes (rejeição de ausência de `personId`, rejeição de usuário inativo, rejeição sem permissão `orders.create`, autorização da Amanda com UID correto).
  3. `tests/unit/alexa/pairing.test.ts`: 5 testes (geração de 8 dígitos, expiração em 5 minutos, aprovação por administrador ativo, rejeição de código expirado ou não admin).
  4. `tests/unit/alexa/dialog.test.ts`: 9 testes (validação de datas no fuso SP, limites monetários, geração do resumo verbal, bloqueio de troca de pessoa no momento da confirmação, terminação após 3 fallbacks).
  5. `tests/unit/alexa/order-transaction.test.ts`: 3 testes (transação atômica única, incremento de contador, sincronia com ledger, idempotência durável sem duplicação).
  6. `tests/unit/alexa/rate-limit.test.ts`: 3 testes (30 req/min, 10 pedidos/h e 50 pedidos/dia, 5 pareamentos/h).

### 4.2 Verificação Estática e Build de Produção
- `npm run typecheck`: **Aprovado com 0 erros** no TypeScript.
- `npm run build`: **Compilação concluída com sucesso** em 22,4 segundos.

---

## 5. Estimativa de Custos e Métricas de Latência

### 5.1 Planilha de Consumo e Custo Mensal Estimado (Tabela Oficial Firebase/Google Cloud)

Como não há modelo de inteligência artificial generativa nem infraestrutura permanente (servidores dedicados ou Redis), o custo é puramente serverless sob demanda:

| Cenário Mensal | Pedidos Criados | Turnos de Conversa (méd. 6/pedido) | Invocações Cloud Functions | Leituras Firestore | Escritas Firestore | Custo Estimado (R$/mês) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pessoal (Amanda)** | 300 | 1.800 | ~2.200 | ~6.600 | ~1.500 | **R$ 0,00 a R$ 2,50** *(coberto pela franquia gratuita do Firebase)* |
| **Pequena Equipe** | 1.000 | 6.000 | ~7.500 | ~22.500 | ~5.000 | **R$ 3,00 a R$ 6,00** |
| **Maior Uso** | 3.000 | 18.000 | ~22.000 | ~66.000 | ~15.000 | **R$ 8,00 a R$ 14,00** |

*Nota:* O custo adicional é mantido rigorosamente dentro da meta de produto de até R$ 10,00/mês para o perfil de uso pessoal.

### 5.2 Orçamento e Expectativa de Latência
- **Janela Máxima da Alexa:** A Amazon encerra a chamada com erro de timeout caso não receba resposta em **8 segundos**.
- **Orçamento Interno Implementado:** Limite operacional de **6 segundos**.
- **Latência Esperada:**
  - Instância quente: p95 inferior a **1.200 ms** por turno de diálogo.
  - Instância fria (cold start v2 com 256 MiB): p95 em torno de **2.500 ms**, bem abaixo do limite de 8 segundos da Alexa.
  - Transação de gravação final: < **800 ms** no Firestore.

---

## 6. Roteiro Operacional: Teste Físico no Echo e Validação

### Passo 1: Preparação no Aplicativo Alexa
1. Amanda abre o aplicativo **Amazon Alexa** no celular conectado à conta do Echo.
2. Acessa: **Mais → Configurações → Seu Perfil e Família → Perfil de Voz**.
3. Treina e confirma seu perfil biométrico de voz dizendo as frases solicitadas pelo aplicativo.
4. Garante que o Echo físico esteja conectado à mesma residência/conta.

### Passo 2: Vinculação Supervisionada no Luisices
1. O administrador acessa `dev.luisices.com.br` (ou local) em **Configurações → Criação de Pedidos por Alexa**.
2. Verifica se o usuário da Amanda está cadastrado com perfil ativo e permissão de criar pedidos.
3. Amanda, diante do Echo e na presença do administrador, diz:
   > *"Alexa, abrir luisices de teste."*  
   > *(Alexa responde)*: *"Olá, Amanda. Ambiente de teste. Diga criar pedido ou vincular minha voz."*  
   > Amanda diz: *"Vincular minha voz."*  
   > *(Alexa fala)*: *"Seu código de vinculação é: [8 dígitos espaçados]."*
4. O administrador insere os 8 dígitos no formulário de pareamento da tela de Configurações, seleciona Amanda e clica em **Aprovar Vinculação**.

### Passo 3: Teste de Criação e Teste Negativo
1. **Teste Positivo (Amanda):**
   - Amanda diz: *"Alexa, abrir luisices de teste."*
   - Amanda: *"Criar pedido de vinte caixinhas para Maria."*
   - Alexa: *"Qual é a data de entrega?"*
   - Amanda: *"Dez de outubro."*
   - Alexa: *"Qual é o valor total do pedido?"*
   - Amanda: *"Cem reais."*
   - Alexa: *"Amanda, no ambiente de teste: vinte caixinhas para Maria, entrega em dez de outubro de 2026, total de cem reais. Confirmar?"*
   - Amanda: *"Sim."*
   - Alexa: *"Pedido criado no seu espaço de teste com o número #2026-0001."*
   - Conferir se o pedido aparece imediatamente no quadro do Luisices no filtro da Amanda com o selo visual **Alexa**.
2. **Teste Negativo (Segurança com Segunda Pessoa):**
   - Outra pessoa (ou visitante) tenta dizer exatamente as mesmas frases para a Alexa.
   - A Alexa deve responder: *"Não reconheci sua voz cadastrada..."* ou negar a confirmação, e **nenhum pedido** deve ser inserido no banco de dados.
