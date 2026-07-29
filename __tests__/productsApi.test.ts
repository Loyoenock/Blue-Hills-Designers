import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/products/route';

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 600,
    remaining: 599,
  }),
}));

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

function createChainableQueryMock(resultData: any = [], resultCount = 0, resultError = null) {
  const queryMock: any = {};

  queryMock.eq = mockEq.mockImplementation(() => queryMock);
  queryMock.gte = mockGte.mockImplementation(() => queryMock);
  queryMock.lte = mockLte.mockImplementation(() => queryMock);
  queryMock.or = mockOr.mockImplementation(() => queryMock);
  queryMock.order = mockOrder.mockImplementation(() => queryMock);
  queryMock.range = mockRange.mockImplementation(() => queryMock);

  queryMock.then = (resolve: any, reject: any) => {
    return Promise.resolve({ data: resultData, count: resultCount, error: resultError }).then(resolve, reject);
  };

  return queryMock;
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseForRequest: vi.fn().mockReturnValue({
    from: vi.fn().mockImplementation(() => ({
      select: mockSelect,
    })),
  }),
}));

describe('Products API Route - Query Parameter & Pagination Translation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly parses category, price range, search, sort, and pagination query params', async () => {
    const fakeProductRow = {
      id: '11111111-2222-3333-4444-555555555555',
      name: 'Bespoke Tweed Blazer',
      description: 'Elegant hand-tailored suit',
      price: 1500,
      stock: 10,
      rating: 4.8,
      categories: { name: 'Suits' },
      product_images: [{ image_url: 'http://example.com/suit.jpg', display_order: 1 }],
      reviews: [],
      is_featured: true,
      is_new: false,
    };

    const queryMock = createChainableQueryMock([fakeProductRow], 25, null);
    mockSelect.mockReturnValue(queryMock);

    const url = 'http://localhost:3000/api/products?category=Suits&minPrice=500&maxPrice=2000&search=Blazer&sort=price-asc&page=2&pageSize=10';
    const req = new NextRequest(url, { method: 'GET' });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);

    // Verify select call
    expect(mockSelect).toHaveBeenCalledWith(
      '*, categories(id, name, slug), product_images(image_url, display_order), reviews(*)',
      { count: 'exact' }
    );

    // Verify category filter
    expect(mockEq).toHaveBeenCalledWith('categories.name', 'Suits');

    // Verify price filters
    expect(mockGte).toHaveBeenCalledWith('price', 500);
    expect(mockLte).toHaveBeenCalledWith('price', 2000);

    // Verify search filter
    expect(mockOr).toHaveBeenCalledWith('name.ilike.%Blazer%,description.ilike.%Blazer%');

    // Verify sort order
    expect(mockOrder).toHaveBeenCalledWith('price', { ascending: true });

    // Verify pagination range calculation: page 2, pageSize 10 -> index 10 to 19
    expect(mockRange).toHaveBeenCalledWith(10, 19);

    // Verify response format
    expect(json).toEqual({
      data: [
        expect.objectContaining({
          id: '11111111-2222-3333-4444-555555555555',
          name: 'Bespoke Tweed Blazer',
          category: 'Suits',
          price: 1500,
          images: ['http://example.com/suit.jpg'],
        }),
      ],
      totalCount: 25,
      page: 2,
      pageSize: 10,
    });
  });

  it('uses default pagination values (page=1, pageSize=6) when query params are omitted', async () => {
    const queryMock = createChainableQueryMock([], 0, null);
    mockSelect.mockReturnValue(queryMock);

    const req = new NextRequest('http://localhost:3000/api/products', { method: 'GET' });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockRange).toHaveBeenCalledWith(0, 5); // page=1, pageSize=6 -> 0 to 5
    expect(json.page).toBe(1);
    expect(json.pageSize).toBe(6);
    expect(json.totalCount).toBe(0);
  });
});
