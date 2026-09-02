import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { SafeImg } from '../SafeMedia';
import { Camera, Loader2 } from 'lucide-react';
import { firebaseCustomerService } from '../../../services/firebaseCustomerService';
import { firebaseStorageService } from '../../../services/firebaseStorageService';
import { toast } from 'sonner';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  userId?: string;
  onSuccess?: () => void;
}

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Brasil',
  notes: '',
  birthday: '',
  status: '' as Customer['status'] | '',
  photoUrl: '',
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  userId,
  onSuccess,
}: CustomerFormDialogProps) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(customer);

  useEffect(() => {
    if (open) {
      if (customer) {
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          street: customer.street || '',
          city: customer.city || '',
          state: customer.state || '',
          zipCode: customer.zipCode || '',
          country: customer.country || 'Brasil',
          notes: customer.notes || '',
          birthday: customer.birthday || '',
          status: customer.status || '',
          photoUrl: customer.photoUrl || '',
        });
        setPhotoPreview(customer.photoUrl || '');
      } else {
        setFormData(INITIAL_FORM);
        setPhotoPreview('');
      }
      setPendingPhotoFile(null);
    }
  }, [open, customer]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview && !photoPreview.startsWith('http')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPendingPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    try {
      if (isEditing && customer) {
        // Verificar duplicata se o telefone mudou
        if (formData.phone !== customer.phone) {
          const existingWithPhone = await firebaseCustomerService.findCustomerByPhone(userId, formData.phone);
          if (existingWithPhone && existingWithPhone.id !== customer.id) {
            toast.error(`Telefone já cadastrado para o cliente "${existingWithPhone.name}". Utilize um número diferente.`);
            setLoading(false);
            return;
          }
        }

        let photoUrl = formData.photoUrl || undefined;
        if (pendingPhotoFile) {
          try {
            photoUrl = await firebaseStorageService.uploadCustomerPhoto(pendingPhotoFile, userId, customer.id);
          } catch (photoErr) {
            console.error('Erro ao enviar foto:', photoErr);
          }
        }

        await firebaseCustomerService.updateCustomer(customer.id, {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          street: formData.street || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
          country: formData.country || undefined,
          notes: formData.notes || undefined,
          birthday: formData.birthday || undefined,
          status: formData.status || undefined,
          photoUrl,
        });

        toast.success('Cliente atualizado com sucesso');
      } else {
        const customerId = await firebaseCustomerService.createCustomer(userId, {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          street: formData.street || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
          country: formData.country || undefined,
          notes: formData.notes || undefined,
          birthday: formData.birthday || undefined,
          status: formData.status || undefined,
        });

        if (pendingPhotoFile) {
          try {
            const photoUrl = await firebaseStorageService.uploadCustomerPhoto(pendingPhotoFile, userId, customerId);
            await firebaseCustomerService.updateCustomer(customerId, { photoUrl });
          } catch (photoErr) {
            console.error('Erro ao enviar foto:', photoErr);
          }
        }

        toast.success('Cliente criado com sucesso');
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      if (error?.message?.startsWith('DUPLICATE_PHONE:')) {
        const existingName = error.message.slice('DUPLICATE_PHONE:'.length);
        toast.error(`Telefone já cadastrado para o cliente "${existingName}". O telefone é a chave única de cada cliente.`);
      } else {
        toast.error(isEditing ? 'Erro ao editar cliente' : 'Erro ao criar cliente');
      }
      if (!isEditing) onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do cliente'
              : 'Preencha os dados para cadastrar um novo cliente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto */}
          <div className="flex justify-center">
            <label className="cursor-pointer group relative">
              <input type="file" className="sr-only" accept="image/*" onChange={handlePhotoSelect} />
              <div className="size-24 rounded-full border-2 border-dashed border-muted-foreground/40 group-hover:border-primary overflow-hidden flex items-center justify-center bg-muted transition-colors">
                {photoPreview ? (
                  <SafeImg src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full size-7 flex items-center justify-center shadow">
                <Camera className="size-3.5" />
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-form-name">Nome *</Label>
            <Input
              data-testid="customer-name"
              id="customer-form-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-form-phone">Telefone *</Label>
            <Input
              data-testid="customer-phone"
              id="customer-form-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
              required
              placeholder="(00) 00000-0000"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-form-email">Email</Label>
            <Input
              data-testid="customer-email"
              id="customer-form-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
              autoComplete="email"
            />
          </div>

          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-3">Endereço</p>
            <div className="space-y-3">
              <Input
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Rua, número, complemento"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Cidade"
                />
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Estado (SP, RJ...)"
                  maxLength={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      zipCode: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9),
                    })
                  }
                  placeholder="CEP (00000-000)"
                  inputMode="numeric"
                />
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="País"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-form-notes">Observações</Label>
            <Textarea
              id="customer-form-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas sobre o cliente..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-form-birthday">Aniversário</Label>
              <Input
                id="customer-form-birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-form-status">Status</Label>
              <Select
                value={formData.status || 'active'}
                onValueChange={(v) => setFormData({ ...formData, status: v as Customer['status'] })}
              >
                <SelectTrigger id="customer-form-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                  <SelectItem value="defaulter">Inadimplente</SelectItem>
                  <SelectItem value="partner">Parceiro / Permuta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              data-testid="save-customer-button"
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
