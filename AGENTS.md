# 🏛️ Luisices — Agent Instructions & Constitution

Bem-vindo ao repositório do **Luisices (Papelaria de Afeto & Gestão de Ateliê)**.
Este arquivo define as diretrizes essenciais para agentes de IA (Antigravity, Codex, etc.) atuando neste codebase.

---

## 🛠️ Stack Tecnológica

* **Frontend:** React 18, Vite, TypeScript, TailwindCSS
* **Backend:** Firebase Cloud Functions (Node.js/ESM, Hono), Firestore, Realtime Database, Cloud Storage
* **Infraestrutura:** Cloudflare Workers (API & CDN), GCP
* **Testes:** Vitest (Unitário e Backend), Playwright (E2E), Firebase Rules Unit Testing

---

## 📚 Skills Disponíveis no Projeto

Ao executar tarefas neste repositório, consulte e siga as skills dedicadas em `.agents/skills/`:

1. **Testes & Qualidade:** [luisices-test-suite](.agents/skills/luisices-test-suite/SKILL.md)
   * Use para executar typecheck, suíte unitária Vitest, testes de regras do Firestore e E2E Playwright.
2. **Design System & UI:** [luisices-design-system](.agents/skills/luisices-design-system/SKILL.md)
   * Use sempre que criar ou alterar telas, componentes ou estilos. Respeita a identidade *"Papelaria de Afeto"* e o *Liquid Glassmorphism*.
3. **Cloudflare & Edge:** [luisices-cloudflare](.agents/skills/luisices-cloudflare/SKILL.md)
   * Use para auditar status DNS/SSL, diagnosticar rotas e fazer deploy seguro dos Workers de API e CDN (Dev e Produção).
4. **Regras do Firestore:** [luisices-firestore-rules](.agents/skills/luisices-firestore-rules/SKILL.md)
   * Use para editar ou validar `firestore.rules`, prevenindo o estouro do limite de 1.000 expressões CEL e erros de profundidade AST.
5. **Segurança de Commits & Dados Sensíveis:** [git-commit-and-security](.agents/skills/git-commit-and-security/SKILL.md)
   * Use antes de commitar para impedir vazamento de segredos, arquivos de ambiente (`.env`, `credentials.json`, `.secret.local`), dados sensíveis de clientes (PII) e padronizar mensagens com Conventional Commits.
6. **Modularização e Deploy de Functions:** [luisices-functions-deploy](.agents/skills/luisices-functions-deploy/SKILL.md)
   * Use ao criar, refatorar ou fazer deploy de Cloud Functions para garantir entrypoints enxutos e isolamento por domínio modular.
7. **Integridade de Pedidos e Ledger:** [luisices-order-ledger-audit](.agents/skills/luisices-order-ledger-audit/SKILL.md)
   * Use para auditar consistência de pedidos (`audit:orders`), conciliar o livro-razão financeiro (`sync:ledger`) e corrigir subtotais/preços unitários.
8. **WhatsApp & Evolution API:** [luisices-whatsapp-integration](.agents/skills/luisices-whatsapp-integration/SKILL.md)
   * Use para trabalhar em webhooks, persistência transacional (`persistMessage.js`), scopes de conversa e tratamento do erro 463 da Evolution.
9. **Integração de Voz Alexa:** [luisices-alexa-integration](.agents/skills/luisices-alexa-integration/SKILL.md)
   * Use para atualizar modelos de interação de voz (`ask-cli`), fazer deploy de pacotes da skill e gerenciar rascunhos de pedidos por voz.
10. **Próximo Passo & Continuidade:** [luisices-next-step-handoff](.agents/skills/luisices-next-step-handoff/SKILL.md)
   * Ao concluir uma etapa relevante, indique o próximo passo concreto e pergunte se o usuário quer que você prossiga; execute diretamente o que já foi solicitado.

---

## ⚠️ Regras Inegociáveis (Golden Rules)

1. **Nunca use cores hexadecimais soltas no código:**
   Utilize sempre as classes semânticas do Tailwind (`bg-background`, `text-foreground`, `bg-primary`, `bg-card`, etc.), mapeadas em `src/styles/theme.css`.
2. **Qualidade Estática Obrigatória:**
   Antes de considerar qualquer tarefa concluída, execute sempre:
   ```bash
   npm run typecheck
   ```
3. **Preservação de Contratos de API:**
   Ao modificar Cloud Functions em `functions/`, preserve rigorosamente os contratos das funções públicas (`callables` e `HTTP`), permissões e validações financeiras.
4. **Isolamento de Funções:**
   Não crie dependências cruzadas circulares entre domínios de Cloud Functions. Mantenha os entrypoints enxutos para garantir a modularidade dos deploys seletivos por domínio (`orders`, `users`, `whatsapp`, `email`, `alexa`, `mcp`, `superfrete`).
