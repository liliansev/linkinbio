import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Marque } from '@/components/marque';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <Marque />, url: '/' },
    themeSwitch: { enabled: false },
    links: [
      { text: 'API reference', url: '/reference', active: 'nested-url' },
      { text: 'hopla.page', url: 'https://hopla.page', external: true },
    ],
  };
}
