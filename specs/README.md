# Spec-Driven Development no Luisices

Este diretório organiza mudanças de produto como especificações rastreáveis ao código, critérios de aceitação e validações. O formato é Markdown simples e funciona no GitHub, Codex e Antigravity.

## Integração com Antigravity

O Antigravity descobre regras do workspace em `.agents/rules/` e workflows acionáveis em `.agents/workflows/`. Este repositório inclui:

- `project-steering.md`: contexto essencial sempre ativo, apontando para regras e guias existentes.
- `spec-driven-development.md`: processo carregado quando a tarefa corresponde à descrição.
- `/specify`: investiga e prepara/atualiza spec, plano e tarefas.
- `/implement-spec`: implementa uma spec e registra validações.

As regras usam frontmatter `trigger` válido para Antigravity. Workflows são Markdown com título, descrição e passos. Os documentos de `specs/` podem ser lidos por outros agentes; as personalizações apenas direcionam para o processo comum.

## Estrutura

```text
specs/
├── README.md
├── constitution.md
├── templates/
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
└── features/
    ├── README.md
    └── <id-curto>/
        ├── spec.md
        ├── plan.md
        └── tasks.md
```

## Fluxo

1. **Investigar:** consultar constituição, funcionalidades, arquitetura, código, regras, contratos e testes relevantes.
2. **Especificar:** definir problema, escopo, atores, requisitos e critérios de aceitação observáveis. Distinguir fatos do sistema atual de decisões propostas.
3. **Planejar:** mapear componentes afetados, compatibilidade, segurança, dados, UX, documentação e validações.
4. **Decompor:** criar tarefas pequenas ligadas a requisitos e critérios.
5. **Implementar:** executar o plano; atualizar a spec se descoberta no código exigir outra decisão.
6. **Verificar:** rodar typecheck obrigatório e validações aplicáveis; registrar somente resultados realmente observados.
7. **Concluir:** atualizar status, tarefas e documentação viva.

Para mudanças pequenas, de baixo risco e sem ambiguidade, uma spec curta pode registrar contexto, comportamento esperado e validação. Explique no plano por que o formato completo foi dispensado.

## Status e identificadores

- Status: `Rascunho`, `Pronta`, `Em andamento`, `Bloqueada` ou `Concluída`.
- Use identificador curto, estável e sem acentos, por exemplo `pedido-publico-personalizado`.
- Mantenha uma pasta por mudança coesa. Não reescreva specs antigas para apagar histórico; registre decisões novas e atualize referências afetadas.
- Uma spec `Concluída` tem critérios resolvidos e validações requeridas registradas. Se algo for adiado, deixe explícito e não marque como concluída.

## Fonte de verdade e divergências

Specs registram intenção e rastreabilidade. Para descrever o comportamento atual, confirme também código, regras executáveis, schemas publicados e documentação do módulo. Um guia ou spec não prova que uma integração está configurada ou publicada. Quando houver divergência, registre evidências e resolva-a antes de implementar mudanças dependentes.

Consulte `constitution.md` para invariantes comuns, `features/README.md` para o catálogo e `templates/` para novos documentos. A documentação técnica existente continua mantida em `docs/` e `functions/README.md`.
