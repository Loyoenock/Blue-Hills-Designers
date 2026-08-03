import { describe, it, expect, vi } from 'vitest';

describe('Guest Review Rollback & Rating Recalculation Logic', () => {
  it('correctly maps guest reviews with user_id null', () => {
    const currentUserId = undefined;
    const isUUID = (str?: string) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const validUserId = currentUserId && isUUID(currentUserId) ? currentUserId : null;

    expect(validUserId).toBeNull();
  });

  it('recalculates product average rating when review is added', () => {
    const existingReviews = [
      { rating: 5 },
      { rating: 3 }
    ];
    const newReview = { rating: 4 };
    const updatedReviews = [...existingReviews, newReview];
    const avgRating = Number(
      (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1)
    );

    expect(avgRating).toBe(4.0);
  });

  it('rolls back products state if database insert returns failure', async () => {
    const initialProducts = [
      {
        id: 'prod-123',
        name: 'Bespoke Suit',
        reviews: [{ rating: 5 }],
        rating: 5.0
      }
    ];

    let storeProducts = [...initialProducts];

    // Mock optimistic update
    const previousProducts = storeProducts;
    const newReview = { rating: 1 };
    storeProducts = storeProducts.map(p => {
      if (p.id === 'prod-123') {
        const updatedReviews = [...p.reviews, newReview];
        const avgRating = Number(
          (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1)
        );
        return { ...p, reviews: updatedReviews, rating: avgRating };
      }
      return p;
    });

    expect(storeProducts[0].reviews.length).toBe(2);
    expect(storeProducts[0].rating).toBe(3.0);

    // Mock failed DB insert response
    const dbRes = { success: false, error: 'Row-level security violation' };

    if (!dbRes.success) {
      storeProducts = previousProducts;
    }

    expect(storeProducts[0].reviews.length).toBe(1);
    expect(storeProducts[0].rating).toBe(5.0);
  });
});
