import { useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, Users, Package2, LogOut, Settings as SettingsIcon, BarChart3, FileText, ShoppingBag, Images, AtSign, Globe, Phone, Mail, MapPin, MessageCircle, ArrowLeftRight } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { applyColorTheme } from '../utils/colorThemes';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ThemeToggle } from '../../components/ThemeToggle';
import { NotificationBell } from '../components/NotificationBell';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useUserSettings();

  // Apply color theme CSS vars whenever settings change
  useEffect(() => {
    applyColorTheme(settings?.colorTheme ?? 'default', settings?.customColorHex);
  }, [settings?.colorTheme, settings?.customColorHex]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  const getUserInitials = () => {
    if (!user?.displayName) return user?.email?.[0].toUpperCase() || 'U';
    const names = user.displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.displayName[0].toUpperCase();
  };

  const navigation = [
    { name: 'Dashboard',       href: '/',           icon: LayoutDashboard },
    { name: 'Agenda Semanal', href: '/agenda',       icon: Calendar },
    { name: 'Clientes',       href: '/clientes',     icon: Users },
    { name: 'Relatórios',     href: '/relatorios',   icon: BarChart3 },
    { name: 'Orçamentos',     href: '/orcamentos',   icon: FileText },
    { name: 'Produtos',       href: '/produtos',     icon: ShoppingBag },
    { name: 'Galeria',        href: '/galeria',      icon: Images },
    { name: 'Permutas',       href: '/permutas',     icon: ArrowLeftRight },
  ];

  const orderedNav = useMemo(() => {
    const order = settings?.navOrder;
    if (!order || order.length === 0) return navigation;
    return [...navigation].sort((a, b) => {
      const ai = order.indexOf(a.href);
      const bi = order.indexOf(b.href);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [settings?.navOrder]);

  const businessName = settings?.businessName || 'Papelaria Personalizada';
  const hasLogo = !!settings?.logo;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {hasLogo ? (
                <img
                  src={settings.logo}
                  alt={businessName}
                  className="h-9 object-contain flex-shrink-0"
                />
              ) : (
                <div className="flex items-center justify-center size-9 bg-primary text-primary-foreground rounded-lg flex-shrink-0">
                  <Package2 className="size-5" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-bold text-base sm:text-xl truncate">{businessName}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {settings?.businessTagline || 'Sistema de Gestão de Pedidos'}
                  </p>
                  {settings?.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Instagram"
                      className="text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                    >
                      <AtSign className="size-3" />
                    </a>
                  )}
                  {settings?.websiteUrl && (
                    <a
                      href={settings.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Site"
                      className="text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                    >
                      <Globe className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={settings?.avatar} alt="Avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.displayName || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="cursor-pointer">
                  <SettingsIcon className="size-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="size-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b bg-card sticky top-0 z-10 hidden sm:block">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex overflow-x-auto scrollbar-none">
            {orderedNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )}
                >
                  <item.icon className="size-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex-1 pb-24 sm:pb-8">
        <Outlet />
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Identidade */}
            <div className="flex items-center gap-3 min-w-0">
              {settings?.logo ? (
                <img src={settings.logo} alt={businessName} className="h-8 object-contain flex-shrink-0 opacity-80" />
              ) : (
                <div className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md flex-shrink-0">
                  <Package2 className="size-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{businessName}</p>
                {settings?.businessTagline && (
                  <p className="text-xs text-muted-foreground truncate">{settings.businessTagline}</p>
                )}
              </div>
            </div>

            {/* Informações de contato */}
            {(settings?.businessPhone || settings?.businessEmail || settings?.businessAddress) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {settings.businessPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" />
                    {settings.businessPhone}
                  </span>
                )}
                {settings.businessEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" />
                    {settings.businessEmail}
                  </span>
                )}
                {settings.businessAddress && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {settings.businessAddress}
                  </span>
                )}
              </div>
            )}

            {/* Links sociais + copyright */}
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div className="flex items-center gap-2">
                {settings?.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram"
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <AtSign className="size-3.5" />
                  </a>
                )}
                {settings?.whatsappPhone && (
                  <a
                    href={`https://wa.me/${settings.whatsappPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <MessageCircle className="size-3.5" />
                  </a>
                )}
                {settings?.businessEmail && (
                  <a
                    href={`mailto:${settings.businessEmail}`}
                    title={settings.businessEmail}
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <Mail className="size-3.5" />
                  </a>
                )}
                {settings?.websiteUrl && (
                  <a
                    href={settings.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Site"
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    <Globe className="size-3.5" />
                  </a>
                )}
              </div>
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} {businessName}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Navegação inferior — somente mobile */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t flex">
        {orderedNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-0',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="truncate w-full text-center px-0.5 leading-tight">
                {item.name.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
