# Plano de implementação — email-open-new-tab

## Abordagem

Abrir a rota própria `/emails/mensagem/:type/:id` com `window.open` diretamente no gesto de clique. A nova página consulta o documento protegido, carrega corpo recebido por `emailService.loadReceivedEmailBody` e reaproveita `EmailHtmlViewer`, mantendo a aba principal aberta.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Lista e-mail | `src/app/pages/Emails.tsx` | Clique abre nova aba; marca recebidos como lidos se houver permissão de edição |
| Rota | `src/app/routes.tsx` | Rota independente da navegação principal, protegida por autenticação e `emails.view` |
| Leitor | `src/app/pages/EmailMessageWindow.tsx`, `EmailHtmlViewer.tsx`, `emailService.ts` | Consultar por ID, corpo de Storage, cabeçalho, anexos e estados de erro |
| Documentação | `docs/FUNCIONALIDADES.md`, Help Center | Explicar abertura em nova aba e permissão |

## Contratos, dados e compatibilidade

- Contratos/API/schema: nenhum.
- Dados/migração: nenhuma.
- Integrações/ambientes: leitura Firebase existente; sem alteração de Functions, Vercel ou Cloudflare.

## Segurança e integridade

- Autorização e ownership: `ProtectedRoute`, `PermissionRoute` e Firestore/Storage Rules permanecem ativos.
- Validação/redação/limites: URL contém somente tipo e ID do documento; conteúdo é recuperado autenticadamente; HTML usa sanitização/iframe isolado.
- Atualização de status: ao abrir recebidos, marca lido somente se o usuário puder editar; falha de atualização não bloqueia leitura.
- Ameaças/casos de abuso: ID arbitrário continua condicionado à autorização Firestore; links externos de anexo usam `noopener`, `noreferrer` e sem referer.

## UX e documentação

- UI usa tokens semânticos, cartões translúcidos, componentes compartilhados e alvo mínimo móvel do design system.
- Documentação atualizada em Help Center, `docs/FUNCIONALIDADES.md` e nesta spec.
- Copiloto (Gemini): sem impacto, interface de leitura não é consumida por IA.
- MCP/ChatGPT: sem impacto, nenhuma ferramenta/escopo/schema muda.
- Compatibilidade: contratos dessas integrações permanecem iguais.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Revisão manual do diff e das proteções da rota; validar erros e URLs de anexos disponíveis.
- Risco: navegador pode bloquear nova aba se a chamada sair do gesto direto; por isso `window.open` é chamado no handler síncrono do clique.

## Reversão

Reverter a rota e o handler de clique; nenhuma migração ou dado persistente novo.
