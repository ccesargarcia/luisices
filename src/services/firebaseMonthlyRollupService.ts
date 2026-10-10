import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SaleRecord } from '../app/types';

export const MONTHLY_SUMMARIES_COLLECTION = 'salesMonthlySummaries';

export interface MonthlySalesSummary {
  id: string; // `${yearMonth}_${userId}`
  yearMonth: string; // 'YYYY-MM'
  userId: string;
  totalRevenue: number; // Faturamento realizado (pedidos concluídos)
  totalValidAmount: number; // Volume total válido (concluídos + em produção + pendentes)
  totalOrders: number;  // Quantidade total de pedidos válidos
  completedCount: number;
  cancelledCount: number;
  cancelledAmount: number;
  inProgressCount: number;
  pendingCount: number;
  totalPaid: number;    // Total efetivamente recebido em caixa
  totalPending: number; // Saldo pendente a receber
  settlementRate: number; // Percentual quitado (0 - 100)
  paymentMethods: Record<string, number>; // { pix: 5000, credit: 3000, ... }
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  updatedAt: string;
}

/**
 * Função pura determinística para computar o Rollup Mensal a partir dos registros de vendas
 */
export function computeMonthlyRollup(
  yearMonth: string,
  userId: string,
  sales: SaleRecord[]
): MonthlySalesSummary {
  const monthSales = sales.filter((s) => {
    const saleDate = s.date || s.createdAt || '';
    return saleDate.startsWith(yearMonth);
  });

  const validSales = monthSales.filter((s) => s.status !== 'cancelled');
  const completedSales = validSales.filter((s) => s.status === 'completed');
  const inProgressSales = validSales.filter((s) => s.status === 'in-progress');
  const pendingSales = validSales.filter((s) => s.status === 'pending');
  const cancelledSales = monthSales.filter((s) => s.status === 'cancelled');

  const totalRevenue = completedSales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalValidAmount = validSales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const cancelledAmount = cancelledSales.reduce((sum, s) => sum + (s.amount || 0), 0);

  // Fluxo de pagamentos e caixa
  const paymentMethods: Record<string, number> = {};
  let totalPending = 0;

  validSales.forEach((s) => {
    const saleAmount = s.amount || 0;
    const isCompleted = s.status === 'completed' || s.paymentStatus === 'paid';

    let paid = s.paidAmount || 0;
    if (isCompleted && paid === 0 && saleAmount > 0) {
      paid = saleAmount;
    }

    const remaining = Math.max(0, saleAmount - paid);
    totalPending += remaining;

    if (paid > 0) {
      const method = s.paymentMethod || 'other';
      paymentMethods[method] = (paymentMethods[method] || 0) + paid;
    }
  });

  const totalPaid = Object.values(paymentMethods).reduce((sum, val) => sum + val, 0);
  const totalAccounted = totalPaid + totalPending;
  const settlementRate = totalAccounted > 0 ? (totalPaid / totalAccounted) * 100 : 100;

  // Produtos mais vendidos no mês
  const prodMap = new Map<string, { count: number; revenue: number }>();
  monthSales.forEach((s) => {
    const prodName = s.productName || 'Produto';
    const cur = prodMap.get(prodName) ?? { count: 0, revenue: 0 };
    prodMap.set(prodName, {
      count: cur.count + (s.quantity || 1),
      revenue: cur.revenue + (s.status === 'completed' ? (s.amount || 0) : 0),
    });
  });

  const topProducts = Array.from(prodMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const docId = `${yearMonth}_${userId}`;

  return {
    id: docId,
    yearMonth,
    userId,
    totalRevenue,
    totalValidAmount,
    totalOrders: validSales.length,
    completedCount: completedSales.length,
    cancelledCount: cancelledSales.length,
    cancelledAmount,
    inProgressCount: inProgressSales.length,
    pendingCount: pendingSales.length,
    totalPaid,
    totalPending,
    settlementRate,
    paymentMethods,
    topProducts,
    updatedAt: new Date().toISOString(),
  };
}

class FirebaseMonthlyRollupService {
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    return user.uid;
  }

  /**
   * Buscar rollup de um mês específico
   */
  async getSummary(yearMonth: string, targetUserId?: string): Promise<MonthlySalesSummary | null> {
    const userId = targetUserId || this.getCurrentUserId();
    const docId = `${yearMonth}_${userId}`;
    const snap = await getDoc(doc(db, MONTHLY_SUMMARIES_COLLECTION, docId));
    if (!snap.exists()) return null;
    return snap.data() as MonthlySalesSummary;
  }

  /**
   * Buscar rollups de todos os meses de um ano
   */
  async getYearSummaries(year: string, targetUserId?: string): Promise<MonthlySalesSummary[]> {
    const userId = targetUserId || this.getCurrentUserId();
    const q = query(
      collection(db, MONTHLY_SUMMARIES_COLLECTION),
      where('userId', '==', userId),
      where('yearMonth', '>=', `${year}-01`),
      where('yearMonth', '<=', `${year}-12`),
      orderBy('yearMonth', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MonthlySalesSummary);
  }

  /**
   * Salvar ou atualizar um rollup mensal de forma idempotente
   */
  async saveMonthlySummary(summary: MonthlySalesSummary): Promise<void> {
    const docRef = doc(db, MONTHLY_SUMMARIES_COLLECTION, summary.id);
    await setDoc(docRef, summary, { merge: true });
  }

  /**
   * Sincronizar meses passados (meses fechados) em lote
   * Não sincroniza o mês atual automaticamente pois ele ainda está aberto recebendo vendas diárias
   */
  async syncPastClosedMonths(userId: string, allSales: SaleRecord[]): Promise<number> {
    const currentYearMonth = new Date().toISOString().substring(0, 7);

    // Identificar todos os yearMonths presentes nas vendas
    const monthsSet = new Set<string>();
    allSales.forEach((s) => {
      const d = s.date || s.createdAt;
      if (d && typeof d === 'string' && d.length >= 7) {
        const ym = d.substring(0, 7);
        // Exclui o mês atual para focar nos meses consolidados/fechados
        if (ym < currentYearMonth) {
          monthsSet.add(ym);
        }
      }
    });

    if (monthsSet.size === 0) return 0;

    const batch = writeBatch(db);
    let count = 0;

    for (const ym of monthsSet) {
      const summary = computeMonthlyRollup(ym, userId, allSales);
      const docRef = doc(db, MONTHLY_SUMMARIES_COLLECTION, summary.id);
      batch.set(docRef, summary, { merge: true });
      count += 1;
    }

    await batch.commit();
    return count;
  }
}

export const firebaseMonthlyRollupService = new FirebaseMonthlyRollupService();
