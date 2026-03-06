import { useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function FixNegativeValues() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({
    customers: 0,
    orders: 0,
    quotes: 0,
    products: 0,
  });
  const [isComplete, setIsComplete] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const fixCustomers = async () => {
    addLog('🔍 Verificando clientes...');

    if (!auth.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);

    let fixed = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const updates: any = {};

      if ((data.totalSpent ?? 0) < 0) {
        updates.totalSpent = 0;
        addLog(`  ❌ Cliente ${data.name}: totalSpent ${data.totalSpent} → 0`);
      }

      if ((data.totalOrders ?? 0) < 0) {
        updates.totalOrders = 0;
        addLog(`  ❌ Cliente ${data.name}: totalOrders ${data.totalOrders} → 0`);
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'customers', docSnap.id), updates);
        fixed++;
      }
    }

    addLog(`✅ ${fixed} clientes corrigidos\n`);
    return fixed;
  };

  const fixOrders = async () => {
    addLog('🔍 Verificando pedidos...');

    if (!auth.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', auth.currentUser.uid),
      where('deletedAt', '==', null)
    );
    const snapshot = await getDocs(q);

    let fixed = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const updates: any = {};

      if ((data.price ?? 0) < 0) {
        updates.price = 0;
        addLog(`  ❌ Pedido ${data.orderNumber}: price ${data.price} → 0`);
      }

      if (data.payment) {
        const paymentUpdates: any = {};
        let hasPaymentFix = false;

        if ((data.payment.totalAmount ?? 0) < 0) {
          paymentUpdates.totalAmount = 0;
          hasPaymentFix = true;
          addLog(`  ❌ Pedido ${data.orderNumber}: payment.totalAmount ${data.payment.totalAmount} → 0`);
        }

        if ((data.payment.paidAmount ?? 0) < 0) {
          paymentUpdates.paidAmount = 0;
          hasPaymentFix = true;
          addLog(`  ❌ Pedido ${data.orderNumber}: payment.paidAmount ${data.payment.paidAmount} → 0`);
        }

        if ((data.payment.remainingAmount ?? 0) < 0) {
          paymentUpdates.remainingAmount = 0;
          hasPaymentFix = true;
          addLog(`  ❌ Pedido ${data.orderNumber}: payment.remainingAmount ${data.payment.remainingAmount} → 0`);
        }

        if (hasPaymentFix) {
          updates.payment = { ...data.payment, ...paymentUpdates };
        }
      }

      if (data.exchangeItems && Array.isArray(data.exchangeItems)) {
        const fixedItems = data.exchangeItems.map((item: any) => ({
          ...item,
          value: item.value && item.value < 0 ? 0 : item.value,
          quantity: (item.quantity ?? 0) < 0 ? 0 : item.quantity
        }));

        if (JSON.stringify(fixedItems) !== JSON.stringify(data.exchangeItems)) {
          updates.exchangeItems = fixedItems;
          addLog(`  ❌ Pedido ${data.orderNumber}: exchangeItems corrigidos`);
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'orders', docSnap.id), updates);
        fixed++;
      }
    }

    addLog(`✅ ${fixed} pedidos corrigidos\n`);
    return fixed;
  };

  const fixQuotes = async () => {
    addLog('🔍 Verificando orçamentos...');

    if (!auth.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const quotesRef = collection(db, 'quotes');
    const q = query(quotesRef, where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);

    let fixed = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const updates: any = {};

      if ((data.totalPrice ?? 0) < 0) {
        updates.totalPrice = 0;
        addLog(`  ❌ Orçamento ${data.quoteNumber}: totalPrice ${data.totalPrice} → 0`);
      }

      if (data.discount !== null && data.discount !== undefined && data.discount < 0) {
        updates.discount = 0;
        addLog(`  ❌ Orçamento ${data.quoteNumber}: discount ${data.discount} → 0`);
      }

      if (data.items && Array.isArray(data.items)) {
        const fixedItems = data.items.map((item: any) => ({
          ...item,
          unitPrice: (item.unitPrice ?? 0) < 0 ? 0 : item.unitPrice,
          quantity: (item.quantity ?? 0) < 0 ? 0 : item.quantity
        }));

        if (JSON.stringify(fixedItems) !== JSON.stringify(data.items)) {
          updates.items = fixedItems;
          addLog(`  ❌ Orçamento ${data.quoteNumber}: items corrigidos`);
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'quotes', docSnap.id), updates);
        fixed++;
      }
    }

    addLog(`✅ ${fixed} orçamentos corrigidos\n`);
    return fixed;
  };

  const fixProducts = async () => {
    addLog('🔍 Verificando produtos...');

    if (!auth.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);

    let fixed = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const updates: any = {};

      if ((data.unitPrice ?? 0) < 0) {
        updates.unitPrice = 0;
        addLog(`  ❌ Produto ${data.name}: unitPrice ${data.unitPrice} → 0`);
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'products', docSnap.id), updates);
        fixed++;
      }
    }

    addLog(`✅ ${fixed} produtos corrigidos\n`);
    return fixed;
  };

  const runFix = async () => {
    setIsRunning(true);
    setIsComplete(false);
    setLogs([]);

    try {
      addLog('🚀 Iniciando correção de valores negativos...\n');

      const customersFixed = await fixCustomers();
      const ordersFixed = await fixOrders();
      const quotesFixed = await fixQuotes();
      const productsFixed = await fixProducts();

      setStats({
        customers: customersFixed,
        orders: ordersFixed,
        quotes: quotesFixed,
        products: productsFixed,
      });

      const total = customersFixed + ordersFixed + quotesFixed + productsFixed;

      addLog('═══════════════════════════════════════');
      addLog(`🎉 Correção concluída!`);
      addLog(`📊 Total: ${total} registros corrigidos`);
      addLog('═══════════════════════════════════════');

      setIsComplete(true);
    } catch (error: any) {
      addLog(`❌ Erro: ${error.message}`);
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Corrigir Valores Negativos</CardTitle>
          <CardDescription>
            Esta ferramenta corrige valores monetários negativos nos seus dados.
            Será aplicado a todos os seus registros de clientes, pedidos, orçamentos e produtos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação irá modificar seus dados no banco.
              A correção será aplicada apenas aos seus registros.
            </AlertDescription>
          </Alert>

          <Button
            onClick={runFix}
            disabled={isRunning}
            size="lg"
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Corrigindo...
              </>
            ) : (
              'Executar Correção'
            )}
          </Button>

          {isComplete && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Correção concluída com sucesso!</strong>
                <div className="mt-2 space-y-1 text-sm">
                  <div>• {stats.customers} clientes corrigidos</div>
                  <div>• {stats.orders} pedidos corrigidos</div>
                  <div>• {stats.quotes} orçamentos corrigidos</div>
                  <div>• {stats.products} produtos corrigidos</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {logs.length > 0 && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm">Log de Execução</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap font-mono">
                  {logs.join('\n')}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
