# Desconexão de dispositivos e revogação global

## Semântica atual

A ação individual é uma **solicitação de logout cooperativo**, não uma revogação individual de credenciais. O aplicativo conectado recebe o documento marcado como `revoked` e faz logout. Um cliente modificado pode ignorar o listener e continuar utilizando um token ainda autorizado.

Os tokens Firebase atuais não carregam uma identidade de sessão independente por dispositivo. O identificador em localStorage não constitui prova de identidade. Firestore, RTDB e Storage são acessados diretamente pelo cliente, portanto adicionar uma verificação de dispositivo apenas às Functions não resolveria o problema nesses acessos.

O bloqueio efetivo existente é a **revogação global**, por usuário, com barreira temporal e sincronização de credenciais. Não se deve tratar sincronização pendente como conclusão de todas as etapas.

## Ajustes desta etapa

- Interface informa a natureza cooperativa da ação individual e orienta a ação global para bloquear credenciais.
- A ação individual exige sessão ativa, inclusive quando o solicitante age sobre o próprio dispositivo.
- Apenas o titular ou administrador ativo pode solicitar a desconexão.
- Identificadores não podem conter caminhos, ser vazios, ultrapassar 128 caracteres ou usar `.`/`..`.
- A transação exige dispositivo existente e preserva a primeira solicitação em repetições.
- A resposta mantém `success` por compatibilidade e explicita `enforcement: client-logout-request`.
- Functions rejeitam token sem `auth_time` numérico finito quando existe barreira de revogação no perfil.
- A interface distingue revogação global concluída de sincronização pendente.

## O que permanece pendente

Revogação individual efetiva exige desenhar autenticação com identidade de sessão verificável nos serviços usados. Esse desenho deve contemplar login, emissão e renovação de credenciais, regras dos três serviços, Functions, sessões offline, migração e recuperação. Não se deve usar claims globais do usuário como se identificassem cada dispositivo separadamente.

Esta etapa não altera regras, claims ou modelo de login, nem força logout global em uma ação individual.

## Validação e custo

Testes unitários cobrem titular, administrador, acesso alheio, sessão inválida, identificadores inválidos, dispositivo inexistente, repetição e barreira temporal. Build e checagem das Functions também devem passar.

A solicitação usa uma transação com leitura do dispositivo e eventual escrita. A autorização lê o perfil do solicitante. Não há serviço adicional, assinatura nova ou chamada paga externa.

Validar em DEV/QA a diferença entre cliente cooperativo e cliente que ignore o listener, além da revogação global com sincronização completa e pendente. Os testes locais não substituem essa validação integrada.
