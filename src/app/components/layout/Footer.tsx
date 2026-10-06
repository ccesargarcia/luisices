import React from 'react';
import { normalizePhoneForWhatsApp } from '../../utils/whatsapp';
import { normalizeInstagramUrl, normalizeWebsiteUrl } from '../../utils/urlUtils';
import { AboutBusinessDialog } from './AboutBusinessDialog';
import { Package2, Phone, Mail, MapPin, AtSign, MessageCircle, Globe, ArrowUp } from 'lucide-react';
import { cn } from '../ui/utils';
import { Button } from '../ui/button';

export interface FooterProps {
  sidebarCollapsed: boolean;
  businessName: string;
  logo?: string;
  businessTagline?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  instagramUrl?: string;
  whatsappPhone?: string;
  websiteUrl?: string;
  isDevEnvironment: boolean;
  appVersion: string;
  aboutOpen: boolean;
  onAboutOpenChange: (open: boolean) => void;

  // Personalização
  footerMode?: 'compact' | 'complete' | 'hidden';
  footerShowSocialLinks?: boolean;
  footerShowContactInfo?: boolean;
  footerShowVersion?: boolean;
  footerShowScrollToTop?: boolean;
}

export function Footer({
  sidebarCollapsed,
  businessName,
  logo,
  businessTagline,
  businessPhone,
  businessEmail,
  businessAddress,
  instagramUrl,
  whatsappPhone,
  websiteUrl,
  isDevEnvironment,
  appVersion,
  aboutOpen,
  onAboutOpenChange,
  footerMode = 'compact',
  footerShowSocialLinks = true,
  footerShowContactInfo = true,
  footerShowVersion = true,
  footerShowScrollToTop = true,
}: FooterProps) {
  // Se o rodapé estiver oculto, renderiza apenas o modal sobre (se invocado) e opcionalmente o botão flutuante de topo
  if (footerMode === 'hidden') {
    return (
      <>
        {footerShowScrollToTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-20 md:bottom-6 right-4 z-40 size-8 sm:size-9 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer"
            title="Voltar ao topo"
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
        <AboutBusinessDialog
          businessName={businessName}
          logo={logo}
          businessTagline={businessTagline}
          businessEmail={businessEmail}
          businessPhone={businessPhone}
          isDevEnvironment={isDevEnvironment}
          appVersion={appVersion}
          open={aboutOpen}
          onOpenChange={onAboutOpenChange}
        />
      </>
    );
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasSocials = Boolean(instagramUrl || whatsappPhone || businessEmail || websiteUrl);
  const hasContacts = Boolean(businessPhone || businessEmail || businessAddress);

  return (
    <footer
      className={cn(
        'mt-auto min-w-0 border-t border-border/60 bg-card/85 backdrop-blur-2xl transition-[margin,width] duration-300 pb-16 md:pb-0 text-xs text-muted-foreground',
        sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-72 md:w-[calc(100%-18rem)]'
      )}
    >
      <div className="w-full px-3 sm:px-4">
        {/* ─── MODO COMPACTO (1 Linha Clean e Eficiente) ──────────────── */}
        {footerMode === 'compact' ? (
          <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
            {/* Lado Esquerdo: Identidade em linha */}
            <div className="flex items-center gap-2 min-w-0 flex-wrap justify-center sm:justify-start">
              {logo ? (
                <img src={logo} alt={businessName} className="h-5 object-contain flex-shrink-0 opacity-80" />
              ) : (
                <Package2 className="size-3.5 text-primary shrink-0" />
              )}
              <span className="font-semibold text-foreground text-xs">{businessName}</span>
              {footerShowVersion && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                  v{appVersion} {isDevEnvironment && '• DEV'}
                </span>
              )}
              {businessTagline && (
                <span className="text-muted-foreground/70 hidden lg:inline truncate text-[11px]">
                  — {businessTagline}
                </span>
              )}
            </div>

            {/* Lado Direito: Ações & Redes */}
            <div className="flex items-center gap-2 shrink-0">
              {footerShowSocialLinks && hasSocials && (
                <div className="flex items-center gap-1.5 mr-1">
                  {instagramUrl && (
                    <a
                      href={normalizeInstagramUrl(instagramUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Instagram"
                      className="size-6 rounded-full border border-border/80 bg-background/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    >
                      <AtSign className="size-3" />
                    </a>
                  )}
                  {whatsappPhone && (
                    <a
                      href={`https://wa.me/${normalizePhoneForWhatsApp(whatsappPhone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                      className="size-6 rounded-full border border-border/80 bg-background/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    >
                      <MessageCircle className="size-3" />
                    </a>
                  )}
                  {websiteUrl && (
                    <a
                      href={normalizeWebsiteUrl(websiteUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Site da Loja"
                      className="size-6 rounded-full border border-border/80 bg-background/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    >
                      <Globe className="size-3" />
                    </a>
                  )}
                </div>
              )}

              <AboutBusinessDialog
                businessName={businessName}
                logo={logo}
                businessTagline={businessTagline}
                businessEmail={businessEmail}
                businessPhone={businessPhone}
                isDevEnvironment={isDevEnvironment}
                appVersion={appVersion}
                open={aboutOpen}
                onOpenChange={onAboutOpenChange}
              />

              {footerShowScrollToTop && (
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="size-6 rounded-full border border-border/80 bg-background/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors ml-1"
                  title="Voltar ao topo da página"
                  aria-label="Voltar ao topo"
                >
                  <ArrowUp className="size-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ─── MODO COMPLETO (3 Colunas Tradicionais) ───────────────── */
          <div className="py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Identidade */}
              <div className="flex items-center gap-3 min-w-0">
                {logo ? (
                  <img src={logo} alt={businessName} className="h-8 object-contain flex-shrink-0 opacity-80" />
                ) : (
                  <div className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md flex-shrink-0">
                    <Package2 className="size-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate text-foreground">{businessName}</p>
                  {businessTagline && (
                    <p className="text-xs text-muted-foreground truncate">{businessTagline}</p>
                  )}
                  {footerShowVersion && (
                    <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                      Versão {appVersion} {isDevEnvironment && '• Ambiente DEV'}
                    </p>
                  )}
                </div>
              </div>

              {/* Informações de contato */}
              {footerShowContactInfo && hasContacts && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {businessPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" />
                      {businessPhone}
                    </span>
                  )}
                  {businessEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" />
                      {businessEmail}
                    </span>
                  )}
                  {businessAddress && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {businessAddress}
                    </span>
                  )}
                </div>
              )}

              {/* Links sociais + copyright */}
              <div className="flex flex-col items-start sm:items-end gap-2">
                <div className="flex items-center gap-2">
                  {footerShowSocialLinks && hasSocials && (
                    <>
                      {instagramUrl && (
                        <a
                          href={normalizeInstagramUrl(instagramUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Instagram"
                          className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                        >
                          <AtSign className="size-3.5" />
                        </a>
                      )}
                      {whatsappPhone && (
                        <a
                          href={`https://wa.me/${normalizePhoneForWhatsApp(whatsappPhone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp"
                          className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                      )}
                      {businessEmail && (
                        <a
                          href={`mailto:${businessEmail}`}
                          title={businessEmail}
                          className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                        >
                          <Mail className="size-3.5" />
                        </a>
                      )}
                      {websiteUrl && (
                        <a
                          href={normalizeWebsiteUrl(websiteUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Site"
                          className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                        >
                          <Globe className="size-3.5" />
                        </a>
                      )}
                    </>
                  )}

                  <AboutBusinessDialog
                    businessName={businessName}
                    logo={logo}
                    businessTagline={businessTagline}
                    businessEmail={businessEmail}
                    businessPhone={businessPhone}
                    isDevEnvironment={isDevEnvironment}
                    appVersion={appVersion}
                    open={aboutOpen}
                    onOpenChange={onAboutOpenChange}
                  />

                  {footerShowScrollToTop && (
                    <button
                      type="button"
                      onClick={scrollToTop}
                      className="flex items-center justify-center size-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                      title="Voltar ao topo"
                      aria-label="Voltar ao topo"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
