# Plano de implementação — email-message-modal

## Abordagem

Substituir a coluna de leitura do e-mail por um `Dialog` compartilhado controlado por `selectedEmailId`. Reaproveitar o conteúdo, estado e ações do leitor já existente em `Emails.tsx`; remover a rota/página de nova aba publicada antes.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Lista/leitor | `src/app/pages/Emails.tsx` | Abrir seleção atual no `Dialog`; fechar limpa seleção e mantém pasta/caixa |
| Primitivo | `src/app/components/ui/dialog.tsx` | Reuso do modal acessível, responsivo e integrado ao histórico |
| Rota | `src/app/routes.tsx` | Remover a rota independente de mensagem |
| Documentação | `docs/FUNCIONALIDADES.md`, Help Center | Explicar leitura em modal |

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

- UI usa `Dialog`, tokens semânticos, glassmorphism e dimensões que respeitam área segura móvel.
- Documentação atualizada em Help Center, `docs/FUNCIONALIDADES.md` e nesta spec.
- Copiloto (Gemini): sem impacto, interface de leitura não é consumida por IA.
- MCP/ChatGPT: sem impacto, nenhuma ferramenta/escopo/schema muda.
- Compatibilidade: contratos dessas integrações permanecem iguais.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Revisão manual do diff e do estado modal/lista/carregamento.
- Risco: modal alto pode reduzir área em telas pequenas; mitigar com altura limitada à viewport e rolagem interna existente.

## Reversão

Reverter o `Dialog` e restaurar o painel anterior; nenhuma migração ou dado persistente novo.
