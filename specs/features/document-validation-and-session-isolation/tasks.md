# Tarefas — document-validation-and-session-isolation

- [x] **T1 (RF-1, RF-2):** suportar normalização, máscara e DV do CNPJ alfanumérico no frontend e backend, preservando CPF e CNPJ numérico.
- [x] **T2 (RF-3):** mover o Hook de erro para antes do retorno condicional do componente.
- [x] **T3 (RF-4):** associar estado dos clientes à sessão, limpar ao iniciar nova consulta e ignorar callbacks obsoletos.
- [x] **T4 (CA-1, CA-2):** adicionar cobertura unitária para o CNPJ oficial, DV inválido, CPF e validação backend.
- [x] **T5:** atualizar documentação do comportamento SuperFrete e avaliar Copiloto/MCP como não impactados.
- [x] **T6:** `npm run typecheck`, teste focado e lint das Functions executados com sucesso; `git diff --check` aprovado.
