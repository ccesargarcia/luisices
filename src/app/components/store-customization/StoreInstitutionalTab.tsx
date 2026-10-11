import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import {
  Building2,
  Sparkles,
  Bot,
  Heart,
  ImageIcon,
  Loader2,
  Upload,
  X,
  Plus,
  Trash2,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { StoreCustomizationFormData, StoreCustomizationHandleChange } from './types';

export interface StoreInstitutionalTabProps {
  formData: StoreCustomizationFormData;
  handleChange: StoreCustomizationHandleChange;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  fillInstitutionalDefaults: () => void;
  setShowAiModal: (show: boolean) => void;
  currentCatalogAboutImage: string | null;
  uploadingAboutImage: boolean;
  handleAboutImageUpload: (file: File) => Promise<void>;
  handleAboutImageRemove: () => Promise<void>;
}

export function StoreInstitutionalTab({
  formData,
  handleChange,
  setFormData,
  fillInstitutionalDefaults,
  setShowAiModal,
  currentCatalogAboutImage,
  uploadingAboutImage,
  handleAboutImageUpload,
  handleAboutImageRemove,
}: StoreInstitutionalTabProps) {
  // Handlers dinâmicos de pilares
  const handleAddPillar = () => {
    setFormData((prev: any) => ({
      ...prev,
      catalogAboutPillars: [
        ...prev.catalogAboutPillars,
        { id: `p-${Date.now()}`, title: '', text: '' },
      ],
    }));
  };

  const handleUpdatePillar = (index: number, field: 'title' | 'text', value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogAboutPillars: prev.catalogAboutPillars.map((p: any, i: number) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const handleRemovePillar = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogAboutPillars: prev.catalogAboutPillars.filter((_: any, i: number) => i !== index),
    }));
  };

  // Handlers dinâmicos de etapas
  const handleAddStep = () => {
    setFormData((prev: any) => ({
      ...prev,
      catalogHowItWorksSteps: [
        ...prev.catalogHowItWorksSteps,
        { id: `s-${Date.now()}`, title: `${prev.catalogHowItWorksSteps.length + 1}. `, text: '' },
      ],
    }));
  };

  const handleUpdateStep = (index: number, field: 'title' | 'text', value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogHowItWorksSteps: prev.catalogHowItWorksSteps.map((s: any, i: number) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleRemoveStep = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogHowItWorksSteps: prev.catalogHowItWorksSteps.filter((_: any, i: number) => i !== index),
    }));
  };

  // Handlers dinâmicos de diferenciais
  const handleAddFeature = () => {
    setFormData((prev: any) => ({
      ...prev,
      catalogFeatureItems: [
        ...prev.catalogFeatureItems,
        { id: `f-${Date.now()}`, title: '', text: '' },
      ],
    }));
  };

  const handleUpdateFeature = (index: number, field: 'title' | 'text', value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogFeatureItems: prev.catalogFeatureItems.map((f: any, i: number) =>
        i === index ? { ...f, [field]: value } : f
      ),
    }));
  };

  const handleRemoveFeature = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogFeatureItems: prev.catalogFeatureItems.filter((_: any, i: number) => i !== index),
    }));
  };

  // Handlers dinâmicos de FAQ
  const handleAddFaq = () => {
    setFormData((prev: any) => ({
      ...prev,
      catalogFaqItems: [
        ...prev.catalogFaqItems,
        { id: `faq-${Date.now()}`, question: '', answer: '' },
      ],
    }));
  };

  const handleUpdateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogFaqItems: prev.catalogFaqItems.map((faq: any, i: number) =>
        i === index ? { ...faq, [field]: value } : faq
      ),
    }));
  };

  const handleRemoveFaq = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogFaqItems: prev.catalogFaqItems.filter((_: any, i: number) => i !== index),
    }));
  };

  // Handlers dinâmicos de seções customizadas
  const handleAddCustomSection = () => {
    setFormData((prev: any) => ({
      ...prev,
      catalogCustomSections: [
        ...prev.catalogCustomSections,
        { id: `custom-${Date.now()}`, title: '', badge: '', content: '' },
      ],
    }));
  };

  const handleUpdateCustomSection = (
    index: number,
    field: 'title' | 'badge' | 'content',
    value: string
  ) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogCustomSections: prev.catalogCustomSections.map((sec: any, i: number) =>
        i === index ? { ...sec, [field]: value } : sec
      ),
    }));
  };

  const handleRemoveCustomSection = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      catalogCustomSections: prev.catalogCustomSections.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-5">
      {/* Header / Banner de Sugestões Prontas */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm text-primary">
            <Building2 className="size-4" />
            <span>Seções Institucionais & Confiança da Marca</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Ative e personalize seções modulares para tornar seu catálogo mais profissional e confiável:{' '}
            <strong>Quem Somos</strong>, <strong>Como Funciona a Encomenda</strong>,{' '}
            <strong>Diferenciais</strong> e <strong>Perguntas Frequentes (FAQ)</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillInstitutionalDefaults}
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold"
          >
            <Sparkles className="size-3.5" />
            Sugestão Manual
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setShowAiModal(true)}
            className="gap-1.5 shadow-xs text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Bot className="size-3.5" />
            Sugestão por IA (Gemini)
          </Button>
        </div>
      </div>

      {/* 1. SEÇÃO QUEM SOMOS / SOBRE O ATELIÊ */}
      <Card
        className={`shadow-xs transition-colors ${
          formData.catalogShowAbout ? 'border-primary/30' : 'border-border/60 opacity-90'
        }`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="size-4 text-rose-500" />
                1. Quem Somos / Sobre o Ateliê
              </CardTitle>
              <CardDescription className="text-xs">
                Apresente a história, carinho artesanal e propósito do seu ateliê para encantar os visitantes.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formData.catalogShowAbout
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {formData.catalogShowAbout ? 'Ativa no Catálogo' : 'Oculta'}
              </span>
              <Switch
                id="toggle-show-about"
                checked={Boolean(formData.catalogShowAbout)}
                onCheckedChange={(checked) => handleChange('catalogShowAbout', checked)}
              />
            </div>
          </div>
        </CardHeader>

        {formData.catalogShowAbout && (
          <CardContent className="space-y-5 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="inst-about-badge" className="text-xs font-semibold">
                  Selo Superior (Badge)
                </Label>
                <Input
                  id="inst-about-badge"
                  placeholder="Ex: Sobre Nós ou Nosso Ateliê"
                  value={formData.catalogAboutBadge}
                  onChange={(e) => handleChange('catalogAboutBadge', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inst-about-title" className="text-xs font-semibold">
                  Título Principal da Seção
                </Label>
                <Input
                  id="inst-about-title"
                  placeholder="Ex: Feito à Mão com Afeto & Dedicação"
                  value={formData.catalogAboutTitle}
                  onChange={(e) => handleChange('catalogAboutTitle', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inst-about-text" className="text-xs font-semibold">
                História / Apresentação do Ateliê
              </Label>
              <Textarea
                id="inst-about-text"
                rows={4}
                placeholder="Conte como o ateliê nasceu, seu amor pela encadernação/papelaria e o cuidado em cada pedido..."
                value={formData.catalogAboutText}
                onChange={(e) => handleChange('catalogAboutText', e.target.value)}
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Foto Institucional / Foto da Artesã ou Ateliê */}
            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-primary" />
                  Foto Institucional (Artesã ou Ateliê)
                </Label>
                <span className="text-[10px] text-muted-foreground">Opcional • Formato 4:3 ou 1:1</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {currentCatalogAboutImage ? (
                  <div className="relative size-24 rounded-2xl overflow-hidden border border-border shadow-xs shrink-0 bg-muted">
                    <img
                      src={currentCatalogAboutImage}
                      alt="Foto Institucional"
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="size-24 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground/60 shrink-0 bg-background/50">
                    <ImageIcon className="size-6" />
                    <span className="text-[9px] mt-1">Sem foto</span>
                  </div>
                )}

                <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <Label htmlFor="inst-about-img-upload" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingAboutImage}
                        className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
                        asChild
                      >
                        <span>
                          {uploadingAboutImage ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Enviando foto...
                            </>
                          ) : (
                            <>
                              <Upload className="size-3.5" />
                              {currentCatalogAboutImage ? 'Trocar Foto' : 'Enviar Foto'}
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="inst-about-img-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void handleAboutImageUpload(file);
                      }}
                    />

                    {currentCatalogAboutImage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploadingAboutImage}
                        onClick={handleAboutImageRemove}
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                      >
                        <X className="size-3.5" />
                        Remover Foto
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    JPG, PNG ou WebP até 5MB. Uma foto acolhedora da artesã ou do ambiente do ateliê gera grande conexão e confiança.
                  </p>
                </div>
              </div>
            </div>

            {/* Pilares do Ateliê (Dinâmicos) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Pilares / Destaques do Ateliê ({formData.catalogAboutPillars.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPillar}
                  className="gap-1.5 text-xs border-dashed text-primary border-primary/40 hover:bg-primary/5 h-7"
                >
                  <Plus className="size-3.5" />
                  Adicionar Pilar
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {formData.catalogAboutPillars.map((pillar, idx) => (
                  <div key={pillar.id || idx} className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-primary">Pilar {idx + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePillar(idx)}
                        disabled={formData.catalogAboutPillars.length <= 1}
                        className="size-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Título (ex: Produção Artesanal)"
                      value={pillar.title}
                      onChange={(e) => handleUpdatePillar(idx, 'title', e.target.value)}
                      className="text-xs font-medium"
                    />
                    <Textarea
                      rows={2}
                      placeholder="Descrição curta do pilar..."
                      value={pillar.text}
                      onChange={(e) => handleUpdatePillar(idx, 'text', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 2. SEÇÃO COMO FUNCIONA A ENCOMENDA */}
      <Card
        className={`shadow-xs transition-colors ${
          formData.catalogShowHowItWorks ? 'border-primary/30' : 'border-border/60 opacity-90'
        }`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                2. Como Funciona a Encomenda (Passo a Passo)
              </CardTitle>
              <CardDescription className="text-xs">
                Explique aos clientes de forma visual e simples as etapas da encomenda até a entrega.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formData.catalogShowHowItWorks
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {formData.catalogShowHowItWorks ? 'Ativa no Catálogo' : 'Oculta'}
              </span>
              <Switch
                id="toggle-show-how-it-works"
                checked={Boolean(formData.catalogShowHowItWorks)}
                onCheckedChange={(checked) => handleChange('catalogShowHowItWorks', checked)}
              />
            </div>
          </div>
        </CardHeader>

        {formData.catalogShowHowItWorks && (
          <CardContent className="space-y-4 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="inst-hiw-badge" className="text-xs font-semibold">
                  Selo Superior (Badge)
                </Label>
                <Input
                  id="inst-hiw-badge"
                  placeholder="Ex: Passo a Passo"
                  value={formData.catalogHowItWorksBadge}
                  onChange={(e) => handleChange('catalogHowItWorksBadge', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inst-hiw-title" className="text-xs font-semibold">
                  Título da Seção
                </Label>
                <Input
                  id="inst-hiw-title"
                  placeholder="Ex: Como Funciona sua Encomenda?"
                  value={formData.catalogHowItWorksTitle}
                  onChange={(e) => handleChange('catalogHowItWorksTitle', e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="inst-hiw-sub" className="text-xs font-semibold">
                  Subtítulo Explicativo
                </Label>
                <Input
                  id="inst-hiw-sub"
                  placeholder="Ex: Um processo simples do pedido até a sua porta"
                  value={formData.catalogHowItWorksSubtitle}
                  onChange={(e) => handleChange('catalogHowItWorksSubtitle', e.target.value)}
                />
              </div>
            </div>

            {/* Etapas do Passo a Passo (Dinâmicas) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  Etapas do Passo a Passo ({formData.catalogHowItWorksSteps.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddStep}
                  className="gap-1.5 text-xs border-dashed text-primary border-primary/40 hover:bg-primary/5 h-7"
                >
                  <Plus className="size-3.5" />
                  Adicionar Etapa
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.catalogHowItWorksSteps.map((step, idx) => (
                  <div key={step.id || idx} className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                        Etapa {idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStep(idx)}
                        disabled={formData.catalogHowItWorksSteps.length <= 1}
                        className="size-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder={`Título da Etapa (ex: ${idx + 1}. Escolha seus Mimos)`}
                      value={step.title}
                      onChange={(e) => handleUpdateStep(idx, 'title', e.target.value)}
                      className="text-xs font-semibold"
                    />
                    <Textarea
                      rows={2}
                      placeholder="Texto explicativo da etapa..."
                      value={step.text}
                      onChange={(e) => handleUpdateStep(idx, 'text', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 3. SEÇÃO DIFERENCIAIS DA MARCA */}
      <Card
        className={`shadow-xs transition-colors ${
          formData.catalogShowFeatures ? 'border-primary/30' : 'border-border/60 opacity-90'
        }`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                3. Diferenciais do Ateliê (Qualidade & Garantia)
              </CardTitle>
              <CardDescription className="text-xs">
                Destaque os motivos e garantias que tornam sua papelaria única (ex: atendimento, acabamento, envio seguro).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formData.catalogShowFeatures
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {formData.catalogShowFeatures ? 'Ativa no Catálogo' : 'Oculta'}
              </span>
              <Switch
                id="toggle-show-features"
                checked={Boolean(formData.catalogShowFeatures)}
                onCheckedChange={(checked) => handleChange('catalogShowFeatures', checked)}
              />
            </div>
          </div>
        </CardHeader>

        {formData.catalogShowFeatures && (
          <CardContent className="space-y-4 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="inst-feat-badge" className="text-xs font-semibold">
                  Selo Superior (Badge)
                </Label>
                <Input
                  id="inst-feat-badge"
                  placeholder="Ex: Nossos Diferenciais"
                  value={formData.catalogFeaturesBadge}
                  onChange={(e) => handleChange('catalogFeaturesBadge', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inst-feat-title" className="text-xs font-semibold">
                  Título da Seção
                </Label>
                <Input
                  id="inst-feat-title"
                  placeholder="Ex: Por que escolher a Luisices?"
                  value={formData.catalogFeaturesTitle}
                  onChange={(e) => handleChange('catalogFeaturesTitle', e.target.value)}
                />
              </div>
            </div>

            {/* Diferenciais (Dinâmicos) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  Diferenciais do Ateliê ({formData.catalogFeatureItems.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFeature}
                  className="gap-1.5 text-xs border-dashed text-primary border-primary/40 hover:bg-primary/5 h-7"
                >
                  <Plus className="size-3.5" />
                  Adicionar Diferencial
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.catalogFeatureItems.map((feat, idx) => (
                  <div key={feat.id || idx} className="p-3 rounded-xl border border-border/80 bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-primary">Diferencial {idx + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFeature(idx)}
                        disabled={formData.catalogFeatureItems.length <= 1}
                        className="size-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Título (ex: Atendimento Humanizado)"
                      value={feat.title}
                      onChange={(e) => handleUpdateFeature(idx, 'title', e.target.value)}
                      className="text-xs font-medium"
                    />
                    <Textarea
                      rows={2}
                      placeholder="Descrição do diferencial..."
                      value={feat.text}
                      onChange={(e) => handleUpdateFeature(idx, 'text', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. SEÇÃO PERGUNTAS FREQUENTES (FAQ) */}
      <Card
        className={`shadow-xs transition-colors ${
          formData.catalogShowFaq ? 'border-primary/30' : 'border-border/60 opacity-90'
        }`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="size-4 text-indigo-500" />
                4. Dúvidas Frequentes (FAQ)
              </CardTitle>
              <CardDescription className="text-xs">
                Responda antecipadamente às principais dúvidas sobre prazos, envio, pagamento e aprovação de arte.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formData.catalogShowFaq
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {formData.catalogShowFaq ? 'Ativa no Catálogo' : 'Oculta'}
              </span>
              <Switch
                id="toggle-show-faq"
                checked={Boolean(formData.catalogShowFaq)}
                onCheckedChange={(checked) => handleChange('catalogShowFaq', checked)}
              />
            </div>
          </div>
        </CardHeader>

        {formData.catalogShowFaq && (
          <CardContent className="space-y-4 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="inst-faq-badge" className="text-xs font-semibold">
                  Selo Superior (Badge)
                </Label>
                <Input
                  id="inst-faq-badge"
                  placeholder="Ex: Tire suas Dúvidas"
                  value={formData.catalogFaqBadge}
                  onChange={(e) => handleChange('catalogFaqBadge', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inst-faq-title" className="text-xs font-semibold">
                  Título da Seção
                </Label>
                <Input
                  id="inst-faq-title"
                  placeholder="Ex: Perguntas Frequentes (FAQ)"
                  value={formData.catalogFaqTitle}
                  onChange={(e) => handleChange('catalogFaqTitle', e.target.value)}
                />
              </div>
            </div>

            {/* Perguntas e Respostas (Dinâmicas) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <HelpCircle className="size-3.5 text-indigo-500" />
                  Perguntas e Respostas ({formData.catalogFaqItems.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFaq}
                  className="gap-1.5 text-xs border-dashed text-primary border-primary/40 hover:bg-primary/5 h-7"
                >
                  <Plus className="size-3.5" />
                  Adicionar Pergunta (FAQ)
                </Button>
              </div>
              <div className="space-y-3">
                {formData.catalogFaqItems.map((faq, idx) => (
                  <div key={faq.id || idx} className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-primary">Pergunta {idx + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFaq(idx)}
                        disabled={formData.catalogFaqItems.length <= 1}
                        className="size-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Pergunta (ex: Qual é o prazo médio de produção?)"
                      value={faq.question}
                      onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                      className="text-xs font-medium"
                    />
                    <Textarea
                      rows={2}
                      placeholder="Resposta clara e objetiva..."
                      value={faq.answer}
                      onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 5. SEÇÕES EXTRAS PERSONALIZADAS */}
      <Card className="shadow-xs border-border/70 bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                5. Seções Extras Personalizadas ({formData.catalogCustomSections.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Adicione blocos institucionais extras conforme sua necessidade (ex: "Política de Trocas", "Cuidados com os Mimos", "Nossa Oficina").
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomSection}
              className="gap-1.5 text-xs border-dashed text-primary border-primary/40 hover:bg-primary/5 font-semibold"
            >
              <Plus className="size-3.5" />
              Adicionar Nova Seção
            </Button>
          </div>
        </CardHeader>

        {formData.catalogCustomSections.length > 0 && (
          <CardContent className="space-y-4 pt-0 border-t border-border/40 animate-in fade-in-50 duration-200">
            <div className="space-y-4 pt-4">
              {formData.catalogCustomSections.map((sec, idx) => (
                <div key={sec.id || idx} className="p-4 rounded-xl border border-border/80 bg-background space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">Seção Customizada #{idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCustomSection(idx)}
                      className="gap-1 text-destructive hover:bg-destructive/10 text-xs h-7 px-2"
                    >
                      <Trash2 className="size-3.5" />
                      Remover Seção
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Selo Superior (Opcional)</Label>
                      <Input
                        placeholder="Ex: Importante ou Cuidados Especiais"
                        value={sec.badge || ''}
                        onChange={(e) => handleUpdateCustomSection(idx, 'badge', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Título da Seção</Label>
                      <Input
                        placeholder="Ex: Política de Personalização e Trocas"
                        value={sec.title}
                        onChange={(e) => handleUpdateCustomSection(idx, 'title', e.target.value)}
                        className="text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Conteúdo / Texto Explicativo</Label>
                    <Textarea
                      rows={3}
                      placeholder="Escreva as informações detalhadas desta seção..."
                      value={sec.content}
                      onChange={(e) => handleUpdateCustomSection(idx, 'content', e.target.value)}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
