import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ShieldCheck, Check, Lock } from 'lucide-react';
import { UserProfile } from '../../types';

interface PermissionsSectionProps {
  userProfile: UserProfile | null;
  isAdmin: boolean;
}

export function PermissionsSection({ userProfile, isAdmin }: PermissionsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          Permissões da conta
        </CardTitle>
        <CardDescription>Acesso e permissões atribuídos ao seu perfil</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!userProfile ? (
          <p className="text-muted-foreground text-sm">Carregando perfil...</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-sm">
                {isAdmin ? (
                  <>
                    <ShieldCheck className="size-3.5 mr-1" /> Admin
                  </>
                ) : (
                  <>Usuário</>
                )}
              </Badge>
              {userProfile.active ? (
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-600 border-green-400 text-xs"
                >
                  ✓ Ativo
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Inativo
                </Badge>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">Módulos permitidos:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {userProfile.permissions.dashboard && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Dashboard
                  </div>
                )}
                {userProfile.permissions.orders?.view && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Pedidos
                  </div>
                )}
                {userProfile.permissions.customers?.view && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Clientes
                  </div>
                )}
                {userProfile.permissions.products?.view && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Produtos
                  </div>
                )}
                {userProfile.permissions.quotes?.view && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Orçamentos
                  </div>
                )}
                {userProfile.permissions.gallery?.view && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Galeria
                  </div>
                )}
                {userProfile.permissions.reports && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Relatórios
                  </div>
                )}
                {userProfile.permissions.exchanges && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Permutas
                  </div>
                )}
                {userProfile.permissions.settings && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Configurações
                  </div>
                )}
                {userProfile.permissions.users?.view && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-green-600" /> Usuários
                  </div>
                )}
              </div>

              {!isAdmin && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Lock className="size-3" />
                    Módulos bloqueados não aparecem no menu de navegação
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
