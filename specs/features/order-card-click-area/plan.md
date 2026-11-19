# Plano — order-card-click-area

- Remover `stopPropagation` do contêiner que ocupa a linha inteira do controle de compartilhamento.
- Manter a propagação interrompida nos botões de copiar/compartilhar, preservando suas ações próprias.
- Revisar a documentação de pedidos; registrar que não há alteração de comportamento funcional/API a documentar além desta correção de interação.
- Impacto no Copiloto (Gemini) e MCP/ChatGPT: nenhum; a mudança fica no componente visual do card.
- Validar com `npm run typecheck` e `git diff --check`; solicitar validação autenticada da área no celular/desktop após publicação.
