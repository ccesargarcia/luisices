import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  Settings as SettingsIcon,
  BarChart3,
  FileText,
  ShoppingBag,
  Images,
  Mail,
  MessageSquare,
  ArrowLeftRight,
  UserCog,
  Coins,
  Store,
  Palette,
  ClipboardList,
  Archive,
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { applyColorTheme, type ColorThemeKey } from '../utils/colorThemes';
import { trackPageView } from '../../services/analyticsService';
import { AiCopilotSheet } from '../components/AiCopilotSheet';
import { NewOrderDialog } from '../components/NewOrderDialog';
import { CustomerFormDialog } from '../components/customers/CustomerFormDialog';
import { AiOrderDraft, canAccessPricing, canAccessArchivedOrders, canAccessEmails } from '../types';
import { firebaseWhatsAppService } from '../../services/firebaseWhatsAppService';

import { SidebarNavigation, NavGroup } from '../components/layout/SidebarNavigation';
import { TopHeader } from '../components/layout/TopHeader';
import { Footer } from '../components/layout/Footer';
import { MobileNavigation, MobileNavItem } from '../components/layout/MobileNavigation';
import { GlobalSearchDialog } from '../components/layout/GlobalSearchDialog';

/** Converte Date para string "YYYY-MM-DD" local (evita shift UTC à noite no Brasil) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, userProfile, hasPermission } = useAuth();
  const { orders } = useOrders();
  const { settings } = useUserSettings();

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [aiOrderDraft, setAiOrderDraft] = useState<AiOrderDraft | null>(null);
  const [aiNewOrderModalOpen, setAiNewOrderModalOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [unreadWhatsAppCount, setUnreadWhatsAppCount] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [storeSubmenuOpen, setStoreSubmenuOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return window.localStorage.getItem('luisices-sidebar-collapsed') === 'true';
  });

  // Atalho global Ctrl+K / Cmd+K para busca rápida
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quantidade de pedidos ativos com entrega prevista para a data atual
  const todayDeliveriesCount = useMemo(() => {
    const todayString = toLocalDateStr(new Date());
    return (orders || []).filter(
      (o) => o.deliveryDate === todayString && o.status !== 'completed' && o.status !== 'cancelled'
    ).length;
  }, [orders]);

  const canCreateOrder = isAdmin || hasPermission((p) => p.orders?.create ?? false);
  const canCreateQuote = isAdmin || hasPermission((p) => p.quotes?.create ?? false);
  const canCreateCustomer = isAdmin || hasPermission((p) => p.customers?.create ?? false);
  const canQuickCreate = canCreateOrder || canCreateQuote || canCreateCustomer;
  const canAccessSettings = isAdmin || hasPermission((p) => Boolean(p?.settings));
  const canAccessAiCopilot = isAdmin || hasPermission((p) => Boolean(p?.aiCopilot));

  // Escuta contagem de mensagens não lidas do WhatsApp em tempo real
  useEffect(() => {
    const unsubscribe = firebaseWhatsAppService.subscribeConversations((chats) => {
      const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setUnreadWhatsAppCount(totalUnread);
    }, undefined, isAdmin);
    return () => unsubscribe();
  }, [isAdmin]);

  const handleApplyAiOrderDraft = (draft: AiOrderDraft) => {
    setAiOrderDraft(draft);
    setAiNewOrderModalOpen(true);
  };

  // Apply color theme CSS vars whenever settings change
  useEffect(() => {
    applyColorTheme((settings?.colorTheme as ColorThemeKey) ?? 'default', settings?.customColorHex);
  }, [settings?.colorTheme, settings?.customColorHex]);

  // Track page views with Firebase Analytics
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  // Auto-expandir submenu da lojinha se estiver em uma rota da lojinha
  useEffect(() => {
    if (
      location.pathname.startsWith('/produtos-lojinha') ||
      location.pathname.startsWith('/personalizar-lojinha') ||
      location.pathname.startsWith('/pedidos-lojinha')
    ) {
      setStoreSubmenuOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem('luisices-sidebar-collapsed', String(next));
      return next;
    });
  };

  const getUserInitials = () => {
    if (!user?.displayName) return user?.email?.[0].toUpperCase() || 'U';
    const names = user.displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.displayName[0].toUpperCase();
  };

  const rawNavGroups = useMemo<NavGroup[]>(() => [
    {
      title: 'OPERAÇÃO DIÁRIA',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, check: (p) => p.dashboard },
        { name: 'Pedidos Arquivados', href: '/pedidos-arquivados', icon: Archive, check: (p) => canAccessArchivedOrders(p, 'view') },
        {
          name: 'Agenda Semanal',
          href: '/agenda',
          icon: Calendar,
          check: (p) => p.orders?.view,
          badge: todayDeliveriesCount,
          badgeVariant: 'amber',
          badgeTitle: 'para hoje',
        },
        {
          name: 'Atendimento WhatsApp',
          href: '/whatsapp',
          icon: MessageSquare,
          badge: unreadWhatsAppCount,
          badgeVariant: 'emerald',
          badgeTitle: 'não lidas',
          check: (p) => Boolean(p?.whatsapp),
        },
      ],
    },
    {
      title: 'VENDAS & CLIENTES',
      items: [
        { name: 'Clientes', href: '/clientes', icon: Users, check: (p) => p.customers?.view },
        { name: 'Orçamentos', href: '/orcamentos', icon: FileText, check: (p) => p.quotes?.view },
        { name: 'Permutas & Parcerias', href: '/permutas', icon: ArrowLeftRight, check: (p) => Boolean(p?.exchanges) },
        {
          name: 'Lojinha Online',
          icon: Store,
          check: (p) => Boolean(p?.store || p?.storeProducts?.view),
          children: [
            {
              name: 'Pedidos Recebidos',
              href: '/pedidos-lojinha',
              icon: ClipboardList,
              check: (p) => Boolean(p?.store || p?.storeProducts?.view || p?.orders?.view),
            },
            {
              name: 'Produtos da Lojinha',
              href: '/produtos-lojinha',
              icon: ShoppingBag,
              check: (p) => Boolean(p?.storeProducts?.view ?? p?.store ?? false),
            },
            {
              name: 'Aparência & Vitrine',
              href: '/personalizar-lojinha',
              icon: Palette,
              check: (p) => Boolean(p?.store),
            },
          ],
        },
      ],
    },
    {
      title: 'ATELIÊ & PRODUÇÃO',
      items: [
        { name: 'Produtos do Ateliê', href: '/produtos', icon: Package, check: (p) => p.products?.view },
        { name: 'Precificação & Custos', href: '/precificacao', icon: Coins, check: (p) => canAccessPricing(p, 'view') },
        { name: 'Galeria de Artes', href: '/galeria', icon: Images, check: (p) => p.gallery?.view },
      ],
    },
    {
      title: 'GESTÃO & AJUSTES',
      items: [
        { name: 'Relatórios', href: '/relatorios', icon: BarChart3, check: (p) => Boolean(p?.reports) },
        { name: 'Central de E-mails', href: '/emails', icon: Mail, check: (p) => canAccessEmails(p, 'view') },
        { name: 'Equipe & Usuários', href: '/usuarios', icon: UserCog, check: (p) => p.users?.view },
        { name: 'Configurações', href: '/configuracoes', icon: SettingsIcon, check: (p) => Boolean(p?.settings) || userProfile?.role === 'admin' },
      ],
    },
  ], [todayDeliveriesCount, unreadWhatsAppCount, userProfile?.role]);

  const filteredNavGroups = useMemo<NavGroup[]>(() => {
    if (!userProfile) return [];
    return rawNavGroups
      .map((group) => {
        const allowedItems = group.items
          .map((item) => {
            if (item.adminOnly && userProfile.role !== 'admin') return null;
            if (item.children) {
              const allowedChildren = item.children.filter((child) => {
                if (child.adminOnly && userProfile.role !== 'admin') return false;
                return child.check ? hasPermission(child.check) : true;
              });
              if (allowedChildren.length === 0) return null;
              return { ...item, children: allowedChildren };
            }
            if (item.check ? hasPermission(item.check) : true) return item;
            return null;
          })
          .filter(Boolean) as any[];

        if (allowedItems.length === 0) return null;
        return {
          title: group.title,
          items: allowedItems,
        };
      })
      .filter(Boolean) as NavGroup[];
  }, [userProfile, hasPermission, rawNavGroups]);

  const flatNavForMobile = useMemo<MobileNavItem[]>(() => {
    const list: MobileNavItem[] = [];
    filteredNavGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children) {
          item.children.forEach((c) => list.push(c));
        } else if (item.href) {
          list.push(item as MobileNavItem);
        }
      });
    });
    return list;
  }, [filteredNavGroups]);

  const mobilePrimaryNav = flatNavForMobile.slice(0, 4);
  const mobileMoreNav = flatNavForMobile.slice(4);

  const businessName = settings?.businessName || '';
  const isDevEnvironment = import.meta.env.VITE_FIREBASE_PROJECT_ID?.endsWith('-dev') ?? false;
  const appVersion = __APP_VERSION__ || '0.0.0';
  const isWhatsApp = location.pathname.startsWith('/whatsapp');

  return (
    <div
      className={cn(
        'w-full max-w-full overflow-x-clip bg-transparent flex flex-col',
        isWhatsApp ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
      )}
    >
      {/* Barra Lateral Desktop */}
      <SidebarNavigation
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        businessName={businessName}
        businessTagline={settings?.businessTagline}
        logo={settings?.logo}
        navGroups={filteredNavGroups}
        currentPath={location.pathname}
        storeSubmenuOpen={storeSubmenuOpen}
        onToggleStoreSubmenu={() => setStoreSubmenuOpen((prev) => !prev)}
      />

      {/* Cabeçalho Superior */}
      <header
        className={cn(
          'shrink-0 min-w-0 transition-[margin,width] duration-300',
          (settings?.headerSticky ?? true) ? 'sticky top-0 z-30' : 'relative z-20',
          settings?.headerStyle === 'solid'
            ? 'border-b border-border bg-card'
            : settings?.headerStyle === 'bordered'
            ? 'border-b border-border/80 bg-background/95'
            : 'border-b border-white/40 bg-card/85 backdrop-blur-2xl',
          sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-72 md:w-[calc(100%-18rem)]'
        )}
      >
        <TopHeader
          businessName={businessName}
          logo={settings?.logo}
          businessTagline={settings?.businessTagline}
          avatarUrl={settings?.avatar}
          userDisplayName={user?.displayName ?? undefined}
          userEmail={user?.email ?? undefined}
          userInitials={getUserInitials()}
          isDevEnvironment={isDevEnvironment}
          canQuickCreate={canQuickCreate}
          canCreateOrder={canCreateOrder}
          canCreateQuote={canCreateQuote}
          canCreateCustomer={canCreateCustomer}
          canAccessAiCopilot={canAccessAiCopilot}
          canAccessSettings={canAccessSettings}
          onOpenNewOrder={() => setIsNewOrderOpen(true)}
          onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
          onOpenAiCopilot={() => setAiCopilotOpen(true)}
          onOpenAbout={() => setAboutOpen(true)}
          onLogout={handleLogout}
          onOpenSearch={() => setGlobalSearchOpen(true)}
          headerLogoStyle={settings?.headerLogoStyle}
          headerShowTagline={settings?.headerShowTagline ?? true}
          headerShowQuickNew={settings?.headerShowQuickNew ?? true}
          headerShowAiCopilot={settings?.headerShowAiCopilot ?? true}
          headerShowCatalogLink={settings?.headerShowCatalogLink ?? true}
          headerShowQuickSearch={settings?.headerShowQuickSearch ?? true}
          headerShowHelpCenter={settings?.headerShowHelpCenter ?? true}
          headerStyle={settings?.headerStyle ?? 'blur'}
        />
      </header>

      {/* Conteúdo Principal */}
      <main
        className={cn(
          'min-w-0 w-full transition-[margin,width] duration-300',
          isWhatsApp
            ? 'flex-1 min-h-0 overflow-hidden flex flex-col p-0 pb-16 md:pb-0'
            : 'flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-8 md:pb-8',
          sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-72 md:w-[calc(100%-18rem)]'
        )}
      >
        <Outlet />
      </main>

      {/* Rodapé Desktop & Mobile */}
      {!isWhatsApp && (
        <Footer
          sidebarCollapsed={sidebarCollapsed}
          businessName={businessName}
          logo={settings?.logo}
          businessTagline={settings?.businessTagline}
          businessPhone={settings?.businessPhone}
          businessEmail={settings?.businessEmail}
          businessAddress={settings?.businessAddress}
          instagramUrl={settings?.instagramUrl}
          whatsappPhone={settings?.whatsappPhone}
          websiteUrl={settings?.websiteUrl}
          isDevEnvironment={isDevEnvironment}
          appVersion={appVersion}
          aboutOpen={aboutOpen}
          onAboutOpenChange={setAboutOpen}
          footerMode={settings?.footerMode ?? 'compact'}
          footerShowSocialLinks={settings?.footerShowSocialLinks ?? true}
          footerShowContactInfo={settings?.footerShowContactInfo ?? true}
          footerShowVersion={settings?.footerShowVersion ?? true}
          footerShowScrollToTop={settings?.footerShowScrollToTop ?? true}
        />
      )}

      {/* Navegação Inferior Mobile */}
      <MobileNavigation
        primaryNav={mobilePrimaryNav}
        moreNav={mobileMoreNav}
        currentPath={location.pathname}
        canAccessSettings={canAccessSettings}
      />

      {/* Dialog de Busca Global (Ctrl + K) */}
      <GlobalSearchDialog
        open={globalSearchOpen}
        onOpenChange={setGlobalSearchOpen}
        onOpenNewOrder={canCreateOrder ? () => setIsNewOrderOpen(true) : undefined}
        onOpenNewCustomer={canCreateCustomer ? () => setIsNewCustomerOpen(true) : undefined}
        onOpenAiCopilot={canAccessAiCopilot ? () => setAiCopilotOpen(true) : undefined}
      />

      {/* Modais Globais & Copiloto */}
      {canAccessAiCopilot && (
        <AiCopilotSheet
          open={aiCopilotOpen}
          onOpenChange={setAiCopilotOpen}
          onApplyOrderDraft={handleApplyAiOrderDraft}
        />
      )}
      <NewOrderDialog
        open={isNewOrderOpen || aiNewOrderModalOpen}
        onOpenChange={(open) => {
          setIsNewOrderOpen(open);
          setAiNewOrderModalOpen(open);
          if (!open) {
            setAiOrderDraft(null);
          }
        }}
        initialDraft={aiOrderDraft}
        hideTrigger={true}
      />
      <CustomerFormDialog
        open={isNewCustomerOpen}
        onOpenChange={setIsNewCustomerOpen}
        userId={user?.uid}
      />
    </div>
  );
}

export default Layout;
