import { useState, useMemo, useEffect, useRef } from 'react';
import { formatDate } from '../utils/date';
import { formatCurrency } from '../utils/currency';
import { exportCustomersToExcel } from '../utils/exportData';
import { Customer, Order, GalleryItem, Tag } from '../types';
import { SafeImg } from '../components/SafeMedia';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Search,
  Plus,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  DollarSign,
  Calendar,
  Trash2,
  Edit,
  Loader2,
  History,
  Cake,
  Star,
  AlertTriangle,
  Camera,
  Images,
  Upload,
  X,
  ZoomIn,
  Download,
} from 'lucide-react';
import { firebaseStorageService } from '../../services/firebaseStorageService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseGalleryService } from '../../services/firebaseGalleryService';
import { useAuth } from '../../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { TagInput } from '../components/TagInput';
import { toast } from 'sonner';

const PAGE_SIZE = 12;

export function Customers() {
  const { user, hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeOrdersForDelete, setActiveOrdersForDelete] = useState(0);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [formLoading, setFormLoading] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [customerGallery, setCustomerGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryUploadOpen, setGalleryUploadOpen] = useState(false);
  const [galleryUploadFile, setGalleryUploadFile] = useState<File | null>(null);
  const [galleryUploadPreview, setGalleryUploadPreview] = useState<string | null>(null);
  const [galleryUploadTitle, setGalleryUploadTitle] = useState('');
  const [galleryUploadDesc, setGalleryUploadDesc] = useState('');
  const [galleryUploadTags, setGalleryUploadTags] = useState<Tag[]>([]);
  const [galleryUploadSaving, setGalleryUploadSaving] = useState(false);
  const [galleryLightbox, setGalleryLightbox] = useState<GalleryItem | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
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
  });

  // Carregar clientes
  useEffect(() => {
    loadCustomers();
  }, [user]);

  const loadCustomers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await firebaseCustomerService.getCustomers(user.uid);
      setCustomers(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Resetar página ao filtrar
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const pagedCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Estatísticas
  const stats = useMemo(() => {
    const total = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
    const averagePerCustomer = total > 0 ? totalRevenue / total : 0;

    return { total, totalRevenue, totalOrders, averagePerCustomer };
  }, [customers]);

  // Top clientes
  const topCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5);
  }, [customers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFormLoading(true);
    try {
      const customerId = await firebaseCustomerService.createCustomer(user.uid, {
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
          const photoUrl = await firebaseStorageService.uploadCustomerPhoto(pendingPhotoFile, user.uid, customerId);
          await firebaseCustomerService.updateCustomer(customerId, { photoUrl });
        } catch (photoErr) {
          console.error('Erro ao enviar foto:', photoErr);
        }
      }

      await loadCustomers();
      setIsNewCustomerOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      if (error?.message?.startsWith('DUPLICATE_PHONE:')) {
        const existingName = error.message.slice('DUPLICATE_PHONE:'.length);
        toast.error(`Telefone já cadastrado para o cliente "${existingName}". O telefone é a chave única de cada cliente.`);
      } else {
        toast.error('Erro ao criar cliente');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setFormLoading(true);
    try {
      // Verificar duplicata de telefone ao editar (se o telefone mudou)
      if (user && formData.phone !== selectedCustomer.phone) {
        const existingWithPhone = await firebaseCustomerService.findCustomerByPhone(user.uid, formData.phone);
        if (existingWithPhone && existingWithPhone.id !== selectedCustomer.id) {
          toast.error(`Telefone já cadastrado para o cliente "${existingWithPhone.name}". Utilize um número diferente.`);
          setFormLoading(false);
          return;
        }
      }

      let photoUrl = formData.photoUrl || undefined;

      if (pendingPhotoFile && user) {
        try {
          photoUrl = await firebaseStorageService.uploadCustomerPhoto(pendingPhotoFile, user.uid, selectedCustomer.id);
        } catch (photoErr) {
          console.error('Erro ao enviar foto:', photoErr);
        }
      }

      await firebaseCustomerService.updateCustomer(selectedCustomer.id, {
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

      await loadCustomers();
      setIsEditOpen(false);
      setSelectedCustomer(null);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao editar cliente:', error);
      if (error?.message?.startsWith('DUPLICATE_PHONE:')) {
        const existingName = error.message.split(':')[1];
        toast.error(`Telefone já cadastrado para o cliente "${existingName}". Utilize um número diferente.`);
      } else {
        toast.error('Erro ao editar cliente');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    setFormLoading(true);
    try {
      await firebaseCustomerService.deleteCustomer(selectedCustomer.id);
      await loadCustomers();
      setIsDeleteOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      toast.error('Erro ao deletar cliente');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPendingPhotoFile(null);
    setPhotoPreview(customer.photoUrl || '');
    setFormData({
      name: customer.name,
      phone: customer.phone,
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
    setIsEditOpen(true);
  };

  const openDeleteDialog = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveOrdersForDelete(0);
    setIsDeleteOpen(true);
    try {
      const count = await firebaseOrderService.getActiveOrdersByCustomer(customer.id);
      setActiveOrdersForDelete(count);
    } catch {
      // se falhar a contagem, deixa deletar mesmo assim
    }
  };

  const openHistoryDialog = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setGalleryLoading(true);
    setCustomerOrders([]);
    setCustomerGallery([]);
    try {
      const [allOrders, galleryItems] = await Promise.all([
        firebaseOrderService.getOrders(),
        user ? firebaseGalleryService.getItems(user.uid) : Promise.resolve([]),
      ]);
      setCustomerOrders(
        allOrders.filter(o => o.customerId === customer.id || o.customerName === customer.name)
      );
      setCustomerGallery(galleryItems.filter(g => g.customerId === customer.id));
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setHistoryLoading(false);
      setGalleryLoading(false);
    }
  };

  const handleGalleryFilePick = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (f.size > 15 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo: 15MB'); return; }
    setGalleryUploadFile(f);
    setGalleryUploadPreview(URL.createObjectURL(f));
    if (!galleryUploadTitle) setGalleryUploadTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleGalleryUploadSave = async () => {
    if (!galleryUploadFile || !historyCustomer || !user) return;
    if (!galleryUploadTitle.trim()) { toast.error('Título é obrigatório'); return; }
    setGalleryUploadSaving(true);
    try {
      const tempId = `${Date.now()}`;
      const imageUrl = await firebaseGalleryService.uploadImage(galleryUploadFile, user.uid, tempId);
      const item = await firebaseGalleryService.createItem(user.uid, {
        title: galleryUploadTitle.trim(),
        description: galleryUploadDesc.trim() || undefined,
        imageUrl,
        customerId: historyCustomer.id,
        customerName: historyCustomer.name,
        tags: galleryUploadTags,
      });
      setCustomerGallery(prev => [item, ...prev]);
      toast.success('Arte adicionada à galeria');
      setGalleryUploadOpen(false);
      setGalleryUploadFile(null);
      setGalleryUploadPreview(null);
      setGalleryUploadTitle('');
      setGalleryUploadDesc('');
      setGalleryUploadTags([]);
    } catch (err) {
      toast.error('Erro ao salvar arte');
      console.error(err);
    } finally {
      setGalleryUploadSaving(false);
    }
  };

  const handleGalleryDelete = async (item: GalleryItem) => {
    try {
      await firebaseGalleryService.deleteItem(item.id);
      setCustomerGallery(prev => prev.filter(g => g.id !== item.id));
      setGalleryLightbox(null);
      toast.success('Arte removida');
    } catch {
      toast.error('Erro ao remover arte');
    }
  };

  const resetForm = () => {
    setFormData({
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
      status: '',
      photoUrl: '',
    });
    setPendingPhotoFile(null);
    if (photoPreview && !photoPreview.startsWith('http')) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview && !photoPreview.startsWith('http')) URL.revokeObjectURL(photoPreview);
    setPendingPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não for número
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => exportCustomersToExcel(filteredCustomers)}
            disabled={filteredCustomers.length === 0}
            className="gap-2"
          >
            <Download className="size-4" />
            Exportar Excel
          </Button>
          {hasPermission(p => p.customers?.create ?? false) && (
            <Dialog open={isNewCustomerOpen} onOpenChange={(open) => { setIsNewCustomerOpen(open); if (open) { resetForm(); setPendingPhotoFile(null); setPhotoPreview(''); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="size-4" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Cliente</DialogTitle>
                  <DialogDescription>
                    Preencha os dados para cadastrar um novo cliente
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCustomer} className="space-y-4">
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
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  required
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
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
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9) })}
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
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas sobre o cliente..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday">Aniversário</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={e => setFormData({ ...formData, birthday: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || 'active'}
                    onValueChange={v => setFormData({ ...formData, status: v as Customer['status'] })}
                  >
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
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
                <Button type="button" variant="outline" onClick={() => setIsNewCustomerOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Criar Cliente
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <UserPlus className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingBag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averagePerCustomer)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pagedCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center border">
                    {customer.photoUrl ? (
                      <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-semibold text-muted-foreground">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                    {customer.status === 'vip' && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border gap-1 py-0">
                        <Star className="size-3 fill-yellow-500 text-yellow-500" /> VIP
                      </Badge>
                    )}
                    {customer.status === 'recurring' && (
                      <Badge variant="outline" className="text-blue-700 border-blue-300 py-0">Recorrente</Badge>
                    )}
                    {customer.status === 'defaulter' && (
                      <Badge variant="outline" className="text-red-700 border-red-300 py-0">Inadimplente</Badge>
                    )}
                    {customer.status === 'partner' && (
                      <Badge variant="outline" className="text-purple-700 border-purple-300 py-0 gap-1">
                        🤝 Parceiro
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3" />
                    {customer.phone}
                  </div>
                </div>                </div>                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openHistoryDialog(customer)}
                    title="Ver histórico de pedidos"
                  >
                    <History className="size-4" />
                  </Button>
                  {hasPermission(p => p.customers?.edit ?? false) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(customer)}
                    >
                      <Edit className="size-4" />
                    </Button>
                  )}
                  {hasPermission(p => p.customers?.delete ?? false) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openDeleteDialog(customer)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-3 text-muted-foreground" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="size-3 text-muted-foreground" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}
              {(customer.city || customer.state) && !customer.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="size-3 text-muted-foreground" />
                  <span className="truncate">{[customer.city, customer.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-1 text-sm">
                  <ShoppingBag className="size-3" />
                  <span>{customer.totalOrders || 0} pedidos</span>
                </div>
                <div className="font-semibold text-sm">
                  {formatCurrency(customer.totalSpent || 0)}
                </div>
              </div>
              {customer.lastOrderDate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3" />
                  Último pedido: {formatDate(customer.lastOrderDate)}
                </div>
              )}
              {customer.birthday && (() => {
                const [, mm, dd] = customer.birthday!.split('-').map(Number);
                const today = new Date();
                const next = new Date(today.getFullYear(), mm - 1, dd);
                if (next < today) next.setFullYear(today.getFullYear() + 1);
                const days = Math.round((next.getTime() - today.setHours(0,0,0,0)) / 86400000);
                return (
                  <div className={`flex items-center gap-2 text-xs ${
                    days === 0 ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'
                  }`}>
                    <Cake className="size-3" />
                    {days === 0 ? '🎂 Aniversário hoje!' : days <= 7 ? `Aniversário em ${days}d — ${dd.toString().padStart(2,'0')}/${mm.toString().padStart(2,'0')}` : `Aniversário: ${dd.toString().padStart(2,'0')}/${mm.toString().padStart(2,'0')}`}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} —
            página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="size-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Tente uma busca diferente'
                : 'Comece adicionando seu primeiro cliente'}
            </p>
            {!searchQuery && hasPermission(p => p.customers?.create ?? false) && (
              <Button onClick={() => setIsNewCustomerOpen(true)}>
                <UserPlus className="size-4 mr-2" />
                Adicionar Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{historyCustomer?.name}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="pedidos" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full">
              <TabsTrigger value="pedidos" className="flex-1 gap-1.5">
                <ShoppingBag className="size-3.5" /> Pedidos
                {!historyLoading && <span className="text-xs opacity-60">({customerOrders.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="galeria" className="flex-1 gap-1.5">
                <Images className="size-3.5" /> Galeria
                {!galleryLoading && <span className="text-xs opacity-60">({customerGallery.length})</span>}
              </TabsTrigger>
            </TabsList>

            {/* ── Pedidos ── */}
            <TabsContent value="pedidos" className="flex-1 overflow-y-auto mt-3">
              {historyLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-primary" /></div>
              ) : customerOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum pedido encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {customerOrders
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(order => (
                      <div key={order.id} className="flex items-start justify-between border rounded-md px-3 py-2 gap-3">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{order.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            Criado: {formatDate(order.createdAt)} · Entrega: {formatDate(order.deliveryDate)}
                          </div>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <div className="font-semibold text-sm">{formatCurrency(order.price)}</div>
                          <Badge
                            variant="outline"
                            className={{
                              pending: 'border-yellow-300 text-yellow-700 bg-yellow-50',
                              'in-progress': 'border-blue-300 text-blue-700 bg-blue-50',
                              completed: 'border-green-300 text-green-700 bg-green-50',
                              cancelled: 'border-red-300 text-red-700 bg-red-50',
                            }[order.status]}
                          >
                            {{
                              pending: 'Pendente',
                              'in-progress': 'Em Produção',
                              completed: 'Concluído',
                              cancelled: 'Cancelado',
                            }[order.status]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* ── Galeria ── */}
            <TabsContent value="galeria" className="flex-1 overflow-y-auto mt-3">
              <div className="flex justify-end mb-3">
                <Button size="sm" className="gap-1.5" onClick={() => setGalleryUploadOpen(true)}>
                  <Plus className="size-3.5" /> Nova Arte
                </Button>
              </div>
              {galleryLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
                </div>
              ) : customerGallery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Images className="size-10 opacity-30" />
                  <p className="text-sm">Nenhuma arte ainda</p>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setGalleryUploadOpen(true)}>
                    <Upload className="size-3.5" /> Adicionar arte
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {customerGallery.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setGalleryLightbox(item)}
                      className="group relative aspect-square rounded-md overflow-hidden border bg-muted"
                    >
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.title}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Gallery upload dialog */}
      <Dialog open={galleryUploadOpen} onOpenChange={v => { if (!v) { setGalleryUploadOpen(false); setGalleryUploadFile(null); setGalleryUploadPreview(null); setGalleryUploadTitle(''); setGalleryUploadDesc(''); setGalleryUploadTags([]); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Arte — {historyCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleGalleryFilePick(f); }} />
            <div
              className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors ${galleryUploadPreview ? 'p-1' : 'p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/60'}`}
              onClick={() => galleryInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleGalleryFilePick(f); }}
            >
              {galleryUploadPreview ? (
                <>
                  <img src={galleryUploadPreview} alt="preview" className="w-full max-h-56 object-contain rounded" />
                  <button type="button" className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white" onClick={e => { e.stopPropagation(); setGalleryUploadFile(null); setGalleryUploadPreview(null); }}>
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="size-7 opacity-50" />
                  <span className="text-sm font-medium">Clique ou arraste uma imagem</span>
                  <span className="text-xs">PNG, JPG, WEBP — até 15MB</span>
                </>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="gu-title">Título <span className="text-destructive">*</span></Label>
              <Input id="gu-title" value={galleryUploadTitle} onChange={e => setGalleryUploadTitle(e.target.value)} placeholder="Nome da arte" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gu-desc">Descrição</Label>
              <Textarea id="gu-desc" value={galleryUploadDesc} onChange={e => setGalleryUploadDesc(e.target.value)} placeholder="Notas sobre a arte..." rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Tags</Label>
              <TagInput tags={galleryUploadTags} onChange={setGalleryUploadTags} placeholder="Adicionar tag..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGalleryUploadOpen(false)} disabled={galleryUploadSaving}>Cancelar</Button>
            <Button onClick={handleGalleryUploadSave} disabled={galleryUploadSaving || !galleryUploadFile}>
              {galleryUploadSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gallery lightbox */}
      {galleryLightbox && (
        <Dialog open onOpenChange={() => setGalleryLightbox(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <DialogTitle className="text-sm font-semibold truncate flex-1">{galleryLightbox.title}</DialogTitle>
              <div className="flex gap-1 ml-2">
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleGalleryDelete(galleryLightbox)}>
                  <Trash2 className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setGalleryLightbox(null)}><X className="size-4" /></Button>
              </div>
            </div>
            <div className="bg-black/90 flex items-center justify-center min-h-48 max-h-[70vh]">
              <img src={galleryLightbox.imageUrl} alt={galleryLightbox.title} className="max-w-full max-h-[70vh] object-contain" />
            </div>
            {galleryLightbox.description && (
              <p className="px-4 py-2 text-sm text-muted-foreground">{galleryLightbox.description}</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCustomer} className="space-y-4">
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
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                required
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9) })}
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
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-birthday">Aniversário</Label>
                <Input
                  id="edit-birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={e => setFormData({ ...formData, birthday: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={v => setFormData({ ...formData, status: v as Customer['status'] })}
                >
                  <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
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
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeOrdersForDelete > 0 ? 'Não é possível excluir' : 'Confirmar exclusão'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              {activeOrdersForDelete > 0 ? (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="size-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>
                    O cliente <strong>{selectedCustomer?.name}</strong> possui{' '}
                    <strong>{activeOrdersForDelete} pedido{activeOrdersForDelete > 1 ? 's' : ''} ativo{activeOrdersForDelete > 1 ? 's' : ''}</strong>{' '}
                    (pendente ou em produção). Conclua ou cancele esses pedidos antes de excluir o cliente.
                  </span>
                </div>
              ) : (
                <span>
                  Tem certeza que deseja excluir o cliente <strong>{selectedCustomer?.name}</strong>?
                  Esta ação não pode ser desfeita.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {activeOrdersForDelete === 0 && (
              <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground">
                {formLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
