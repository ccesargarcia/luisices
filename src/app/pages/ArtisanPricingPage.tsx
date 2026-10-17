import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { firebasePricingService } from '../../services/firebasePricingService';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { firebaseQuoteService } from '../../services/firebaseQuoteService';
import {
  SupplyItem,
  ProductPricingRecipe,
  RecipeItem,
  Customer,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  canAccessPricing,
  SupplyUnit,
} from '../types';
import { formatCurrency } from '../utils/currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Package,
  Calculator,
  Search,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Coins,
  XCircle,
  MessageCircle,
  Wallet,
  Loader2,
  MoreVertical,
  Minus,
  CreditCard,
  Banknote,
  AlertTriangle,
  RotateCcw,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { toast } from 'sonner';

// Estrutura de item na composição da encomenda
interface CompositionItem {
  id: string;
  supplyId: string;
  name: string;
  unit: SupplyUnit;
  quantity: number;
  unitCost: number;
  subtotalCost: number;
}

interface LocalQuoteRecord {
  id: string;
  quoteNumber?: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  quantity: number;
  paymentMethod: 'pix' | 'cartao' | 'dinheiro';
  depositPercentage: number;
  depositAmount: number;
  remainingAmount: number;
  costTotal: number;
  totalPrice: number;
  profitMargin: number;
  pricingMode?: 'markup' | 'margem';
  markupPercent?: number;
  status: 'pending' | 'approved' | 'cancelled';
  orderId?: string;
  orderNumber?: string;
  items: CompositionItem[];
}

export function ArtisanPricingPage() {
  const { userProfile, isAdmin, hasPermission } = useAuth();
  const { refreshOrders } = useOrders();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const canView = isAdmin || hasPermission((p) => canAccessPricing(p, 'view'));
  const canCreate = isAdmin || hasPermission((p) => canAccessPricing(p, 'create'));
  const canEdit = isAdmin || hasPermission((p) => canAccessPricing(p, 'edit'));
  const canDelete = isAdmin || hasPermission((p) => canAccessPricing(p, 'delete'));
  const canCreateOrder = isAdmin || hasPermission((p) => p.orders?.create ?? false);
  const canCreateQuote = isAdmin || hasPermission((p) => p.quotes?.create ?? false);
  const canEditQuote = isAdmin || hasPermission((p) => p.quotes?.edit ?? false);

  // Aba ativa: 'calculadora' ou 'insumos'
  const defaultTab = location.pathname.endsWith('/estoque-insumos') ? 'insumos' : 'calculadora';
  const activeTab = (searchParams.get('tab') === 'insumos' ? 'insumos' : searchParams.get('tab') === 'calculadora' ? 'calculadora' : defaultTab) as 'calculadora' | 'insumos';

  const setTab = (tab: 'calculadora' | 'insumos') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  };

  // -------------------------------------------------------------
  // ESTADO DOS INSUMOS
  // -------------------------------------------------------------
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [loadingSupplies, setLoadingSupplies] = useState(true);
  const [suppliesSearch, setSuppliesSearch] = useState('');
  const [suppliesViewMode, setSuppliesViewMode] = useState<'table' | 'grid'>('table');

  // Formulário de Cadastro / Edição de Insumo
  const [editingSupplyId, setEditingSupplyId] = useState<string | null>(null);
  const [supplyName, setSupplyName] = useState('');
  const [packageQty, setPackageQty] = useState<number | string>(1);
  const [supplyUnit, setSupplyUnit] = useState<SupplyUnit>('unidade');
  const [purchasePrice, setPurchasePrice] = useState<number | string>('');
  const [currentStock, setCurrentStock] = useState<number | string>('');
  const [savingSupply, setSavingSupply] = useState(false);

  // -------------------------------------------------------------
  // ESTADO DA CALCULADORA DE PRECIFICAÇÃO
  // -------------------------------------------------------------
  const [recipes, setRecipes] = useState<ProductPricingRecipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  // Lista de Clientes do Ateliê
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Composição Atual (Coluna 1)
  const [compositionItems, setCompositionItems] = useState<CompositionItem[]>([]);
  const [selectedSupplyToAdd, setSelectedSupplyToAdd] = useState<string>('');
  const [supplyQtyToAdd, setSupplyQtyToAdd] = useState<number | string>(1);
  const [compositionName, setCompositionName] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState(false);

  // Custos, Margem e Orçamento (Coluna 2)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('avulso');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [orderName, setOrderName] = useState('');
  const [orderQuantity, setOrderQuantity] = useState<number | string>(1);
  const [pricingMode, setPricingMode] = useState<'markup' | 'margem'>('margem');
  const [markupPercent, setMarkupPercent] = useState<number>(100); // Ex: 100% dobra o custo
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(50); // Padrão 50%
  const [manualTotalPrice, setManualTotalPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');
  const [depositOption, setDepositOption] = useState<'50' | '30' | '100' | 'custom'>('50');
  const [customDepositValue, setCustomDepositValue] = useState<string>('');

  // Lista de Orçamentos Gerados (Persistidos localmente com sync na nuvem)
  const [localQuoteState, setLocalQuoteState] = useState<{ uid: string | null; quotes: LocalQuoteRecord[] }>(() => {
    try {
      const uid = userProfile?.uid || null;
      const stored = uid ? localStorage.getItem(`luisices_artisan_quotes_${uid}`) : null;
      return { uid, quotes: stored ? JSON.parse(stored) : [] };
    } catch {
      return { uid: userProfile?.uid || null, quotes: [] };
    }
  });
  const localQuotes = localQuoteState.uid === (userProfile?.uid || null) ? localQuoteState.quotes : [];

  useEffect(() => {
    const uid = userProfile?.uid || null;
    try {
      const stored = uid ? localStorage.getItem(`luisices_artisan_quotes_${uid}`) : null;
      setLocalQuoteState({ uid, quotes: stored ? JSON.parse(stored) : [] });
    } catch {
      setLocalQuoteState({ uid, quotes: [] });
    }
  }, [userProfile?.uid]);

  const saveLocalQuotes = (quotes: LocalQuoteRecord[]) => {
    const uid = userProfile?.uid || null;
    if (!uid) return;
    setLocalQuoteState({ uid, quotes });
    try {
      localStorage.setItem(`luisices_artisan_quotes_${uid}`, JSON.stringify(quotes));
    } catch (e) {
      console.warn('Erro ao salvar orçamentos no cache local:', e);
    }
  };

  // Carregar Insumos, Modelos e Clientes do Firestore
  useEffect(() => {
    if (!canView || !userProfile?.uid) return;
    let isActive = true;
    const uid = userProfile.uid;

    setLoadingSupplies(true);
    const unsubSupplies = firebasePricingService.subscribeToSupplies(
      (data: SupplyItem[]) => {
        if (!isActive) return;
        setSupplies(data);
        setLoadingSupplies(false);
      },
      userProfile.uid
    );

    setLoadingRecipes(true);
    const unsubRecipes = firebasePricingService.subscribeToRecipes(
      (data: ProductPricingRecipe[]) => {
        if (!isActive) return;
        setRecipes(data);
        setLoadingRecipes(false);
      },
      userProfile.uid
    );

    // Carregar clientes do ateliê
    firebaseCustomerService.getCustomers(userProfile.uid).then((data: Customer[]) => {
      if (isActive) setCustomers(data || []);
    }).catch((err) => {
      console.warn('Falha não-bloqueante ao carregar clientes:', err);
    });

    // Sincronizar orçamentos salvos na nuvem
    firebaseQuoteService.getQuotes().then((cloudQuotes) => {
      if (isActive && cloudQuotes && cloudQuotes.length > 0) {
        setLocalQuoteState((prev) => {
          const merged = [...(prev.uid === uid ? prev.quotes : [])];
          cloudQuotes.forEach((cq) => {
            const exists = merged.some((lq) => lq.id === cq.id || (cq.quoteNumber && lq.quoteNumber === cq.quoteNumber));
            if (!exists) {
              merged.push({
                id: cq.id,
                quoteNumber: cq.quoteNumber,
                createdAt: cq.createdAt,
                customerName: cq.customerName,
                customerPhone: cq.customerPhone,
                productName: cq.items?.[0]?.name || 'Encomenda',
                quantity: cq.items?.[0]?.quantity || 1,
                paymentMethod: (cq.paymentCondition?.toLowerCase().includes('pix') ? 'pix' : cq.paymentCondition?.toLowerCase().includes('cart') ? 'cartao' : 'dinheiro') as any,
                depositPercentage: 50,
                depositAmount: Math.round((cq.totalPrice || 0) * 0.5 * 100) / 100,
                remainingAmount: Math.round((cq.totalPrice || 0) * 0.5 * 100) / 100,
                costTotal: 0,
                totalPrice: cq.totalPrice || 0,
                profitMargin: 50,
                status: cq.status === 'approved' ? 'approved' : cq.status === 'rejected' ? 'cancelled' : 'pending',
                orderId: cq.orderId,
                orderNumber: cq.orderNumber,
                items: [],
              });
            }
          });
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          try { localStorage.setItem(`luisices_artisan_quotes_${uid}`, JSON.stringify(merged)); } catch (_error) {}
          return { uid, quotes: merged };
        });
      }
    }).catch((err) => {
      console.warn('Falha não-bloqueante ao carregar orçamentos do Firestore:', err);
    });

    return () => {
      isActive = false;
      unsubSupplies();
      unsubRecipes();
    };
  }, [userProfile?.uid, canView]);

  // Custo unitário do insumo em edição/cadastro
  const calculatedUnitCostPreview = useMemo(() => {
    const pkg = Number(packageQty) || 0;
    const price = Number(purchasePrice) || 0;
    if (pkg <= 0 || price <= 0) return 0;
    return price / pkg;
  }, [packageQty, purchasePrice]);

  // -------------------------------------------------------------
  // HANDLERS: INSUMOS
  // -------------------------------------------------------------
  const handleSaveSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate && !editingSupplyId) {
      toast.error('Você não tem permissão para cadastrar insumos.');
      return;
    }
    if (!canEdit && editingSupplyId) {
      toast.error('Você não tem permissão para editar insumos.');
      return;
    }

    const trimmedName = supplyName.trim();
    if (!trimmedName) {
      toast.error('Informe o nome do insumo.');
      return;
    }

    const pkg = Number(packageQty) || 1;
    const price = Number(purchasePrice) || 0;
    if (!Number.isFinite(pkg) || pkg <= 0) {
      toast.error('A quantidade na embalagem deve ser maior que zero.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Informe um preço válido, igual ou maior que zero.');
      return;
    }

    const stock = currentStock !== '' ? Number(currentStock) : pkg;
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error('O estoque atual precisa ser um número igual ou maior que zero.');
      return;
    }
    const unitCost = Math.round((price / pkg) * 100) / 100;

    setSavingSupply(true);
    try {
      if (editingSupplyId) {
        await firebasePricingService.updateSupply(editingSupplyId, {
          name: trimmedName,
          packageQuantity: pkg,
          purchasePrice: price,
          unitCost: unitCost,
          currentStock: stock,
          unit: supplyUnit,
          category: 'outros',
        });
        toast.success('Insumo atualizado com sucesso!');
      } else {
        await firebasePricingService.createSupply({
          name: trimmedName,
          packageQuantity: pkg,
          purchasePrice: price,
          unitCost: unitCost,
          currentStock: stock,
          unit: supplyUnit,
          category: 'outros',
        });
        toast.success('Insumo cadastrado com sucesso!');
      }

      // Limpar formulário
      setEditingSupplyId(null);
      setSupplyName('');
      setPackageQty(1);
      setSupplyUnit('unidade');
      setPurchasePrice('');
      setCurrentStock('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar insumo.');
    } finally {
      setSavingSupply(false);
    }
  };

  const handleEditSupply = (supply: SupplyItem) => {
    setEditingSupplyId(supply.id);
    setSupplyName(supply.name);
    setPackageQty(supply.packageQuantity || 1);
    setSupplyUnit(supply.unit || 'unidade');
    setPurchasePrice(supply.purchasePrice || 0);
    setCurrentStock(supply.currentStock ?? supply.packageQuantity ?? 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSupply = async (id: string, name: string) => {
    if (!canDelete) {
      toast.error('Você não possui permissão para excluir insumos.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o insumo "${name}"?`)) return;

    try {
      await firebasePricingService.deleteSupply(id);
      toast.success(`Insumo "${name}" excluído.`);
      if (editingSupplyId === id) {
        setEditingSupplyId(null);
        setSupplyName('');
        setPackageQty(1);
        setSupplyUnit('unidade');
        setPurchasePrice('');
        setCurrentStock('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir insumo.');
    }
  };

  const handleQuickAdjustStock = async (supply: SupplyItem, delta: number) => {
    if (!canEdit) return;
    const current = supply.currentStock || 0;
    const newStock = Math.max(0, current + delta);
    try {
      await firebasePricingService.updateSupply(supply.id, { currentStock: newStock });
      toast.success(`Estoque de "${supply.name}" ajustado para ${newStock}.`);
    } catch (err: any) {
      toast.error('Erro ao ajustar estoque.');
    }
  };

  const filteredSupplies = useMemo(() => {
    const q = suppliesSearch.toLowerCase().trim();
    if (!q) return supplies;
    return supplies.filter((s) => s.name.toLowerCase().includes(q));
  }, [supplies, suppliesSearch]);

  // -------------------------------------------------------------
  // HANDLERS: CALCULADORA DE COMPOSIÇÃO
  // -------------------------------------------------------------
  const handleAddSupplyToComposition = () => {
    if (!selectedSupplyToAdd) {
      toast.error('Selecione um insumo para adicionar.');
      return;
    }
    const supply = supplies.find((s) => s.id === selectedSupplyToAdd);
    if (!supply) return;

    const qty = Math.max(0.001, Number(supplyQtyToAdd) || 1);
    const unitCost = supply.unitCost || 0;
    const subtotal = Math.round(unitCost * qty * 100) / 100;

    // Se já estiver na lista, apenas soma a quantidade
    setCompositionItems((prev) => {
      const idx = prev.findIndex((i) => i.supplyId === supply.id);
      if (idx >= 0) {
        const next = [...prev];
        const newQty = next[idx].quantity + qty;
        next[idx] = {
          ...next[idx],
          quantity: newQty,
          subtotalCost: Math.round(unitCost * newQty * 100) / 100,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          supplyId: supply.id,
          name: supply.name,
          unit: supply.unit,
          quantity: qty,
          unitCost,
          subtotalCost: subtotal,
        },
      ];
    });

    setSelectedSupplyToAdd('');
    setSupplyQtyToAdd(1);
  };

  const handleRemoveCompositionItem = (id: string) => {
    setCompositionItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItemQty = (id: string, newQty: number) => {
    if (isNaN(newQty) || newQty <= 0) {
      handleRemoveCompositionItem(id);
      return;
    }
    const cleanQty = Math.round(newQty * 1000) / 1000;
    setCompositionItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: cleanQty,
              subtotalCost: Math.round(item.unitCost * cleanQty * 100) / 100,
            }
          : item
      )
    );
  };

  // Salvar modelo de composição (Atualizar existente ou Salvar como novo)
  const handleSaveModel = async (forceNew = false) => {
    const trimmedName = compositionName.trim();
    if (!trimmedName) {
      toast.error('Digite um nome para a composição antes de salvar o modelo.');
      return;
    }
    if (compositionItems.length === 0) {
      toast.error('Adicione pelo menos um insumo para compor o modelo.');
      return;
    }
    const targetId = (!forceNew && loadedModelId) ? loadedModelId : undefined;
    if (targetId ? !canEdit : !canCreate) {
      toast.error(targetId ? 'Você não tem permissão para editar modelos.' : 'Você não tem permissão para criar modelos.');
      return;
    }

    setSavingModel(true);
    try {
      const recipeItems: RecipeItem[] = compositionItems.map((c) => ({
        supplyId: c.supplyId,
        name: c.name,
        unit: c.unit,
        quantityUsed: c.quantity,
        unitCost: c.unitCost,
        totalCost: c.subtotalCost,
      }));

      const totalMatCost = compositionItems.reduce((acc, curr) => acc + curr.subtotalCost, 0);

      // Se não for forçado a novo e houver um modelo carregado com o mesmo nome, atualiza
      const saved = await firebasePricingService.saveRecipe({
        id: targetId,
        productName: trimmedName,
        category: 'papelaria_festa',
        items: recipeItems,
        materialsCost: totalMatCost,
        wasteMarginPercent: 0,
        materialsCostWithWaste: totalMatCost,
        laborMode: 'time',
        productionTimeMinutes: 0,
        hourlyRateApplied: 0,
        laborCost: 0,
        fixedCostsShare: 0,
        totalUnitCost: totalMatCost,
        paymentFeePercent: 0,
        pricingMethod: pricingMode === 'markup' ? 'markup_on_cost' : 'margin_on_sale',
        profitMarginPercent: pricingMode === 'markup' ? markupPercent : profitMarginPercent,
        suggestedUnitPrice: Math.round((effectiveTotalPrice / numEncomendadas) * 100) / 100,
      });

      setLoadedModelId(saved.id);
      setSelectedModelId(saved.id);
      toast.success(targetId ? `Modelo "${trimmedName}" atualizado com sucesso!` : `Modelo "${trimmedName}" salvo com sucesso!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar modelo.');
    } finally {
      setSavingModel(false);
    }
  };

  // Carregar modelo selecionado
  const handleLoadModel = () => {
    if (!selectedModelId) {
      toast.error('Selecione um modelo salvo para carregar.');
      return;
    }
    const model = recipes.find((r) => r.id === selectedModelId);
    if (!model) return;

    setLoadedModelId(model.id);
    setCompositionName(model.productName);
    setOrderName(model.productName);

    // Restaurar modo e margem / markup salvos no modelo
    if (model.pricingMethod === 'markup_on_cost') {
      setPricingMode('markup');
      setMarkupPercent(model.profitMarginPercent || 100);
    } else {
      setPricingMode('margem');
      setProfitMarginPercent(model.profitMarginPercent || 50);
    }

    // Mapear insumos da receita atualizando com os preços atuais do estoque
    const loadedItems: CompositionItem[] = (model.items || []).map((item) => {
      const currentSupply = supplies.find((s) => s.id === item.supplyId);
      const unitCost = currentSupply ? (currentSupply.unitCost || item.unitCost) : item.unitCost;
      const qty = item.quantityUsed || 1;
      return {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        supplyId: item.supplyId || '',
        name: item.name || currentSupply?.name || 'Insumo',
        unit: (item.unit || currentSupply?.unit || 'unidade') as SupplyUnit,
        quantity: qty,
        unitCost,
        subtotalCost: Math.round(unitCost * qty * 100) / 100,
      };
    });

    setCompositionItems(loadedItems);
    toast.success(`Modelo "${model.productName}" carregado com sucesso!`);
  };

  // Excluir modelo
  const handleDeleteModel = async () => {
    if (!canDelete) {
      toast.error('Você não tem permissão para excluir modelos.');
      return;
    }
    if (!selectedModelId) return;
    const model = recipes.find((r) => r.id === selectedModelId);
    if (!model) return;
    if (!window.confirm(`Deseja realmente apagar o modelo "${model.productName}"?`)) return;

    try {
      await firebasePricingService.deleteRecipe(model.id);
      toast.success('Modelo excluído.');
      if (loadedModelId === model.id) {
        setLoadedModelId(null);
      }
      setSelectedModelId('');
    } catch (err: any) {
      toast.error('Erro ao excluir modelo.');
    }
  };

  // Reiniciar composição do zero para uma nova encomenda
  const handleResetComposition = () => {
    setCompositionItems([]);
    setCompositionName('');
    setSelectedModelId('');
    setLoadedModelId(null);
    setOrderName('');
    setOrderQuantity(1);
    setManualTotalPrice('');
    setCustomCustomerName('');
    setSelectedCustomerId('avulso');
    toast.success('Composição reiniciada para nova encomenda.');
  };

  // -------------------------------------------------------------
  // CÁLCULOS MATEMÁTICOS DE PRECIFICAÇÃO & MARGEM REAL
  // -------------------------------------------------------------
  const numEncomendadas = Math.max(1, Number(orderQuantity) || 1);

  // Custo unitário da composição (soma dos insumos)
  const unitCompositionCost = useMemo(() => {
    return compositionItems.reduce((acc, curr) => acc + curr.subtotalCost, 0);
  }, [compositionItems]);

  // Custo total da encomenda (custo unitário * quantidade solicitada)
  const totalCost = useMemo(() => {
    return Math.round(unitCompositionCost * numEncomendadas * 100) / 100;
  }, [unitCompositionCost, numEncomendadas]);

  // Preço Sugerido com base no Modo Escolhido (Markup sobre o custo ou Margem sobre a venda)
  const suggestedTotalPrice = useMemo(() => {
    if (totalCost <= 0) return 0;
    if (pricingMode === 'markup') {
      const price = totalCost * (1 + Math.max(0, markupPercent) / 100);
      return Math.round(price * 100) / 100;
    } else {
      const marginRatio = Math.min(0.95, Math.max(0, profitMarginPercent / 100));
      if (marginRatio >= 1) return totalCost * 2;
      const price = totalCost / (1 - marginRatio);
      return Math.round(price * 100) / 100;
    }
  }, [totalCost, pricingMode, markupPercent, profitMarginPercent]);

  // Preço Efetivo (manual se informado, senão o sugerido)
  const effectiveTotalPrice = useMemo(() => {
    const manual = Number(manualTotalPrice);
    if (!isNaN(manual) && manual > 0) {
      return Math.round(manual * 100) / 100;
    }
    return suggestedTotalPrice;
  }, [manualTotalPrice, suggestedTotalPrice]);

  // Margem Real em R$
  const effectiveMarginAmount = useMemo(() => {
    return Math.round((effectiveTotalPrice - totalCost) * 100) / 100;
  }, [effectiveTotalPrice, totalCost]);

  // Cálculo do Sinal de Entrada
  const depositValues = useMemo(() => {
    const total = effectiveTotalPrice;
    if (total <= 0) return { deposit: 0, remaining: 0 };

    if (depositOption === '100') {
      return { deposit: total, remaining: 0 };
    }
    if (depositOption === '30') {
      const dep = Math.round(total * 0.3 * 100) / 100;
      return { deposit: dep, remaining: Math.round((total - dep) * 100) / 100 };
    }
    if (depositOption === 'custom') {
      const customVal = Number(customDepositValue) || 0;
      const dep = Math.min(total, Math.max(0, Math.round(customVal * 100) / 100));
      return { deposit: dep, remaining: Math.round((total - dep) * 100) / 100 };
    }
    // Padrão 50%
    const dep = Math.round(total * 0.5 * 100) / 100;
    return { deposit: dep, remaining: Math.round((total - dep) * 100) / 100 };
  }, [effectiveTotalPrice, depositOption, customDepositValue]);

  // Nome do cliente final
  const resolvedCustomerName = useMemo(() => {
    if (selectedCustomerId === 'avulso') {
      return customCustomerName.trim() || 'Cliente Avulso';
    }
    const found = customers.find((c: Customer) => c.id === selectedCustomerId);
    return found?.name || 'Cliente';
  }, [selectedCustomerId, customCustomerName, customers]);

  const resolvedCustomerPhone = useMemo(() => {
    if (selectedCustomerId === 'avulso') return '';
    const found = customers.find((c: Customer) => c.id === selectedCustomerId);
    return found?.phone || '';
  }, [selectedCustomerId, customers]);

  // Alternar entre modo Markup e Margem mantendo coerência matemática
  const handlePricingModeChange = (newMode: 'markup' | 'margem') => {
    setPricingMode(newMode);
    if (newMode === 'markup') {
      if (profitMarginPercent < 100) {
        const correspondingMarkup = Math.round((profitMarginPercent / (100 - profitMarginPercent)) * 100);
        setMarkupPercent(Math.min(1000, Math.max(0, correspondingMarkup)));
      }
    } else {
      const correspondingMargin = Math.min(95, Math.round((markupPercent / (100 + markupPercent)) * 100));
      setProfitMarginPercent(Math.max(0, correspondingMargin));
    }
  };

  // Mudança no slider
  const handleSliderChange = (newVal: number) => {
    if (pricingMode === 'markup') {
      setMarkupPercent(newVal);
      const correspondingMargin = Math.min(95, Math.round((newVal / (100 + newVal)) * 100));
      setProfitMarginPercent(correspondingMargin);
    } else {
      setProfitMarginPercent(newVal);
      const correspondingMarkup = newVal < 100 ? Math.round((newVal / (100 - newVal)) * 100) : 999;
      setMarkupPercent(Math.min(1000, correspondingMarkup));
    }
    setManualTotalPrice('');
  };

  // Handler: Digitação no campo manual de preço recalcula markup e margem
  const handleManualPriceChange = (valStr: string) => {
    setManualTotalPrice(valStr);
    const num = Number(valStr);
    if (!isNaN(num) && num > totalCost && totalCost > 0) {
      const calculatedMarkup = Math.round(((num - totalCost) / totalCost) * 100);
      const calculatedMargin = Math.min(95, Math.round(((num - totalCost) / num) * 100));
      setMarkupPercent(Math.min(1000, Math.max(0, calculatedMarkup)));
      setProfitMarginPercent(Math.max(0, calculatedMargin));
    }
  };

  // -------------------------------------------------------------
  // HANDLER: GERAR ORÇAMENTO (Salva na lista aguardando aprovação)
  // -------------------------------------------------------------
  const handleGenerateQuote = () => {
    if (!canCreateQuote) {
      toast.error('Você não tem permissão para gerar orçamentos.');
      return;
    }
    if (compositionItems.length === 0) {
      toast.error('Adicione pelo menos um insumo para compor o produto.');
      return;
    }
    if (effectiveTotalPrice <= 0) {
      toast.error('O valor total do orçamento deve ser maior que zero.');
      return;
    }

    const prodName = orderName.trim() || compositionName.trim() || 'Encomenda Personalizada';

    const newQuote: LocalQuoteRecord = {
      id: `quote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      productName: prodName,
      quantity: numEncomendadas,
      paymentMethod,
      depositPercentage: depositOption === 'custom' ? Math.round((depositValues.deposit / effectiveTotalPrice) * 100) : Number(depositOption),
      depositAmount: depositValues.deposit,
      remainingAmount: depositValues.remaining,
      costTotal: totalCost,
      totalPrice: effectiveTotalPrice,
      profitMargin: profitMarginPercent,
      status: 'pending',
      items: [...compositionItems],
    };

    saveLocalQuotes([newQuote, ...localQuotes]);
    toast.success(`Orçamento gerado para "${resolvedCustomerName}"!`);
  };

  // -------------------------------------------------------------
  // HANDLER: LANÇAR VENDA DIRETA (Converte em Pedido Oficial no Dashboard)
  // -------------------------------------------------------------
  const [launchingSale, setLaunchingSale] = useState(false);

  const handleLaunchDirectSale = async () => {
    if (!canCreateOrder) {
      toast.error('Você não tem permissão para criar pedidos.');
      return;
    }
    if (compositionItems.length === 0) {
      toast.error('Adicione insumos à composição antes de lançar a venda.');
      return;
    }
    if (effectiveTotalPrice <= 0) {
      toast.error('O valor total deve ser maior que zero.');
      return;
    }
    const trackedSupplyIds = compositionItems
      .filter((item) => supplies.some((supply) => supply.id === item.supplyId && supply.currentStock !== undefined))
      .map((item) => item.supplyId);
    if (trackedSupplyIds.length > 0 && !canEdit) {
      toast.error('Para lançar esta venda e baixar o estoque, você também precisa de permissão para editar insumos.');
      return;
    }

    setLaunchingSale(true);
    try {
      const prodName = orderName.trim() || compositionName.trim() || 'Encomenda Personalizada';
      const deposit = depositValues.deposit;
      const total = effectiveTotalPrice;

      // Data de entrega sugerida (+7 dias)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const deliveryDateStr = futureDate.toISOString().split('T')[0];

      // Mapear método de pagamento compatível
      const mappedMethod: PaymentMethod = paymentMethod === 'pix' ? 'pix' : paymentMethod === 'cartao' ? 'credit' : 'cash';
      const paymentStatus: PaymentStatus = deposit >= total && total > 0 ? 'paid' : deposit > 0 ? 'partial' : 'pending';

      const order = await firebaseOrderService.createOrder({
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        customerId: selectedCustomerId !== 'avulso' ? selectedCustomerId : undefined,
        productName: `${prodName} (${numEncomendadas} un)`,
        quantity: numEncomendadas,
        price: total,
        status: 'pending' as OrderStatus,
        deliveryDate: deliveryDateStr,
        payment: {
          status: paymentStatus,
          method: mappedMethod,
          totalAmount: total,
          paidAmount: deposit,
          remainingAmount: depositValues.remaining,
          paymentDate: deposit > 0 ? new Date().toISOString() : null,
          notes: `Lançado pela Calculadora de Insumos & Preços. Forma: ${paymentMethod.toUpperCase()}`,
          history: deposit > 0 ? [{
            amount: deposit,
            date: new Date().toISOString(),
            method: mappedMethod,
            notes: 'Sinal de entrada da encomenda',
          }] : [],
        },
        notes: `Venda lançada pela Calculadora de Insumos & Preços.\nForma de Pagto: ${paymentMethod.toUpperCase()}.\nSinal recebido: ${formatCurrency(deposit)}. Saldo pendente: ${formatCurrency(depositValues.remaining)}.\nComposição:\n${compositionItems.map((c) => `- ${c.quantity}x ${c.name}`).join('\n')}`,
      });

      // Abate do estoque físico dos insumos utilizados
      let inventoryUpdated = true;
      for (const item of compositionItems) {
        const supply = supplies.find((s) => s.id === item.supplyId);
        if (supply && supply.currentStock !== undefined) {
          const usedTotal = item.quantity * numEncomendadas;
          const updatedStock = Math.max(0, supply.currentStock - usedTotal);
          try {
            await firebasePricingService.updateSupply(supply.id, { currentStock: updatedStock });
          } catch (error) {
            inventoryUpdated = false;
            console.warn('Não foi possível atualizar o estoque após criar o pedido:', error);
          }
        }
      }

      refreshOrders();
      if (inventoryUpdated) {
        toast.success(`🎉 Venda lançada com sucesso! Pedido ${order.orderNumber} registrado no Dashboard.`);
      } else {
        toast.warning(`Pedido ${order.orderNumber} criado, mas o estoque não foi atualizado por completo. Confira os insumos utilizados.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao lançar pedido oficial.');
    } finally {
      setLaunchingSale(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLER: APROVAR ORÇAMENTO DA LISTA INFERIOR
  // -------------------------------------------------------------
  const [approvingQuoteId, setApprovingQuoteId] = useState<string | null>(null);

  const handleApproveQuote = async (quote: LocalQuoteRecord) => {
    if (!canCreateOrder) {
      toast.error('Você não tem permissão para criar pedidos.');
      return;
    }
    const trackedSupplyIds = quote.items
      .filter((item) => supplies.some((supply) => supply.id === item.supplyId && supply.currentStock !== undefined))
      .map((item) => item.supplyId);
    if (trackedSupplyIds.length > 0 && !canEdit) {
      toast.error('Para aprovar este orçamento e baixar o estoque, você também precisa de permissão para editar insumos.');
      return;
    }
    setApprovingQuoteId(quote.id);
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const deliveryDateStr = futureDate.toISOString().split('T')[0];

      const mappedMethod: PaymentMethod = quote.paymentMethod === 'pix' ? 'pix' : quote.paymentMethod === 'cartao' ? 'credit' : 'cash';
      const paymentStatus: PaymentStatus = quote.depositAmount >= quote.totalPrice && quote.totalPrice > 0 ? 'paid' : quote.depositAmount > 0 ? 'partial' : 'pending';

      const order = await firebaseOrderService.createOrder({
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        productName: `${quote.productName} (${quote.quantity} un)`,
        quantity: quote.quantity,
        price: quote.totalPrice,
        status: 'pending' as OrderStatus,
        deliveryDate: deliveryDateStr,
        payment: {
          status: paymentStatus,
          method: mappedMethod,
          totalAmount: quote.totalPrice,
          paidAmount: quote.depositAmount,
          remainingAmount: quote.remainingAmount,
          paymentDate: quote.depositAmount > 0 ? new Date().toISOString() : null,
          notes: `Aprovado do orçamento rápido. Forma: ${quote.paymentMethod.toUpperCase()}`,
          history: quote.depositAmount > 0 ? [{
            amount: quote.depositAmount,
            date: new Date().toISOString(),
            method: mappedMethod,
            notes: 'Sinal de entrada do orçamento',
          }] : [],
        },
        notes: `Aprovado a partir de orçamento rápido.\nSinal pago: ${formatCurrency(quote.depositAmount)}. Restante na entrega: ${formatCurrency(quote.remainingAmount)}.`,
      });

      let inventoryUpdated = true;
      for (const item of quote.items) {
        const supply = supplies.find((candidate) => candidate.id === item.supplyId);
        if (supply && supply.currentStock !== undefined) {
          const usedTotal = item.quantity * quote.quantity;
          const updatedStock = Math.max(0, supply.currentStock - usedTotal);
          try {
            await firebasePricingService.updateSupply(supply.id, { currentStock: updatedStock });
          } catch (error) {
            inventoryUpdated = false;
            console.warn('Não foi possível atualizar o estoque após aprovar o orçamento:', error);
          }
        }
      }

      // Atualiza o registro local
      const updated = localQuotes.map((q) =>
        q.id === quote.id
          ? { ...q, status: 'approved' as const, orderId: order.id, orderNumber: order.orderNumber }
          : q
      );
      saveLocalQuotes(updated);
      refreshOrders();

      if (inventoryUpdated) {
        toast.success(`Orçamento aprovado! Pedido ${order.orderNumber} gerado na fila de produção.`);
      } else {
        toast.warning(`Pedido ${order.orderNumber} criado, mas o estoque não foi atualizado por completo. Confira os insumos utilizados.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar orçamento.');
    } finally {
      setApprovingQuoteId(null);
    }
  };

  const handleCancelQuote = (id: string) => {
    if (!canEditQuote) {
      toast.error('Você não tem permissão para editar orçamentos.');
      return;
    }
    const updated = localQuotes.map((q) =>
      q.id === id ? { ...q, status: 'cancelled' as const } : q
    );
    saveLocalQuotes(updated);
    toast.info('Orçamento cancelado.');
  };

  const handleSendWhatsAppQuote = (quote: LocalQuoteRecord) => {
    const phone = quote.customerPhone ? quote.customerPhone.replace(/\D/g, '') : '';
    const message = encodeURIComponent(
      `Olá, ${quote.customerName}! Tudo bem? 😊\n\n` +
      `Aqui está o seu orçamento do Ateliê Luisices:\n\n` +
      `📋 *${quote.productName}* (${quote.quantity} un)\n` +
      `💰 *Valor Total:* ${formatCurrency(quote.totalPrice)}\n` +
      `💳 *Forma de Pagamento:* ${quote.paymentMethod.toUpperCase()}\n` +
      `💵 *Sinal para Início (50%):* ${formatCurrency(quote.depositAmount)}\n` +
      `📦 *Restante na Entrega:* ${formatCurrency(quote.remainingAmount)}\n\n` +
      `Podemos confirmar a sua encomenda para reservar a data?`
    );

    if (phone) {
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO & SELETOR DE MÓDULOS (ESTOQUE vs CALCULADORA) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {activeTab === 'insumos' ? <Package className="size-5" /> : <Calculator className="size-5" />}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {activeTab === 'insumos' ? 'Estoque de Insumos' : 'Calculadora de Precificação & Orçamentos'}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === 'insumos'
              ? 'Gerencie seus insumos para compor produtos na calculadora com custo unitário automático.'
              : 'Monte seu orçamento com os Insumos de Estoque e defina a margem ou o preço de venda.'}
          </p>
        </div>

        {/* Alternador de Telas Interligadas */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex rounded-lg border bg-muted/60 p-1 shadow-xs w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setTab('calculadora')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all flex-1 sm:flex-initial text-center justify-center ${
                activeTab === 'calculadora'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calculator className="size-3.5 shrink-0" />
              <span>Calculadora & Orçamentos</span>
            </button>
            <button
              onClick={() => setTab('insumos')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all flex-1 sm:flex-initial text-center justify-center ${
                activeTab === 'insumos'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="size-3.5 shrink-0" />
              <span>Estoque de Insumos</span>
            </button>
          </div>

          {activeTab === 'insumos' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs shadow-xs h-9 shrink-0 print:hidden"
              title="Imprimir relatório do estoque"
            >
              <Printer className="size-3.5" />
              <span className="inline">Imprimir estoque</span>
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* TELA 1: ESTOQUE DE INSUMOS (Layout Fiel à Imagem 1) */}
      {/* ============================================================= */}
      {activeTab === 'insumos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Card Esquerdo: Formulário Cadastrar / Editar Insumo (5 colunas) */}
          <Card className="lg:col-span-5 shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                {editingSupplyId ? 'Editar Insumo' : 'Cadastrar Insumo'}
              </CardTitle>
              <CardDescription className="text-xs">
                Informe o pacote e o preço pago. O custo unitário é calculado e fica disponível na calculadora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSupply} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="supply-name" className="text-xs font-medium">
                    Nome do Insumo
                  </Label>
                  <Input
                    id="supply-name"
                    value={supplyName}
                    onChange={(e) => setSupplyName(e.target.value)}
                    placeholder="Ex: Tinta Sublimática EPSON, Folha 180g"
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="package-qty" className="text-xs font-medium">
                      Qtd na Embalagem
                    </Label>
                    <Input
                      id="package-qty"
                      type="number"
                      step="any"
                      min="1"
                      value={packageQty}
                      onChange={(e) => setPackageQty(e.target.value)}
                      placeholder="Ex: 100"
                      required
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="supply-unit" className="text-xs font-medium">Unidade de medida</Label>
                    <Select value={supplyUnit} onValueChange={(value) => setSupplyUnit(value as SupplyUnit)}>
                      <SelectTrigger id="supply-unit" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['unidade', 'folha', 'metro', 'cm', 'ml', 'g', 'pacote', 'rolo', 'kit', 'par'] as SupplyUnit[]).map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="purchase-price" className="text-xs font-medium">
                      Preço Pago (R$)
                    </Label>
                    <Input
                      id="purchase-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="Ex: 35.00"
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="current-stock" className="text-xs font-medium">
                    Estoque Atual ({supplyUnit} em mãos)
                  </Label>
                  <Input
                    id="current-stock"
                    type="number"
                    step="any"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    placeholder="Ex: 10"
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Quantidade física disponível hoje. Se deixar em branco no cadastro, inicia igual à quantidade da embalagem.
                  </p>
                </div>

                {/* Card de Pré-visualização do Custo Unitário */}
                <div className="rounded-lg border bg-muted/40 p-3 text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Custo Unitário Calculado:</span>
                  <span className="font-semibold text-primary text-sm">
                    {formatCurrency(calculatedUnitCostPreview)} / {supplyUnit}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={savingSupply || (editingSupplyId ? !canEdit : !canCreate)}
                    className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-medium text-xs h-9 shadow-xs"
                  >
                    {savingSupply ? (
                      <Loader2 className="size-4 animate-spin mr-1.5" />
                    ) : null}
                    {editingSupplyId ? 'Atualizar Insumo' : 'Salvar Insumo'}
                  </Button>

                  {editingSupplyId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSupplyId(null);
                        setSupplyName('');
                        setPackageQty(1);
                        setSupplyUnit('unidade');
                        setPurchasePrice('');
                        setCurrentStock('');
                      }}
                      className="text-xs h-9"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card Direito: Insumos Cadastrados (7 colunas) */}
          <Card className="lg:col-span-7 shadow-xs border-border/80">
            <CardHeader className="pb-3 flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Insumos Cadastrados
                </CardTitle>
                <CardDescription className="text-xs">
                  {supplies.length} {supplies.length === 1 ? 'insumo cadastrado' : 'insumos cadastrados'}
                </CardDescription>
              </div>

              {/* Controles de Visualização (Lista vs Cards) e Impressão */}
              <div className="flex items-center gap-1.5 shrink-0 print:hidden">
                <div className="flex items-center rounded-lg border bg-muted/60 p-0.5 shadow-2xs">
                  <Button
                    type="button"
                    variant={suppliesViewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSuppliesViewMode('table')}
                    className="h-7 px-2.5 text-xs gap-1"
                    title="Visualização em Lista / Tabela"
                  >
                    <LayoutList className="size-3.5" />
                    <span className="hidden sm:inline">Lista</span>
                  </Button>
                  <Button
                    type="button"
                    variant={suppliesViewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSuppliesViewMode('grid')}
                    className="h-7 px-2.5 text-xs gap-1"
                    title="Visualização em Cards"
                  >
                    <LayoutGrid className="size-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-7 px-2.5 text-xs gap-1 shadow-2xs"
                  title="Imprimir lista de insumos"
                >
                  <Printer className="size-3.5" />
                  <span className="hidden xs:inline">Imprimir</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de Busca */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={suppliesSearch}
                  onChange={(e) => setSuppliesSearch(e.target.value)}
                  placeholder="Buscar insumo cadastrado..."
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* MODO TABELA / LISTA */}
              {suppliesViewMode === 'table' ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-purple-50/50 dark:bg-purple-950/20 text-purple-950 dark:text-purple-200 border-b">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Insumo</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Qtd Emb.</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Estoque Atual</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Preço Pago</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Custo/Unid.</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loadingSupplies ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                            Carregando insumos do ateliê...
                          </td>
                        </tr>
                      ) : filteredSupplies.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            Nenhum insumo encontrado. Cadastre seu primeiro insumo ao lado!
                          </td>
                        </tr>
                      ) : (
                        filteredSupplies.map((supply) => (
                          <tr key={supply.id} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              {supply.name}
                            </td>
                            <td className="py-2.5 px-3 text-center text-muted-foreground">
                              {supply.packageQuantity || 1} {supply.unit}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                (supply.currentStock ?? supply.packageQuantity ?? 0) <= (supply.minStock ?? 5)
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}>
                                {supply.currentStock ?? supply.packageQuantity ?? 0} {supply.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                              {formatCurrency(supply.purchasePrice || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-purple-700 dark:text-purple-300">
                              {formatCurrency(supply.unitCost || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7">
                                    <MoreVertical className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditSupply(supply)} disabled={!canEdit} className="gap-2">
                                    <Edit2 className="size-3.5" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickAdjustStock(supply, 1)} disabled={!canEdit} className="gap-2">
                                    <Plus className="size-3.5 text-emerald-600" /> Adicionar +1 ao estoque
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickAdjustStock(supply, -1)} disabled={!canEdit} className="gap-2">
                                    <Minus className="size-3.5 text-amber-600" /> Diminuir -1 do estoque
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteSupply(supply.id, supply.name)}
                                    disabled={!canDelete}
                                    className="gap-2 text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="size-3.5" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* MODO CARDS / GRID */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {loadingSupplies ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                      <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                      Carregando insumos do ateliê...
                    </div>
                  ) : filteredSupplies.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl p-6">
                      Nenhum insumo encontrado. Cadastre seu primeiro insumo ao lado!
                    </div>
                  ) : (
                    filteredSupplies.map((supply) => {
                      const stockVal = supply.currentStock ?? supply.packageQuantity ?? 0;
                      const isLowStock = stockVal <= (supply.minStock ?? 5);
                      return (
                        <div
                          key={supply.id}
                          className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 relative group"
                        >
                          {/* Header do Card */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="font-semibold text-xs text-foreground truncate" title={supply.name}>
                                {supply.name}
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                isLowStock
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}>
                                {isLowStock ? '⚠️ Estoque Baixo:' : '📦 Estoque:'} {stockVal} {supply.unit}
                              </span>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7 shrink-0 -mr-1.5 -mt-1">
                                  <MoreVertical className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditSupply(supply)} disabled={!canEdit} className="gap-2">
                                  <Edit2 className="size-3.5" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickAdjustStock(supply, 1)} disabled={!canEdit} className="gap-2">
                                  <Plus className="size-3.5 text-emerald-600" /> Adicionar +1 ao estoque
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickAdjustStock(supply, -1)} disabled={!canEdit} className="gap-2">
                                  <Minus className="size-3.5 text-amber-600" /> Diminuir -1 do estoque
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSupply(supply.id, supply.name)}
                                  disabled={!canDelete}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Detalhes Financeiros */}
                          <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 rounded-lg bg-muted/40 text-center text-[11px]">
                            <div>
                              <span className="text-[9px] text-muted-foreground uppercase block">EMBALAGEM</span>
                              <span className="font-medium text-foreground">{supply.packageQuantity || 1} un</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-muted-foreground uppercase block">PREÇO PAGO</span>
                              <span className="font-medium text-foreground">{formatCurrency(supply.purchasePrice || 0)}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-purple-700 dark:text-purple-300 uppercase block font-semibold">CUSTO/UNID</span>
                              <span className="font-bold text-purple-700 dark:text-purple-300">{formatCurrency(supply.unitCost || 0)}</span>
                            </div>
                          </div>

                          {/* Ações Rápidas do Card */}
                          <div className="flex items-center justify-between gap-1.5 pt-1">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAdjustStock(supply, -1)}
                                disabled={!canEdit}
                                className="h-7 px-2 text-[11px] gap-1"
                                title="Diminuir 1 do estoque"
                              >
                                <Minus className="size-3 text-amber-600" /> -1
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAdjustStock(supply, 1)}
                                disabled={!canEdit}
                                className="h-7 px-2 text-[11px] gap-1"
                                title="Adicionar 1 ao estoque"
                              >
                                <Plus className="size-3 text-emerald-600" /> +1
                              </Button>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSupply(supply)}
                              disabled={!canEdit}
                              className="h-7 px-2 text-[11px] text-primary hover:text-primary gap-1"
                            >
                              <Edit2 className="size-3" /> Editar
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TELA 2: CALCULADORA DE PRECIFICAÇÃO & ORÇAMENTOS (Imagem 2) */}
      {/* ============================================================= */}
      {activeTab === 'calculadora' && (
        <div className="space-y-6">
          {/* Grid Principal: 2 Colunas Lado a Lado */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* ----------------------------------------------------------- */}
            {/* COLUNA ESQUERDA: 1. Compor Produto / Cesta / Encomenda */}
            {/* ----------------------------------------------------------- */}
            <Card className="lg:col-span-6 shadow-xs border-border/80 flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
                      1
                    </span>
                    Compor Produto / Cesta / Encomenda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Modelos Salvos */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Modelo salvo</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 min-w-0">
                        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                          <SelectTrigger className="h-9 text-xs w-full min-w-0">
                            <SelectValue placeholder="Selecione um modelo..." />
                          </SelectTrigger>
                          <SelectContent className="text-xs max-h-56 max-w-[calc(100vw-2rem)] z-50">
                            {recipes.length === 0 ? (
                              <SelectItem value="nenhum" disabled>
                                Nenhum modelo salvo ainda
                              </SelectItem>
                            ) : (
                              recipes.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  <span className="truncate block max-w-[280px] sm:max-w-md">
                                    {r.productName}
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleLoadModel}
                          disabled={!selectedModelId}
                          className="text-xs h-9 flex-1 sm:flex-none"
                        >
                          Carregar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleDeleteModel}
                          disabled={!selectedModelId || !canDelete}
                          title="Excluir modelo selecionado"
                          className="size-9 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Nome da Composição & Salvar Modelo */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nome da composição</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={compositionName}
                        onChange={(e) => setCompositionName(e.target.value)}
                        placeholder="Ex: Caneca personalizada, Kit Festa Luxo"
                        className="h-9 text-xs flex-1 min-w-0"
                      />
                      <Button
                        type="button"
                        onClick={() => handleSaveModel(false)}
                        disabled={savingModel || !compositionName.trim() || (loadedModelId ? !canEdit : !canCreate)}
                        className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-9 shadow-xs shrink-0 sm:w-auto"
                      >
                        {savingModel ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                        Salvar modelo
                      </Button>
                    </div>
                  </div>

                  {/* Adicionar Insumo do Estoque */}
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-medium text-foreground">
                      Adicionar Insumo do Estoque:
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 min-w-0">
                        <Select
                          value={selectedSupplyToAdd}
                          onValueChange={setSelectedSupplyToAdd}
                        >
                          <SelectTrigger className="h-9 text-xs w-full min-w-0">
                            <SelectValue placeholder="Selecione o insumo do estoque..." />
                          </SelectTrigger>
                          <SelectContent className="text-xs max-h-56 max-w-[calc(100vw-2rem)] z-50">
                            {supplies.length === 0 ? (
                              <SelectItem value="vazio" disabled>
                                Nenhum insumo cadastrado no estoque
                              </SelectItem>
                            ) : (
                              supplies.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  <span className="truncate block max-w-[280px] sm:max-w-md">
                                    {s.name} ({formatCurrency(s.unitCost || 0)}/{s.unit})
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          value={supplyQtyToAdd}
                          onChange={(e) => setSupplyQtyToAdd(e.target.value)}
                          placeholder="Qtd"
                          className="h-9 text-xs w-20 sm:w-24 shrink-0"
                        />
                        <Button
                          type="button"
                          onClick={handleAddSupplyToComposition}
                          className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-9 gap-1 shadow-xs flex-1 sm:flex-none shrink-0"
                        >
                          <Plus className="size-3.5" /> Insumo
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Itens na Encomenda */}
                  <div className="space-y-2 pt-2">
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 text-muted-foreground border-b">
                          <tr>
                            <th className="py-2 px-3 font-medium">Item na Encomenda</th>
                            <th className="py-2 px-2 font-medium text-center">Tipo</th>
                            <th className="py-2 px-2 font-medium text-center">Qtd</th>
                            <th className="py-2 px-3 font-medium text-right">Subtotal Custo</th>
                            <th className="py-2 px-2 font-medium text-center">Remover</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {compositionItems.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-muted-foreground">
                                Nenhum item na composição. Adicione insumos do estoque acima!
                              </td>
                            </tr>
                          ) : (
                            compositionItems.map((item) => (
                              <tr key={item.id} className="hover:bg-muted/30">
                                <td className="py-2 px-3 font-medium text-foreground">
                                  {item.name}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                                    INSUMO
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                                    className="w-14 text-center border rounded py-0.5 text-xs bg-background"
                                  />
                                </td>
                                <td className="py-2 px-3 text-right font-medium">
                                  {formatCurrency(item.subtotalCost)}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    onClick={() => handleRemoveCompositionItem(item.id)}
                                    className="text-destructive hover:opacity-80 p-1"
                                    title="Remover item"
                                  >
                                    <XCircle className="size-4 text-red-500" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Subtotal da Composição */}
                    <div className="flex justify-between items-center text-xs px-2 pt-1 font-medium">
                      <span className="text-muted-foreground">Custo Unitário da Composição:</span>
                      <span className="text-foreground text-sm font-semibold">
                        {formatCurrency(unitCompositionCost)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* ----------------------------------------------------------- */}
            {/* COLUNA DIREITA: 2. Custos, Margem Real & Orçamento */}
            {/* ----------------------------------------------------------- */}
            <Card className="lg:col-span-6 shadow-xs border-border/80 flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
                      2
                    </span>
                    Custos, Margem Real & Orçamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Linha 1: Cliente e Nome da Encomenda */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Selecione o Cliente</Label>
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="-- Cliente Avulso --" />
                        </SelectTrigger>
                        <SelectContent className="text-xs max-h-56">
                          <SelectItem value="avulso">-- Cliente Avulso --</SelectItem>
                          {customers.map((c: Customer) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nome da Encomenda no Orçamento</Label>
                      <Input
                        value={orderName}
                        onChange={(e) => setOrderName(e.target.value)}
                        placeholder="Ex: Kit Dia dos Namorados"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {selectedCustomerId === 'avulso' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nome do Cliente Avulso (opcional)</Label>
                      <Input
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        placeholder="Digite o nome do cliente..."
                        className="h-9 text-xs"
                      />
                    </div>
                  )}

                  {/* Quantidade de Encomendas Solicitadas */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Quantidade de Encomendas Solicitadas:
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(e.target.value)}
                      className="h-9 text-xs w-32"
                    />
                  </div>

                  {/* Card Rosa de Markup / Margem de Lucro */}
                  <div className="rounded-2xl p-4 sm:p-5 bg-[#fdf2f7] dark:bg-pink-950/25 border border-pink-200/90 dark:border-pink-900/50 space-y-3.5 shadow-2xs">
                    {/* Linha Superior: Rótulo Dinâmico + Dropdown [ Markup v ] + Badge [ 490% ] */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-foreground">
                        {pricingMode === 'markup' ? 'Markup sobre o custo (%):' : 'Margem de lucro (%):'}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Dropdown com opções de Markup e Margem */}
                        <Select value={pricingMode} onValueChange={(val: 'markup' | 'margem') => handlePricingModeChange(val)}>
                          <SelectTrigger className="h-8 px-3 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 rounded-lg shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="markup">Markup</SelectItem>
                            <SelectItem value="margem">Margem</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Badge roxa/vinho com o valor percentual */}
                        <span className="inline-flex items-center justify-center min-w-16 px-3.5 py-1 rounded-full bg-[#8c3570] dark:bg-[#a64386] text-white font-bold text-xs sm:text-sm shadow-xs">
                          {pricingMode === 'markup' ? `${markupPercent}%` : `${profitMarginPercent}%`}
                        </span>
                      </div>
                    </div>

                    {/* Slider Roxo */}
                    <input
                      type="range"
                      min="0"
                      max={pricingMode === 'markup' ? 1000 : 95}
                      step={pricingMode === 'markup' ? 5 : 1}
                      value={pricingMode === 'markup' ? markupPercent : profitMarginPercent}
                      onChange={(e) => handleSliderChange(Number(e.target.value))}
                      className="w-full h-2 rounded-lg bg-pink-200 dark:bg-pink-900/60 accent-[#8c3570] cursor-pointer"
                    />

                    {/* Texto explicativo dinâmico */}
                    <p className="text-[11px] sm:text-xs text-muted-foreground font-normal">
                      {pricingMode === 'markup' ? (
                        <>
                          <strong className="text-foreground font-semibold">Markup:</strong> acréscimo sobre o custo. Ex.: 100% dobra o custo do produto.
                        </>
                      ) : (
                        <>
                          <strong className="text-foreground font-semibold">Margem:</strong> porcentagem do lucro sobre o preço de venda final. Ex.: 50% de margem resulta no dobro do custo.
                        </>
                      )}
                    </p>

                    {/* Ou digite quanto vai vender no total: (R$): */}
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs text-muted-foreground font-normal">
                        Ou digite quanto vai vender no total: (R$):
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualTotalPrice}
                        onChange={(e) => handleManualPriceChange(e.target.value)}
                        placeholder={effectiveTotalPrice > 0 ? effectiveTotalPrice.toFixed(2) : '1,25'}
                        className="h-10 text-sm font-semibold bg-white dark:bg-slate-900 border-pink-200 dark:border-pink-900/50 rounded-xl px-3 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Forma de Pagamento do Cliente */}
                  <div className="space-y-2.5 pt-2">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      Forma de Pagamento do Cliente:
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Pix */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          paymentMethod === 'pix'
                            ? 'border-[#8c3570] bg-pink-50/60 dark:bg-pink-950/30 ring-1 ring-[#8c3570]'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className={`size-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'pix' ? 'border-[#8c3570]' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {paymentMethod === 'pix' && <div className="size-2.5 rounded-full bg-[#8c3570]" />}
                        </div>
                        <div className="size-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                          <svg className="size-4.5" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M407.3 358.5c-20.9 0-40.4-8.2-55.2-23l-59.5-59.5c-4.4-4.4-11.5-4.4-15.9 0l-59.4 59.5c-14.8 14.8-34.3 23-55.2 23s-40.4-8.2-55.2-23l-34.7-34.7c-7.3-7.3-7.3-19.1 0-26.4l34.7-34.7c14.8-14.8 34.3-23 55.2-23s40.4 8.2 55.2 23l59.4 59.5c4.4 4.4 11.5 4.4 15.9 0l59.5-59.5c14.8-14.8 34.3-23 55.2-23s40.4 8.2 55.2 23l34.7 34.7c7.3 7.3 7.3 19.1 0 26.4l-34.7 34.7c-14.8 14.9-34.3 23-55.2 23z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-foreground">Pix</div>
                          <div className="text-[11px] text-muted-foreground">À vista</div>
                        </div>
                      </button>

                      {/* Cartão */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cartao')}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          paymentMethod === 'cartao'
                            ? 'border-[#8c3570] bg-pink-50/60 dark:bg-pink-950/30 ring-1 ring-[#8c3570]'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className={`size-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'cartao' ? 'border-[#8c3570]' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {paymentMethod === 'cartao' && <div className="size-2.5 rounded-full bg-[#8c3570]" />}
                        </div>
                        <div className="size-8 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                          <CreditCard className="size-4.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-foreground">Cartão</div>
                          <div className="text-[11px] text-muted-foreground">Crédito / Débito</div>
                        </div>
                      </button>

                      {/* Dinheiro */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('dinheiro')}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          paymentMethod === 'dinheiro'
                            ? 'border-[#8c3570] bg-pink-50/60 dark:bg-pink-950/30 ring-1 ring-[#8c3570]'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className={`size-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'dinheiro' ? 'border-[#8c3570]' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {paymentMethod === 'dinheiro' && <div className="size-2.5 rounded-full bg-[#8c3570]" />}
                        </div>
                        <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Banknote className="size-4.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-foreground">Dinheiro</div>
                          <div className="text-[11px] text-muted-foreground">Espécie</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Sinal de Entrada / Início da Produção */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        🔒 Sinal de Entrada / Início da Produção:
                      </Label>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] dark:bg-amber-950/60 dark:text-amber-300 font-semibold shadow-2xs">
                        {depositOption === '100' ? '100% À vista' : `${depositOption}% Entrada`}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDepositOption('50')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                          depositOption === '50'
                            ? 'bg-[#8c3570] text-white border-[#8c3570] shadow-xs'
                            : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        50% (Padrão)
                      </button>

                      <button
                        type="button"
                        onClick={() => setDepositOption('30')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                          depositOption === '30'
                            ? 'bg-[#8c3570] text-white border-[#8c3570] shadow-xs'
                            : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        30%
                      </button>

                      <button
                        type="button"
                        onClick={() => setDepositOption('100')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                          depositOption === '100'
                            ? 'bg-[#8c3570] text-white border-[#8c3570] shadow-xs'
                            : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        À Vista (100%)
                      </button>

                      <button
                        type="button"
                        onClick={() => setDepositOption('custom')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                          depositOption === 'custom'
                            ? 'bg-[#8c3570] text-white border-[#8c3570] shadow-xs'
                            : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        R$ Outro valor
                      </button>
                    </div>

                    {depositOption === 'custom' && (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customDepositValue}
                        onChange={(e) => setCustomDepositValue(e.target.value)}
                        placeholder="Digite o valor do sinal em R$..."
                        className="h-8 text-xs mt-1.5"
                      />
                    )}

                    {/* Cards Visuais de Sinal e Restante */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 text-center">
                        <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 block uppercase tracking-wider">
                          💰 SINAL A RECEBER AGORA
                        </span>
                        <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(depositValues.deposit)}
                        </span>
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 text-center">
                        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 block uppercase tracking-wider">
                          📦 RESTANTE NA ENTREGA
                        </span>
                        <span className="text-base font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(depositValues.remaining)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo de KPIs */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                    <div className="rounded border bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground uppercase block font-medium">CUSTO TOTAL</span>
                      <span className="text-xs font-bold text-foreground">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>

                    <div className="rounded border bg-purple-50/50 dark:bg-purple-950/20 p-2">
                      <span className="text-[10px] text-purple-800 dark:text-purple-300 uppercase block font-medium">PREÇO SUGERIDO</span>
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrency(effectiveTotalPrice)}
                      </span>
                    </div>

                    <div className={`rounded border p-2 ${effectiveMarginAmount < 0 ? 'bg-red-50/60 dark:bg-red-950/20' : 'bg-emerald-50/50 dark:bg-emerald-950/20'}`}>
                      <span className={`text-[10px] uppercase block font-medium ${effectiveMarginAmount < 0 ? 'text-red-800 dark:text-red-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                        {effectiveMarginAmount < 0 ? 'PREJUÍZO ESTIMADO' : 'MARGEM DE LUCRO'}
                      </span>
                      <span className={`text-xs font-bold ${effectiveMarginAmount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(effectiveMarginAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação Imediata */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      type="button"
                      onClick={handleGenerateQuote}
                      disabled={!canCreateQuote}
                      className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-10 font-semibold shadow-xs"
                    >
                      📄 Gerar Orçamento
                    </Button>

                    <Button
                      type="button"
                      onClick={handleLaunchDirectSale}
                      disabled={launchingSale || !canCreateOrder}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 font-semibold shadow-xs"
                    >
                      {launchingSale ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                      ✓ Lançar Venda
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* SEÇÃO INFERIOR: Orçamentos Gerados (Aguardando Aprovação) */}
          {/* ----------------------------------------------------------- */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                📋 Orçamentos Gerados (Aguardando Aprovação do Cliente)
              </CardTitle>
              <CardDescription className="text-xs">
                Quando o cliente fechar, clique em "Aprovar Venda" para registrar a venda no Dashboard. Se não fechar, clique em "Cancelar".
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-50/60 dark:bg-purple-950/20 text-purple-950 dark:text-purple-200 border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Data / Hora</th>
                      <th className="py-2.5 px-3 font-semibold">Cliente</th>
                      <th className="py-2.5 px-3 font-semibold">Produto</th>
                      <th className="py-2.5 px-2 font-semibold text-center">Pagamento</th>
                      <th className="py-2.5 px-2 font-semibold text-center">Qtd</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Valor Total</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Ações de Fechamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {localQuotes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          Nenhum orçamento pendente. Monte a composição acima e clique em "Gerar Orçamento"!
                        </td>
                      </tr>
                    ) : (
                      localQuotes.map((q) => (
                        <tr key={q.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {new Date(q.createdAt).toLocaleDateString('pt-BR')} {new Date(q.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {q.customerName}
                          </td>
                          <td className="py-2.5 px-3 text-foreground">
                            {q.productName}
                          </td>
                          <td className="py-2.5 px-2 text-center uppercase text-[11px] font-medium text-muted-foreground">
                            {q.paymentMethod}
                          </td>
                          <td className="py-2.5 px-2 text-center font-medium">
                            {q.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">
                            {formatCurrency(q.totalPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {q.status === 'pending' && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                                Aguardando Aprovação
                              </Badge>
                            )}
                            {q.status === 'approved' && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                                Aprovado {q.orderNumber ? `(${q.orderNumber})` : ''}
                              </Badge>
                            )}
                            {q.status === 'cancelled' && (
                              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                                Cancelado
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {q.status === 'pending' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveQuote(q)}
                                  disabled={approvingQuoteId === q.id || !canCreateOrder}
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] shadow-xs"
                                >
                                  {approvingQuoteId === q.id ? (
                                    <Loader2 className="size-3 animate-spin mr-1" />
                                  ) : null}
                                  Aprovar Venda
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendWhatsAppQuote(q)}
                                  className="h-7 px-2 text-[11px] gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  title="Enviar proposta via WhatsApp"
                                >
                                  <MessageCircle className="size-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelQuote(q.id)}
                                  disabled={!canEditQuote}
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                                  title="Cancelar orçamento"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : q.status === 'approved' ? (
                              <span className="text-[11px] text-emerald-600 font-medium">
                                Pedido Criado
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Cancelado
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ArtisanPricingPage;
