# Tarefas — quote-conversion-integrity

## Especificação

- [x] **S1 — Fronteira de confiança:** definir projeção de servidor e rejeição de payload divergente/desatualizado.
  - Evidência: `spec.md` RF-1 a RF-4 e CA-1 a CA-3.
- [x] **S2 — Replay e autorização:** exigir permissões atuais antes de qualquer replay de conversão.
  - Evidência: `spec.md` RF-5, CA-4 e seção de autorização.
- [x] **S3 — Matemática:** definir centavos inteiros e percentual arredondado ao centavo.
  - Evidência: `spec.md` RF-7/RF-8 e CA-6/CA-7.
- [x] **S4 — Compatibilidade:** manter callable, fluxo sem `quoteId` e orçamentos MCP válidos.
  - Evidência: `spec.md` RF-9, seção Dados e contratos; `plan.md`.
- [x] **S5 — Catálogo:** registrar a spec de implementação.
  - Evidência: entrada `quote-conversion-integrity` em `specs/features/README.md`.
- [x] **S6 — Titularidade e permissão:** registrar que o pedido pertence ao titular do orçamento e exigir permissões prévias do executor.
  - Evidência: decisão em `spec.md` RF-4a, RF-5, CA-3 e seção de decisões registradas.
- [x] **S7 — Replay por chave:** especificar validação do vínculo, titular e hash antes de reconhecer pedido existente.
  - Evidência: `spec.md` RF-6 e CA-5.

## Implementação

- [x] **I1 — Titularidade, autorização e replay:** pedido/ledger usam `quote.userId`; executor fica em `createdByUid`/`createdByName`; permissões são verificadas antes do replay e vínculos/hash são conferidos.
- [x] **I2 — Projeção canônica:** conversão compara o comando com a projeção do snapshot transacional e persiste os valores gerados no backend; conflito não grava dados.
- [x] **I3 — Matemática:** Rules exigem total cent-exato e desconto percentual arredondado em centavos; 1–10 itens e caso MCP foram mantidos.
- [x] **I4 — Cobertura E2E de conflito desatualizado:** cenário Playwright edita o orçamento por uma segunda sessão autenticada enquanto a primeira mantém o snapshot antigo. A asserção do total foi delimitada à linha `Total` para evitar correspondência ambígua com preço unitário e subtotal.
  - Evidência: [run #43333147292](https://github.com/ccesargarcia/luisices/actions/runs/43333147292) executou com sucesso os quatro shards Playwright em `ubuntu-latest` (Ubuntu 26.04), incluindo o cenário de conflito.
- [x] **I5 — Validação executada:** `npm run typecheck`; lint das Functions; 56 testes de integração Functions/Rules; 57 testes focados de segurança, MCP e startup; suíte unitária completa (1.516 passaram, 1 ignorado); `git diff --check`.
- [x] **I6 — Documentação:** baseline e catálogo atualizados com o comportamento entregue e a validação observada.
- [x] **I7 — Normalização monetária do transporte:** alinhar a comparação backend ao arredondamento de `sanitizeOrderItems` sem substituir a alocação autoritativa em centavos; cobrir desconto fixo de R$ 0,01 entre linhas.
  - Evidência: `tests/integration/create-order-function.test.ts`, cenário “aceita os itens normalizados pelo serviço e persiste os centavos alocados pelo orçamento”; integração Functions 47/47 aprovada.
- [x] **I8 — Preço unitário superior:** preservar na comparação o `orderData.unitPrice` de item único, que a callable recebe sem a normalização aplicada aos itens; aceitar fração de centavo nesse campo somente quando `quoteId` ativa a projeção autoritativa.
  - Evidência: teste “preserva o unitPrice superior enviado sem arredondamento em orçamento de item único” cobre 3 × R$ 10,00 menos R$ 0,01 e confirma persistência pelo backend.
