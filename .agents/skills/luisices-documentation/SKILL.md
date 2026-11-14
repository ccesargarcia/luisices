---
name: luisices-documentation
description: >-
  Use for every Luisices code, configuration, workflow, API, data model, security,
  bug-fix, refactor, or product-feature change. Reviews documentation against the
  implementation and keeps specs, user guides, indexes, and operational runbooks accurate.
---

# Revisão contínua da documentação Luisices

Esta skill é obrigatória sempre que uma alteração de código, configuração, workflow, contrato, regra de negócio ou funcionalidade for proposta ou concluída. A revisão também se aplica a correções pequenas; o tamanho da mudança não elimina a verificação documental.

## Procedimento

1. **Antes de alterar:** identifique a documentação e a spec existentes para o domínio. Consulte-as junto com o código, regras executáveis, contratos e workflows relevantes. Trate código e configuração ativos como fonte do comportamento atual; specs registram intenção e decisões.
2. **Durante a mudança:** mantenha os critérios da spec alinhados ao comportamento acordado. Para funcionalidade nova ou mudança relevante, siga `.agents/rules/spec-driven-development.md` e atualize `spec.md`, `plan.md` e `tasks.md` conforme necessário.
3. **Ao concluir a implementação:** revise os documentos afetados e atualize o conteúdo que ficou incompleto ou divergente. Considere, conforme o escopo:
   - `docs/FUNCIONALIDADES.md` para capacidades, limites e comportamento visível;
   - `docs/DEPENDENCIAS_E_ARQUITETURA.md` e `functions/README.md` para arquitetura, serviços e contratos backend;
   - guias especializados em `docs/`, `tests/`, `.github/` e `functions/` para operação, segurança, CI e integrações;
   - `specs/features/` para requisitos, decisões, tarefas, status e evidências;
   - `README.md`, `docs/README.md` e catálogos para índices, comandos e links de entrada.
4. **Avalie sempre o impacto nas integrações de IA do produto:** faça essa checagem em toda mudança, mesmo quando parecer não relacionada. Registre na spec/tarefa se Copiloto, MCP, ambos ou nenhum são afetados e por quê. Quando houver impacto:
   - Para o **Copiloto** (Gemini), confira `docs/COPILOTO_IA.md`, `docs/FUNCIONALIDADES.md` e os contratos ativos em `functions/ai/`, `functions/mcp/aiServices.js` quando compartilhado, serviços e interface que chamam as ferramentas. Revise prompt, ferramentas/schemas, dados consultados, permissões, efeitos, limites/orçamento, erros e afirmações de capacidade.
   - Para o **MCP/ChatGPT**, confira `docs/INTEGRACAO_CHATGPT_MCP.md`, o schema/OpenAPI ativo em `functions/mcp/`, as ferramentas, repositórios e camadas de autorização. Revise nomes/argumentos/resultados, escopos, OAuth/sessão, tenant/ownership, idempotência, erros e documentação publicada ao cliente.
   - Não presuma paridade entre Copiloto e MCP. Registre diferenças existentes e preserve-as, a menos que a mudança defina explicitamente um contrato diferente.
   - Atualize contagens, listas de ferramentas, capacidades e exemplos somente após confirmá-los contra o código/schema ativo; não trate documentação ou presença no código como prova de configuração ou publicação remota.
5. **Verifique a coerência:** confira nomes de arquivos, scripts, comandos, versões de runtime, contagens, status e resultados de CI contra os arquivos e evidências atuais. Não transforme um resultado histórico em afirmação de estado atual.
6. **Verifique links locais** nos documentos alterados e mantenha referências cruzadas válidas. Evite duplicar documentação: prefira atualizar a fonte de verdade e apontar outros guias para ela.
7. **Se a revisão concluir que nada precisa mudar:** não force uma edição. Informe quais documentos foram revisados e registre também por que Copiloto e MCP não são afetados, quando for o caso.
8. **Registre evidências com precisão:** só marque tarefas/specs como concluídas e só declare validações que realmente ocorreram. Diferencie execução local, CI, deploy e estado remoto.

## Critério de conclusão

Uma alteração não está documentalmente concluída até que os documentos relevantes tenham sido revisados, as atualizações necessárias estejam feitas e os links/referências tocados tenham sido conferidos. Esta skill não autoriza commit, publicação, deploy ou alteração de dados externos.
