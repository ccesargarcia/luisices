---
trigger: model_decision
description: Use este processo ao criar, atualizar, implementar ou revisar especificações de funcionalidades e mudanças do Luisices.
---

# Desenvolvimento guiado por especificações

1. Leia `specs/README.md`, `AGENTS.md` e documentos/fontes atuais relevantes antes de propor comportamento.
2. Crie ou atualize `specs/features/<id-curto>/` com `spec.md`, `plan.md` e `tasks.md`, seguindo os modelos em `specs/templates/`.
3. Em `spec.md`, descreva problema, atores, escopo, comportamento observável, critérios verificáveis, erros, requisitos não funcionais e dúvidas. Separe fatos confirmados de decisões propostas.
4. Em `plan.md`, mapeie a solução para módulos existentes, contratos, dados, permissões, integrações, migração/compatibilidade, documentação e validação. Evite redesenhar arquitetura sem necessidade demonstrada.
5. Em `tasks.md`, decomponha o plano em etapas verificáveis ligadas aos critérios. Não marque trabalho não executado como concluído.
6. Antes de codificar, compare a proposta com `specs/constitution.md`, regras de segurança e guias de domínio. Resolva contradições explicitamente; não enfraqueça controles para fazer a spec passar.
7. Ao implementar, atualize código, testes e documentação viva necessários. Se o código divergir da spec, reconcilie a decisão antes de perpetuar a divergência.
8. Registre validações realmente executadas e seus resultados. Diferencie falha de ambiente de falha de produto.
9. Atualize status e tarefas ao encerrar. Só marque `Concluída` quando critérios e validações requeridas estiverem comprovados; caso contrário use `Em andamento` ou `Bloqueada` com motivo.
