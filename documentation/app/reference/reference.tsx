'use client';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import { basePath } from '@/lib/shared';

/*
 * Scalar lit public/openapi.json. Pas de relais : « Essayer » appelle app.hopla.page directement (l'API ouvre CORS),
 * la clé tapée ne part donc vers personne d'autre. Ni polices ni outils de Scalar chargés d'ailleurs.
 */
export function Reference() {
  return (
    <ApiReferenceReact
      configuration={{
        url: `${basePath}/openapi.json`,
        theme: 'none',
        layout: 'modern',
        withDefaultFonts: false,
        hideDarkModeToggle: true,
        forceDarkModeState: 'light',
        darkMode: false,
        hideClientButton: false,
        showDeveloperTools: 'never',
        telemetry: false,
        persistAuth: false,
        documentDownloadType: 'none',
        hideModels: false,
        defaultOpenFirstTag: true,
        orderSchemaPropertiesBy: 'preserve',
        defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
        mcp: { disabled: true },
        agent: { disabled: true },
        metaData: { title: 'API reference · Hopla Docs' },
      }}
    />
  );
}
