# 📚 Documentação do Ecossistema Luisices

Este diretório consolida a documentação técnica oficial, arquitetura viva e especificações do sistema **Luisices (Papelaria de Afeto & Gestão de Ateliê)**.

---

## 🏛️ Guias Oficiais & Arquitetura Viva

| Documento | Foco & Quando Consultar |
| :--- | :--- |
| **[Design System](../design.md)** | Diretrizes estéticas de *Papelaria de Afeto*, Liquid Glassmorphism, tokens de cores, anatomia de componentes e regras de UX mobile. |
| **[Funcionalidades](FUNCIONALIDADES.md)** | Catálogo completo de módulos funcionais (pedidos, clientes, vitrine pública, e-mails corporativos, WhatsApp, financeiro e estoque). |
| **[Dependências & Arquitetura](DEPENDENCIAS_E_ARQUITETURA.md)** | Visão estrutural de serviços, entrypoints frontend/backend, modelo de dados multi-tenant, Cloudflare WAF e pipelines de deploy. |
| **[Copiloto de IA](COPILOTO_IA.md)** | Especificação do subsistema de inteligência artificial (Google Gemini), ferramentas (Function Calling), orçamentos de token e system prompt. |
| **[Especificação Alexa](ESPECIFICACAO_ALEXA_ANTIGRAVITY.md)** | Contratos, intents, modelos de interação de voz e fluxo de segurança da Skill Alexa. |
| **[Backend Cloud Functions](../functions/README.md)** | Organização de micro-serviços, triggers, webhooks e tarefas agendadas no Firebase Gen2 / Cloud Run. |

---

## 🔒 Diretrizes de Governança & Segurança

- **Segregação de Dados:** Nunca inclua credenciais, segredos de produção, tokens de API, e-mails reais de clientes ou faturas de faturamento (IDs de contas de billing GCP) na documentação versionada.
- **Documentação Viva:** Ao alterar fluxos de dados, regras de negócio ou permissões de segurança, atualize diretamente o guia do módulo correspondente (`FUNCIONALIDADES.md` ou `DEPENDENCIAS_E_ARQUITETURA.md`).
- **Relatórios Temporários:** Relatórios pontuais de depuração, evidências efêmeras de testes e rascunhos de investigação devem ser mantidos em diretórios de trabalho locais (scratchpad) ou descartados após a entrega.
