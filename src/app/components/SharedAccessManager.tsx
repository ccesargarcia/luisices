import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';
import { firebaseSharedAccessService } from '../../services/firebaseSharedAccessService';
import type { SharedAccess, SharedResourceType } from '../types';
import { Users, Share2, X, Calendar, CheckCircle2, XCircle } from 'lucide-react';

const RESOURCE_LABELS: Record<SharedResourceType, string> = {
  orders: 'Pedidos',
  customers: 'Clientes',
  quotes: 'Orçamentos',
  products: 'Produtos',
  gallery: 'Galeria',
};

export function SharedAccessManager() {
  const [mySharedAccess, setMySharedAccess] = useState<SharedAccess[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewShareDialog, setShowNewShareDialog] = useState(false);
  const [newShareEmail, setNewShareEmail] = useState('');
  const [selectedResources, setSelectedResources] = useState<SharedResourceType[]>(['orders']);
  const [expirationDate, setExpirationDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSharedAccess();
  }, []);

  const loadSharedAccess = async () => {
    try {
      setLoading(true);
      const [myShares, sharesWithMe] = await Promise.all([
        firebaseSharedAccessService.getMySharedAccess(),
        firebaseSharedAccessService.getSharedWithMe(),
      ]);
      setMySharedAccess(myShares);
      setSharedWithMe(sharesWithMe);
    } catch (error) {
      console.error('Erro ao carregar compartilhamentos:', error);
      toast.error('Erro ao carregar compartilhamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    if (!newShareEmail.trim()) {
      toast.error('Digite um email válido');
      return;
    }

    if (selectedResources.length === 0) {
      toast.error('Selecione pelo menos um recurso para compartilhar');
      return;
    }

    try {
      setSubmitting(true);
      await firebaseSharedAccessService.shareAccess(
        newShareEmail,
        selectedResources,
        expirationDate || undefined
      );
      toast.success('Acesso compartilhado com sucesso!');
      setShowNewShareDialog(false);
      setNewShareEmail('');
      setSelectedResources(['orders']);
      setExpirationDate('');
      loadSharedAccess();
    } catch (error: any) {
      console.error('Erro ao compartilhar acesso:', error);
      toast.error(error.message || 'Erro ao compartilhar acesso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAccess = async (id: string, email: string) => {
    if (!confirm(`Deseja realmente revogar o acesso de ${email}?`)) return;

    try {
      await firebaseSharedAccessService.revokeSharedAccess(id);
      toast.success('Acesso revogado com sucesso');
      loadSharedAccess();
    } catch (error: any) {
      console.error('Erro ao revogar acesso:', error);
      toast.error(error.message || 'Erro ao revogar acesso');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await firebaseSharedAccessService.updateSharedAccess(id, {
        active: !currentActive,
      });
      toast.success(currentActive ? 'Acesso desativado' : 'Acesso ativado');
      loadSharedAccess();
    } catch (error: any) {
      console.error('Erro ao atualizar acesso:', error);
      toast.error(error.message || 'Erro ao atualizar acesso');
    }
  };

  const toggleResource = (resource: SharedResourceType) => {
    setSelectedResources(prev =>
      prev.includes(resource)
        ? prev.filter(r => r !== resource)
        : [...prev, resource]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Compartilhamento de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Meus Compartilhamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Acessos que Compartilhei
              </CardTitle>
              <CardDescription>
                Usuários que têm acesso aos seus dados
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewShareDialog(true)}>
              <Users className="w-4 h-4 mr-2" />
              Compartilhar Acesso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mySharedAccess.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Você ainda não compartilhou acesso com ninguém
            </p>
          ) : (
            <div className="space-y-3">
              {mySharedAccess.map(access => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium">{access.grantedToEmail}</p>
                      {access.active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Inativo
                        </Badge>
                      )}
                      {isExpired(access.expiresAt) && (
                        <Badge variant="destructive">Expirado</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {access.resources.map(resource => (
                        <Badge key={resource} variant="outline" className="text-xs">
                          {RESOURCE_LABELS[resource]}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Criado em {formatDate(access.createdAt)}</span>
                      {access.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expira em {formatDate(access.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(access.id, access.active)}
                    >
                      {access.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeAccess(access.id, access.grantedToEmail)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compartilhados Comigo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Acessos Compartilhados Comigo
          </CardTitle>
          <CardDescription>
            Dados de outros usuários que você pode visualizar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sharedWithMe.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ninguém compartilhou dados com você ainda
            </p>
          ) : (
            <div className="space-y-3">
              {sharedWithMe.map(access => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium">{access.ownerName}</p>
                      <Badge variant="outline" className="text-xs">
                        {access.ownerEmail}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {access.resources.map(resource => (
                        <Badge key={resource} variant="secondary" className="text-xs">
                          {RESOURCE_LABELS[resource]}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Compartilhado em {formatDate(access.createdAt)}</span>
                      {access.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Válido até {formatDate(access.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para novo compartilhamento */}
      <Dialog open={showNewShareDialog} onOpenChange={setShowNewShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Acesso</DialogTitle>
            <DialogDescription>
              Permita que outro usuário visualize seus dados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email do Usuário</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={newShareEmail}
                onChange={e => setNewShareEmail(e.target.value)}
              />
            </div>

            <div>
              <Label>Recursos Compartilhados</Label>
              <div className="space-y-2 mt-2">
                {(Object.keys(RESOURCE_LABELS) as SharedResourceType[]).map(resource => (
                  <div key={resource} className="flex items-center space-x-2">
                    <Checkbox
                      id={resource}
                      checked={selectedResources.includes(resource)}
                      onCheckedChange={() => toggleResource(resource)}
                    />
                    <Label
                      htmlFor={resource}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {RESOURCE_LABELS[resource]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="expiration">Data de Expiração (Opcional)</Label>
              <Input
                id="expiration"
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para acesso permanente
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewShareDialog(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateShare} disabled={submitting}>
              {submitting ? 'Compartilhando...' : 'Compartilhar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
