import { getSupabaseClient } from './supabase';
import { logger } from './apiUtils';

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
      const BATCH_SIZE = 1000;
      const allProducts: SitemapProduct[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * BATCH_SIZE;
        const to = from + BATCH_SIZE - 1;

        const { data, error } = await supabase
          .from('products')
          .select('id, created_at, updated_at')
          .range(from, to);

        if (error) {
          logger.warn('[sitemap] Failed to query products batch from Supabase:', { error, page });
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          const mapped = data.map((p: any) => ({
            id: p.id,
            updatedAt: p.updated_at || p.created_at || new Date().toISOString(),
          }));
          allProducts.push(...mapped);

          if (data.length < BATCH_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      if (allProducts.length > 45000) {
        logger.warn('[sitemap] Product count exceeds 45,000 threshold; sitemap splitting into index files recommended.', {
          count: allProducts.length,
        });
      }

      if (allProducts.length > 0) {
        return allProducts;
      }
    }
  } catch (err) {
    logger.warn('[sitemap] Failed to query products from Supabase:', { error: err });
  }

  return FALLBACK_PRODUCT_IDS;
}
