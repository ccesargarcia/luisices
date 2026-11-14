# 🎨 Luisices — Gestão do Ateliê & Papelaria Personalizada

## 🌟 Visão Geral & Propósito
- **Domínio**: Gestão completa de papelaria personalizada e ateliê artesanal
- **Objetivo**: Unificar pedidos, produção, precificação, CRM, loja pública e IA
- **Ambientes**: Produção (`dev.luisices.com.br` / `luisices.com.br`) e Desenvolvimento Local (Vite `localhost:3000`)

## 🏗️ Arquitetura & Stack Tecnológica
- **Frontend SPA**
  - React 19 + TypeScript 5
  - Build Tool: Vite
  - Roteamento: React Router DOM v6
  - UI & Estilização: Tailwind CSS + Radix UI Primitives + Lucide React + Motion + Sonner
  - Formulários: React Hook Form + Zod Schema Validation
- **Backend Serverless**
  - Cloud Functions for Firebase (Node.js 22)
  - Gateway de Borda: Cloudflare API Worker (Proxy, proteção de origem e CORS)
  - Arquitetura Modular: Exports sob demanda por domínio (evita cold-starts pesados)
- **Persistência & Dados**
  - Cloud Firestore: Pedidos, clientes, produtos, orçamentos, insumos e ledger
  - Realtime Database: Presença em tempo real e sessões ativas
  - Cloud Storage: Fotos de catálogo, comprovantes, recibos e mídias
- **Observabilidade & Governança**
  - Sentry: Monitoramento ativo de erros (frontend e backend)
  - Firebase Analytics & Performance Monitoring
  - Suíte de Testes: Vitest (unitários), Playwright (E2E), Firebase Emulator Suite (regras e integração)

## 📦 Módulos Principais da Aplicação

### 🚀 1. Operação & Produção
- **Quadro Kanban de Pedidos**
  - Status: Novo, Em Produção, Aguardando Aprovação, Pronto, Entregue, Cancelado
  - Filtros por prioridade, data de festa e canal de origem
  - Atribuição direta de responsáveis na equipe
- **Fluxo de Produção Artesanal**
  - 1. Criação da arte digital e mockup
  - 2. Envio e aprovação pelo cliente
  - 3. Impressão e laminação (brilho, fosca, holográfica)
  - 4. Corte e vinco automatizado (Silhouette / Plotter)
  - 5. Montagem, colagem e aviamentos (laços, pedrarias)
  - 6. Embalagem de proteção e expedição
- **Ledger Financeiro & Transações Atômicas**
  - Controle de pagamentos (Sinal 50%, Quitação, Taxas)
  - Idempotência com limite CEL e proteção contra falhas de rede
  - Emissão de recibos digitais e relatórios de fluxo de caixa
- **Agenda Semanal (`WeeklyCalendar`)**
  - Programação visual de entregas por dia da semana
  - Alerta de margem de segurança para eventos

### 💼 2. Comercial & Relacionamento (CRM)
- **Gestão de Clientes (`Customers`)**
  - Cadastro detalhado com histórico de pedidos e preferências
  - Registro de endereços e aniversários dos filhos
  - Nível de fidelidade e observações de atendimento
- **Orçamentos Inteligentes (`Quotes`)**
  - Composição rápida de itens e prazos de validade
  - Condições de pagamento configuráveis
  - Conversão em pedido de produção com 1 clique
- **Catálogo Interno de Produtos (`Products`)**
  - Fichas completas com variações (temas, tamanhos, tipos)
  - Vínculo com receitas técnicas de produção e insumos
- **Permutas & Parcerias (`Exchanges`)**
  - Controle de trocas com criadores de conteúdo e parceiros
  - Acompanhamento de entregas e contrapartidas
- **Galeria & Portfólio (`Gallery`)**
  - Mostruário de trabalhos realizados
  - Banco de referências e inspirações visuais

### 💰 3. Custos & Precificação Artesanal
- **Gestão de Insumos & Compras (`Pricing`)**
  - Papéis (offset, fotográfico, color plus, lamicote)
  - Aviamentos, fitas de cetim, pedrarias e caixas
  - Histórico de preços e compras com cálculo de custo unitário
- **Fichas Técnicas & Receitas de Produção**
  - Lista de materiais (BOM) por produto
  - Cálculo automático de consumo de folhas e perdas
- **Motor de Precificação (`ArtisanPricingPage`)**
  - Custos diretos: Matéria-prima e embalagem
  - Custos indiretos: Energia, depreciação de equipamentos, software
  - Custo da mão de obra artesanal por hora dedicada
  - Margem de lucro pretendida, taxas de cartão e impostos
- **Configurações do Ateliê (`Settings`)**
  - Metas de faturamento mensal e horas produtivas da equipe

### 🛍️ 4. Loja Pública & Vitrine Digital
- **Vitrine Virtual (`PublicCatalog`)**
  - Interface moderna para visualização de coleções
  - Categorias: Aniversários infantis, batizados, lembrancinhas, papelaria corporativa
- **Personalização Interativa**
  - Escolha de tema, paleta de cores, nome e idade do homenageado
  - Upload de arquivos de referência pelo cliente
- **Rastreamento de Pedidos (`PublicOrderTracking`)**
  - Consulta pública por código de rastreio seguro
  - Linha do tempo visual do progresso da produção
- **Gestão da Vitrine (`StoreCustomization` & `StoreOrders`)**
  - Personalização de banners, anúncios e identidade visual
  - Conversão assistida de encomendas da vitrine em pedidos do ateliê

### 💬 5. Atendimento Omnichannel
- **E-mails Transacionais (`Emails`)**
  - Integração oficial com Resend API
  - Templates para confirmação de pedido, aprovação de arte e envio
  - Webhooks de tracking (entregue, aberto, clicado)
- **WhatsApp Integrado (`WhatsAppChat`)**
  - Conexão com Evolution API via HTTP
  - Envio de atualizações automáticas de status
  - Histórico de mensagens sincronizado com a ficha do cliente

### 🤖 6. Inteligência Artificial & Copiloto
- **Copiloto IA no Painel (`functions/ai`)**
  - Modelo: Google Gemini com Function Calling
  - 9 Ferramentas operacionais integradas
  - Consulta rápida de pedidos, clientes, prazos e estoque
  - Elaboração de rascunhos de orçamentos e mensagens
- **Visão Computacional**
  - Leitura e validação de comprovantes de PIX
  - Extração de paleta e estilo de imagens de referência
- **Integração de Voz Alexa (`functions/alexa`)**
  - Skill desenvolvida com Alexa Skills Kit (ASK SDK)
  - Comandos de voz: "Alexa, quais pedidos são para hoje?"

### 🔐 7. Segurança, Administração & Governança
- **Controle de Usuários (`Users`)**
  - Gestão de equipe e convites por e-mail
  - Perfis de acesso (RBAC): Admin, Produção, Atendimento
  - Custom Claims no Firebase Auth para autorização estrita
- **Sessões & Presença em Tempo Real**
  - Monitoramento de operadores logados via Realtime Database
  - Prevenção de conflitos de edição simultânea
- **Políticas de Segurança Declarativas**
  - `firestore.rules`: Validação de esquema e permissões por role
  - `storage.rules`: Proteção de uploads, limites de tamanho e tipo
  - `database.rules.json`: Acesso seguro a dados de presença
