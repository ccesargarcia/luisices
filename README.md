# 🎨 Papelaria Personalizada — Sistema de Gestão (Luisices)

Sistema completo de gerenciamento para ateliês de papelaria personalizada com controle de pedidos, orçamentos, clientes, produtos, galeria de trabalhos, **permissões granulares (RBAC)**, **Lojinha Online pública** e relatórios — tudo em tempo real via Firebase.

Para consultar a visão completa do produto, regras e fluxos de negócio, veja [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).  
Para detalhes sobre a stack técnica, todas as dependências e a arquitetura de CDN com Cloudflare, consulte [docs/DEPENDENCIAS_E_ARQUITETURA.md](docs/DEPENDENCIAS_E_ARQUITETURA.md).

---

## ✨ Funcionalidades Principais

### 📦 Pedidos do Ateliê
- Cadastro completo com cliente, produto, valor, data de entrega e status.
- **Workflow de produção** em 7 etapas (Design → Aprovação → Impressão → Corte → Montagem → Qualidade → Embalagem).
- **Atribuição para equipe**: delegação de pedidos para funcionários responsáveis (`assignedTo`).
- **Ações em lote**: atribuição rápida de múltiplos pedidos a um colaborador.
- **Filtro de equipe**: administradores filtram visão por colaborador responsável.
- Controle de pagamento com múltiplos métodos (PIX, dinheiro, cartão, transferência).
- **Trocas/Parcerias**: pedidos sem cobrança monetária com itens de permuta.
- Anexos (fotos e PDFs) com thumbnails automáticos e vinculação com a galeria de artes.
- Atualização em tempo real via Firestore.

### 🛍️ Lojinha Online & Catálogo Público (`/catalogo`)
- **Catálogo público para clientes**: vitrine digital responsiva e rápida para compartilhamento no Instagram, WhatsApp ou link na bio, permitindo encomendas sem necessidade de login.
- **Separação de Catálogos**: módulo dedicado para **Produtos da Lojinha** (`/produtos-lojinha`), separando a coleção pública (`storeProducts`) dos insumos internos do ateliê (`products`).
- **Cadastro em Massa por Fotos**: upload simultâneo de múltiplas fotos com inferência automática de título comercial e replicação rápida de categoria, preço e prazo de confecção.
- **Exclusão e Ativação em Massa**: barra flutuante mobile-first para pausar, ativar ou excluir múltiplos produtos com modal de prévia visual.
- **Gestão de Pedidos da Lojinha (`/pedidos-lojinha`)**: acompanhamento de pedidos recebidos com conversão em 1 clique para a esteira oficial de produção do ateliê.
- **Lock Anti-duplicação**: prevenção contra concorrência e cliques múltiplos na conversão de pedidos da lojinha.
- **Auditoria Anti-adulteração de Preços**: verificação automática no backend que detecta divergências entre o valor submetido pelo cliente e os preços oficiais do catálogo (`isPriceTampered`).
- **Banners rotativos e vitrine**: carrossel de propaganda e comunicados com transição automática configurável e opção de banner fixo.
- **Sacola de encomendas e WhatsApp**: cálculo de subtotal dinâmico, campos de personalização por item (nome, tema) e geração de mensagem pronta para envio no WhatsApp de vendas dedicado.
- **Isolamento de tema**: a vitrine pública inicia obrigatoriamente no **tema claro (default)** sem interferir na preferência do painel administrativo.

### 💰 Orçamentos
- Criação com itens do catálogo interno ou livres.
- Desconto (porcentagem ou valor fixo).
- **Envio via WhatsApp** com mensagem comercial personalizável.
- Fluxo completo: Rascunho → Enviado → Aprovado/Rejeitado/Expirado.
- **Conversão automática** em pedido de produção ao aprovar.
- Expiração automática de orçamentos vencidos.
- Exportação dinâmica para PDF e duplicação rápida.

### 👥 Clientes
- CRUD completo com foto, contatos, data de aniversário e endereço.
- Classificação: Cliente padrão, VIP, Cliente recorrente, Inadimplente e Parceiro/Permuta.
- Preenchimento automático de endereço por CEP via ViaCEP com suporte a preenchimento manual internacional.
- **Galeria de artes** vinculada ao cliente e histórico de pedidos.

### 📊 Trocas / Permutas
- Gestão de pedidos em permuta e parcerias com influenciadores.
- Controle de itens fornecidos e benefícios/produtos recebidos.
- Relatórios específicos de trocas com acesso escopado para usuário comum.

### 💰 Precificação, Gestão de Custos & Insumos (`/precificacao`)
- **4 Abas especializadas**: Cadastro de Custos (Insumos), Calculadora de Precificação Inteligente, Histórico de Compras e Configurações do Ateliê.
- **Cálculo unitário automático**: incorporação de preço e rateio de frete `(Preço + Frete) ÷ Qtd`.
- **Formação de preço com markup real**: cálculo de tempo de produção/mão de obra por minuto, custos fixos da oficina e margem de lucro.
- **Sincronização com 1 clique**: atualização automática do valor de venda no catálogo.
- **Visualização compacta**: tabela otimizada sem barras de rolagem excessivas e alertas de reposição de estoque (`⚠️ Repor`).
- **Exportação para Excel (`xlsx`)**: download de planilha completa de custos e estoque de insumos.

### 🎨 Galeria de Artes
- Upload e organização de trabalhos realizados em pastas por cliente/tema.
- Tags, busca avançada e visualização em lightbox.

### 📅 Agenda Semanal
- Visualização de entregas nos próximos 7 dias.
- Filtros por status, resumo semanal e destaque do dia atual.

### 📈 Dashboard & Relatórios
- **KPIs em tempo real**: receita, ticket médio, pedidos em aberto e faturamento.
- Alertas de entregas e pedidos em atraso.
- Gráficos analíticos e relatórios com exportação sob demanda em Excel (`xlsx`) e PDF (`jspdf`).
- Preservação do histórico contábil (`salesLedger`) independente de exclusões de contatos.

### 👤 Sistema de Permissões (RBAC)
- **3 Papéis no sistema**:
  - **Admin**: controle total, gerenciamento de equipe/usuários, delegação de pedidos e métricas globais.
  - **Funcionário**: execução da produção, acompanhamento de pedidos atribuídos e atualização de etapas.
  - **User**: gestão de clientes, produtos, orçamentos e pedidos próprios com relatórios individuais.
- **Permissões granulares** por módulo (visualizar, criar, editar, excluir).
- **Revogação em tempo real**: alterações de papel ou permissões são aplicadas imediatamente na sessão via listeners do Firestore sem necessidade de novo login.

### 📧 Central de E-mails (`/emails`)
- **Envio de e-mails transacionais** via Resend com preview em tempo real (exclusivo para admins).
- **Controle de cota diária/mensal** com barra de progresso sincronizada via Cloud Function.
- **Recebimento de e-mails** via webhook HTTP com validação de assinatura Svix e proteção contra replay attacks.
- **Rate limiting** no backend: máximo de 50 disparos por hora por administrador.

### 💡 Central de Ajuda & Guia Operacional (`/ajuda`)
- Guia operacional interativo com passo a passo dos fluxos do sistema.
- FAQ com soluções para dúvidas frequentes do dia a dia e catálogo de atalhos de teclado.

### ⚙️ Configurações & Personalização
- Segregação entre dados do ateliê (dados institucionais) e da lojinha pública (WhatsApp de vendas dedicado).
- Personalização visual: logotipo, banner, avatar e 6 paletas de cores de destaque.
- Templates de mensagem WhatsApp e preferências do dashboard.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI & Estilos | Tailwind CSS v4 + Radix UI + Lucide React |
| Backend & DB | Firebase (Cloud Firestore + Authentication + Cloud Storage) |
| Serverless | Firebase Cloud Functions v2 (Node 20) |
| CDN de Mídia | Cloudflare Workers Edge CDN (`cdn.luisices.com.br`) |
| Roteamento | React Router v7 com carregamento resiliente (`lazyWithRetry`) |
| Resiliência | Escudo global do Firestore com auto-cura de cache IndexedDB |
| Observabilidade | Sentry React SDK + Firebase Performance & Analytics |

---

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos
- Node.js 20+
- Projeto no Firebase Console com Firestore, Auth e Storage habilitados.

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env.local
```

Preencha o `.env.local` com as credenciais do seu projeto Firebase (Project Settings → General → Your apps).

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse: `http://localhost:5173`

### 5. Validar tipos e build
```bash
npm run typecheck
npm run build
```

---

## 🌐 Ambientes e Deploy

| Ambiente | Branch | URL | Destino |
|---|---|---|---|
| Desenvolvimento | `develop` | https://dev.luisices.com.br | Firebase Hosting `luisices-dev` |
| Produção | `main` | https://luisices.com.br | GitHub Pages |

O deploy padrão de `develop` executa os testes E2E antes de publicar. O deploy das Cloud Functions é separado e executado sob demanda via GitHub Actions ou Firebase CLI.
