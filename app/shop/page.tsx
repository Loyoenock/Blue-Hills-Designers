export const revalidate = 60;

import type { Metadata } from 'next';
import { getSupabaseClient } from '../../lib/supabase';
import { logger } from '../../lib/apiUtils';
import ShopClientWrapper from './ShopClientWrapper';

export const metadata: Metadata = {
  title: 'Premium Corporate Clothing Collection | Blue Hills Designers',
  description: 'Browse Uganda\'s finest selection of executive menswear including luxury suits, corporate shirts, custom trousers, and high-end shoes imported from Turkey, Egypt, and Italy.',
  openGraph: {
    title: 'Corporate Ready-To-Wear Menswear | Blue Hills Designers',
    description: 'Bespoke corporate fits and luxury ready-to-wear at Lubowa Shopping Mall, Uganda.',
  }
};

export default async function ShopPage() {
  let initialProducts: any[] = [];
  let initialCategories: string[] = [];

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: dbProducts } = await supabase.from('products').select('*');
      if (dbProducts && dbProducts.length > 0) {
        const productIds = dbProducts.map((p: any) => p.id).filter(Boolean);

        // Fetch reviews and images scoped to the products being displayed
        let dbReviews: any[] | null = null;
        if (productIds.length > 0) {
          const { data: revData } = await supabase.from('reviews').select('*').in('product_id', productIds);
          dbReviews = revData;
        }

        const { data: dbCats } = await supabase.from('categories').select('*');
        if (dbCats) {
          initialCategories = dbCats.filter((c: any) => c.slug !== 'app-settings').map((c: any) => c.name);
        }
        
        let dbImages: any[] | null = null;
        try {
          if (productIds.length > 0) {
            const { data: imgData } = await supabase.from('product_images').select('*').in('product_id', productIds);
            dbImages = imgData;
          }
        } catch (e) {
          logger.warn('Could not query product_images:', { error: e });
        }

        const reviewsWithProfiles = dbReviews ? dbReviews.map((r: any) => ({
          id: r.id,
          productId: r.product_id,
          userName: 'Gentleman Customer',
          userRole: 'Customer',
          rating: r.rating,
          comment: r.comment,
          date: r.created_at
        })) : [];

        initialProducts = dbProducts.map((p: any) => {
          const catName = dbCats ? (dbCats.find((c: any) => c.id === p.category_id)?.name || 'Suits') : 'Suits';
          const prodReviews = reviewsWithProfiles.filter(r => r.productId === p.id);
          
          const productImages = dbImages
            ? dbImages
                .filter((img: any) => img.product_id === p.id)
                .sort((a: any, b: any) => (a.display_order || 1) - (b.display_order || 1))
                .map((img: any) => img.image_url)
            : [];
          
          const finalImages = productImages.length > 0 ? productImages : [p.slug ? `https://picsum.photos/seed/${p.slug}/600/600` : 'https://picsum.photos/seed/suit/600/600'];

          let parsedSizes = ['M', 'L', 'XL'];
          let parsedColors = ['Classic Black'];
          if (p.short_description) {
            try {
              const parsed = JSON.parse(p.short_description);
              if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.sizes) && parsed.sizes.length > 0) {
                  parsedSizes = parsed.sizes;
                }
                if (Array.isArray(parsed.colors) && parsed.colors.length > 0) {
                  parsedColors = parsed.colors;
                }
              }
            } catch {
              // Not JSON
            }
          }

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            category: catName,
            price: Number(p.price) || 0,
            images: finalImages,
            sizes: parsedSizes,
            colors: parsedColors,
            stock: Number(p.stock) || 0,
            rating: Number(p.rating) || 0,
            isNew: p.is_new,
            isFeatured: p.is_featured,
            isDealOfTheDay: p.is_deal,
            discountPercentage: Number(p.discount_percentage) || 0,
            reviews: prodReviews
          };
        });
      }
    }
  } catch (err) {
    logger.error('Error fetching initial products on shop page server:', err);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': 'Premium Menswear Collection',
    'description': 'Browse our selected range of suits, coats, shirts, and high-fashion items.',
    'url': 'https://blue-hills-designers.com/shop',
    'mainEntity': {
      '@type': 'ItemList',
      'itemListElement': initialProducts.slice(0, 10).map((p, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'url': `https://blue-hills-designers.com/product/${p.id}`,
        'name': p.name,
        'image': p.images[0]
      }))
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ShopClientWrapper initialProducts={initialProducts} initialCategories={initialCategories} />
    </>
  );
}
