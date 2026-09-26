# Regressões de acesso e pedidos

Execute com Node 24 e Java 21 ou superior:

```sh
npm ci --legacy-peer-deps
npm run test:integration
```

A suíte inicia Firestore e Storage locais com o projeto fictício `demo-luisices-review`, carrega as regras deste repositório e limpa os dados entre testes. Não exige credenciais de produção. As portas 8080 e 9199 devem estar livres.

Cobertura: criação segura de perfil, perfis legados, contas desativadas, isolamento financeiro, galeria privada, criação de pedidos, atribuição individual/coletiva e remoção de atribuição, rollback, conversão concorrente/idempotente, relatórios acima de 200 vendas e pausa/retomada de vendas.

O primeiro uso baixa os emuladores oficiais. Em ambientes onde o Node do sistema bloqueia MD5, use o Node 24 oficial: o emulador de Storage utiliza MD5 nos metadados dos objetos. Isso não requer mudar a configuração criptográfica do sistema.

## Aplicação das correções

Publique o frontend, as regras de Firestore/Storage e a função `enrichGalleryItemWithAi` de forma coordenada. O frontend preserva os tokens das imagens novas e resolve URLs antigas da CDN por meio do SDK autenticado; a função lê a imagem privada com o Admin SDK após verificar a autorização do item.

A correção de atribuição mantém o ledger consistente nas operações futuras e reconstrói registros ausentes. Para registros que já estavam divergentes, utilize a sincronização existente de pedidos para o ledger, avaliando os dados antes de executar em produção. Nenhuma migração nem publicação é feita por esta suíte.

URLs com tokens de download já compartilhados e cópias existentes em caches/CDNs não são revogadas pela alteração de regras. Revogação desses links exige uma operação separada sobre os arquivos/infraestrutura.
