# Isolamento das caixas WhatsApp

## Decisão e restrição da instância compartilhada

As caixas são isoladas por `userId`. A instância Evolution atual é compartilhada e os chats são identificados pelo telefone. Nesta versão, um telefone pertence a **um único parceiro**: outro parceiro não pode assumir a mesma conversa. Separar o mesmo telefone em duas caixas exigiria identificar instância/destinatário ou encaminhamento explícito dos eventos recebidos; isso não foi inventado automaticamente.

O vínculo é reservado atomicamente ao criar/enviar uma conversa. O proprietário é o dono do cliente validado ou o usuário que cria o novo chat. Administradores não substituem o proprietário de uma conversa existente ao responder.

## Proteções

- Regras exigem permissão WhatsApp e proprietário compatível, exceto administração ativa.
- Consultas comuns filtram `userId` antes da leitura; administradores podem consultar globalmente.
- Envio, exclusão, sincronização e marcação de leitura verificam o proprietário no backend.
- Exclusão também confere o proprietário da mensagem, além da correspondência do chat.
- Sincronização procura clientes dentro do parceiro do chat.
- Webhook usa o vínculo confirmado do chat, sem associação global arbitrária por telefone.
- Contatos sem vínculo recebem `userId: null`: somente administração pode ler.
- Troca de parceiro/conta limpa a conversa, seleção e texto, com aviso se havia texto não enviado. Callbacks antigos de mensagens são descartados.

## Dados legados e implantação

Registros sem `userId` permanecem acessíveis somente à administração. Não atribuir proprietário apenas pelo nome, telefone ou último usuário que enviou mensagem.

Antes da publicação:
1. Validar com duas contas em DEV, incluindo acessos diretos a documentos e Functions.
2. Executar os testes de integração das regras com Java 21.
3. Levantar chats/mensagens sem proprietário e contatos compartilhados; conferir o vínculo com os parceiros.
4. Preparar migração revisável em lotes, com dry-run, registro de alterações e tratamento explícito de ambiguidades. Esta mudança não executa migração.
5. Publicar os novos índices e aguardar sua disponibilidade.
6. Coordenar Functions, regras e frontend, preferencialmente em janela de manutenção. A nova regra bloqueia consultas globais do frontend antigo para usuários comuns.

Os dados antigos não são apagados. Sem migração, históricos sem vínculo não serão exibidos a usuários comuns. O administrador precisa conferir os registros antes de liberá-los.

## Validação e custo

Testes unitários cobrem acesso próprio, acesso alheio, legado, administrador, cliente de outro parceiro e reserva do vínculo. Os testes de integração verificam regras de documentos e consultas, mas dependem do emulador.

As operações passam a consultar perfil/chat para autorizar e reservar vínculos. O webhook substitui buscas globais de clientes por leitura direcionada do chat. A consulta por proprietário reduz os registros recebidos pelo cliente. Não há nova infraestrutura externa.

## Rollback

Não restaurar regras globais para recuperar visibilidade: isso reabre acesso entre parceiros. Se houver incidente, restringir acesso operacional e corrigir vínculo/índices. Preservar os novos campos e auditar qualquer reassociação de chats e mensagens.
