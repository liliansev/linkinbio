import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import type { MDXComponents } from 'mdx/types';
import { Accueil } from './accueil';
import { Methode, Route, Routes, RoutesDe, ToutesLesRoutes } from './routes';
import { ListePictos, ListeReseaux, ListeThemes, ListeTypes, TableV1 } from './listes';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Tab, Tabs, Step, Steps, Accueil, Methode, Route, Routes, RoutesDe, ToutesLesRoutes, ListeThemes, ListeReseaux, ListePictos, ListeTypes, TableV1,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
