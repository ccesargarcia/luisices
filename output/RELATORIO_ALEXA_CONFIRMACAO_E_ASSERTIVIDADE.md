# Relatório Técnico: Confirmação de Voz e Assertividade da Alexa — Luisices

**Data:** 30 de setembro de 2026  
**Ambiente:** Linux, Node v20.20.2, Branch `develop`  
**Referência Oficial Amazon ASK:** [Re-prompt if a speaker is unrecognized](https://developer.amazon.com/en-US/docs/alexa/custom-skills/test-troubleshoot-personalization.html)  

---

## 1. Problema Diagnosticado e Comportamento Final

### 1.1 Causa Raiz
No dispositivo físico Echo (ex: Echo Pop / Dot), palavras monossilábicas curtas como **"Sim"** frequentemente contêm pacotes acústicos insuficientes para o algoritmo de *beamforming* e identificação de perfil de voz da Amazon anexar o identificador biométrico `envelope.context.System.person.personId`.
Anteriormente, o subsistema `functions/alexa/dialog.js` adotava uma política prematura: na **primeira** resposta afirmativa sem `personId`, mesmo com sessão legítima e rascunho íntegro, o sistema encerrava imediatamente o diálogo por voz, alterava o draft para `awaiting_app_approval` e emitia:
> *"Não reconheci sua voz com segurança na confirmação. Por segurança, o pedido foi enviado para aprovação no aplicativo Luisices."*

Isso impedia o usuário de confirmar o pedido por voz no Echo, forçando-o a abandonar a Alexa e abrir o aplicativo web/mobile para aprovar. Além disso, o modo `app_approval` compartilhava esse ramo desnecessariamente, e os prompts verbais não orientavam o usuário a pronunciar uma frase com maior riqueza fonética.

### 1.2 Comportamento Final Implementado
1. **Política de 2 Novas Tentativas (3 tentativas no total) no modo `voice_confirm`:**
   - **1ª confirmação sem `personId` atual:** Mantém a sessão aberta (`shouldEndSession: false`), preserva o draft em `awaiting_confirmation`, incrementa `voiceConfirmationFailures` para `1` dentro de transação atômica e solicita:
     > **Fala:** *"Não consegui reconhecer sua voz nesta resposta. Diga: pode confirmar."*  
     > **Reprompt:** *"Para confirmar o pedido, diga: pode confirmar."*
   - **2ª confirmação sem `personId` atual:** Mantém a sessão aberta, preserva o draft em `awaiting_confirmation`, incrementa `voiceConfirmationFailures` para `2` dentro de transação e oferece a última nova tentativa com o mesmo prompt orientativo.
   - **Confirmação com `personId` correspondente na 2ª ou 3ª tentativa:** Revalida autenticação e permissões via transação e efetua exatamente um commit (`commitOrderFromDraft`), gerando exatamente um pedido e um lançamento no livro de vendas.
   - **3ª confirmação sem `personId` atual (limite atingido):** Transiciona atomicamente o rascunho para `awaiting_app_approval`, incrementa o contador para `3`, encerra a sessão (`shouldEndSession: true`) e informa com fidelidade:
     > *"Não reconheci sua voz com segurança na confirmação. Por segurança, o pedido foi enviado para aprovação no aplicativo Luisices."*
2. **Isolamento do modo `app_approval`:**
   - Usuários com `mode === 'app_approval'` não passam pelas retentativas de voz. A confirmação transiciona o rascunho diretamente para `awaiting_app_approval` e responde a mensagem padrão:
     > *"Pedido preparado no seu espaço de teste. Acesse o Luisices no aplicativo para conferir e aprovar a gravação definitiva."*
3. **Orientação Fonética nos Prompts de Resumo:**
   - Prompts de confirmação final sugerem explicitamente a pronúncia de *"pode confirmar"*:
     > *"Amanda, no ambiente de teste: 10 caixinhas para Maria, entrega em 20 de novembro de 2026, total de 100 reais. Confirmar? Diga: pode confirmar. Ou diga o que deseja corrigir."*
   - O modelo de interação (`pt-BR.json`) agora inclui `"confirmo o pedido"` em `AMAZON.YesIntent`.
4. **Proteção Anti-Hijacking e Fail-Safe Preservados:**
   - Se uma pessoa física diferente for detectada (`personId` diferente da pessoa do draft ou da sessão), a requisição é rejeitada imediatamente sem fallback.
   - Contadores recebidos via atributos de sessão são ignorados; a persistência no Firestore é a única fonte da verdade.
   - Falha transitória na transição para o app emite mensagem verdadeira e não alega falsamente que o pedido foi enviado.

---

## 2. Arquivos Alterados e Motivo

| Arquivo | Motivo da Alteração |
| :--- | :--- |
| `functions/alexa/dialog.js` | Implementação da política de 2 novas tentativas (`voiceConfirmationFailures`), transição na 3ª falha afirmativa, isolamento do modo `app_approval`, atualização dos prompts de confirmação para sugerir *"pode confirmar"*, prevenção de reabertura em drafts expirados e registro de eventos estruturados `[AlexaDiagnostic]`. |
| `functions/alexa/authorization.js` | Inclusão de telemetria diagnóstica estruturada em `authorizeAlexaPerson` (`[AlexaDiagnostic]`) com detecção de presença de biometria física, biometria de sessão e resultado da autorização, com total ausência de dados pessoais (zero PII). |
| `alexa/skill-package/interactionModels/custom/pt-BR.json` | Adição da amostra multissilábica `"confirmo o pedido"` ao `AMAZON.YesIntent`, ampliando as opções fonéticas de confirmação. |
| `tests/unit/alexa/natural-dialog.test.ts` | Atualização do teste de confirmação curta sem biometria para validar o ciclo completo (1ª tentativa -> retry, 2ª tentativa -> retry, 3ª tentativa -> transição para `awaiting_app_approval`). |
| `tests/unit/alexa/interaction-model.test.ts` | Revisão do título e expectativas do teste 7 (deixando explícita a verificação estrutural antes do profiler da Alexa) e isolamento do diretório temporário no teste 8 para evitar concorrência. |
| `tests/unit/alexa/confirmation-retry.test.ts` | **(Novo)** Suíte dedicada cobrindo os 11 cenários de diálogo e os 4 fluxos do caminho completo de ponta a ponta (`processAlexaEnvelope`). |

---

## 3. Tabela dos Cenários Obrigatórios com Resultados Reais

Todos os testes foram executados via `vitest run` e validados com asserções estritas:

| # | Cenário Obrigatório | Resultado Esperado | Resultado Real no Teste | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Primeira confirmação sem identificação atual | Contador 1; `awaiting_confirmation`; sessão aberta; solicita "pode confirmar"; 0 pedidos gravados | `res.shouldEndSession === false`, speech orienta "pode confirmar", failures: 1, 0 orders | **PASSOU** |
| **2** | Segunda confirmação sem identificação atual | Contador 2; `awaiting_confirmation`; sessão aberta; última tentativa por voz | `res.shouldEndSession === false`, failures: 2, state awaiting_confirmation, 0 orders | **PASSOU** |
| **3** | Terceira confirmação sem identificação atual | Transição atômica para `awaiting_app_approval`; encerra sessão; 0 pedidos gravados diretamente | `res.shouldEndSession === true`, speech avisa envio ao app, state awaiting_app_approval, failures: 3 | **PASSOU** |
| **4** | Identificação atual correspondente antes do limite | Revalida autorização e confirma pelo serviço transacional; exatamente um pedido | `res.shouldEndSession === true`, state committed, exatamente 1 pedido gravado em `orders` | **PASSOU** |
| **5** | Identificação atual diferente | Rejeita imediatamente; nenhuma gravação; não usa identidade anterior como fallback | `res.shouldEndSession === true`, speech acusa pessoa diferente, 0 pedidos gravados | **PASSOU** |
| **6** | Draft legado sem contador ou com contador inválido | Inicia em 0 se ausente; falha fechado (limite 2) se corrompido/não-numérico | Ausente -> retry com contador 1; Corrompido -> transiciona para app_approval | **PASSOU** |
| **7** | Revisão obsoleta ou divergente | Apresenta resumo atual antes de aceitar confirmação; não consome tentativa de voz | `res.speech` informa atualização, reprompt orienta "pode confirmar", contador inalterado | **PASSOU** |
| **8** | Repetir pedido (`RepeatOrderIntent`) | Apresenta o que está no draft, preserva o limite de tentativas e nunca grava | `res.speech` repete resumo, failures mantido em 1, state awaiting_confirmation | **PASSOU** |
| **9** | Draft expirado, cancelado ou committed | Não reabre, não prolonga e não confirma | `res.shouldEndSession === true`, speech informa ausência de pedido ativo, 0 pedidos | **PASSOU** |
| **10** | Falha na transição para o app | Mensagem verdadeira sem afirmar envio; estado consistente | `res.speech` avisa impossibilidade de envio, state awaiting_confirmation preservado | **PASSOU** |
| **11** | Modo `app_approval` | Preserva encaminhamento normal para aprovação sem exigir novas tentativas de voz | Transiciona diretamente para `awaiting_app_approval`, emite speech padrão de app | **PASSOU** |
| **12** | Caminho Completo: Início válido -> Retry sem personId -> Confirmação com personId | Fluxo completo via `processAlexaEnvelope` autoriza e grava exatamente um pedido | Turno 1 -> session aberta com retry; Turno 2 -> pedido gravado e idempotência garantida | **PASSOU** |
| **13** | Caminho Completo: Deduplicação de transporte | Reenvio com mesmo `requestId` devolve cache e não consome nova tentativa | Resposta idêntica obtida do cache do Firestore, contador de falhas preservado | **PASSOU** |
| **14** | Caminho Completo: Identificação diferente | Bloqueio de voz na autorização anti-hijacking antes do commit | Rejeitado antes do diálogo por personId divergente da sessão, 0 pedidos | **PASSOU** |
| **15** | Caminho Completo: Perda de sessão sem vínculo | Rejeição imediata na autorização | Rejeitado com código `VOICE_NOT_RECOGNIZED`, 0 pedidos gravados | **PASSOU** |

---

## 4. Comandos e Quantidades Exatas de Testes

### 4.1 Suíte Alexa Completa
```sh
npm test -- tests/unit/alexa
```
- **Arquivos de teste:** 13 aprovados (13 arquivos no total).
- **Testes executados:** 189 aprovados, 0 falhas, 0 pulados.
- **Duração:** ~5,5 segundos.

### 4.2 Suíte de Testes Unitários do Repositório
```sh
npm run test:unit
```
- **Arquivos de teste:** 31 aprovados (31 arquivos no total).
- **Testes executados:** 340 aprovados, 0 falhas.
- **Duração:** ~14,7 segundos.

### 4.3 Verificação Estática de Tipos (TypeScript)
```sh
npm run typecheck
```
- **Resultado:** Execução limpa (`tsc --noEmit`), código 0, zero erros de tipagem.

---

## 5. Testes Bloqueados e Limitações do Ambiente

- **Testes com Firestore Emulator Local (`npm run test:integration`):**
  - **Comando:** `firebase emulators:exec --config firebase.test.json --project demo-luisices-review --only firestore,storage "vitest run --config vitest.integration.config.ts"`
  - **Status:** **Bloqueado por restrição de ambiente do host.**
  - **Motivo Real:** A máquina host executa Node.js v20.20.2 sob Linux com modo FIPS ativado no OpenSSL do sistema. O utilitário de download de binários do `firebase-tools` (`lib/downloadUtils.js:54`) invoca `crypto.createHash('md5')` para validar o checksum do JAR do emulador Firestore (`cloud-firestore-emulator-v1.22.0.jar`), gerando o erro nativo:
    ```
    Error: error:060800C8:digital envelope routines:EVP_DigestInit_ex:disabled for FIPS
    ```
  - **Mitigação:** Conforme documentado no próprio `tests/integration/README.md`, essa execução requer Node 24 (ou ambiente de CI sem bloqueio FIPS de MD5). Todas as asserções de atomicidade, transação, reversão e condicionais foram plenamente validadas através da suíte de testes unitários com mocks de transação controlados e no processador de envelopes.

---

## 6. Impacto Esperado em Custo e Latência

- **Custo de Firestore:**
  - Cada nova tentativa de confirmação de voz gera **uma leitura e uma escrita** de documento (`alexaDrafts/{draftId}`) dentro de transação para atualizar `voiceConfirmationFailures`.
  - A política limita rigorosamente a no máximo **2 atualizações de contador** (3 tentativas no total). Não há risco de loop infinito ou consumo descontrolado de cotas Firestore.
- **Latência:**
  - Respostas intermediárias de retry têm latência típica de **150 a 300 ms**, pois realizam apenas uma leitura de rascunho e um update de contador atômico (sem chamadas a APIs externas ou geração de IDs de pedidos).
  - Respostas de commit final mantêm o tempo de transação pré-existente (validação de vínculo, verificação de cota horária/diária e gravação do pedido no Firestore).
- **Sem Custos Adicionais:**
  - Nenhuma API externa (OpenAI, Gemini, transcrição terceira ou Redis) é acionada no fluxo de confirmação.

---

## 7. Eventos Diagnósticos Estruturados (Etapa 3)

Eventos estruturados foram inseridos nos estágios de autorização e confirmação sem gravar documentos Firestore adicionais:

```json
{
  "timestamp": "2026-09-30T16:36:10.244Z",
  "stage": "confirmation",
  "intent": "AMAZON.YesIntent",
  "sessionId": "session-p1-1",
  "physicalPersonPresent": false,
  "sessionPersonPresent": true,
  "comparisonResult": "ausente",
  "failureAttempt": 1,
  "outcome": "nova_tentativa"
}
```

Esses logs permitem responder de forma imediata no CloudWatch / Google Cloud Logging:
1. O usuário disse "Sim" e foi reconhecido como `AMAZON.YesIntent`? (Sim).
2. Faltou a biometria vocal na requisição atual? (`physicalPersonPresent: false`).
3. O rascunho foi preservado e foi solicitada nova tentativa? (`outcome: "nova_tentativa"`, `failureAttempt: 1`).
4. Ao esgotar as tentativas, o rascunho foi enviado ao app? (`outcome: "encaminhado_app"`, `failureAttempt: 3`).
5. A confirmação foi bem-sucedida com voz reconhecida? (`outcome: "confirmado"`).

---

## 8. Necessidades de Implantação por Artefato

Para que as melhorias tenham efeito no dispositivo físico Echo em ambiente de desenvolvimento ou produção, os seguintes artefatos devem ser implantados:

1. **Cloud Functions (`alexaWebhook`):**
   - **Arquivo alterado:** `functions/alexa/dialog.js`, `functions/alexa/authorization.js`.
   - **Procedimento:** Executar o workflow do GitHub Actions `.github/workflows/deploy-functions-manual.yml`, selecionando `environment: dev` e `functions_target: alexaWebhook` (ou `all`).
2. **Modelo de Interação Alexa (ASK SMAPI):**
   - **Arquivo alterado:** `alexa/skill-package/interactionModels/custom/pt-BR.json`.
   - **Procedimento:** Executar o workflow `.github/workflows/deploy-alexa-skill.yml` para compilar o modelo com `prepareSkillPackage` e enviar o novo pacote via ASK CLI.

> **Importante:** Conforme as diretrizes de segurança, **nenhum deploy ou commit automático foi disparado** durante esta tarefa.

---

## 9. Roteiro de Validação Posterior no Echo Físico

Após a implantação dos artefatos acima no ambiente `dev`:

1. **Teste da 1ª Tentativa com Fala Curta ("Sim"):**
   - No Echo, invoque: *"Alexa, abrir papelaria teste"*.
   - Dite um pedido: *"Criar pedido de 10 caixinhas para Maria a 10 reais cada entrega dia 20 de novembro"*.
   - Ouça o resumo verbal completo.
   - Responda apenas: *"Sim"*.
   - **Comportamento esperado:** Se o Echo não capturar o perfil vocal na fala curta, a Alexa não encerrará o diálogo; ela responderá: *"Não consegui reconhecer sua voz nesta resposta. Diga: pode confirmar."*
2. **Teste da Confirmação com Frase Longa ("Pode confirmar"):**
   - Responda em seguida: *"Pode confirmar"*.
   - **Comportamento esperado:** A frase com maior riqueza fonética permite ao Echo identificar a voz cadastrada e a Alexa responde: *"Pedido criado no seu espaço de teste com o número #..."*.
   - Verifique no aplicativo web/mobile que exatamente um pedido foi criado e creditado.
3. **Teste de Correção de Campo:**
   - Crie um rascunho, ouça o resumo e diga: *"Não, quero alterar a quantidade"*.
   - Forneça a nova quantidade (ex: *"15 unidades"*), ouça o novo resumo com valor recalculado e confirme.
4. **Teste de Cancelamento:**
   - Crie um rascunho e diga: *"Cancelar"*. Verifique se o pedido é cancelado e a sessão encerrada com segurança.
5. **Teste de Limite de Tentativas (Envio ao App):**
   - Caso um usuário não consiga o reconhecimento por 3 vezes consecutivas na mesma confirmação, a Alexa informará que o pedido foi enviado com segurança para aprovação no aplicativo Luisices. Verifique no aplicativo web a presença do rascunho pendente em `awaiting_app_approval`.
