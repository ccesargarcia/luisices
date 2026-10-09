# Correção do permission_denied em /status — DEV/QA

Base final: develop, commit 9563bd128291d73e3cf04d8a6cff87f13cefec98.
Branch local da correção: codex/fix-rtdb-presence.
Escopo: reparo de claims e ciclo de vida da consulta de presença administrativa.

## Diagnóstico reproduzido

O componente Users decide isAdmin a partir do perfil Firestore. A regra da leitura
global /status decide a partir do ID token: role admin, active ausente/true e
auth_time posterior à barreira de revogação RTDB, quando existente.
Um perfil admin não implica que o token já contenha role admin.

Na base revisada, executeUserRepair não compara Auth quando não existe
claimsSyncPending. Ele retorna already-synced com synced=false e não grava claims.
Isso deixa contas legadas/divergentes sem mecanismo efetivo de reparo.

O listener de Users depende de isAdmin e do objeto currentUser. Renovar um token
pode manter o mesmo objeto. Um listener cancelado por permission_denied precisa ser
reativado; mudar o token não é evidência de nova execução do efeito React.
O commit 9563bd1 passou a consultar getIdTokenResult antes de assinar, mas essa
verificação pontual não acompanha a renovação do token; sem role, apenas retorna.

O prefixo installHook.js corresponde ao encaminhamento do aviso no console.
A mensagem relevante é a negativa de leitura do RTDB.

## Correção

- executeUserRepair verifica Auth para perfil sem marcador e cria pendência
  transacional se houver divergência. Preserva marcador concorrente e lease ativo.
- Reparo sem trabalho retorna sucesso somente após comparar as claims efetivas.
- O cliente deduplica reparos em voo, verifica synced e confirma o token renovado.
- A consulta de presença observa onIdTokenChanged, inclusive para o mesmo User.
  Só abre /status se role/active do token forem compatíveis; as regras continuam
  decidindo a autorização real e a revogação.
- Logout/desmontagem invalidam callbacks assíncronos anteriores.
- Negativas limpam os dados antigos e mostram presença indisponível, sem inventar
  online para o próprio usuário nem confundir falha de consulta com offline.
- Nenhuma regra foi afrouxada. O gateway configurado em src/lib/firebase.ts é mantido.
- Não há polling, timer de reparo nem serviço novo. Há uma observação local de
  eventos Auth na tela e leitura administrativa do Auth quando o reparo precisa
  verificar uma conta sem marcador.

## Aplicar e validar

Aplique o patch na cópia local do repositório, depois de atualizar develop e
preservar alterações em andamento. Para arquivo no formato git diff:
git apply --check /caminho/correcao-presenca-rtdb.patch
git apply /caminho/correcao-presenca-rtdb.patch

Se a base tiver mudado, revisar os conflitos; não aplicar cegamente por substituição
de arquivos completos. O patch contém também testes e este documento.

Com dependências já instaladas:
npm run typecheck
npm run lint:functions
npm run test:unit
npm run test:presence
npm run build

test:presence exige Java 21+ e porta 9000 livre. O projeto demo e os tokens
sintéticos mantêm o teste local. Não configurar projectId real para essa suíte.
Em ambientes com proxy, conexões 127.0.0.1/localhost precisam acessar diretamente
o emulador; não desabilitar o gateway da aplicação em DEV.

## Publicação coordenada em DEV/QA

A correção precisa do frontend e da Function repairUserClaims. Publicar apenas
o frontend evita a assinatura prematura, mas não conserta claims ausentes no Auth.
Utilize a pipeline existente da develop com validações habilitadas.

As regras de database.rules.json não mudam nesta correção. Confirme que a instância
referenciada por VITE_FIREBASE_DATABASE_URL usa as regras do repositório e pertence
ao mesmo projeto do Auth. Não suponha que o deploy padrão seleciona uma instância
secundária customizada sem verificar a configuração de targets.

Após publicação:
1. Abrir Usuários como admin de teste com claims corretas: presença deve carregar.
2. Com fixture DEV que tenha perfil admin e claims ausentes, sem marcador pendente:
   reparo deve retornar synced=true, renovar token e permitir /status.
   Crie essa fixture apenas por backend/script autorizado; não alterar o próprio
   administrador principal para reproduzir.
3. Renovar token com a tela aberta: listener deve continuar funcionando.
4. Testar usuário comum: /status deve continuar negado; o próprio /status/uid pode
   ser lido conforme regras.
5. Testar logout/revogação em conta de teste: limpar presença local e não reutilizar
   os dados do administrador anterior.

## Se a negativa persistir no ambiente

O erro do navegador sozinho não informa qual condição da regra falhou. Verifique:

- Claims: role é exatamente admin? active é boolean true ou legado ausente?
  Renovar token apenas propaga claims existentes; não cria role no servidor.
- Revogação: por leitura autorizada no backend/Console Firebase, compare
  auth_time * 1000 com revocations/uid. Um novo token com auth_time antigo continua
  revogado; é necessária nova autenticação. Não apagar a barreira para contornar.
- Instância: projectId e databaseURL usados pelo bundle DEV são os esperados?
  O aviso da consulta inclui esses metadados, sem token ou UID.
- Regras efetivamente publicadas: coincidem com database.rules.json?
- App Check: se enforcement estiver habilitado no console, conferir a integração
  e as métricas. Não foi possível observar essa configuração nesta revisão.
- Gateway: na aba Network, verificar resposta de repairUserClaims no domínio
  configurado. Se ainda houver 401, determinar pelo corpo/cabeçalhos/logs se vem
  do gateway, da identidade invocadora ou da autenticação Firebase. Confirmar
  encaminhamento do Authorization e roteamento da Function conforme a arquitetura.
  Não liberar genericamente caminhos nem contornar Cloudflare pela URL direta.

Os commits e93be31 e 76eeb85 documentam tentativa e reversão de bypass do domínio.
Esta correção respeita essa decisão. Um 401 anterior à Function exige ajuste na
camada que o produz; esse caminho não foi executado com uma sessão real nesta revisão.

## Evidências e limites

Validação local: 623 testes unitários em 59 arquivos, seis testes no emulador RTDB,
TypeScript, sintaxe de 40 arquivos Functions e build aprovados.

Quatro testes novos reproduziram falhas do reparo na base e passaram após a mudança.
Os testes unitários exercitam também refresh no mesmo objeto User, negativa e
reativação do listener, logout durante leitura do token, cleanup, reparo pendente,
falha do gateway e deduplicação.

As regras reais passaram em seis testes RTDB: admin permitido, claims ausentes
negadas, anônimo/usuário comum negados na raiz, leitura própria permitida, inativo
negado, auth_time anterior/igual negado, autenticação posterior permitida e cliente
impedido de alterar revocations.

O build passa com avisos preexistentes de ativos e tamanho de bundle. Não foi
executado login real nem deploy em DEV/QA; os tokens, regras publicadas e logs
do gateway do ambiente não foram inspecionados.

Esta correção não resolve a totalidade dos achados anteriores de segurança, como
isolamento de anexos, checkpoints após crash e convergência do worker sob múltiplas
alterações simultâneas.

Referências oficiais:
https://firebase.google.com/docs/auth/admin/custom-claims
https://firebase.google.com/docs/database/security/core-syntax

