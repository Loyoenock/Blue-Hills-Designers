import { getSupabaseClient } from './supabase';

export interface SitemapProduct {
  id: string;
  updatedAt?: string;
}

const FALLBACK_PRODUCT_IDS: SitemapProduct[] = [
  { id: 'prod-monaco-navy' },
  { id: 'prod-savile-pinstripe' },
  { id: 'prod-herringbone-shirts' },
  { id: 'prod-presidential-poplin' },
  { id: 'prod-cognac-oxfords' },
  { id: 'prod-obsidian-monks' },
  { id: 'prod-emerald-silk' },
  { id: 'prod-camel-overcoat' },
  { id: 'prod-calfskin-tote' },
  { id: 'prod-charcoal-blazer' },
  { id: 'prod-calfskin-loafers' },
];

export async function getAllProductsForSitemap(): Promise<SitemapProduct[]> {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('id, created_at, updated_at');

      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          updatedAt: p.updated_at || p.created_at || new Date().toISOString(),
        }));
      }
    }
  } catch (err) {
    console.warn('[sitemap] Failed to query products from Supabase:', err);
  }

  return FALLBACK_PRODUCT_IDS;
}
