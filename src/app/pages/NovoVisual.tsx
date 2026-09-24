import React, { useState, useEffect } from 'react';
import { LuisicesNovoExperience } from '../components/novo/LuisicesNovoExperience';
import { STORE_PRODUCTS } from '../data/storeProductsData';
import { StoreProduct } from '../types/store';
import { ArchiveItem } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { INITIAL_ARCHIVE_ITEMS } from '../../archiveData';

function parseStringList(val: any, fallback: string[] = []): string[] {
  if (!val) return fallback;
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') return (item.name || item.title || item.tag || '').toString().trim();
        return String(item).trim();
      })
      .filter(Boolean);
  }
  if (typeof val === 'string' && val.trim()) {
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return fallback;
}

export const NovoVisual: React.FC = () => {
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>(INITIAL_ARCHIVE_ITEMS);
  const [cartItems, setCartItems] = useState<Array<{
    product: StoreProduct;
    quantity: number;
    selectedFinishes: Record<string, string>;
    totalPrice: number;
    celebrationDate?: string;
    namesOrInitials?: string;
  }>>([
    {
      product: STORE_PRODUCTS[0],
      quantity: 30,
      selectedFinishes: {
        foil: 'finish-foil-rose',
        paper: 'finish-paper-cotton',
        seal: 'finish-seal-botanic',
        ribbon: 'finish-ribbon-silk',
      },
      totalPrice: 30 * (STORE_PRODUCTS[0].basePrice + 2.50 + 3.80 + 3.20 + 2.90),
      celebrationDate: '2026-11-15',
      namesOrInitials: 'Luísa & Gabriel',
    },
  ]);

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Attempt to load gallery items from Firebase if available
  useEffect(() => {
    let isMounted = true;
    const fetchGallery = async () => {
      try {
        const snap = await getDocs(collection(db, 'gallery'));
        if (!snap.empty && isMounted) {
          const liveItems: ArchiveItem[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const safeTags = parseStringList(data.tags || data.aiTags, ['#afeto', '#artesanal']);
            const safePapers = parseStringList(data.materials || data.papers, ['Papel Algodão 300g', 'Lamicote Rosé']);

            return {
              id: docSnap.id,
              title: data.title || data.name || 'Projeto Autoral',
              theme: data.category || data.theme || 'Ateliê',
              category: 'floral_luxo',
              description: data.description || 'Peça artesanal exclusiva do ateliê.',
              papers: safePapers,
              layersCount: typeof data.layersCount === 'number' ? data.layersCount : 3,
              silhouetteTips: data.silhouetteTips || 'Corte com lâmina de precisão.',
              imageUrl: data.imageUrl || data.photoUrl || data.url || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
              tags: safeTags,
            };
          });
          setArchiveItems(liveItems);
        }
      } catch (err) {
        // Fallback to static archive data silently
        console.debug('Using default atelier archive items');
      }
    };
    fetchGallery();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddToCart = (item: {
    product: StoreProduct;
    quantity: number;
    selectedFinishes: Record<string, string>;
    totalPrice: number;
    celebrationDate?: string;
    namesOrInitials?: string;
  }) => {
    setCartItems((prev) => [...prev, item]);
  };

  return (
    <div className="min-h-screen">
      <LuisicesNovoExperience
        archiveItems={archiveItems}
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
};

export default NovoVisual;
