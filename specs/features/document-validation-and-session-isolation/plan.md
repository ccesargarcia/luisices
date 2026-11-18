# Plano — document-validation-and-session-isolation

## Abordagem

Manter a validação de documento nas duas fronteiras existentes (formulários e callable), aplicando a conversão oficial ASCII menos 48 para o cálculo de DV alfanumérico. Normalizar para letras maiúsculas e caracteres alfanuméricos, sem alterar o contrato de pedidos ou a autorização. Manter o estado do contexto de clientes associado a uma chave de sessão e esconder estado cujo identificador não corresponda à sessão renderizada.

## Componentes

| Área | Arquivos | Alteração |
|---|---|---|
| Documento/UI | `src/app/utils/documentFormat.ts`, formulários SuperFrete | Máscara, normalização e DV do CNPJ alfanumérico; corrigir ordem dos Hooks |
| Callable | `functions/orders/superfrete.js` | Aceitar e validar o documento alfanumérico, preservando CPF/CNPJ numérico |
| Sessão/dados | `src/contexts/CustomersContext.tsx` | Limpar e isolar dados por usuário/papel e ignorar listeners obsoletos |
| Testes/documentação | `tests/unit/document-format.test.ts`, `docs/FUNCIONALIDADES.md`, esta spec | Cobertura e registro do comportamento |

## Segurança e impacto

- A permissão `superfrete`, o ownership do pedido e a restrição Sandbox DEV/emulador permanecem iguais.
- `CustomersContext` não amplia a consulta; protege o estado local entre sessões.
- Copiloto e MCP/ChatGPT não são impactados, conforme registrado na spec.

## Validação

- `npm run typecheck`
- `npx vitest run tests/unit/document-format.test.ts`
- `git diff --check`

## Reversão

Reverter estas alterações restaura o comportamento anterior. Não há alteração de dados persistidos nem deploy automático iniciado por esta tarefa.
