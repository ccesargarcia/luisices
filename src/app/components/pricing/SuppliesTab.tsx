import { useState, useMemo } from 'react';
import { SupplyItem, SupplyCategory, SupplyUnit } from '../../types';
import { firebasePricingService } from '../../../services/firebasePricingService';
import { formatCurrency } from '../../utils/currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Layers,
  Package,
  Loader2,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

interface SuppliesTabProps {
  supplies: SupplyItem[];
  loading: boolean;
  onRefresh?: () => void;
}

const CATEGORY_MAP: Record<SupplyCategory, { label: string; color: string }> = {
  papeis: { label: 'Papéis', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  fitas_aviamentos: { label: 'Fitas & Aviamentos', color: 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300' },
  impressao_tintas: { label: 'Impressão & Tintas', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300' },
  embalagens: { label: 'Embalagens', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  adesivos_colas: { label: 'Adesivos & Colas', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  outros: { label: 'Outros', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
};

const UNIT_MAP: Record<SupplyUnit, string> = {
  folha: 'folha(s)',
  metro: 'metro(s)',
  cm: 'centímetro(s)',
  unidade: 'unidade(s)',
  ml: 'ml',
  g: 'grama(s)',
  pacote: 'pacote(s)',
};

export function SuppliesTab({ supplies, loading, onRefresh }: SuppliesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal de Adição/Edição
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<SupplyItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplyCategory>('papeis');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [packageQuantity, setPackageQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<SupplyUnit>('folha');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  // Diálogo de confirmação de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<SupplyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Carga de presets
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);

  const openAddDialog = () => {
    setEditingSupply(null);
    setName('');
    setCategory('papeis');
    setPurchasePrice(35);
    setPackageQuantity(100);
    setUnit('folha');
    setSupplier('');
    setNotes('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: SupplyItem) => {
    setEditingSupply(item);
    setName(item.name);
    setCategory(item.category);
    setPurchasePrice(item.purchasePrice);
    setPackageQuantity(item.packageQuantity);
    setUnit(item.unit);
    setSupplier(item.supplier || '');
    setNotes(item.notes || '');
    setDialogOpen(true);
  };

  const calculatedUnitCost =
    packageQuantity > 0 ? Math.round((purchasePrice / packageQuantity) * 1000) / 1000 : 0;

  const handleSaveSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do insumo.');
      return;
    }
    if (purchasePrice <= 0 || packageQuantity <= 0) {
      toast.error('Informe um preço e quantidade de pacote válidos.');
      return;
    }

    try {
      setSaving(true);
      if (editingSupply) {
        await firebasePricingService.updateSupply(editingSupply.id, {
          name: name.trim(),
          category,
          purchasePrice,
          packageQuantity,
          unit,
          supplier: supplier.trim() || null,
          notes: notes.trim() || null,
        });
        toast.success('Insumo atualizado com sucesso!');
      } else {
        await firebasePricingService.createSupply({
          name: name.trim(),
          category,
          purchasePrice,
          packageQuantity,
          unit,
          unitCost: calculatedUnitCost,
          supplier: supplier.trim() || null,
          notes: notes.trim() || null,
        });
        toast.success('Insumo cadastrado com sucesso!');
      }
      setDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao salvar insumo:', err);
      toast.error('Não foi possível salvar o insumo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supplyToDelete) return;
    try {
      setDeleting(true);
      await firebasePricingService.deleteSupply(supplyToDelete.id);
      toast.success('Insumo removido com sucesso!');
      setDeleteConfirmOpen(false);
      setSupplyToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir insumo:', err);
      toast.error('Não foi possível remover o insumo.');
    } finally {
      setDeleting(false);
    }
  };

  const handleLoadPresets = async () => {
    try {
      setLoadingPresets(true);
      const count = await firebasePricingService.loadPresetSupplies();
      toast.success(`${count} insumos sugeridos foram adicionados ao seu catálogo!`);
      setPresetConfirmOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao carregar presets:', err);
      toast.error('Falha ao carregar insumos sugeridos.');
    } finally {
      setLoadingPresets(false);
    }
  };

  const filteredSupplies = useMemo(() => {
    return supplies.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [supplies, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header com Ações e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar insumos (nome, fornecedor)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {supplies.length === 0 && (
            <Button
              variant="outline"
              onClick={() => setPresetConfirmOpen(true)}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/5"
            >
              <Sparkles className="size-4" />
              Carregar Insumos Sugeridos
            </Button>
          )}

          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="size-4" />
            Novo Insumo
          </Button>
        </div>
      </div>

      {/* Grid de Insumos */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredSupplies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Layers className="size-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Nenhum insumo encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
              {supplies.length === 0
                ? 'Comece cadastrando suas matérias-primas ou carregue nossa lista pré-configurada com papéis, fitas e colas comuns de papelaria personalizada.'
                : 'Nenhum insumo corresponde aos filtros de busca selecionados.'}
            </p>
            {supplies.length === 0 && (
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={() => setPresetConfirmOpen(true)}
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Sparkles className="size-4" />
                  Carregar Insumos Sugeridos de Papelaria
                </Button>
                <Button variant="outline" onClick={openAddDialog} className="gap-2">
                  <Plus className="size-4" />
                  Cadastrar Manualmente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSupplies.map((item) => {
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.outros;
            return (
              <Card
                key={item.id}
                className="hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cat.color}`}
                    >
                      {cat.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setSupplyToDelete(item);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold leading-tight mt-2">
                    {item.name}
                  </CardTitle>
                  {item.supplier && (
                    <CardDescription className="text-xs">
                      Fornecedor: {item.supplier}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <div className="bg-muted/40 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Compra: {formatCurrency(item.purchasePrice)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        por {item.packageQuantity} {item.unit}s
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">
                        Custo unitário
                      </div>
                      <div className="text-lg font-black text-primary">
                        {formatCurrency(item.unitCost)}
                        <span className="text-xs font-normal text-muted-foreground">
                          /{item.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      "{item.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Adicionar / Editar Insumo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupply ? 'Editar Insumo' : 'Novo Insumo / Matéria-Prima'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSupply} className="space-y-4">
            <div>
              <Label htmlFor="supply-name" className="text-xs">
                Nome do Insumo *
              </Label>
              <Input
                id="supply-name"
                placeholder="Ex: Papel Fotográfico Glossy 180g (A4)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category" className="text-xs">
                  Categoria
                </Label>
                <Select
                  value={category}
                  onValueChange={(val: SupplyCategory) => setCategory(val)}
                >
                  <SelectTrigger id="category" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unit" className="text-xs">
                  Unidade de Consumo
                </Label>
                <Select
                  value={unit}
                  onValueChange={(val: SupplyUnit) => setUnit(val)}
                >
                  <SelectTrigger id="unit" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UNIT_MAP).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conversor de Compra para Consumo */}
            <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Package className="size-3.5 text-primary" />
                Conversor de Pacote / Embalagem
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="purchase-price" className="text-xs">
                    Preço da Compra (R$) *
                  </Label>
                  <Input
                    id="purchase-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="35.00"
                    value={purchasePrice || ''}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="package-qty" className="text-xs">
                    Qtd. no Pacote/Rolo *
                  </Label>
                  <Input
                    id="package-qty"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={packageQuantity || ''}
                    onChange={(e) => setPackageQuantity(parseFloat(e.target.value) || 1)}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <span className="text-muted-foreground">Custo calculado:</span>
                <span className="font-bold text-primary">
                  {formatCurrency(calculatedUnitCost)} por {unit}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="supplier" className="text-xs">
                Loja / Fornecedor (Opcional)
              </Label>
              <Input
                id="supplier"
                placeholder="Ex: Kalunga, Mercado Livre, Armarinho..."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-xs">
                Observações (Opcional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Dicas de corte, espessura, fornecedor favorito..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingSupply ? 'Atualizar Insumo' : 'Cadastrar Insumo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir insumo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o insumo{' '}
              <strong>{supplyToDelete?.name}</strong>? Fichas técnicas que já usam este
              insumo manterão o valor registrado historicamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir Insumo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Carga de Presets */}
      <AlertDialog open={presetConfirmOpen} onOpenChange={setPresetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Carregar Insumos Sugeridos de Papelaria?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso adicionará ao seu catálogo 14 insumos frequentemente utilizados em
              papelaria personalizada (Offset 180g, Fotográfico Glossy/Matte, Color Plus,
              Lamicote Dourado, Kraft, fitas de cetim e gorgurão, cola quente, fita banana,
              tintas e embalagens). Você poderá editar os preços a qualquer momento conforme
              seus fornecedores locais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingPresets}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLoadPresets}
              disabled={loadingPresets}
              className="gap-2"
            >
              {loadingPresets ? <Loader2 className="size-4 animate-spin" /> : null}
              Carregar Insumos Sugeridos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
