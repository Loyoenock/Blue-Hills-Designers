export const dynamic = 'force-dynamic';

import { getSupabaseClient } from '../../../lib/supabase';
import ProductClientWrapper from './ProductClientWrapper';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  let initialProduct = null;

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: p } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (p) {
        // Fetch categories to map category name
        const { data: dbCats } = await supabase.from('categories').select('*');
        const catName = dbCats?.find((c: any) => c.id === p.category_id)?.name || 'Suits';

        // Fetch reviews
        const { data: dbReviews } = await supabase
          .from('reviews')
          .select('*')
          .eq('product_id', id);

        const { data: dbProfilesList } = await supabase.from('profiles').select('*');

        const mappedReviews = dbReviews ? dbReviews.map((r: any) => {
          const profile = dbProfilesList?.find((prof: any) => prof.id === r.user_id);
          return {
            id: r.id,
            productId: r.product_id,
            userName: profile?.full_name || 'Gentleman Customer',
            userRole: profile?.role || 'Customer',
            rating: r.rating,
            comment: r.comment,
            date: r.created_at
          };
        }) : [];

        let dbImages: any[] | null = null;
        try {
          const { data: imgData } = await supabase.from('product_images').select('*');
          dbImages = imgData;
        } catch (e) {
          console.warn('Could not query product_images:', e);
        }

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

        initialProduct = {
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
          reviews: mappedReviews
        };
      }
    }
  } catch (err) {
    console.error('Error fetching initial product on server details page:', err);
  }

  return <ProductClientWrapper productId={id} initialProduct={initialProduct} />;
}
