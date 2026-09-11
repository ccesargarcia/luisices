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
      'Painel central de controle que consolida métricas financeiras, alertas de prazos, gráficos e a esteira de pedidos.',
    colorClass: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    steps: [
      {
        title: 'Leitura dos Cartões de Indicadores',
        desc: 'Acompanhe Faturamento Realizado, "A Receber" (saldo pendente de pedidos em aberto), Previsão de Receita (total de pedidos em andamento) e Ticket Médio.',
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
        title: 'Abas de Status da Esteira',
        desc: 'Navegue entre "Todos", "Pendentes", "Em Produção" e "Concluídos" para acompanhar o ciclo de vida dos pedidos em cards visuais.',
      },
    ],
    tips: [
      'Pedidos com data de entrega ultrapassada são destacados automaticamente no card "Pedidos Atrasados".',
      'Você pode exportar a lista de pedidos filtrados diretamente para Excel clicando no botão "Exportar".',
    ],
  },
  {
    id: 'orders',
    title: 'Pedidos & Workflow de Produção',
    badge: 'Operação',
    icon: Package,
    description:
      'Criação, controle de prazos, fluxo de pagamentos parciais, anexos e as 7 etapas do processo fabril.',
    colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    steps: [
      {
        title: 'Criar Novo Pedido',
        desc: 'Clique em "+ Novo Pedido". Selecione um cliente existente (ou cadastre na hora), monte a lista de produtos, defina o prazo de entrega e a forma de pagamento.',
      },
      {
        title: 'Atribuir Responsável na Criação',
        desc: 'Administradores podem delegar o pedido para um membro da equipe já no formulário inicial no campo "Responsável pela Produção".',
      },
      {
        title: 'Workflow de Produção (7 Etapas)',
        desc: 'Abra os detalhes do pedido e avance as etapas: Design → Aprovação → Impressão → Corte → Montagem → Controle de Qualidade → Embalagem. Cada etapa registra data e usuário.',
      },
      {
        title: 'Controle de Pagamento Parcial',
        desc: 'Registre entradas (ex: 50% no Pix) e saldo na entrega. O sistema calcula automaticamente o valor restante e atualiza o status de pagamento.',
      },
      {
        title: 'Anexos de Arquivos e Fotos',
        desc: 'Faça upload de fotos das artes ou documentos em PDF diretamente no pedido para que a equipe de produção visualize em qualquer dispositivo.',
      },
    ],
    tips: [
      'Ative a opção "Permuta / Parceria" quando o pedido não envolver dinheiro (troca de serviços ou parcerias de divulgação).',
      'Use cores nos cartões para categorizar visualmente pedidos prioritários.',
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
        desc: 'Personalize o que cada colaborador pode fazer (Visualizar, Criar, Editar ou Excluir) em Pedidos, Clientes, Produtos, Orçamentos, Relatórios e Galeria.',
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
      'Visualização cronológica por dia da semana para organizar o lote diário de entregas e balancear o trabalho da oficina.',
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
        desc: 'Preencha o nome e telefone com DDD. O sistema formata automaticamente e evita cadastros duplicados.',
      },
      {
        title: 'Histórico Financeiro Automático',
        desc: 'Veja na hora quantos pedidos o cliente já realizou e o total acumulado em compras com a sua loja.',
      },
      {
        title: 'Alertas de Aniversário no Sino',
        desc: 'O ícone de notificação avisa quando um cliente faz aniversário no dia ou nos próximos 7 dias para envio de cupom ou mensagem de parabéns.',
      },
    ],
    tips: [
      'Toque no ícone de telefone ou WhatsApp no card do cliente para abrir uma conversa direta no aplicativo sem precisar salvar o número na agenda do aparelho.',
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
        desc: 'Quando o cliente aprovar o orçamento, clique em "Converter em Pedido". Todos os itens, valores e dados do cliente são transferidos para a esteira de produção automaticamente.',
      },
    ],
    tips: [
      'Você pode gerar um PDF limpo do orçamento para enviar diretamente ao cliente por e-mail ou WhatsApp.',
    ],
  },
  {
    id: 'products',
    title: 'Produtos & Catálogo',
    badge: 'Cadastros',
    icon: ShoppingBag,
    description:
      'Catálogo padrão de itens, precificação e categorias para agilizar o preenchimento de pedidos e orçamentos.',
    colorClass: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    steps: [
      {
        title: 'Cadastrar Produto Base',
        desc: 'Informe o nome do item, categoria (ex: Topos de Bolo, Caixas, Convites), valor unitário sugerido e fotos.',
      },
      {
        title: 'Preenchimento Automático nos Pedidos',
        desc: 'Ao digitar o nome do produto no formulário de Novo Pedido ou Orçamento, o catálogo sugere o item e preenche o preço instantaneamente.',
      },
    ],
    tips: [
      'Mantenha os preços atualizados no catálogo para que toda a equipe orce e venda sempre com a margem correta.',
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
        desc: 'Quando um cliente solicitar um tema já feito anteriormente, pesquise na galeria para reutilizar elementos gráficos ou aprovar modelos com agilidade.',
      },
    ],
    tips: [
      'Você pode atribuir tags às fotos da galeria para filtrar temas como #Aniversario, #Casamento, #Batizado.',
    ],
  },
];

const FAQ_LIST = [
  {
    q: 'Como funciona a atribuição de pedidos para funcionários?',
    a: 'Administradores podem atribuir pedidos individualmente na tela de Novo Pedido, nos Detalhes do Pedido ou em lote selecionando vários pedidos no Dashboard. O funcionário atribuído terá acesso para visualizar o pedido e atualizar as etapas de produção.',
  },
  {
    q: 'O que o funcionário consegue ver no sistema?',
    a: 'Por padrão, funcionários veem os pedidos atribuídos a eles ou criados por eles, além dos módulos autorizados pelo administrador (como Galeria e Agenda). Permissões financeiras e de exclusão ficam protegidas conforme configurado na tela de Usuários.',
  },
  {
    q: 'O que acontece se uma conta de funcionário for desativada?',
    a: 'A sincronização ocorre em tempo real. Se o administrador desativar uma conta, o colaborador é deslogado imediatamente em seu aparelho com um aviso seguro e não conseguirá mais acessar os dados.',
  },
  {
    q: 'Como registrar um pagamento com 50% de entrada e o restante na entrega?',
    a: 'No formulário do pedido, selecione o Status do Pagamento como "Parcial" e informe o valor pago na entrada. O sistema calculará o "Restante" automaticamente e manterá o pedido visível na métrica "A Receber" até a quitação final.',
  },
  {
    q: 'Como converter um orçamento aprovado em pedido?',
    a: 'Abra a tela de Orçamentos, clique sobre o orçamento aprovado e toque no botão "Converter em Pedido". Todos os itens e valores serão copiados para a esteira de produção sem redigitação.',
  },
  {
    q: 'O que são os pedidos de Permuta / Parceria?',
    a: 'São pedidos feitos em troca de divulgação (ex: influenciadores) ou parcerias de serviço sem cobrança monetária. Marcar como "Permuta" zera o valor a receber e preserva suas métricas financeiras de faturamento real.',
  },
  {
    q: 'Como instalar o aplicativo na tela inicial do celular (Android e iOS)?',
    a: 'No iPhone (Safari): toque no botão Compartilhar (quadrado com seta) e escolha "Adicionar à Tela de Início". No Android (Chrome): toque nos três pontos no canto superior direito e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
  },
  {
    q: 'Como filtrar métricas e entregas de um funcionário específico?',
    a: 'Tanto no topo quanto nas páginas de Dashboard, Agenda e Relatórios, utilize o botão do seletor de Equipe. Você pode marcar um ou múltiplos colaboradores para isolar indicadores ou conferir pedidos sem responsável.',
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
              Explore o funcionamento detalhado de cada módulo, regras de negócio, esteira de produção e dicas para operar com alta produtividade no celular ou computador.
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
            placeholder="O que você precisa aprender? Ex: permuta, atribuir, pagamento, relatórios..."
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
