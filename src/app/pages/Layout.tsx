import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, Package2, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
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

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useUserSettings();

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
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Agenda Semanal',
      href: '/agenda',
      icon: Calendar,
    },
  ];

  const businessName = settings?.businessName || 'Papelaria Personalizada';
  const hasLogo = !!settings?.logo;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasLogo ? (
                <img 
                  src={settings.logo} 
                  alt={businessName}
                  className="h-10 object-contain"
                />
              ) : (
                <div className="flex items-center justify-center size-10 bg-primary text-primary-foreground rounded-lg">
                  <Package2 className="size-6" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-xl">{businessName}</h1>
                <p className="text-sm text-muted-foreground">Sistema de Gestão de Pedidos</p>
              </div>
            </div>

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
      </header>

      <nav className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )}
                >
                  <item.icon className="size-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
