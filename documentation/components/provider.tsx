'use client';
import SearchDialog from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { type ReactNode } from 'react';
import { TRADUCTIONS } from '@/lib/traductions';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider search={{ SearchDialog }} theme={{ enabled: false, forcedTheme: 'light', defaultTheme: 'light' }} i18n={{ locale: 'fr', translations: TRADUCTIONS }}>
      {children}
    </RootProvider>
  );
}
