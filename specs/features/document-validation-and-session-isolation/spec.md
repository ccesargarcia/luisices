# Validação de documentos e isolamento da sessão de clientes

## Problema e comportamento esperado

O SuperFrete valida CPF e CNPJ antes de cotar/emissão. A partir de julho de 2026, novos CNPJs podem conter letras nas 12 primeiras posições e mantêm dois dígitos verificadores numéricos. O formatter e a validação anteriores removiam letras, impedindo o uso desses documentos. Além disso, a seção de configurações condicionava um Hook ao papel de administrador, e o contexto compartilhado de clientes podia manter dados da sessão anterior durante a troca de usuário ou papel.

## Requisitos e critérios

- **RF-1:** formatar CNPJ alfanumérico em maiúsculas no padrão `AA.AAA.AAA/AAAA-00`, preservando CNPJs numéricos existentes e CPF.
- **RF-2:** validar CNPJ alfanumérico conforme a regra oficial da Receita Federal, incluindo DV, no frontend e no backend antes de enviar documentos à SuperFrete.
- **RF-3:** chamar Hooks na mesma ordem, independentemente de `isAdmin`.
- **RF-4:** ao mudar usuário/papel, limpar clientes anteriores, mostrar carregamento e ignorar callbacks de listeners cancelados; a interface nunca deve expor dados associados a outra sessão.
- **CA-1:** o CNPJ oficial `00.000.000/E08G-12` é formatado e validado; uma alteração no DV é rejeitada.
- **CA-2:** CPF e CNPJ numérico continuam validados; dígitos de CNPJ inválidos são recusados também no backend.
- **CA-3:** a primeira renderização não administrativa seguida do carregamento de perfil administrador não viola a ordem de Hooks.
- **CA-4:** trocas de usuário, papel, logout e respostas atrasadas dos listeners não reutilizam dados de clientes de outra sessão.

## Segurança, dados e impacto de IA

- Autorização/ownership não muda; as regras RBAC e a fronteira SuperFrete Sandbox permanecem intactas.
- Nenhum dado persistido é migrado. O documento normalizado é enviado à API SuperFrete sem pontuação e com letras maiúsculas.
- Copiloto (Gemini): sem impacto; a validação é exclusiva da interface e do backend SuperFrete.
- MCP/ChatGPT: sem impacto; ferramentas e schemas MCP não recebem mudanças.

## Documentação consultada

- `docs/FUNCIONALIDADES.md`, `functions/README.md`, `specs/features/orders-beta-gateway/spec.md`.
- [Receita Federal — CNPJ Alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico/cnpj-alfa) e [manual de cálculo do DV](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj).

## Validação e evidências

- `npm run typecheck`: aprovado.
- `npx vitest run --reporter=verbose tests/unit/document-format.test.ts`: 7 testes aprovados, incluindo validação backend.
- `npm --prefix functions run lint`: 108 arquivos JavaScript sem erros de sintaxe.
- `git diff --check`: aprovado.
