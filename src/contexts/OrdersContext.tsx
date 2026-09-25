// @refresh reset
/**
 * OrdersContext
 *
 * Mantém um único listener onSnapshot para pedidos, compartilhado por
 * todas as páginas (Dashboard, Agenda, Relatórios, NotificationBell…).
 * Suporta filtragem por equipe/responsável para o Admin (individual ou múltipla).
 */

import { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { collection, query, where, orderBy, onSnapshot, QuerySnapshot, DocumentData, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Order, UserProfile } from '../app/types';

export interface TeamMemberOption {
  uid: string;
  displayName: string;
  email?: string;
  role?: string;
  orderCount: number;
}

export interface OrdersContextValue {
  orders: Order[];
  allOrders: Order[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => void;
  selectedUserIds: string[];
  setSelectedUserIds: (ids: string[]) => void;
  selectSoloUser: (id: string) => void;
  toggleUserId: (id: string) => void;
  selectAllUsers: () => void;
  clearUserFilter: () => void;
  teamMembers: TeamMemberOption[];
  unassignedCount: number;
  isFilterActive: boolean;
  selectedFilterLabel: string;
}

const STORAGE_KEY = 'luisices_admin_selected_users';

function getInitialSelectedUsers(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const OrdersContext = createContext<OrdersContextValue>({
  orders: [],
  allOrders: [],
  loading: true,
  error: null,
  refreshOrders: () => {},
  selectedUserIds: [],
  setSelectedUserIds: () => {},
  selectSoloUser: () => {},
  toggleUserId: () => {},
  selectAllUsers: () => {},
  clearUserFilter: () => {},
  teamMembers: [],
  unassignedCount: 0,
  isFilterActive: false,
  selectedFilterLabel: 'Todos (Tudo)',
});

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedUserIds, setSelectedUserIdsState] = useState<string[]>(getInitialSelectedUsers);
  const [reloadToken, setReloadToken] = useState(0);

  const refreshOrders = useCallback(() => {
    setReloadToken((prev) => prev + 1);
  }, []);

  // Detecção de retomada de segundo plano no mobile (sleep / alternância de apps) e reconexão de rede
  useEffect(() => {
    const handleResume = async () => {
      if (document.visibilityState === 'visible' && user) {
        try {
          // Força renovação do token do Firebase caso tenha expirado durante o bloqueio de tela
          await user.getIdToken(false);
        } catch {}
        setReloadToken((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('online', handleResume);
    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('online', handleResume);
    };
  }, [user]);

  // Carregar perfis em tempo real quando for admin ou funcionário
  useEffect(() => {
    if (!user || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'funcionario')) {
      setProfiles([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'userProfiles'),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        } as UserProfile));
        setProfiles(list);
      },
      (err) => {
        console.warn('OrdersContext: aviso ao escutar userProfiles:', err);
      }
    );

    return () => unsub();
  }, [user, userProfile?.role, reloadToken]);

  // Listener para pedidos no Firestore
  useEffect(() => {
    if (!user || !userProfile || authLoading) {
      setAllOrders([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const ordersQuery = userProfile?.role === 'admin'
      ? query(
          collection(db, 'orders'),
          where('deletedAt', '==', null),
          orderBy('createdAt', 'desc'),
          limit(200)
        )
      : query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          where('deletedAt', '==', null),
          orderBy('createdAt', 'desc'),
          limit(200)
        );

    const mapSnapshot = (snapshot: QuerySnapshot<DocumentData>): Order[] => snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerId: data.customerId,
        productName: data.productName,
        quantity: data.quantity,
        price: data.price,
        status: data.status,
        deliveryDate: data.deliveryDate,
        notes: data.notes,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
        updatedAt: data.updatedAt,
        version: typeof data.version === 'number' ? data.version : 1,
        tags: data.tags,
        payment: data.payment,
        createdByName: data.createdByName || (data.userId === user.uid
          ? user.displayName || user.email || user.uid
          : undefined),
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        assignedAt: data.assignedAt,
        assignedBy: data.assignedBy,
        productionWorkflow: data.productionWorkflow,
        attachments: data.attachments,
        isExchange: data.isExchange ?? false,
        exchangeNotes: data.exchangeNotes,
        exchangeItems: data.exchangeItems,
        cardColor: data.cardColor,
        userId: data.userId,
      } as Order;
    });

    let ownOrders: Order[] = [];
    let assignedOrders: Order[] = [];
    const publish = () => {
      const ordersById = new Map<string, Order>();
      [...ownOrders, ...assignedOrders].forEach(order => ordersById.set(order.id, order));
      const orders = [...ordersById.values()].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );
      setAllOrders(orders);
      setLoading(false);
      setError(null);
    };

    const unsubscribers = [onSnapshot(
      ordersQuery,
      (snapshot) => {
        ownOrders = mapSnapshot(snapshot);
        publish();
      },
      (err) => {
        console.warn('OrdersContext: aviso ao escutar orders no Firestore:', err?.message || err);
        setError(err.message);
        setLoading(false);
      }
    )];

    if (userProfile?.role === 'funcionario') {
      const assignedQuery = query(
        collection(db, 'orders'),
        where('assignedTo', '==', user.uid),
        where('deletedAt', '==', null),
        orderBy('createdAt', 'desc')
      );
      unsubscribers.push(onSnapshot(
        assignedQuery,
        (snapshot) => {
          assignedOrders = mapSnapshot(snapshot);
          publish();
        },
        (err) => {
          console.error('OrdersContext: erro nos pedidos atribuídos:', err);
          setError(err.message);
          setLoading(false);
        }
      ));
    }

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [user, userProfile?.role, authLoading, reloadToken]);

  // Enriquece pedidos com o nome do criador se disponível nos perfis
  const enrichedOrders = useMemo(() => {
    const profileMap = new Map<string, string>();
    profiles.forEach((p) => {
      if (p.uid) {
        const name = p.displayName || p.email;
        if (name) profileMap.set(p.uid, name);
      }
    });

    return allOrders.map((order) => {
      const existing = order.createdByName;
      if (existing && existing !== 'Usuário proprietário') {
        return order;
      }
      const resolved = (order.userId && profileMap.get(order.userId))
        || (order.userId === user?.uid ? user.displayName || user.email || 'Você' : undefined);

      if (!resolved) return order;
      return { ...order, createdByName: resolved };
    });
  }, [allOrders, profiles, user]);

  // Lista de membros de equipe para o filtro e resolução de nomes
  const teamMembers = useMemo((): TeamMemberOption[] => {
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'funcionario') return [];

    const memberMap = new Map<string, TeamMemberOption>();

    profiles.forEach((p) => {
      memberMap.set(p.uid, {
        uid: p.uid,
        displayName: p.displayName || p.email || 'Usuário',
        email: p.email,
        role: p.role,
        orderCount: 0,
      });
    });

    enrichedOrders.forEach((o) => {
      if (o.assignedTo && !memberMap.has(o.assignedTo)) {
        memberMap.set(o.assignedTo, {
          uid: o.assignedTo,
          displayName: o.assignedToName || 'Funcionário',
          role: 'funcionario',
          orderCount: 0,
        });
      }
      if (o.userId && !memberMap.has(o.userId)) {
        memberMap.set(o.userId, {
          uid: o.userId,
          displayName: o.createdByName || 'Usuário',
          role: 'user',
          orderCount: 0,
        });
      }
    });

    // Contabiliza pedidos atribuídos ou de responsabilidade
    enrichedOrders.forEach((o) => {
      if (o.assignedTo && memberMap.has(o.assignedTo)) {
        memberMap.get(o.assignedTo)!.orderCount += 1;
      } else if (!o.assignedTo && o.userId && memberMap.has(o.userId)) {
        memberMap.get(o.userId)!.orderCount += 1;
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return 1;
      if (a.role !== 'admin' && b.role === 'admin') return -1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [profiles, enrichedOrders, userProfile?.role]);

  const unassignedCount = useMemo(() => {
    return enrichedOrders.filter(o => !o.assignedTo).length;
  }, [enrichedOrders]);

  const isFilterActive = useMemo(() => {
    if (userProfile?.role !== 'admin') return false;
    if (!selectedUserIds || selectedUserIds.length === 0) return false;
    if (selectedUserIds.length === 1 && selectedUserIds[0] === 'all') return false;
    return true;
  }, [userProfile?.role, selectedUserIds]);

  // Filtra pedidos se o admin tiver selecionado responsáveis específicos
  const filteredOrders = useMemo(() => {
    if (!isFilterActive) {
      return enrichedOrders;
    }

    return enrichedOrders.filter((order) => {
      // 1. "Sem responsável" selecionado
      if (selectedUserIds.includes('unassigned') && !order.assignedTo) {
        return true;
      }

      // 2. Responsável atribuído está entre os selecionados
      if (order.assignedTo && selectedUserIds.includes(order.assignedTo)) {
        return true;
      }

      // 3. Pedido não atribuído cujo criador está selecionado
      if (!order.assignedTo && order.userId && selectedUserIds.includes(order.userId)) {
        return true;
      }

      // 4. Se o criador for um funcionário selecionado
      if (selectedUserIds.includes(order.userId)) {
        const creator = profiles.find((p) => p.uid === order.userId);
        if (creator?.role === 'funcionario') {
          return true;
        }
      }

      return false;
    });
  }, [enrichedOrders, isFilterActive, selectedUserIds, profiles]);

  const selectedFilterLabel = useMemo(() => {
    if (!isFilterActive) return 'Todos (Tudo)';
    if (selectedUserIds.length === 1) {
      const id = selectedUserIds[0];
      if (id === 'unassigned') return 'Sem responsável';
      const member = teamMembers.find((m) => m.uid === id);
      return member?.displayName || '1 responsável';
    }
    if (selectedUserIds.length === 2) {
      const names = selectedUserIds.map((id) => {
        if (id === 'unassigned') return 'Sem responsável';
        const member = teamMembers.find((m) => m.uid === id);
        return member?.displayName || '1 responsável';
      });
      return names.join(', ');
    }
    return `${selectedUserIds.length} selecionados`;
  }, [isFilterActive, selectedUserIds, teamMembers]);

  const setSelectedUserIds = useCallback((ids: string[]) => {
    const cleanIds = ids.filter(Boolean);
    setSelectedUserIdsState(cleanIds);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cleanIds));
    } catch {}
  }, []);

  const selectSoloUser = useCallback((id: string) => {
    setSelectedUserIds([id]);
  }, [setSelectedUserIds]);

  const toggleUserId = useCallback((id: string) => {
    setSelectedUserIdsState((prev) => {
      let next: string[];
      if (id === 'all') {
        next = [];
      } else if (prev.includes(id)) {
        next = prev.filter((x) => x !== id && x !== 'all');
      } else {
        next = [...prev.filter((x) => x !== 'all'), id];
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const selectAllUsers = useCallback(() => {
    setSelectedUserIds([]);
  }, [setSelectedUserIds]);

  const clearUserFilter = useCallback(() => {
    setSelectedUserIds([]);
  }, [setSelectedUserIds]);

  return (
    <OrdersContext.Provider
      value={{
        orders: filteredOrders,
        allOrders: enrichedOrders,
        loading,
        error,
        refreshOrders,
        selectedUserIds,
        setSelectedUserIds,
        selectSoloUser,
        toggleUserId,
        selectAllUsers,
        clearUserFilter,
        teamMembers,
        unassignedCount,
        isFilterActive,
        selectedFilterLabel,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  return useContext(OrdersContext);
}
