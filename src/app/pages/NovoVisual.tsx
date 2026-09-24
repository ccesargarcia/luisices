import React, { useState, useEffect } from 'react';
import { LuisicesNovoExperience, BusinessInfo } from '../components/novo/LuisicesNovoExperience';
import { StoreProduct } from '../types/store';
import { ArchiveItem } from '../types';
import { GLOBAL_FINISHES } from '../data/storeProductsData';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toCdnUrl } from '../utils/cdnUtils';

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
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: 'Luisices',
    tagline: 'Papelaria de Afeto & Luxo Artesanal',
    whatsapp: '',
    instagram: '',
    logo: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cartItems, setCartItems] = useState<Array<{
    product: StoreProduct;
    quantity: number;
    selectedFinishes: Record<string, string>;
    totalPrice: number;
    celebrationDate?: string;
    namesOrInitials?: string;
  }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // 1. Carregar Configurações Públicas da Loja (storeSettings/public)
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const cached = localStorage.getItem('luisices_public_store_settings');
        if (cached) {
          const s = JSON.parse(cached);
          if (isMounted) {
            setBusinessInfo({
              name: s.catalogStoreName || s.name || s.businessName || 'Luisices',
              tagline: s.catalogStoreTagline || s.businessTagline || s.tagline || 'Papelaria de Afeto & Luxo Artesanal',
              whatsapp: s.catalogWhatsappPhone || s.whatsappPhone || s.businessPhone || '',
              instagram: s.instagramUrl ? s.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
              logo: toCdnUrl(s.catalogLogo) || '',
              banner: toCdnUrl(s.catalogBanner) || '',
              statusText: s.catalogStatusText || '',
              announcement: s.catalogAnnouncement || '',
            });
          }
        }

        const snap = await getDoc(doc(db, 'storeSettings', 'public'));
        if (snap.exists() && isMounted) {
          const s = snap.data();
          localStorage.setItem('luisices_public_store_settings', JSON.stringify(s));
          setBusinessInfo({
            name: s.catalogStoreName || s.name || s.businessName || 'Luisices',
            tagline: s.catalogStoreTagline || s.businessTagline || s.tagline || 'Papelaria de Afeto & Luxo Artesanal',
            whatsapp: s.catalogWhatsappPhone || s.whatsappPhone || s.businessPhone || '',
            instagram: s.instagramUrl ? s.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
            logo: toCdnUrl(s.catalogLogo) || '',
            banner: toCdnUrl(s.catalogBanner) || '',
            statusText: s.catalogStatusText || '',
            announcement: s.catalogAnnouncement || '',
          });
        }
      } catch (err) {
        console.debug('Usando configuracoes padrao da loja:', err);
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Carregar Produtos Reais da Vitrine (storeProducts do Firestore) — DE -> PARA
  useEffect(() => {
    let isMounted = true;
    const fetchRealStoreProducts = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, 'storeProducts'));
        if (!snap.empty && isMounted) {
          const realList: StoreProduct[] = [];
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const price = Number(data.price ?? data.unitPrice) || 0;
            if (data.name && price > 0 && data.active !== false) {
              const rawImg = data.imageUrl || data.photoUrl || (Array.isArray(data.images) && data.images[0]);
              const rawImgs = Array.isArray(data.images) && data.images.length > 0
                ? data.images.map((img: string) => toCdnUrl(img)).filter(Boolean)
                : [toCdnUrl(rawImg)].filter(Boolean);

              const safeTags = parseStringList(data.tags || data.aiTags, ['#artesanal', '#afeto']);
              const safeMaterials = parseStringList(data.materials || data.papers, ['Papel Especial 250g']);
              const leadTime = Number(data.leadTimeDays || data.estimatedDays) || 10;

              // De -> Para
              realList.push({
                id: docSnap.id,
                slug: data.slug || docSnap.id,
                title: data.name || data.title,
                subtitle: data.subtitle || data.description || 'Produto autoral confeccionado com carinho sob encomenda.',
                category: (data.category && ['casamentos', 'maternidade', 'debutantes', 'corporativo', 'topos_3d'].includes(data.category.toLowerCase()))
                  ? data.category.toLowerCase()
                  : 'casamentos',
                categoryLabel: data.categoryLabel || data.category || 'Coleção Autoral',
                description: data.description || data.name,
                details: Array.isArray(data.details) && data.details.length > 0
                  ? data.details
                  : [
                      data.description || 'Acabamento artesanal minucioso',
                      `Tempo de confecção estimado: ${leadTime} dias úteis`,
                      'Embalagem protegida e perfumada com essência do ateliê',
                    ],
                basePrice: price,
                minQuantity: Number(data.minQuantity) || 1,
                unitLabel: data.unitLabel || 'un',
                rating: 5.0,
                reviewsCount: Number(data.reviewsCount) || 18,
                mainImage: toCdnUrl(rawImg) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
                galleryImages: rawImgs.length > 0 ? rawImgs : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'],
                tags: safeTags,
                materials: safeMaterials,
                estimatedDaysToProduce: leadTime,
                isBestseller: Boolean(data.isBestseller || data.badge),
                availableFinishes: GLOBAL_FINISHES,
              });
            }
          });

          if (isMounted) {
            setStoreProducts(realList);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar storeProducts do Firestore:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRealStoreProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Carregar Peças Reais do Acervo / Galeria (gallery do Firestore) — DE -> PARA
  useEffect(() => {
    let isMounted = true;
    const fetchGallery = async () => {
      try {
        const snap = await getDocs(collection(db, 'gallery'));
        if (!snap.empty && isMounted) {
          const liveItems: ArchiveItem[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const safeTags = parseStringList(data.tags || data.aiTags, ['#topo3d', '#silhouette']);
            const safePapers = parseStringList(data.materials || data.papers, ['Papel Colorplus 180g', 'Lamicote Dourado']);

            return {
              id: docSnap.id,
              title: data.title || data.name || 'Projeto Autoral 3D',
              theme: data.category || data.theme || 'Ateliê',
              category: 'floral_luxo',
              description: data.description || 'Peça artesanal exclusiva confeccionada sob encomenda.',
              papers: safePapers,
              layersCount: typeof data.layersCount === 'number' ? data.layersCount : 3,
              silhouetteTips: data.silhouetteTips || 'Corte com lâmina de precisão na Silhouette Portrait.',
              imageUrl: toCdnUrl(data.imageUrl || data.photoUrl || data.url) || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
              tags: safeTags,
            };
          });
          if (isMounted) {
            setArchiveItems(liveItems);
          }
        }
      } catch (err) {
        console.debug('Usando itens de galeria locais:', err);
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
        storeProducts={storeProducts}
        archiveItems={archiveItems}
        businessInfo={businessInfo}
        isLoading={isLoading}
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
};

export default NovoVisual;
