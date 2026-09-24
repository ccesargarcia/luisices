import React, { useState, useEffect } from 'react';
import { LuisicesNovoExperience } from '../components/novo/LuisicesNovoExperience';
import { STORE_PRODUCTS } from '../data/storeProductsData';
import { StoreProduct } from '../types/store';
import { ArchiveItem } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { INITIAL_ARCHIVE_ITEMS } from '../../archiveData';

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
      selectedFinishes: { foil: 'finish-foil-rose', paper: 'finish-paper-cotton', seal: 'finish-seal-botanic', ribbon: 'finish-ribbon-silk' },
      totalPrice: 30 * (STORE_PRODUCTS[0].basePrice + 2.50 + 3.80 + 3.20 + 2.90),
      celebrationDate: '2026-11-15',
      namesOrInitials: 'Luísa & Gabriel',
    },
  ]);

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Attempt to load gallery items from Firebase if available
  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const snap = await getDocs(collection(db, 'gallery'));
        if (!snap.empty) {
          const liveItems: ArchiveItem[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || 'Projeto Autoral',
              theme: data.category || 'Ateliê',
              category: 'floral_luxo',
              description: data.description || 'Peça artesanal exclusiva do ateliê.',
              papers: data.materials || ['Papel Algodão 300g', 'Lamicote Rosé'],
              layersCount: data.layersCount || 3,
              silhouetteTips: data.silhouetteTips || 'Corte com lâmina de precisão.',
              imageUrl: data.imageUrl || data.photoUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
              tags: data.tags || ['#afeto', '#artesanal'],
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
