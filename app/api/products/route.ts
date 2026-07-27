import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger, ApiError } from '@/lib/apiUtils';

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    await enforceRateLimit(req, 600, 60000);

    const authHeader = req.headers.get('Authorization');
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    const supabase = getSupabaseForRequest(token);
    if (!supabase) {
      throw new ApiError('Supabase client could not be initialized.', 500);
    }

    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort');
    const search = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam || '6', 10) || 6));

    let query = supabase
      .from('products')
      .select('*, categories(id, name, slug), product_images(image_url, display_order), reviews(*)', { count: 'exact' });

    // Category filter
    if (category && category !== 'All' && category !== 'Wishlist') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      if (isUuid) {
        query = query.eq('category_id', category);
      } else {
        query = query.eq('categories.name', category);
      }
    }

    // Min Price filter
    if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
      const minP = Number(minPrice);
      if (!isNaN(minP)) {
        query = query.gte('price', minP);
      }
    }

    // Max Price filter
    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
      const maxP = Number(maxPrice);
      if (!isNaN(maxP)) {
        query = query.lte('price', maxP);
      }
    }

    // Search filter
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      query = query.or(`name.ilike.%${trimmedSearch}%,description.ilike.%${trimmedSearch}%`);
    }

    // Sorting
    if (sort === 'price-asc') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price-desc') {
      query = query.order('price', { ascending: false });
    } else if (sort === 'rating') {
      query = query.order('rating', { ascending: false });
    } else if (sort === 'featured') {
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;
    query = query.range(fromIndex, toIndex);

    const { data: rawData, count, error } = await query;

    if (error) {
      logger.error('Error querying products in API route', error);
      throw new ApiError(error.message, 400);
    }

    const mappedData = (rawData || []).map((p: any) => {
      const catName = p.categories?.name || p.category || 'Suits';
      let sizes = ['M', 'L', 'XL'];
      let colors = ['Classic Black'];

      if (p.short_description) {
        try {
          const parsed = JSON.parse(p.short_description);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.sizes) && parsed.sizes.length > 0) sizes = parsed.sizes;
            if (Array.isArray(parsed.colors) && parsed.colors.length > 0) colors = parsed.colors;
          }
        } catch {}
      }

      const productImages = Array.isArray(p.product_images) && p.product_images.length > 0
        ? p.product_images
            .sort((a: any, b: any) => (a.display_order || 1) - (b.display_order || 1))
            .map((img: any) => img.image_url)
        : [p.slug ? `https://picsum.photos/seed/${p.slug}/600/600` : 'https://picsum.photos/seed/suit/600/600'];

      return {
        id: p.id,
        name: p.name || 'Luxury Product',
        description: p.description || '',
        category: catName,
        price: Number(p.price) || 0,
        images: productImages,
        sizes: p.sizes || sizes,
        colors: p.colors || colors,
        stock: Number(p.stock) || 0,
        rating: Number(p.rating) || 0,
        reviews: Array.isArray(p.reviews) ? p.reviews.map((r: any) => ({
          id: r.id,
          productId: r.product_id || p.id,
          userName: r.user_name || 'Gentleman Customer',
          userRole: r.user_role || 'Customer',
          rating: Number(r.rating) || 5,
          comment: r.comment || '',
          date: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
        })) : [],
        isNew: Boolean(p.is_new),
        isFeatured: Boolean(p.is_featured),
        isDealOfTheDay: Boolean(p.is_deal),
        discountPercentage: Number(p.discount_percentage) || 0,
        dealDays: p.deal_days ?? 0,
        dealHours: p.deal_hours ?? 14,
        dealMins: p.deal_mins ?? 40,
        dealSecs: p.deal_secs ?? 17
      };
    });

    const totalCount = count !== null && count !== undefined ? count : mappedData.length;

    return NextResponse.json({
      data: mappedData,
      totalCount,
      page,
      pageSize
    });
  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
