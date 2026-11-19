# Plano de implementação — email-body-local-cache

## Abordagem

Usar serviço isolado de IndexedDB com cache best effort e AES-GCM. A leitura consulta primeiro o cache por UID, ID da mensagem e caminhos atuais de Storage; em falha/ausência, mantém o fluxo Firebase Storage e persiste apenas o resultado final completo.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Cache | `src/services/emailBodyCache.ts` | Banco local, chave não exportável por UID, cifra, TTL, limites e limpeza |
| Leitura | `src/services/emailService.ts` | Consultar e gravar cache sem alterar fallback ou retorno existente |
| Interface | `src/app/pages/Emails.tsx` | Passar UID e ID nas ações de leitura, resposta e cópia |
| Sessão | `src/contexts/AuthContext.tsx` | Limpar registros e chaves na mudança de UID/logout |

## Contratos, dados e compatibilidade

- Contratos/API/schema: sem alterações.
- Dados/migração: novo IndexedDB local; sem migração remota; chave de banco versão 1.
- Política: atende à regra universal de IndexedDB em `specs/constitution.md`; persistências internas Firebase sem cifra foram migradas conforme `browser-local-data-encryption`.
- Integrações/ambientes: funciona por origem/navegador e não compartilha dados entre DEV/Beta/produção.

## Segurança e integridade

- Autorização e ownership: regras Firebase permanecem autoritativas; cache só localiza por UID e paths.
- Validação/redação/limites: AES-GCM, IV aleatório, limite individual de 15 MiB, 8 itens e 25 MiB, validade de 7 dias.
- Ameaças/casos de abuso: XSS na origem pode invocar a chave não exportável; cache não é fronteira de autorização nem substitui regras Storage.

## UX e documentação

- UI/acessibilidade/design system: sem alteração visual.
- Documentação viva: `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md`, índice de specs.
- Copiloto (Gemini): não afetado; nenhuma chamada/dado do Copiloto passa por esse cache.
- MCP/ChatGPT: não afetado; nenhum contrato/ferramenta MCP usa cache local.
- Compatibilidade/paridade: nenhuma alteração de integração.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Testes: não solicitados; não executar testes nesta tarefa.
- Risco e mitigação: suporte/quota do IndexedDB varia; erros são absorvidos e o Storage continua sendo fonte de verdade.

## Reversão

Reverter chamadas/importações do cache; o banco local pode ser removido manualmente, e nenhum dado remoto foi alterado.
