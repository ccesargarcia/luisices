import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  HelpCircle,
  Search,
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  FileText,
  ShoppingBag,
  Images,
  UserCog,
  CheckCircle2,
  Smartphone,
  Sparkles,
  ChevronRight,
  Package,
  ArrowRight,
  Store,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';

interface GuideSection {
  id: string;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  colorClass: string;
  steps: { title: string; desc: string }[];
  tips: string[];
}

const MODULE_GUIDES: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard & Indicadores (KPIs)',
    badge: 'Visão Geral',
    icon: LayoutDashboard,
    description:
      'Painel central de controle que consolida faturamento, valores a receber, alertas de prazos de entrega e visão geral dos pedidos.',
    colorClass: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    steps: [
      {
        title: 'Leitura dos Cartões de Indicadores',
        desc: 'Acompanhe Faturamento Realizado, "A Receber" (saldo pendente de pedidos com pagamento parcial ou pendente), Previsão de Receita e Ticket Médio.',
      },
      {
        title: 'Filtro por Responsável / Equipe (Admin)',
        desc: 'No topo ou na barra de busca, use o botão "Equipe: Todos" para isolar os cálculos e pedidos de um funcionário específico ou ver pedidos ainda desatribuídos.',
      },
      {
        title: 'Ações em Lote (Atribuição e Exclusão)',
        desc: 'Marque a caixa de seleção de 1 ou mais pedidos para abrir a barra de ações em massa: atribua vários pedidos de uma só vez a um colaborador ou faça exclusões autorizadas.',
      },
      {
        title: 'Filtro Rápido por Status',
        desc: 'Alterne rapidamente entre "Todos", "Pendentes", "Em Produção" e "Concluídos" para acompanhar o andamento dos trabalhos do dia com rapidez.',
      },
    ],
    tips: [
      'Pedidos com data de entrega ultrapassada são destacados automaticamente no card "Pedidos Atrasados".',
      'Você pode exportar a lista de pedidos filtrados diretamente para Excel clicando no botão "Exportar".',
    ],
  },
  {
    id: 'orders',
    title: 'Gestão de Pedidos & Encomendas',
    badge: 'Operação do Ateliê',
    icon: Package,
    description:
      'Abertura rápida de encomendas, controle de prazos de entrega, pagamentos (total ou entrada), observações de personalização e histórico do cliente.',
    colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    steps: [
      {
        title: 'Abertura da Encomenda',
        desc: 'Clique em "+ Novo Pedido". Selecione o cliente (ou cadastre no momento com WhatsApp), adicione os itens do catálogo, defina o prazo de entrega e a forma de pagamento.',
      },
      {
        title: 'Controle de Status Prático',
        desc: 'Acompanhe cada encomenda em status objetivos: Pendente (aguardando início), Em Produção (sendo confeccionado no ateliê), Concluído (pronto para retirada/entrega) ou Cancelado.',
      },
      {
        title: 'Pagamento Parcial (Entrada e Saldo)',
        desc: 'Registre entradas (ex: 50% no Pix) e saldo na entrega. O sistema calcula automaticamente o valor restante e atualiza a métrica "A Receber".',
      },
      {
        title: 'Personalização & Observações da Peça',
        desc: 'Anote o nome do homenageado, idade, tema da festa ou detalhes de acabamento artesanal no campo de observações para que nada seja esquecido.',
      },
      {
        title: 'Anexos de Arquivos e Fotos',
        desc: 'Faça upload de fotos das artes, comprovantes de pagamento ou arquivos PDF diretamente no pedido para consulta rápida no celular durante a produção.',
      },
      {
        title: 'Atribuição a Membros da Equipe',
        desc: 'Delegue o pedido para um colaborador responsável. O colaborador visualiza suas tarefas atribuídas no Dashboard e na Agenda Semanal.',
      },
    ],
    tips: [
      'Ative a opção "Permuta / Parceria" quando o pedido for feito em troca de divulgação com influenciadores ou parcerias sem cobrança em dinheiro.',
      'Use as cores nos cartões para categorizar visualmente pedidos prioritários ou temas específicos.',
      'O sistema avisa automaticamente no Dashboard quando uma data de entrega estiver próxima ou atrasada.',
    ],
  },
  {
    id: 'store',
    title: 'Lojinha Online & Catálogo Público',
    badge: 'Vendas Online',
    icon: Store,
    description:
      'Vitrine digital para divulgar no Instagram/WhatsApp, receber pedidos formatados e controlar disponibilidade, banners e opções de compra.',
    colorClass: 'text-amber-600 bg-amber-600/10 border-amber-600/20',
    steps: [
      {
        title: 'Vitrine Comercial Separada (storeProducts)',
        desc: 'Os produtos da lojinha são independentes dos produtos internos do ateliê. Cadastre fotos vendedoras, preços promocionais e categorias com tags em "Produtos da Lojinha".',
      },
      {
        title: 'Publicação em Lote via Fotos',
        desc: 'Em "Produtos da Lojinha", clique em "Mais Fotos" ou "Publicação em Lote". Selecione múltiplas imagens de uma só vez direto da galeria do celular ou computador. O sistema formata os nomes automaticamente (ex: "caixa_milk_luxo.jpg" vira "Caixa Milk Luxo"), gera miniaturas e permite definir preços, prazos e categorias unitárias ou em massa.',
      },
      {
        title: 'Criação Dinâmica de Categorias (+ Nova Categoria)',
        desc: 'Tanto na barra superior de preenchimento em lote quanto no card de cada foto individual, selecione "+ Nova categoria" no seletor para digitar um nome livre na hora. Ao aplicar em lote, todas as fotos da fila herdam a nova categoria instantaneamente.',
      },
      {
        title: 'Publicação & Modo Manutenção (Toggle "Fora do Ar")',
        desc: 'Na tela "Personalizar Loja" > aba "Operação", você pode pausar a loja com 1 clique. Os visitantes visualizam uma página de manutenção com sua logo, mensagem personalizada e botão para falar no WhatsApp.',
      },
      {
        title: 'Feature Flags (Pedidos Online / Modo Vitrine)',
        desc: 'Se a capacidade de produção estiver lotada, desative a flag "Pedidos Online (Sacola)". A loja se transforma em vitrine de consulta com botão "Ver Detalhes" e "Consultar no WhatsApp", sem carrinho.',
      },
      {
        title: 'Banners Rotativos & Propaganda (Carrossel)',
        desc: 'Adicione múltiplos banners promocionais (formato 4:1) com transição automática configurável (3s, 5s, 7s) ou efeito parallax fixo ao fundo.',
      },
      {
        title: 'Pedidos da Lojinha no WhatsApp & Histórico',
        desc: 'Quando o cliente fecha o pedido na lojinha, recebe uma mensagem pronta no WhatsApp com código único (#LJ-XXXX) e o pedido é salvo automaticamente em "Pedidos da Lojinha".',
      },
    ],
    tips: [
      'O envio em fotos aceita múltiplos arquivos JPG, PNG e WebP de até 8MB cada, com barra de progresso em tempo real e publicação direta no Firestore e Storage.',
      'Você pode selecionar múltiplos produtos na tabela da lojinha para realizar exclusões em lote com confirmação de segurança.',
      'Acesse a vitrine pelo link direto /catalogo, por /loja ou pelo subdomínio direto loja.luisices.com.br (ou loja.dev.luisices.com.br em desenvolvimento).',
      'Você pode adicionar uma conta de Instagram de Parceria/Colab que é exibida elegantemente no cabeçalho e rodapé da lojinha.',
    ],
  },
  {
    id: 'users',
    title: 'Equipe, Usuários & Permissões (RBAC)',
    badge: 'Segurança & Gestão',
    icon: UserCog,
    description:
      'Cadastre colaboradores, defina níveis de acesso modulares e acompanhe a delegação de tarefas com segurança.',
    colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    steps: [
      {
        title: 'Cadastrar Novo Usuário ou Convidar',
        desc: 'Na aba Usuários, clique em "Novo Usuário" para cadastrar com login e senha ou "Convidar" para gerar link de acesso enviado por WhatsApp/E-mail.',
      },
      {
        title: 'Níveis de Acesso (Roles)',
        desc: 'Administrador (acesso total às configurações e finanças), Funcionário (acesso operacional focado em seus pedidos atribuídos) e Usuário Padrão.',
      },
      {
        title: 'Matriz Granular de Permissões',
        desc: 'Personalize o que cada colaborador pode fazer (Visualizar, Criar, Editar ou Excluir) em Pedidos, Clientes, Produtos, Orçamentos, Relatórios e Lojinha.',
      },
      {
        title: 'Sincronização e Revogação em Tempo Real',
        desc: 'Se desativar um usuário ou alterar suas permissões, o celular do colaborador atualiza na mesma hora sem necessidade de deslogar e logar.',
      },
    ],
    tips: [
      'Funcionários enxergam no Dashboard e na Agenda os pedidos atribuídos a eles ou criados por eles.',
      'Apenas Administradores podem excluir pedidos ou reatribuir pedidos entre funcionários.',
    ],
  },
  {
    id: 'calendar',
    title: 'Agenda Semanal de Entregas',
    badge: 'Planejamento',
    icon: Calendar,
    description:
      'Visualização cronológica por dia da semana para organizar as entregas e balancear o trabalho do ateliê.',
    colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    steps: [
      {
        title: 'Navegação Entre Semanas',
        desc: 'Utilize as setas para avançar ou retroceder as semanas do mês, ou clique em "Hoje" para voltar imediatamente aos prazos atuais.',
      },
      {
        title: 'Filtro por Responsável',
        desc: 'Selecione um funcionário no filtro de equipe para ver exclusivamente a carga de trabalho e entregas daquele colaborador na semana.',
      },
      {
        title: 'Acesso Rápido aos Detalhes',
        desc: 'Toque em qualquer card da agenda para visualizar o status do pedido, cliente, telefone para contato e avançar o status.',
      },
    ],
    tips: [
      'Excelente para abrir no tablet ou celular na bancada de trabalho no início de cada expediente.',
    ],
  },
  {
    id: 'customers',
    title: 'Clientes & Relacionamento',
    badge: 'Cadastro',
    icon: Users,
    description:
      'Base de clientes com histórico de compras consolidado, aniversários e atalhos rápidos de contato via WhatsApp.',
    colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    steps: [
      {
        title: 'Cadastrar Cliente com WhatsApp',
        desc: 'Preencha o nome e telefone com DDD. O sistema formata automaticamente para abrir conversas com 1 toque.',
      },
      {
        title: 'Histórico Financeiro Automático',
        desc: 'Veja na hora quantos pedidos o cliente já realizou e o total acumulado em compras com o seu ateliê.',
      },
      {
        title: 'Alertas de Aniversário no Sino',
        desc: 'O ícone de notificação avisa quando um cliente faz aniversário no dia ou nos próximos 7 dias para envio de lembrete ou cupom carinhoso.',
      },
    ],
    tips: [
      'Toque no ícone de WhatsApp no card do cliente para abrir uma conversa direta no aplicativo sem precisar salvar o número na agenda do aparelho.',
    ],
  },
  {
    id: 'quotes',
    title: 'Orçamentos Comerciais',
    badge: 'Vendas',
    icon: FileText,
    description:
      'Elabore orçamentos profissionais com múltiplos itens e transforme em pedido aprovado com apenas um clique.',
    colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    steps: [
      {
        title: 'Criar Proposta Orçamentária',
        desc: 'Informe o cliente, adicione produtos do catálogo com quantidades e valores, e defina uma data de validade da proposta.',
      },
      {
        title: 'Gerenciar Status',
        desc: 'Acompanhe as propostas em: Rascunho, Enviado, Aprovado, Rejeitado ou Expirado.',
      },
      {
        title: 'Converter em Pedido com 1 Toque',
        desc: 'Quando o cliente aprovar o orçamento, clique em "Converter em Pedido". Todos os itens, valores e dados do cliente são transferidos diretamente para a lista de pedidos em andamento.',
      },
    ],
    tips: [
      'Você pode gerar um PDF limpo do orçamento para enviar diretamente ao cliente por e-mail ou WhatsApp.',
    ],
  },
  {
    id: 'products',
    title: 'Produtos & Catálogo Interno',
    badge: 'Cadastros',
    icon: ShoppingBag,
    description:
      'Cadastro de produtos base, categorias dinâmicas e precificação para agilizar o preenchimento de pedidos e orçamentos.',
    colorClass: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    steps: [
      {
        title: 'Cadastrar Produto Base',
        desc: 'Informe o nome do item, valor sugerido, categoria e se a peça permite personalização de nome.',
      },
      {
        title: 'Categorias Dinâmicas com Tags',
        desc: 'Selecione categorias existentes no dropdown ou clique em "➕ Cadastrar nova categoria..." para criar uma na hora sem sair do formulário.',
      },
      {
        title: 'Preenchimento Automático nos Pedidos',
        desc: 'Ao selecionar o produto no formulário de Novo Pedido ou Orçamento, o preço e dados são preenchidos instantaneamente.',
      },
    ],
    tips: [
      'Você pode importar produtos do catálogo interno diretamente para a Lojinha Pública clicando em "Importar do Ateliê" na tela de Produtos da Lojinha.',
    ],
  },
  {
    id: 'reports',
    title: 'Relatórios & Inteligência Financeira',
    badge: 'Análise',
    icon: BarChart3,
    description:
      'Gráficos de faturamento, canais de pagamento mais usados e análise de produtividade individual ou por equipe.',
    colorClass: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    steps: [
      {
        title: 'Seleção do Período',
        desc: 'Filtre os dados por Semana, Mês, Trimestre ou Ano para avaliar o crescimento do negócio.',
      },
      {
        title: 'Filtro por Colaborador',
        desc: 'Selecione membros da equipe para analisar o faturamento e volume de pedidos executados por cada operador.',
      },
      {
        title: 'Distribuição de Formas de Pagamento',
        desc: 'Veja graficamente a proporção entre Pix, Dinheiro e Cartão para melhor planejamento do fluxo de caixa.',
      },
    ],
    tips: [
      'Acesse os relatórios regularmente para identificar quais produtos mais vendem e quais clientes geram maior faturamento.',
    ],
  },
  {
    id: 'gallery',
    title: 'Galeria de Artes & Portfólio',
    badge: 'Mídia',
    icon: Images,
    description:
      'Acervo digital de fotos de artes produzidas, organizadas por cliente e pedido para inspiração e reutilização.',
    colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    steps: [
      {
        title: 'Vincular Artes aos Pedidos',
        desc: 'Ao concluir um pedido, anexe fotos do resultado final na galeria.',
      },
      {
        title: 'Consulta Rápida de Inspirações',
        desc: 'Quando um cliente solicitar um tema já feito anteriormente, pesquise na galeria para aprovar modelos com agilidade.',
      },
    ],
    tips: [
      'Você pode atribuir tags às fotos da galeria para filtrar temas como #Aniversario, #Casamento, #Batizado.',
    ],
  },
];

const FAQ_LIST = [
  {
    q: 'Como funciona a publicação e o botão de despublicar a lojinha?',
    a: 'Em "Personalizar Loja" > aba "Operação", existe o botão "Loja Publicada". Ao desligá-la e salvar, a vitrine pública entra em modo manutenção imediatamente. Os visitantes veem sua logomarca, uma mensagem explicativa personalizável e botões para falar com você no WhatsApp ou Instagram.',
  },
  {
    q: 'O que acontece ao desativar o botão "Pedidos Online (Sacola)"?',
    a: 'A loja continua no ar como uma vitrine/portfólio online para divulgar suas peças, mas a sacola de compras e o checkout são ocultados. Nos produtos, o botão muda de "Adicionar à Sacola" para "Ver Detalhes" e direciona o cliente para tirar dúvidas ou fazer encomenda diretamente no WhatsApp.',
  },
  {
    q: 'Como cadastrar novas categorias de produtos de forma rápida?',
    a: 'Tanto no formulário de produtos do ateliê quanto nos produtos da lojinha, o campo de categoria conta com um menu seletor inteligente. Você pode escolher uma categoria já existente ou selecionar a opção "➕ Cadastrar nova categoria..." para digitar um novo nome na hora.',
  },
  {
    q: 'Qual a diferença entre os "Produtos do Ateliê" e os "Produtos da Lojinha"?',
    a: 'Os "Produtos do Ateliê" servem para suporte interno à produção, orçamentos e insumos. Já os "Produtos da Lojinha" compõem exclusivamente a vitrine pública online que seus clientes enxergam. Na tela da lojinha você pode clicar em "Importar do Ateliê" para trazer peças internas com um clique.',
  },
  {
    q: 'Como os pedidos feitos na lojinha chegam até mim?',
    a: 'Quando o cliente finaliza o pedido na lojinha, o sistema abre uma conversa formatada no seu WhatsApp com o código do pedido (#LJ-XXXX), itens escolhidos, nomes para personalização e dados de entrega. O pedido também fica registrado no menu "Pedidos da Lojinha" para acompanhamento da sua equipe.',
  },
  {
    q: 'Como configurar o endereço / domínio da minha lojinha?',
    a: 'Sua vitrine pública atende automaticamente tanto pelo caminho luisices.com.br/loja (ou /catalogo) quanto pelo subdomínio direto loja.luisices.com.br (e em desenvolvimento por loja.dev.luisices.com.br), facilitando colocar o link na bio do Instagram.',
  },
  {
    q: 'Como registrar um pagamento com entrada (sinal) e saldo na entrega?',
    a: 'Ao criar ou editar o pedido, selecione o Status do Pagamento como "Parcial" e informe o valor pago na entrada (ex: 50%). O sistema calcula o saldo restante automaticamente e mantém o pedido visível na métrica "A Receber" até a quitação final.',
  },
  {
    q: 'Como funciona a atribuição de pedidos para colaboradores?',
    a: 'Administradores podem atribuir pedidos individualmente na tela de Novo Pedido, nos Detalhes do Pedido ou em lote selecionando múltiplos pedidos no Dashboard. O funcionário atribuído visualiza suas tarefas em sua própria agenda e lista de tarefas.',
  },
  {
    q: 'O que o funcionário consegue ver no sistema?',
    a: 'Por padrão, funcionários veem os pedidos atribuídos a eles ou criados por eles, além dos módulos autorizados pelo administrador (como Galeria e Agenda). Permissões financeiras e de exclusão ficam protegidas conforme configurado na tela de Usuários.',
  },
  {
    q: 'O que são os pedidos de Permuta / Parceria?',
    a: 'São encomendas feitas em parceria com influenciadores ou permuta de serviços, sem pagamento em dinheiro. Ao marcar a opção "Permuta / Parceria", o sistema zera o valor a receber e preserva suas métricas financeiras de faturamento real.',
  },
  {
    q: 'Como converter um orçamento aprovado em pedido?',
    a: 'Abra a tela de Orçamentos, clique sobre o orçamento aprovado e toque no botão "Converter em Pedido". Todos os itens, valores e dados do cliente são copiados para a lista de pedidos em andamento sem redigitação.',
  },
  {
    q: 'Como instalar o aplicativo na tela inicial do celular (Android e iOS)?',
    a: 'No iPhone (Safari): toque no botão Compartilhar (quadrado com seta) e escolha "Adicionar à Tela de Início". No Android (Chrome): toque nos três pontos no canto superior direito e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
  },
  {
    q: 'Como funciona a publicação em lote de produtos por fotos na lojinha?',
    a: 'No menu "Produtos da Lojinha", clique no botão "Mais Fotos" (ou "Publicação em Lote"). Arraste ou selecione diversas fotos de produtos do seu celular ou computador. O sistema gera automaticamente os títulos dos produtos a partir dos nomes dos arquivos. Você pode usar a barra superior para aplicar preço, prazo e categoria a todas as fotos de uma só vez, ou ajustar cada produto individualmente antes de clicar em "Publicar".',
  },
  {
    q: 'Como cadastrar uma nova categoria durante o envio em lote de fotos?',
    a: 'Tanto na barra de lote rápida (no topo do modal) quanto no card de cada foto, abra o campo de seleção de Categoria e escolha a opção "+ Nova categoria". O campo se transformará em uma caixa de texto livre onde você digita o nome desejado. Clicando no ícone de "✕", você pode voltar à lista de categorias pré-existentes a qualquer momento.',
  },
  {
    q: 'Como o Copiloto IA da Luisices pode me ajudar na operação do dia a dia?',
    a: 'O Copiloto IA (disponível no menu superior ou lateral) atua como um assistente operacional inteligente. Ele consegue analisar o Raio-X do dia (pedidos em atraso e entregas de hoje), estimar custos e sugerir preços com margem protegida, buscar modelos e fotos no acervo da galeria por visão computacional, auditar métricas de desempenho de colaboradores (para administradores) e redigir mensagens gentis de cobrança e aviso para o WhatsApp do cliente.',
  },
];

export function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('modulos');

  // Filtro de busca dinâmica
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return MODULE_GUIDES;
    const q = searchQuery.toLowerCase();
    return MODULE_GUIDES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.steps.some((s) => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)) ||
        m.tips.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredFaq = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_LIST;
    const q = searchQuery.toLowerCase();
    return FAQ_LIST.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Principal */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <HelpCircle className="size-3.5" />
              <span>Guia Completo da Plataforma</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Central de Ajuda & Manual Operacional
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Explore o funcionamento detalhado de cada módulo, regras de negócio, gestão de encomendas e dicas para operar com alta produtividade no celular ou computador.
            </p>
          </div>

          <div className="hidden lg:flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Sparkles className="size-10" />
          </div>
        </div>

        {/* Barra de Busca Dinâmica */}
        <div className="mt-5 sm:mt-6 relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tópicos, dúvidas ou funcionalidades... Ex: permuta, atribuir, pagamento"
            aria-label="Buscar tópicos, dúvidas ou funcionalidades"
            className="h-11 pl-10 pr-4 text-base sm:text-sm bg-background/90 rounded-xl shadow-xs border-primary/20 focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-muted"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Destaque Mobile PWA */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 dark:text-emerald-200">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Smartphone className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">100% Compatível com Celulares (iOS & Android)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instale o app diretamente na tela de início do seu iPhone ou Android para acesso instantâneo no chão de produção.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActiveTab('faq');
            setSearchQuery('tela inicial');
          }}
          className="h-8 text-xs shrink-0 self-start sm:self-auto border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
        >
          Como Instalar
          <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-sm h-10 p-1">
          <TabsTrigger value="modulos" className="text-xs sm:text-sm font-medium">
            Módulos & Guias ({filteredModules.length})
          </TabsTrigger>
          <TabsTrigger value="faq" className="text-xs sm:text-sm font-medium">
            Perguntas Frequentes ({filteredFaq.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MÓDULOS */}
        <TabsContent value="modulos" className="space-y-4">
          {filteredModules.length === 0 ? (
            <div className="py-12 text-center rounded-xl border bg-card p-6">
              <HelpCircle className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">Nenhum guia encontrado para "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground mt-1">Tente pesquisar por outro termo ou limpe a busca.</p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="mt-3 text-xs">
                Ver todos os módulos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredModules.map((section) => {
                const Icon = section.icon;
                return (
                  <Card key={section.id} className="border-border/60 shadow-xs hover:border-primary/40 transition-all flex flex-col">
                    <CardHeader className="p-4 sm:p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={cn('flex size-10 items-center justify-center rounded-xl border shrink-0', section.colorClass)}>
                            <Icon className="size-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base sm:text-lg font-semibold leading-tight">
                              {section.title}
                            </CardTitle>
                            <Badge variant="secondary" className="text-[10px] mt-1 font-normal px-2 py-0">
                              {section.badge}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-2.5 leading-relaxed">
                        {section.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-5 pt-0 flex-1 flex flex-col justify-between space-y-4">
                      {/* Passos */}
                      <div className="space-y-2.5 border-t pt-3">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Como utilizar no dia a dia:
                        </span>
                        <div className="space-y-2">
                          {section.steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs">
                              <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div>
                                <strong className="text-foreground font-medium">{step.title}: </strong>
                                <span className="text-muted-foreground">{step.desc}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dicas extras */}
                      {section.tips.length > 0 && (
                        <div className="rounded-lg bg-muted/40 p-2.5 border border-muted-foreground/10 text-[11px] space-y-1">
                          {section.tips.map((tip, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-muted-foreground">
                              <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                              <span>{tip}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PERGUNTAS FREQUENTES (FAQ) */}
        <TabsContent value="faq" className="space-y-4">
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-lg font-semibold">Perguntas Frequentes (FAQ)</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Tire dúvidas imediatas sobre permissões, pagamentos, atalhos e rotinas do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              {filteredFaq.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhuma dúvida correspondente encontrada.
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaq.map((item, idx) => (
                    <AccordionItem key={idx} value={`faq-${idx}`}>
                      <AccordionTrigger className="text-left text-xs sm:text-sm font-medium py-3 hover:no-underline hover:text-primary">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-3">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ações Rápidas de Navegação */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <h4 className="text-sm font-semibold">Pronto para colocar em prática?</h4>
          <p className="text-xs text-muted-foreground">
            Volte ao painel principal ou explore a agenda semanal de produção.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/agenda')}
            className="flex-1 sm:flex-none text-xs h-9"
          >
            Ver Agenda
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex-1 sm:flex-none text-xs h-9 gap-1.5"
          >
            Ir para o Dashboard
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HelpCenter;
