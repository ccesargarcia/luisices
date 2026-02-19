import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Loader2, UserPlus, Trash2 } from 'lucide-react';
import { OrderStatus, PaymentStatus, PaymentMethod, Customer, Tag } from '../types';
import { TagInput } from './TagInput';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useAuth } from '../../contexts/AuthContext';

interface ProductItem {
  name: string;
  quantity: string;
  unitPrice: string;
}

export function NewOrderDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryDate: '',
    notes: '',
    status: 'pending' as OrderStatus,
    paymentStatus: 'pending' as PaymentStatus,
    paymentMethod: '' as PaymentMethod | '',
    paidAmount: '',
  });
  const [products, setProducts] = useState<ProductItem[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [tags, setTags] = useState<Tag[]>([]);

  const totalPrice = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = parseFloat(p.quantity) || 0;
      const unit = parseFloat(p.unitPrice) || 0;
      return sum + qty * unit;
    }, 0);
  }, [products]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Carregar clientes
  useEffect(() => {
    if (open && user) {
      firebaseCustomerService.getCustomers(user.uid).then(setCustomers);
    }
  }, [open, user]);

  // Preencher dados do cliente selecionado
  useEffect(() => {
    if (selectedCustomer && selectedCustomer !== 'new') {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (customer) {
        setFormData(prev => ({
          ...prev,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email || '',
        }));
        setIsNewCustomer(false);
      }
    } else if (selectedCustomer === 'new') {
      setIsNewCustomer(true);
      setFormData(prev => ({
        ...prev,
        customerName: '',
        customerPhone: '',
        customerEmail: '',
      }));
    }
  }, [selectedCustomer, customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);

    try {
      let customerId = selectedCustomer !== 'new' ? selectedCustomer : undefined;

      // Criar novo cliente se necessário
      if (isNewCustomer || selectedCustomer === 'new') {
        customerId = await firebaseCustomerService.createCustomer(user.uid, {
          name: formData.customerName,
          phone: formData.customerPhone,
          email: formData.customerEmail || undefined,
        });
      }

      const totalAmount = totalPrice;
      const paidAmount = formData.paidAmount ? parseFloat(formData.paidAmount) : 0;

      const productName = products
        .filter(p => p.name.trim())
        .map(p => parseInt(p.quantity) > 1 ? `${p.name.trim()} (${p.quantity}x)` : p.name.trim())
        .join(', ');
      const totalQuantity = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

      // Criar pedido
      await firebaseOrderService.createOrder({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        productName,
        quantity: totalQuantity,
        price: totalAmount,
        status: formData.status,
        deliveryDate: formData.deliveryDate,
        notes: formData.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
        customerId,
        payment: {
          status: formData.paymentStatus,
          method: formData.paymentMethod || undefined,
          totalAmount,
          paidAmount,
          remainingAmount: totalAmount - paidAmount,
        },
      });

      // Atualizar estatísticas do cliente se pago parcialmente ou totalmente
      if (customerId && paidAmount > 0) {
        await firebaseCustomerService.incrementCustomerStats(customerId, paidAmount);
      }

      setOpen(false);
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        deliveryDate: '',
        notes: '',
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: '',
        paidAmount: '',
      });
      setProducts([{ name: '', quantity: '1', unitPrice: '' }]);
      setTags([]);
      setSelectedCustomer('');
      setIsNewCustomer(false);
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      alert('Erro ao criar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          Novo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Pedido</DialogTitle>
          <div className="sr-only">Formulário para criar um novo pedido</div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção de Cliente */}
          <div className="space-y-2">
            <Label htmlFor="customer">Cliente *</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Selecione um cliente ou crie novo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4" />
                    Novo Cliente
                  </div>
                </SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dados do Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nome do Cliente *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                disabled={selectedCustomer !== 'new' && selectedCustomer !== ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Telefone *</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="(11) 98765-4321"
                disabled={selectedCustomer !== 'new' && selectedCustomer !== ''}
                required
              />
            </div>
          </div>

          {(isNewCustomer || selectedCustomer === 'new') && (
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email (opcional)</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="cliente@email.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produtos *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={() => setProducts(prev => [...prev, { name: '', quantity: '1', unitPrice: '' }])}
              >
                <Plus className="size-3" /> Adicionar item
              </Button>
            </div>
            {/* header das colunas */}
            <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 px-1">
              <span className="text-xs text-muted-foreground">Produto</span>
              <span className="text-xs text-muted-foreground text-center">Qtd</span>
              <span className="text-xs text-muted-foreground text-right">Valor unit.</span>
              <span />
            </div>
            <div className="space-y-2">
              {products.map((item, idx) => {
                const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="grid grid-cols-[1fr_56px_96px_36px] gap-2 items-center">
                      <Input
                        placeholder={`Produto ${idx + 1}`}
                        value={item.name}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                        required={idx === 0}
                      />
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, quantity: e.target.value } : p))}
                        className="text-center px-1"
                        required={idx === 0}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={item.unitPrice}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, unitPrice: e.target.value } : p))}
                        className="text-right px-2"
                        required={idx === 0}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setProducts(prev => prev.filter((_, i) => i !== idx))}
                        disabled={products.length === 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    {sub > 0 && (
                      <p className="text-xs text-muted-foreground text-right pr-10">
                        subtotal: {formatCurrency(sub)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {totalPrice > 0 && (
              <div className="flex justify-end border-t pt-2">
                <span className="text-sm font-semibold">Total: {formatCurrency(totalPrice)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: OrderStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in-progress">Em Produção</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Data de Entrega *</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalhes adicionais sobre o pedido..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Adicione tags para categorizar o pedido..."
            />
          </div>

          {/* Informações de Pagamento */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-sm">Informações de Pagamento</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Status de Pagamento *</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value: PaymentStatus) => setFormData({ ...formData, paymentStatus: value })}
                >
                  <SelectTrigger id="paymentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value: PaymentMethod) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit">Cartão de Débito</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.paymentStatus !== 'pending' && (
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Valor Pago (R$)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={totalPrice || undefined}
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                  placeholder={totalPrice > 0 ? `Máximo: ${formatCurrency(totalPrice)}` : 'Informe o valor pago'}
                />
                {formData.paidAmount && totalPrice > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Restante: {formatCurrency(totalPrice - parseFloat(formData.paidAmount))}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              Adicionar Pedido
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}