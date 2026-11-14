---
trigger: always_on
description: Regras essenciais do projeto Luisices e orientação para consultar especificações e guias por domínio.
---

# Steering do projeto Luisices

- Responda em português brasileiro, salvo pedido explícito em outro idioma.
- Trate `AGENTS.md` na raiz como a constituição operacional principal do repositório.
- Para mudanças de produto, consulte `specs/README.md` e a spec da funcionalidade em `specs/features/` antes de planejar alterações.
- Specs descrevem intenção; código, regras executáveis e contratos publicados determinam o comportamento atual. Não invente fatos ausentes: registre dúvidas e discrepâncias.
- Preserve contratos existentes, isolamento multi-tenant, permissões, validações financeiras e compatibilidade com clientes atuais. Mudanças de segurança exigem revisão das camadas afetadas e testes de regressão apropriados.
- Para UI, siga `design.md` e `.agents/skills/luisices-design-system/SKILL.md`. Para backend, segurança, regras, integrações e testes, consulte as skills do domínio listadas em `AGENTS.md`.
- Em toda correção, refatoração, mudança de contrato/configuração/workflow ou funcionalidade nova, aplique `.agents/skills/luisices-documentation/SKILL.md`: revise documentação antes e depois da implementação, avalie explicitamente impacto no Copiloto (Gemini) e no MCP/ChatGPT, atualize os documentos afetados e confira links, versões, comandos, status e evidências. Se nada exigir edição, registre as justificativas, inclusive de não impacto em IA.
- Antes de implementar uma nova funcionalidade ou mudança relevante, alinhe critérios de aceitação e riscos em uma spec. Para correções pequenas e inequívocas, registre por que uma spec completa foi dispensada.
- Ao concluir alterações, atualize a spec e a documentação viva afetadas. Execute `npm run typecheck` conforme `AGENTS.md`; execute testes relevantes ao risco e às instruções da skill aplicável.
- Deploy, commit, migração de dados ou operação externa não são consequências implícitas de uma spec.
