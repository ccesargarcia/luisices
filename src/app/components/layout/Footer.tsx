import React from 'react';
import { normalizePhoneForWhatsApp } from '../../utils/whatsapp';
import { normalizeInstagramUrl, normalizeWebsiteUrl } from '../../utils/urlUtils';
import { AboutBusinessDialog } from './AboutBusinessDialog';
import { Package2, Phone, Mail, MapPin, AtSign, MessageCircle, Globe } from 'lucide-react';
import { cn } from '../ui/utils';

interface FooterProps {
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
}: FooterProps) {
  return (
    <footer
      className={cn(
        'mt-auto min-w-0 border-t border-white/40 bg-card/85 backdrop-blur-2xl transition-[margin,width] duration-300 pb-16 md:pb-0',
        sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-72 md:w-[calc(100%-18rem)]'
      )}
    >
      <div className="w-full px-4 py-6">
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
              <p className="font-semibold text-sm truncate">{businessName}</p>
              {businessTagline && (
                <p className="text-xs text-muted-foreground truncate">{businessTagline}</p>
              )}
            </div>
          </div>

          {/* Informações de contato */}
          {(businessPhone || businessEmail || businessAddress) && (
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
            </div>

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
          </div>
        </div>
      </div>
    </footer>
  );
}
