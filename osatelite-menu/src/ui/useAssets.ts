import { useEffect, useMemo, useState } from 'react';
import { loadFonts, type Fonts } from '../render/fonts';
import { loadLogo, type LogoAsset } from '../render/logo';
import { layoutMenu, type Layout } from '../render/layout';
import type { DailyMenu, TemplateSettings } from '../domain/types';

export interface Assets {
  fonts: Fonts;
  logo: LogoAsset;
}

/** Waits for the bundled fonts and logo; nothing is rendered until both are ready. */
export function useAssets(): { assets: Assets | null; error: string | null } {
  const [assets, setAssets] = useState<Assets | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadFonts(), loadLogo()])
      .then(([fonts, logo]) => alive && setAssets({ fonts, logo }))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);
  return { assets, error };
}

export function useLayout(menu: DailyMenu | null, settings: TemplateSettings, assets: Assets | null): Layout | null {
  return useMemo(() => {
    if (!menu || !assets) return null;
    return layoutMenu({ menu, settings, logoAspect: assets.logo.width / assets.logo.height }, assets.fonts);
  }, [menu, settings, assets]);
}
