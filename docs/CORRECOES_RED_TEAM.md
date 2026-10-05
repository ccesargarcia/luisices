# Correções da auditoria Red Team

## Comportamento implementado

- A instância Evolution atual (`homeassistant`) tem um proprietário explícito no documento `integrationSettings/whatsapp`: `{ ownerUid: "UID_DO_PROPRIETARIO", enabled: true }`. Configuração ausente, desativada ou proprietário inválido bloqueia operações.
- Administradores mantêm acesso administrativo. Usuários comuns acessam somente sua integração. Funcionários precisam de `permissions.whatsapp: true` e `createdBy` igual ao proprietário; esse vínculo só pode ser alterado por admin.
- Chats e mensagens carregam `userId` do proprietário e identificadores com escopo. Funções validam o escopo antes de usar o Admin SDK. Clientes não escrevem mensagens diretamente; apenas criam um contato e zeram sua contagem de não lidas.
- Clientes são procurados somente no escopo do proprietário, com telefone completo normalizado, inclusive em registros legados com pontuação. Não há associação por sufixo.
- O webhook rejeita chave vazia, erro de resolução, chave incorreta e instância inesperada. Credenciais devem ir em `apikey`, `x-api-key` ou `Authorization: Bearer`, nunca na URL. Comparação usa hashes de comprimento fixo e `timingSafeEqual`.
- A proteção de origem rejeita segredo ausente fora do emulador (`FUNCTIONS_EMULATOR=true`). Configure `ORIGIN_SECRET` em todos os ambientes publicados.
- Fotos de clientes são enviadas por função autenticada e salvas sem tokens públicos de download. O frontend guarda referências `gs://` e carrega blobs pelo SDK autenticado. Links legados conhecidos do Firebase/CDN são convertidos em caminhos privados, sem fallback público. Produtos e imagens públicas do catálogo preservam seu fluxo.
- Funcionários com edição de pedidos continuam alterando dados operacionais e status. Preço, quantidade, pagamento, custo e permuta ficam restritos ao proprietário/admin. O histórico de vendas bloqueia alterações financeiras por funcionários e permite reconstrução de registros ausentes com valores conferidos contra o pedido.

## Preparação e migração antes de publicar

Não foi feito deploy, migração de dados, envio real de WhatsApp ou acesso a contas externas.

1. Confirme o UID do proprietário da instância única e o vínculo `createdBy` dos funcionários. Não atribua automaticamente conversas globais a um usuário sem revisar a propriedade.
2. Faça exportação Firestore/Storage e revise a migração em modo somente leitura:

   ```bash
   node scripts/migrate-red-team-security.mjs --project PROJETO --owner UID --bucket BUCKET
   ```

   O script bloqueia históricos pertencentes a outros usuários. Registros sem `userId` exigem confirmação explícita por `--claim-unowned`. Essa opção afirma que o histórico sem proprietário pertence ao UID informado; não resolve conflitos entre proprietários.

3. Bloqueie `/users/*/customers/*` no Worker/CDN público, elimine exposição por IAM público no bucket e limpe os caches dessas rotas. Essa configuração externa não está neste repositório. Configure CORS do Storage para os domínios oficiais da aplicação, necessário para `getBlob` autenticado.
4. Em janela de manutenção, copie o histórico revisado e revogue os tokens antigos:

   ```bash
   node scripts/migrate-red-team-security.mjs --project PROJETO --owner UID --bucket BUCKET --claim-unowned --apply --backup /CAMINHO_SEGURO/backup-red-team.json
   ```

   O backup contém dados privados e tokens antigos: guarde com acesso restrito. O script preserva documentos originais, não sobrescreve destinos existentes e publica a configuração ao finalizar. Execute novamente em dry-run para conferir. Dados globais ambíguos continuam exigindo revisão manual.

5. Publique os novos índices, regras de Firestore/Storage, funções e frontend de forma coordenada. Aguarde os índices ficarem prontos. Publique também `uploadPrivateCustomerPhoto`. Atualize a configuração do webhook para enviar a chave em header e a instância no payload.
6. Valide na aplicação proprietário, funcionário vinculado, conta externa, edição operacional, bloqueio financeiro e carregamento de fotos. Confira que URLs antigas, acesso anônimo e CDN não entregam fotos. Testes locais não comprovam essas configurações externas.

## Validação local

- 564 testes unitários passaram (53 arquivos), incluindo autorização backend, segredo vazio/erro, isolamento de clientes, deduplicação e upload privado.
- 32 testes de integração passaram nos emuladores Firestore/Storage, incluindo acesso externo/anônimo negado, criação de contato novo, escrita direta de mensagens negada, privacidade de fotos e preservação de edição operacional/ledger legado.
- Typecheck e build de produção passaram. O build apresentou avisos de referências de assets Vite não resolvidas; a validação visual e dessas referências no Hosting não foi executada.
- Verificação sintática das 38 fontes JavaScript de funções passou. O script de migração passou na verificação sintática; não foi executado contra dados de produção.
- Última mudança compatível da exclusão por ID Evolution validada novamente pelos testes unitários do backend WhatsApp.
