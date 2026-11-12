# Implementar uma especificação

Description: Implementa uma spec aprovada do Luisices em etapas rastreáveis, preservando contratos e guardrails do projeto.

## Passos

1. Identifique a pasta da funcionalidade em `specs/features/` e leia `spec.md`, `plan.md`, `tasks.md`, `AGENTS.md` e skills aplicáveis.
2. Confirme que critérios, decisões e plano são suficientes. Se houver lacuna que afete segurança, finanças, permissões, dados ou contratos públicos, registre-a e não invente a regra.
3. Inspecione o código atual e ajuste o plano se necessário; mantenha a spec coerente com qualquer decisão aprovada.
4. Implemente as tarefas na ordem, preservando compatibilidade e atualizando documentação e testes necessários.
5. Marque uma tarefa como concluída apenas após concluir e verificar o trabalho correspondente.
6. Execute `npm run typecheck` e validações específicas exigidas por `AGENTS.md` e pelas skills aplicáveis. Não declare validação que não foi executada.
7. Atualize status, tarefas e evidências de validação. Relate limitações e discrepâncias restantes.
