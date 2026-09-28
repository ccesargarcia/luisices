# Revisão Alexa — rodada 7

Data: 2026-09-28  
Commit analisado: `d01a7d0 fix(alexa): requestId estrito, deduplicacao transacional e otimizacao auth (rodada 6)`

## Validação

- `npm test`: **210 testes aprovados**, 24 arquivos, 0 falhas;
- `npm run build`: **aprovado**;
- `node --check` das funções Alexa: **aprovado**;
- `git diff --check`: **aprovado**.

As novas regressões cobrem `requestId`, ausência de transação, replay pós-TTL, fallback de sessão estrangeira e remoção do helper legado.

## Correções confirmadas

- `requestId` obrigatório e limitado a 8–300 caracteres;
- deduplicação falha fechada sem `runTransaction`;
- reserva de requisição atômica;
- proteção durável por `alexaCommits/{draftId}`;
- pré-validação e memoização de Firebase Auth durante retries da transação;
- fallback não anuncia limite atingido quando não atualizou um rascunho válido;
- `getOrCreateDraft` removido.

## Riscos remanescentes

### P1 — `processAlexaEnvelope` ainda aceita `db` ausente

O bloco de deduplicação é condicionado a `if (db)`. Se uma chamada interna ou futura invocar o processador sem Firestore, ela passa pela validação de `requestId` e pode continuar até os efeitos de negócio sem reserva idempotente. O webhook oficial sempre injeta `db`, portanto o risco atual de produção é baixo, mas a garantia fail-closed não é completa.

Recomendação: exigir `db` e `db.collection` antes do processamento; retornar erro transitório quando o banco não estiver disponível.

### P2 — TTL inconsistente entre reserva e resposta concluída

A reserva usa 300 segundos, mas `persistResponse` grava `expiresAt` com 150 segundos. Isso reduz a janela de replay cache para respostas concluídas. A idempotência durável protege o commit de pedidos, mas diálogos, pairing e outras intenções podem ser executados novamente após a limpeza do documento.

Recomendação: usar uma constante única para a janela e documentar a garantia real. Confirmar com métricas de retry da Alexa antes de aumentar o TTL, pois isso aumenta retenção e custo de Firestore.

### P3 — formato do `requestId` ainda permissivo

O código valida tipo, presença e tamanho, mas não restringe caracteres. Isso não cria duplicidade por si só, porque a chave é derivada por hash, mas permite payloads fora do contrato esperado. Uma validação de formato deve ser adicionada somente se a documentação oficial do canal confirmar o formato permitido.

### P3 — cache de Auth atravessa retries da transação

O cache evita chamadas repetidas e reduz latência, mas uma alteração muito rápida no estado da conta depois da primeira leitura pode ser observada apenas no próximo commit. O risco é pequeno e é o trade-off atual entre custo e revalidação; monitorar antes de mudar.

## Limitações

Não houve teste real com Alexa/Echo, Firestore Emulator ou produção. Os avisos de assets não resolvidos em tempo de build e chunks grandes permanecem, sem bloquear a compilação.

## Conclusão

A rodada 6 resolveu os itens P1 anteriores e está pronta para revisão funcional controlada. Antes de produção ampla, recomendo fechar o bypass de `db` ausente e padronizar o TTL. O restante é melhoria de contrato e observabilidade.
