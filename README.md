# Luisices — gestão do ateliê

Aplicação de gestão de papelaria personalizada: pedidos, produção, clientes, orçamentos, precificação, galeria, loja pública, atendimento e assistência por IA.

Documentação revisada em **10/10/2026**, com base na `develop` (`b2b6ef9`). A presença de uma funcionalidade no código não comprova sua configuração ou publicação em um ambiente remoto.

## Documentação

- [Índice dos guias](docs/README.md)
- [Funcionalidades e limites operacionais](docs/FUNCIONALIDADES.md)
- [Arquitetura e dependências](docs/DEPENDENCIAS_E_ARQUITETURA.md)
- [Copiloto: capacidades e evolução do system prompt](docs/COPILOTO_IA.md)
- [Backend e funções publicadas pelo código](functions/README.md)

## Módulos

| Área | Recursos principais |
|---|---|
| Operação | Quadro de pedidos, etapas de produção, atribuição à equipe, pagamentos, arquivamento e agenda |
| Comercial | Clientes, orçamentos, catálogo interno, permutas e galeria |
| Custos | Insumos, compras, receitas de produção, cálculo de preço e configurações do ateliê |
| Loja pública | Produtos próprios da vitrine, personalização, encomendas e conversão em pedidos internos |
| Atendimento | E-mails via Resend e conversas WhatsApp via Evolution API |
| Administração | Usuários, convites, permissões, sessões e presença |
| Assistência | Copiloto com nove ferramentas, análise de imagens e integração Alexa separada |

O Copiloto consulta dados e prepara rascunhos. Salvar um pedido ou enviar uma mensagem exige a ação correspondente na interface e autorização do backend.

## Desenvolvimento local

Use **Node.js 22**, alinhado ao runtime de Functions e aos workflows. Os testes com Firebase Emulator Suite também precisam de Java compatível com a versão instalada do Firebase CLI; para este projeto, use Java 21.

```bash
npm ci
npm --prefix functions ci
cp .env.example .env.local
npm run dev
```

Preencha o arquivo local com a configuração do seu ambiente. O Vite usa **http://localhost:3000**. O entrypoint é `src/main.tsx` → `src/app/App.tsx`; não existe um servidor Express separado neste checkout.

Não versione credenciais, arquivos de service account ou ambientes preenchidos. A configuração pública do SDK Firebase não substitui regras e autorização no servidor.

## Validações

```bash
npm run typecheck
npm run test:unit
npm run lint:functions
npm run build
npm run test:integration
npm run test:presence
```

Os dois últimos comandos usam emuladores. E2E possui configuração própria: consulte [tests/README.md](tests/README.md) e [tests/integration/README.md](tests/integration/README.md). Verifique o destino antes de executar testes que escrevem dados.

Para simular a limpeza de artefatos locais:

```bash
npm run clean:disk -- --dry-run
```

Sem `--dry-run`, remove apenas os diretórios gerados previstos no script, dentro do projeto.

## Publicação

| Branch | Ambiente | Workflow principal |
|---|---|---|
| `develop` | Desenvolvimento/QA | [deploy-dev.yml](.github/workflows/deploy-dev.yml): seleciona frontend, Functions e regras/índices conforme alterações ou parâmetros |
| `main` | Produção | [deploy.yml](.github/workflows/deploy.yml): frontend no GitHub Pages; backend tem workflow separado |

O workflow de DEV decide as validações conforme alterações e parâmetros; não executa obrigatoriamente todos os E2E em cada push. `[skip tests]` pula testes, mas permite deploy. `[skip ci]` evita os workflows de push/pull request; verificações gerenciadas pelo GitHub, como CodeQL, podem continuar.

Os índices são definidos em [firestore.indexes.json](firestore.indexes.json), referenciado por [firebase.json](firebase.json). Aguarde a disponibilidade dos índices necessários antes de validar consultas dependentes deles.

## Limites importantes

- Desconexão individual de dispositivo é uma solicitação cooperativa; não equivale à revogação global de sessões.
- O histórico financeiro de clientes usa o ledger; as consultas financeiras do Copiloto ainda usam pedidos. As bases podem divergir após exclusões ou mudanças históricas.
- O modelo atual de chat WhatsApp associa um telefone a um proprietário. Contatos compartilhados entre parceiros exigem evolução desse modelo.
- Manifest e ícones estão presentes; o entrypoint desregistra service workers. Não há promessa de funcionamento offline completo.

Detalhes e fontes estão nos guias vinculados acima.
