import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Store,
  Globe,
  ExternalLink,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Loader2,
  Clock,
  MapPin,
  FileText,
  AtSign,
  Phone,
  Info,
  Bell,
  Building2,
  Upload,
  X,
  Eye,
  ShoppingBag,
  Wand2,
  Heart,
  Image as ImageIcon,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

export const STORE_TEMPLATES = [
  {
    id: 'afetiva',
    name: 'Papelaria Afetiva & Festas',
    icon: '🌸',
    tag: 'Mais Popular',
    description: 'Estilo acolhedor e carinhoso, perfeito para ateliês de encadernação, lembrancinhas e peças artesanais.',
    data: {
      catalogBadge: 'Atelier Afetivo',
      catalogStatusText: 'Atendimento WhatsApp ativo • Encomendas abertas',
      catalogAnnouncement: '✨ Encomendas abertas com envio carinhoso para todo o Brasil!',
      catalogHeroTitle: 'Catálogo & Vitrine Afetiva',
      businessTagline: 'Papelaria artesanal feita à mão para momentos únicos',
      catalogHeroDescription: 'Cadernos, planners, mimos e lembrancinhas personalizados com acabamento artesanal de alto padrão. Faça sua encomenda direta pelo WhatsApp!',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar pelo catálogo do Ateliê:',
      catalogWhatsappCustomizationLabel: 'Nome para a personalização:',
      catalogWhatsappFooter: 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar o pedido?',
      catalogFooterText: 'Papelaria artesanal feita à mão com afeto e dedicação para eternizar momentos únicos. ❤️',
      catalogFooterLocation: 'Enviamos com carinho para todo o Brasil 📦',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 18h',
      catalogFooterNotice: 'Produção artesanal sob encomenda. Os prazos começam a contar após a aprovação da arte.',
    }
  },
  {
    id: 'maternidade',
    name: 'Maternidade & Primeiros Anos',
    icon: '🍼',
    tag: 'Delicado',
    description: 'Foco em mães e bebês, perfeito para livros do bebê, cadernetas de saúde e lembrancinhas de batizado.',
    data: {
      catalogBadge: 'Maternidade & Baby',
      catalogStatusText: 'Atendimento com carinho para mamães',
      catalogAnnouncement: '🍼 Cadernetas de vacinação e kits de maternidade com acabamento protetor premium.',
      catalogHeroTitle: 'Coleção Maternidade & Primeiros Anos',
      businessTagline: 'Lembranças e encadernações delicadas para a chegada do seu bebê',
      catalogHeroDescription: 'Cadernetas de vacina personalizadas, livros de recordação, caixas cartonadas e lembrancinhas afetivas para momentos inesquecíveis.',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar itens de maternidade pelo catálogo:',
      catalogWhatsappCustomizationLabel: 'Nome do bebê e tema escolhido:',
      catalogWhatsappFooter: 'Por favor, me envie as opções de frete e o prazo de confecção para o meu CEP.',
      catalogFooterText: 'Feito com amor e cuidado para acolher as memórias mais preciosas da sua família. 👶',
      catalogFooterLocation: 'Ateliê com envio seguro para todo o país ✈️',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 17h',
      catalogFooterNotice: 'Recomendamos encomendar com antecedência de 20 a 30 dias da data prevista do parto.',
    }
  },
  {
    id: 'minimalista',
    name: 'Ateliê Minimalista & Planners',
    icon: '🌿',
    tag: 'Elegante',
    description: 'Design contemporâneo, limpo e refinado para planners, agendas, blocos de notas e encadernação artística.',
    data: {
      catalogBadge: 'Design & Papel',
      catalogStatusText: 'Ateliê aberto para encomendas',
      catalogAnnouncement: '📓 Planners permanentes e blocos de anotações com capa dura e hot stamping.',
      catalogHeroTitle: 'Planners, Agendas & Papelaria Autoral',
      businessTagline: 'Organização e encadernação artística em design clean e sofisticado',
      catalogHeroDescription: 'Peças pensadas para quem valoriza estética funcional, papéis nobres de alta gramatura e acabamento artístico refinado.',
      catalogWhatsappGreeting: 'Olá! Gostaria de encomendar pelo catálogo autoral:',
      catalogWhatsappCustomizationLabel: 'Nome ou iniciais na capa:',
      catalogWhatsappFooter: 'Poderia confirmar a disponibilidade e as opções de pagamento (PIX / Cartão)?',
      catalogFooterText: 'Papelaria funcional e atemporal criada para inspirar a sua rotina diária.',
      catalogFooterLocation: 'Produção artesanal sob demanda • Envio para todo o Brasil',
      catalogFooterBusinessHours: 'Segunda a Sábado, das 10h às 19h',
      catalogFooterNotice: 'Trabalhamos exclusivamente com papéis certificados FSC e laminação acetinada de toque aveludado.',
    }
  },
  {
    id: 'festas',
    name: 'Kits de Festa & Scraps Criativos',
    icon: '🎈',
    tag: 'Colorido',
    description: 'Alegre e vibrante, ideal para temas infantis, papelaria de festa, caixas personalizadas e topos de bolo.',
    data: {
      catalogBadge: 'Festas & Mimos',
      catalogStatusText: 'Agenda de festas e comemorações aberta',
      catalogAnnouncement: '🎉 Consulte nossos combos especiais "Pegue e Monte" para comemorações em casa!',
      catalogHeroTitle: 'Kits de Festa & Lembrancinhas Temáticas',
      businessTagline: 'Papelaria criativa e personalizados que transformam qualquer comemoração',
      catalogHeroDescription: 'Caixas milk, pirâmides, topos de bolo, adesivos e lembranças personalizadas para a festa dos sonhos.',
      catalogWhatsappGreeting: 'Olá! Quero solicitar um orçamento de festa pelo catálogo:',
      catalogWhatsappCustomizationLabel: 'Nome do aniversariante, idade e data do evento:',
      catalogWhatsappFooter: 'Qual o prazo de confecção para a minha data e as opções de frete?',
      catalogFooterText: 'A alegria da sua celebração traduzida em recortes especiais e muito afeto!',
      catalogFooterLocation: 'Enviamos kits com montagem prática para todo o Brasil 📦',
      catalogFooterBusinessHours: 'Segunda a Sexta, das 9h às 18h',
      catalogFooterNotice: 'Personalizamos em qualquer tema sob consulta. As artes são enviadas para prévia antes da impressão.',
    }
  }
];

export function StoreCustomization() {
  const { 
    settings, 
    loading, 
    updateSettings, 
    uploadCatalogLogo, 
    removeCatalogLogo,
    uploadCatalogBanner,
    removeCatalogBanner
  } = useUserSettings();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [currentCatalogLogo, setCurrentCatalogLogo] = useState<string | null>(null);
  const [currentCatalogBanner, setCurrentCatalogBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('identity');

  // Estado dos campos do formulário
  const [formData, setFormData] = useState({
    businessName: '',
    businessTagline: '',
    whatsappPhone: '',
    instagramUrl: '',
    websiteUrl: '',
    catalogBadge: '',
    catalogStatusText: '',
    catalogHeroTitle: '',
    catalogHeroDescription: '',
    catalogAnnouncement: '',
    catalogWhatsappGreeting: '',
    catalogWhatsappCustomizationLabel: '',
    catalogWhatsappFooter: '',
    catalogFooterText: '',
    catalogFooterLocation: '',
    catalogFooterBusinessHours: '',
    catalogFooterCopyright: '',
    catalogFooterNotice: '',
    catalogBannerFixed: false,
  });

  const [dataLoaded, setDataLoaded] = useState(false);

  // Carregar dados quando settings estiver pronto ou carregar de storeSettings/public
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      // Inicia com catalogLogo e catalogBanner exclusivos da lojinha (sem fallback para o logo do painel)
      let loadedLogo: string | null = settings?.catalogLogo || null;
      let loadedBanner: string | null = settings?.catalogBanner || null;
      let data = {
        businessName: settings?.businessName || '',
        businessTagline: settings?.businessTagline || '',
        whatsappPhone: settings?.whatsappPhone || settings?.businessPhone || '',
        instagramUrl: settings?.instagramUrl || '',
        websiteUrl: settings?.websiteUrl || '',
        catalogBadge: settings?.catalogBadge || '',
        catalogStatusText: settings?.catalogStatusText || '',
        catalogHeroTitle: settings?.catalogHeroTitle || '',
        catalogHeroDescription: settings?.catalogHeroDescription || '',
        catalogAnnouncement: settings?.catalogAnnouncement || '',
        catalogWhatsappGreeting: settings?.catalogWhatsappGreeting || '',
        catalogWhatsappCustomizationLabel: settings?.catalogWhatsappCustomizationLabel || '',
        catalogWhatsappFooter: settings?.catalogWhatsappFooter || '',
        catalogFooterText: settings?.catalogFooterText || '',
        catalogFooterLocation: settings?.catalogFooterLocation || '',
        catalogFooterBusinessHours: settings?.catalogFooterBusinessHours || '',
        catalogFooterCopyright: settings?.catalogFooterCopyright || '',
        catalogFooterNotice: settings?.catalogFooterNotice || '',
        catalogBannerFixed: settings?.catalogBannerFixed || false,
      };

      // Carrega os dados compartilhados públicos da loja do Firestore
      try {
        const publicSnap = await getDoc(doc(db, 'storeSettings', 'public'));
        if (publicSnap.exists() && !isCancelled) {
          const pub = publicSnap.data();
          // Prioriza estritamente o catalogLogo exclusivo da loja pública
          if (pub.catalogLogo) {
            loadedLogo = pub.catalogLogo;
          } else if (pub.catalogLogo === null || pub.catalogLogo === '') {
            loadedLogo = null;
          } else if (settings?.catalogLogo) {
            loadedLogo = settings.catalogLogo;
          } else {
            loadedLogo = null;
          }

          // Prioriza estritamente o catalogBanner exclusivo da loja pública
          if (pub.catalogBanner) {
            loadedBanner = pub.catalogBanner;
          } else if (pub.catalogBanner === null || pub.catalogBanner === '') {
            loadedBanner = null;
          } else if (settings?.catalogBanner) {
            loadedBanner = settings.catalogBanner;
          } else {
            loadedBanner = null;
          }

          data = {
            businessName: pub.businessName || data.businessName,
            businessTagline: pub.businessTagline || data.businessTagline,
            whatsappPhone: pub.whatsappPhone || data.whatsappPhone,
            instagramUrl: pub.instagramUrl || data.instagramUrl,
            websiteUrl: pub.websiteUrl || data.websiteUrl,
            catalogBadge: pub.catalogBadge || data.catalogBadge,
            catalogStatusText: pub.catalogStatusText || data.catalogStatusText,
            catalogHeroTitle: pub.catalogHeroTitle || data.catalogHeroTitle,
            catalogHeroDescription: pub.catalogHeroDescription || data.catalogHeroDescription,
            catalogAnnouncement: pub.catalogAnnouncement !== undefined ? pub.catalogAnnouncement : data.catalogAnnouncement,
            catalogWhatsappGreeting: pub.catalogWhatsappGreeting || data.catalogWhatsappGreeting,
            catalogWhatsappCustomizationLabel: pub.catalogWhatsappCustomizationLabel || data.catalogWhatsappCustomizationLabel,
            catalogWhatsappFooter: pub.catalogWhatsappFooter || data.catalogWhatsappFooter,
            catalogFooterText: pub.catalogFooterText || data.catalogFooterText,
            catalogFooterLocation: pub.catalogFooterLocation || data.catalogFooterLocation,
            catalogFooterBusinessHours: pub.catalogFooterBusinessHours || data.catalogFooterBusinessHours,
            catalogFooterCopyright: pub.catalogFooterCopyright || data.catalogFooterCopyright,
            catalogFooterNotice: pub.catalogFooterNotice || data.catalogFooterNotice,
            catalogBannerFixed: pub.catalogBannerFixed !== undefined ? Boolean(pub.catalogBannerFixed) : (settings?.catalogBannerFixed || false),
          };
        }
      } catch (err) {
        console.warn('Aviso ao ler storeSettings/public:', err);
      }

      if (!isCancelled) {
        setCurrentCatalogLogo(loadedLogo);
        setCurrentCatalogBanner(loadedBanner);
        if (!dataLoaded) {
          setFormData(data);
          setDataLoaded(true);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [settings]);

  const handleLogoUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const url = await uploadCatalogLogo(file, currentCatalogLogo || undefined);
      setCurrentCatalogLogo(url);
      toast.success('Logo exclusivo da lojinha atualizado com sucesso!');
    } catch (error) {
      console.error('Erro no upload do logo da lojinha:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload do logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!confirm('Deseja realmente remover o logo exclusivo da lojinha pública?')) return;
    setUploadingLogo(true);
    const previousLogo = currentCatalogLogo;
    try {
      setCurrentCatalogLogo(null);
      await removeCatalogLogo(previousLogo || undefined);
      toast.success('Logo exclusivo da lojinha removido!');
    } catch (error) {
      console.error('Erro ao remover logo da lojinha:', error);
      setCurrentCatalogLogo(previousLogo);
      toast.error('Erro ao remover logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingBanner(true);
    try {
      const url = await uploadCatalogBanner(file, currentCatalogBanner || undefined);
      setCurrentCatalogBanner(url);
      toast.success('Banner de capa da lojinha atualizado com sucesso!');
    } catch (error) {
      console.error('Erro no upload do banner da lojinha:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload do banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerRemove = async () => {
    if (!confirm('Deseja realmente remover o banner de capa da lojinha pública?')) return;
    setUploadingBanner(true);
    const previousBanner = currentCatalogBanner;
    try {
      setCurrentCatalogBanner(null);
      await removeCatalogBanner(previousBanner || undefined);
      toast.success('Banner de capa da lojinha removido!');
    } catch (error) {
      console.error('Erro ao remover banner da lojinha:', error);
      setCurrentCatalogBanner(previousBanner);
      toast.error('Erro ao remover banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const [showTemplates, setShowTemplates] = useState(false);

  const applyTemplate = (templateId: string) => {
    const tmpl = STORE_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    setFormData((prev) => ({
      ...prev,
      ...tmpl.data,
    }));
    toast.success(`Modelo "${tmpl.name}" aplicado! Revise os textos e clique em Salvar Alterações.`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...formData,
        catalogLogo: currentCatalogLogo || '',
        catalogBanner: currentCatalogBanner || '',
        catalogBannerFixed: Boolean(formData.catalogBannerFixed),
      });
      // Salva no cache do navegador para a lojinha atualizar instantaneamente
      try {
        const publicData = {
          name: formData.businessName || 'Luisices Papelaria Personalizada',
          tagline: formData.businessTagline,
          whatsapp: formData.whatsappPhone,
          instagram: formData.instagramUrl ? formData.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '',
          website: formData.websiteUrl,
          logo: currentCatalogLogo || '',
          banner: currentCatalogBanner || '',
          bannerFixed: Boolean(formData.catalogBannerFixed),
          badge: formData.catalogBadge,
          statusText: formData.catalogStatusText,
          announcement: formData.catalogAnnouncement,
          heroTitle: formData.catalogHeroTitle,
          heroDescription: formData.catalogHeroDescription,
          whatsappGreeting: formData.catalogWhatsappGreeting,
          whatsappCustomizationLabel: formData.catalogWhatsappCustomizationLabel,
          whatsappFooter: formData.catalogWhatsappFooter,
          footerText: formData.catalogFooterText,
          footerLocation: formData.catalogFooterLocation,
          footerBusinessHours: formData.catalogFooterBusinessHours,
          footerNotice: formData.catalogFooterNotice,
          footerCopyright: formData.catalogFooterCopyright,
        };
        localStorage.setItem('luisices_public_store_settings', JSON.stringify(publicData));
      } catch {}
      toast.success('Configurações da lojinha salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar personalizações:', err);
      toast.error('Erro ao salvar configurações da lojinha');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const cleanInstagram = formData.instagramUrl
    ? formData.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
    : 'luisicesatelie';

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Store className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Personalizar Lojinha
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Configure todos os textos, mensagens de pedido, faixa de aviso e rodapé da sua vitrine pública online.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowTemplates((prev) => !prev)}
            className={`gap-2 ${showTemplates ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300' : 'border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50/70'}`}
          >
            <Wand2 className="size-4 text-amber-500" />
            <span>{showTemplates ? 'Ocultar Modelos' : 'Modelos & Inspirações'}</span>
          </Button>

          <a href="/catalogo" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
              <Globe className="size-4" />
              <span className="hidden sm:inline">Ver Lojinha Online</span>
              <ExternalLink className="size-3.5 opacity-60" />
            </Button>
          </a>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-sm">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Caixa de Modelos & Inspirações Prontas */}
      {showTemplates && (
        <Card className="border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Wand2 className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-amber-950 dark:text-amber-200">
                    Modelos de Inspiração Prontos para Uso
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    Escolha um tema para preencher automaticamente os textos da vitrine. Você poderá editar cada campo à vontade antes de salvar!
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
                onClick={() => setShowTemplates(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {STORE_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3.5 rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-card flex flex-col justify-between hover:shadow-md transition-all space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-2xl">{tmpl.icon}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {tmpl.tag}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-foreground leading-tight">
                      {tmpl.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {tmpl.description}
                    </p>
                    <div className="p-2 rounded-lg bg-muted/50 text-[10px] space-y-0.5 text-muted-foreground font-mono">
                      <p className="truncate"><span className="font-semibold text-foreground">Slogan:</span> {tmpl.data.businessTagline}</p>
                      <p className="truncate"><span className="font-semibold text-foreground">Selo:</span> {tmpl.data.catalogBadge}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyTemplate(tmpl.id)}
                    className="w-full text-xs font-semibold gap-1.5 border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white dark:hover:text-black transition-colors"
                  >
                    <Wand2 className="size-3" />
                    Aplicar este Modelo
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid Principal: Formulário de Configuração (2/3) + Prévia Visual (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Formulário com Abas (2 Colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/60">
              <TabsTrigger value="identity" className="text-xs py-2">
                Logo & Vitrine
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs py-2">
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="footer" className="text-xs py-2">
                Rodapé
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-xs py-2">
                Loja & Contato
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: Logo & Vitrine */}
            <TabsContent value="identity" className="space-y-5 pt-3">
              {/* Card de Upload do Banner de Capa Panorâmico (Estilo LinkedIn / 4:1) */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ImageIcon className="size-4 text-primary" />
                      Banner de Capa da Lojinha (Formato LinkedIn / Panorâmico)
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Proporção 4:1
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Adicione um banner panorâmico no topo do seu catálogo para estampar a identidade visual do seu ateliê, fotos de produtos ou arte de capa (como no cabeçalho do LinkedIn).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Prévia do Banner com Logo Sobreposto */}
                  <div className="relative w-full aspect-[4/1] rounded-2xl overflow-hidden border border-border/80 bg-muted/30 flex items-center justify-center group shadow-xs">
                    {currentCatalogBanner ? (
                      <>
                        <img
                          src={currentCatalogBanner}
                          alt="Banner de Capa da Lojinha"
                          className="w-full h-full object-cover"
                        />
                        {/* Simulação do Logo Sobreposto */}
                        <div className="absolute -bottom-2 left-4 size-12 sm:size-14 rounded-full ring-2 ring-background bg-background shadow-md overflow-hidden flex items-center justify-center">
                          {currentCatalogLogo ? (
                            <img src={currentCatalogLogo} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Store className="size-5 text-muted-foreground opacity-50" />
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground gap-1.5">
                        <ImageIcon className="size-7 opacity-40" />
                        <p className="text-xs font-semibold">Nenhum banner de capa cadastrado</p>
                        <p className="text-[10px] opacity-75">Recomendado: 1584 x 396 px (ou proporção 4:1) • JPG, PNG ou WebP até 5MB</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor="store-banner-upload" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingBanner}
                        className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                        asChild
                      >
                        <span>
                          {uploadingBanner ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Enviando banner de capa...
                            </>
                          ) : (
                            <>
                              <Upload className="size-3.5" />
                              {currentCatalogBanner ? 'Trocar Banner de Capa' : 'Enviar Banner de Capa'}
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="store-banner-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void handleBannerUpload(file);
                      }}
                    />

                    {currentCatalogBanner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploadingBanner}
                        onClick={handleBannerRemove}
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                      >
                        <X className="size-3.5" />
                        Remover Banner
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {currentCatalogBanner
                      ? '✅ Banner de capa panorâmico ativo no topo do catálogo público online.'
                      : '💡 Dica: Um banner em proporção 4:1 (ex: 1584x396px) cria uma apresentação visual marcante de estúdio, com o logo do ateliê sobreposto no canto inferior estilo LinkedIn.'}
                  </p>

                  {/* Opção de Banner Fixo / Parallax */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="banner-fixed-switch" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                        <Layers className="size-3.5 text-primary" />
                        Fixar banner de capa (Efeito Parallax / Vitrine)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        O banner de capa fica fixado ao fundo e o catálogo de produtos sobe suavemente por cima dele ao rolar a página.
                      </p>
                    </div>
                    <Switch
                      id="banner-fixed-switch"
                      checked={Boolean(formData.catalogBannerFixed)}
                      onCheckedChange={(checked) => handleChange('catalogBannerFixed', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card de Upload do Logo */}
              <Card className="border-primary/25 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      Logo Exclusivo da Lojinha Online
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                      Exclusivo da Vitrine
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Configure uma logo personalizada exclusivamente para a vitrine pública e rodapé da lojinha. Ela é <strong>totalmente independente</strong> da logo configurada no painel administrativo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {currentCatalogLogo ? (
                      <div className="relative group size-20 rounded-xl overflow-hidden border border-border bg-muted/40 p-1.5 flex items-center justify-center shrink-0">
                        <img
                          src={currentCatalogLogo}
                          alt="Logo Exclusivo da Lojinha"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="size-20 rounded-xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-muted-foreground shrink-0 gap-1">
                        <Building2 className="size-7 opacity-50" />
                        <span className="text-[10px]">Sem logo próprio</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label htmlFor="store-logo-upload" className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingLogo}
                            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                            asChild
                          >
                            <span>
                              {uploadingLogo ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin" />
                                  Enviando logo da lojinha...
                                </>
                              ) : (
                                <>
                                  <Upload className="size-3.5" />
                                  {currentCatalogLogo ? 'Trocar Logo da Lojinha' : 'Enviar Logo Exclusivo'}
                                </>
                              )}
                            </span>
                          </Button>
                        </Label>
                        <Input
                          id="store-logo-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void handleLogoUpload(file);
                          }}
                        />

                        {currentCatalogLogo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={uploadingLogo}
                            onClick={handleLogoRemove}
                            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                          >
                            <X className="size-3.5" />
                            Remover Logo da Lojinha
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {currentCatalogLogo
                          ? '✅ Logo exclusivo ativo na lojinha pública online. A logo do painel administrativo permanece intacta.'
                          : 'Envie um logotipo específico para seus clientes (fundo transparente é ideal). Se nenhum for enviado, a vitrine exibirá o nome da marca.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Identidade do Cabeçalho & Barra Superior
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define o selo afetivo da marca, o status de atendimento e anúncios de campanhas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-badge" className="text-xs font-semibold">
                        Selo da Marca (Badge)
                      </Label>
                      <Input
                        id="m-badge"
                        placeholder="Ex: Atelier, Papelaria Afetiva, Personalizados"
                        value={formData.catalogBadge}
                        onChange={(e) => handleChange('catalogBadge', e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Pílula ao lado do nome do ateliê</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-status" className="text-xs font-semibold">
                        Status do Atendimento
                      </Label>
                      <Input
                        id="m-status"
                        placeholder="Ex: Atendimento WhatsApp ativo"
                        value={formData.catalogStatusText}
                        onChange={(e) => handleChange('catalogStatusText', e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Frase ao lado da luz pulsante no topo</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-announcement" className="text-xs font-semibold flex items-center gap-1.5">
                      <Bell className="size-3.5 text-amber-500" />
                      Faixa de Aviso Promocional (Opcional)
                    </Label>
                    <Input
                      id="m-announcement"
                      placeholder="Ex: ✨ Agenda de Páscoa aberta! Encomendas com entrega até 25/03"
                      value={formData.catalogAnnouncement}
                      onChange={(e) => handleChange('catalogAnnouncement', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Deixe em branco para ocultar. Quando preenchido, exibe um banner dourado no topo da lojinha.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    Apresentação & Vitrine (Banner Hero)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    O cartão de boas-vindas logo abaixo do cabeçalho da lojinha.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-hero-title" className="text-xs font-semibold">
                      Título Superior da Vitrine (Selo Pequeno)
                    </Label>
                    <Input
                      id="m-hero-title"
                      placeholder="Ex: Catálogo & Vitrine Afetiva"
                      value={formData.catalogHeroTitle}
                      onChange={(e) => handleChange('catalogHeroTitle', e.target.value)}
                    />
                  </div>

                  {/* Frase Principal de Destaque / Slogan do Banner */}
                  <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="m-hero-tagline" className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" />
                        Frase de Destaque / Slogan Principal do Banner
                      </Label>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Texto Central da Vitrine
                      </span>
                    </div>
                    <Input
                      id="m-hero-tagline"
                      className="bg-background font-medium text-sm"
                      placeholder="Ex: Papelaria artesanal feita à mão para momentos únicos"
                      value={formData.businessTagline}
                      onChange={(e) => handleChange('businessTagline', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Este é o texto principal exibido com destaque central no banner da vitrine da lojinha.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-hero-desc" className="text-xs font-semibold">
                      Texto de Boas-vindas / Instruções de Encomenda
                    </Label>
                    <Textarea
                      id="m-hero-desc"
                      rows={3}
                      placeholder="Ex: Escolha suas peças, informe o nome para personalização e envie o pedido formatado diretamente no nosso WhatsApp."
                      value={formData.catalogHeroDescription}
                      onChange={(e) => handleChange('catalogHeroDescription', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 2: WhatsApp & Checkout */}
            <TabsContent value="whatsapp" className="space-y-5 pt-3">
              <Card className="border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <MessageCircle className="size-4" />
                    Formato da Mensagem de Pedido no WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Personalize como os dados da sacola e os itens encomendados são formatados ao clicar em "Enviar Pedido".
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-wa-greeting" className="text-xs font-semibold">
                      Saudação Inicial
                    </Label>
                    <Input
                      id="m-wa-greeting"
                      placeholder="Ex: Olá! Gostaria de encomendar pelo catálogo do Ateliê:"
                      value={formData.catalogWhatsappGreeting}
                      onChange={(e) => handleChange('catalogWhatsappGreeting', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-wa-label" className="text-xs font-semibold">
                        Rótulo da Personalização
                      </Label>
                      <Input
                        id="m-wa-label"
                        placeholder="Ex: Nome/Personalização:"
                        value={formData.catalogWhatsappCustomizationLabel}
                        onChange={(e) => handleChange('catalogWhatsappCustomizationLabel', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-wa-footer" className="text-xs font-semibold">
                        Fechamento / Chave PIX
                      </Label>
                      <Input
                        id="m-wa-footer"
                        placeholder="Ex: Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?"
                        value={formData.catalogWhatsappFooter}
                        onChange={(e) => handleChange('catalogWhatsappFooter', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/40 border border-emerald-500/20 space-y-1.5 font-mono text-xs">
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1 font-sans">
                      📱 Exemplo da mensagem enviada ao seu WhatsApp:
                    </p>
                    <p className="text-emerald-600 dark:text-emerald-400">
                      {formData.catalogWhatsappGreeting || 'Olá! Gostaria de encomendar pelo catálogo do Ateliê:'}
                    </p>
                    <p>• 1x Planner Espiral Floral 2025 - R$ 89,90</p>
                    <p className="pl-3 text-[11px] italic">
                      ↳ {formData.catalogWhatsappCustomizationLabel || 'Nome/Personalização:'} Cecília Martins
                    </p>
                    <p className="font-semibold text-foreground">✨ Subtotal Estimado: R$ 89,90</p>
                    <p className="text-emerald-600 dark:text-emerald-400">
                      {formData.catalogWhatsappFooter || 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: Rodapé & Políticas */}
            <TabsContent value="footer" className="space-y-5 pt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="size-4 text-primary" />
                    Rodapé da Lojinha (Footer)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Mensagem de encerramento, endereço/envio, horários de atendimento e aviso de prazos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-text" className="text-xs font-semibold">
                      Texto Afetivo / Sobre o Ateliê
                    </Label>
                    <Textarea
                      id="m-footer-text"
                      rows={2}
                      placeholder="Ex: Papelaria artesanal feita à mão com afeto e dedicação para eternizar momentos únicos. ❤️"
                      value={formData.catalogFooterText}
                      onChange={(e) => handleChange('catalogFooterText', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-footer-loc" className="text-xs font-semibold flex items-center gap-1">
                        <MapPin className="size-3.5 text-muted-foreground" /> Localização & Envio
                      </Label>
                      <Input
                        id="m-footer-loc"
                        placeholder="Ex: São Paulo - SP • Enviamos com carinho para todo o Brasil 📦"
                        value={formData.catalogFooterLocation}
                        onChange={(e) => handleChange('catalogFooterLocation', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-footer-hours" className="text-xs font-semibold flex items-center gap-1">
                        <Clock className="size-3.5 text-muted-foreground" /> Horário de Atendimento
                      </Label>
                      <Input
                        id="m-footer-hours"
                        placeholder="Ex: Segunda a Sexta, das 9h às 18h"
                        value={formData.catalogFooterBusinessHours}
                        onChange={(e) => handleChange('catalogFooterBusinessHours', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-notice" className="text-xs font-semibold">
                      Aviso sobre Prazos e Políticas
                    </Label>
                    <Input
                      id="m-footer-notice"
                      placeholder="Ex: Produção artesanal sob encomenda. Os prazos começam a contar após a aprovação da arte."
                      value={formData.catalogFooterNotice}
                      onChange={(e) => handleChange('catalogFooterNotice', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-footer-copy" className="text-xs font-semibold">
                      Texto de Direitos Autorais / Copyright
                    </Label>
                    <Input
                      id="m-footer-copy"
                      placeholder={`Ex: © ${new Date().getFullYear()} Luisices. Todos os direitos reservados.`}
                      value={formData.catalogFooterCopyright}
                      onChange={(e) => handleChange('catalogFooterCopyright', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 4: Loja & Contato */}
            <TabsContent value="contact" className="space-y-5 pt-3">
              {/* Resumo do Logo */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center gap-3">
                  {currentCatalogLogo ? (
                    <img
                      src={currentCatalogLogo}
                      alt="Logo da Lojinha"
                      className="size-12 rounded-lg object-contain border border-border bg-white p-1"
                    />
                  ) : (
                    <div className="size-12 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground">
                      <Building2 className="size-5 opacity-60" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold">Logo Exclusivo da Lojinha</p>
                    <p className="text-[11px] text-muted-foreground">
                      {currentCatalogLogo ? 'Logo específico da lojinha configurado e ativo' : 'Nenhum logo específico configurado'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('identity')}
                  className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Building2 className="size-3.5" />
                  {currentCatalogLogo ? 'Trocar Logo' : 'Enviar Logo Exclusivo'}
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="size-4 text-primary" />
                    Dados Gerais do Negócio
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Informações principais exibidas no topo e nos links de contato da lojinha.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-name" className="text-xs font-semibold">
                        Nome da Loja / Ateliê
                      </Label>
                      <Input
                        id="m-biz-name"
                        placeholder="Ex: Luisices"
                        value={formData.businessName}
                        onChange={(e) => handleChange('businessName', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-phone" className="text-xs font-semibold flex items-center gap-1">
                        <Phone className="size-3.5 text-muted-foreground" />
                        WhatsApp de Recebimento de Pedidos
                      </Label>
                      <Input
                        id="m-biz-phone"
                        placeholder="Ex: (11) 99999-9999"
                        value={formData.whatsappPhone}
                        onChange={(e) => handleChange('whatsappPhone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="m-biz-tag" className="text-xs font-semibold">
                      Slogan da Loja
                    </Label>
                    <Input
                      id="m-biz-tag"
                      placeholder="Ex: Papelaria artesanal feita à mão para momentos únicos"
                      value={formData.businessTagline}
                      onChange={(e) => handleChange('businessTagline', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-insta" className="text-xs font-semibold flex items-center gap-1">
                        <AtSign className="size-3.5 text-muted-foreground" />
                        Instagram
                      </Label>
                      <Input
                        id="m-biz-insta"
                        placeholder="Ex: https://instagram.com/luisicesatelie"
                        value={formData.instagramUrl}
                        onChange={(e) => handleChange('instagramUrl', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="m-biz-web" className="text-xs font-semibold flex items-center gap-1">
                        <Globe className="size-3.5 text-muted-foreground" />
                        Website Oficial (Opcional)
                      </Label>
                      <Input
                        id="m-biz-web"
                        placeholder="Ex: https://luisices.com.br"
                        value={formData.websiteUrl}
                        onChange={(e) => handleChange('websiteUrl', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 px-8">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Salvar Todas as Configurações
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Coluna Lateral: Prévia Visual ao Vivo (1 Coluna) */}
        <div className="lg:col-span-1 sticky top-6 space-y-4">
          <Card className="overflow-hidden border-primary/25 shadow-md">
            <CardHeader className="bg-primary/5 py-3 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Eye className="size-3.5" />
                  <span>Prévia Visual da Lojinha</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  Modo Claro
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 text-xs bg-[#fff8f7] text-[#221a1a]">
              {/* Aviso do Topo */}
              {formData.catalogAnnouncement && (
                <div className="px-3 py-1.5 bg-amber-400/20 text-amber-900 border-b border-amber-400/30 text-[10px] font-semibold text-center flex items-center justify-center gap-1">
                  <Sparkles size={11} className="text-amber-600 shrink-0" />
                  <span className="truncate">{formData.catalogAnnouncement}</span>
                </div>
              )}

              {/* Header simulado */}
              <div className="p-3 bg-white/80 border-b border-stone-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentCatalogLogo ? (
                    <img
                      src={currentCatalogLogo}
                      alt="Logo da Lojinha"
                      className="size-8 rounded-full object-cover border border-white/60 shadow-xs shrink-0"
                    />
                  ) : null}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#613d3e]">
                        {formData.businessName || 'Luisices'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#613d3e]/10 text-[#613d3e] font-medium">
                        {formData.catalogBadge || 'Atelier'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-stone-500">
                      <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate max-w-[140px]">
                        {formData.catalogStatusText || 'Atendimento WhatsApp ativo'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-6 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                    <ShoppingBag size={12} />
                  </div>
                </div>
              </div>

              {/* Hero Banner simulado (estilo LinkedIn) */}
              <div className="m-2.5 rounded-xl overflow-hidden border border-white/60 shadow-2xs bg-white/70">
                {/* Capa */}
                <div className="relative w-full aspect-[3.5/1] bg-gradient-to-r from-[#fceee9] via-[#f7d6d0] to-[#ede7f6] overflow-hidden flex items-center justify-center text-stone-400">
                  {currentCatalogBanner ? (
                    <img src={currentCatalogBanner} alt="Capa da Loja" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-medium opacity-60">Banner Panorâmico (LinkedIn)</span>
                  )}
                </div>
                {/* Informações com Logo Sobreposto */}
                <div className="p-3 pt-0">
                  <div className="-mt-5 mb-2 flex items-end justify-between">
                    <div className="size-10 rounded-full ring-2 ring-white bg-white shadow-xs overflow-hidden flex items-center justify-center">
                      {currentCatalogLogo ? (
                        <img src={currentCatalogLogo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles size={14} className="text-[#613d3e]" />
                      )}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#613d3e]/10 text-[#613d3e] font-semibold">
                      {formData.catalogBadge || 'Atelier'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <p className="font-bold text-xs leading-tight text-[#221a1a]">
                      {formData.businessName || 'Luisices'}
                    </p>
                    <p className="font-semibold text-[10px] text-[#613d3e] leading-snug">
                      {formData.businessTagline || 'Papelaria artesanal feita à mão'}
                    </p>
                    <p className="text-[9px] text-stone-600 leading-snug line-clamp-2 pt-0.5">
                      {formData.catalogHeroDescription || 'Escolha suas peças, informe o nome para personalização e envie o pedido...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Miniatura de Produto simulado */}
              <div className="p-2.5 mx-2.5 rounded-lg bg-white/50 border border-stone-200/50 flex items-center gap-2">
                <div className="size-10 rounded bg-stone-200 shrink-0 flex items-center justify-center text-stone-400">
                  <Store size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[11px] truncate">Planner Espiral Floral 2025</p>
                  <p className="text-[10px] text-[#613d3e] font-bold">R$ 89,90</p>
                </div>
              </div>

              {/* Rodapé simulado */}
              <div className="p-3 mt-3 border-t border-stone-200/60 bg-white/40 text-center space-y-1 text-[10px] text-stone-600">
                {currentCatalogLogo ? (
                  <img
                    src={currentCatalogLogo}
                    alt="Logo da Lojinha"
                    className="size-9 rounded-full object-cover border border-white/60 shadow-xs mx-auto mb-1.5"
                  />
                ) : null}
                <p className="font-bold text-[#613d3e] text-[11px]">
                  {formData.businessName || 'Luisices'}
                </p>
                {formData.catalogFooterText && (
                  <p className="text-[9px] line-clamp-2 italic px-1">
                    "{formData.catalogFooterText}"
                  </p>
                )}
                {formData.catalogFooterLocation && (
                  <p className="text-[9px] flex items-center justify-center gap-0.5">
                    <MapPin size={9} /> {formData.catalogFooterLocation}
                  </p>
                )}
                {cleanInstagram && (
                  <p className="text-[9px] text-stone-500">
                    @{cleanInstagram}
                  </p>
                )}
                <p className="text-[8px] text-stone-400 pt-1">
                  {formData.catalogFooterCopyright || `© ${new Date().getFullYear()} ${formData.businessName || 'Luisices'}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
