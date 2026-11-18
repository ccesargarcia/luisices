import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => 'vercel-analytics',
}));

vi.mock('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => 'vercel-speed-insights',
}));

vi.mock('../../src/app/routes', () => ({
  router: {},
  isStoreRoute: () => false,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock('../../src/app/components/common/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock('../../src/app/components/ui/sonner', () => ({
  Toaster: () => null,
}));

import { VercelBetaTelemetry } from '../../src/app/App';

describe('VercelBetaTelemetry host gating', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['beta.luisices.com.br', 'loja.beta.luisices.com.br'])(
    'renders SpeedInsights and Analytics on %s',
    (hostname) => {
      vi.stubGlobal('window', { location: { hostname } });
      const element = VercelBetaTelemetry();
      expect(element).not.toBeNull();
    },
  );

  it.each(['dev.luisices.com.br', 'loja.dev.luisices.com.br', 'luisices.com.br', 'localhost'])(
    'does not render SpeedInsights or Analytics on %s',
    (hostname) => {
      vi.stubGlobal('window', { location: { hostname } });
      expect(VercelBetaTelemetry()).toBeNull();
    },
  );
});
