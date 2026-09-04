# Backlog de melhorias

Backlog priorizado para os próximos dias. As alterações de interface devem funcionar em iPhone/iOS e Android, incluindo teclado, viewport dinâmico, safe areas, toque e rolagem.

## Prioridade 1: Segurança

- [ ] Corrigir autoelevação em `firestore.rules`: impedir que um usuário crie o próprio perfil com `role: admin`.
- [ ] Validar `active` nas regras para impedir acesso de usuários desativados.
- [ ] Restringir Storage por autenticação, proprietário e compartilhamento; remover leituras públicas quando não forem necessárias.
- [ ] Impedir alteração de `userId` em pedidos existentes.
- [ ] Limitar no Firestore os campos que um funcionário pode alterar em pedidos, especialmente preço, pagamento, anexos e atribuição.
- [ ] Exigir `permissions.orders.view` para leitura de pedidos atribuídos.
- [ ] Criar testes com Firebase Emulator para Firestore Rules e Storage Rules.

## Prioridade 2: Fluxo de funcionários

- [ ] Revisar o perfil `funcionario` no ambiente DEV.
- [ ] Confirmar atribuição e remoção de responsável em pedidos.
- [ ] Confirmar que o funcionário vê somente pedidos próprios e atribuídos.
- [ ] Confirmar que o admin vê pedidos criados por todos os usuários.
- [ ] Adicionar atribuição em massa de pedidos.
- [ ] Adicionar filtro por responsável pelo pedido.
- [ ] Registrar histórico de atribuições: quem atribuiu, quando e para quem.
- [ ] Adicionar notificações quando um pedido for atribuído ou removido.
- [ ] Ocultar valores financeiros para funcionários quando essa permissão estiver desativada.

## Prioridade 3: Compatibilidade mobile

- [ ] Testar o diálogo `Novo usuário` no iPhone 14 Pro Max e Android Chrome.
- [ ] Testar o diálogo `Novo pedido` com teclado aberto, rotação e retomada após fechar.
- [ ] Padronizar todos os dialogs em `dvh` e rolagem interna.
- [ ] Corrigir `URL.createObjectURL` sem `URL.revokeObjectURL` em uploads e previews.
- [ ] Revisar `Sheet` mobile para safe area e rolagem.
- [ ] Substituir o envio `whatsapp://` por `https://wa.me` com fallback confiável no iOS.
- [ ] Testar links de convite/reset abertos pelo Mail, Safari, Chrome iOS e Chrome Android.
- [ ] Corrigir ou adicionar os ícones PWA `icon-192.png` e `icon-512.png`.
- [ ] Validar instalação PWA no Android e adicionar à tela inicial no iOS.
- [ ] Testar impressão e exportação no Safari iOS; oferecer PDF como alternativa quando necessário.

## Prioridade 4: Convites, reset e WhatsApp

- [ ] Confirmar deploy das Functions e regras no projeto `luisices-dev`.
- [ ] Testar convite por e-mail sem WhatsApp.
- [ ] Testar convite por e-mail e Evolution API.
- [ ] Testar timeout/indisponibilidade da Evolution sem bloquear o e-mail.
- [ ] Testar reset enviado pelo admin por e-mail e WhatsApp.
- [ ] Registrar status de entrega dos canais sem armazenar credenciais.
- [ ] Documentar configuração e rotação de `RESEND_API_KEY` e `EVOLUTION_API_KEY`.
- [ ] Avaliar mecanismo próprio para impedir reutilização de senha, pois o Firebase Auth não expõe histórico de senhas.

## Prioridade 5: Dados e observabilidade

- [ ] Preencher `createdByName` em pedidos antigos por uma migração segura ou exibição via perfil.
- [ ] Adicionar histórico de alterações de pedidos.
- [ ] Registrar usuário, data e ação em operações administrativas.
- [ ] Criar mensagens de erro orientadas para falhas de permissão.
- [ ] Monitorar erros de Firestore Rules, Functions, Resend e Evolution API.
- [ ] Adicionar testes de regressão para admin, user e funcionario.

## Prioridade 6: Operação e documentação

- [ ] Criar checklist de publicação da branch de feature para `develop`.
- [ ] Documentar quais workflows publicam Hosting, Functions e Rules.
- [ ] Revisar custos e alertas de billing do Firebase/Google Cloud.
- [ ] Configurar alertas de orçamento no Google Cloud.
- [ ] Revisar artefatos temporários e comandos de teste documentados.
- [ ] Fazer revisão de dependências, especialmente `firebase-functions` e runtime Node.js.

## Critério para merge em `develop`

Antes do merge, confirmar:

- [ ] `npm run typecheck` passou.
- [ ] `npm run build` passou.
- [ ] Regras foram validadas/publicadas no ambiente DEV.
- [ ] Teste manual no desktop.
- [ ] Teste manual no iPhone/iOS.
- [ ] Teste manual no Android.
- [ ] Nenhuma permissão administrativa foi ampliada sem necessidade.
- [ ] O PR contém somente o escopo planejado.
