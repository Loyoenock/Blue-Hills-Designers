import { describe, it, expect } from 'vitest';

function mapReviewPayload(payload: any, state: { currentUserId?: string; currentUser?: { id: string } }) {
  const isUUID = (str?: string) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  
  let userId = payload.userId || payload.user_id;
  if (userId && !isUUID(userId)) {
    userId = null;
  }
  const activeUserId = state.currentUserId || state.currentUser?.id;
  if (!userId && activeUserId && isUUID(activeUserId)) {
    userId = activeUserId;
  }
  return {
    ...(isUUID(payload.id) ? { id: payload.id } : {}),
    product_id: payload.productId || payload.product_id,
    user_id: userId || null,
    rating: Number(payload.rating) || 5,
    comment: payload.comment || '',
    user_name: payload.userName || payload.user_name || 'Guest',
    user_role: payload.userRole || payload.user_role || 'Customer',
    user_company: payload.userCompany || payload.user_company || null,
    created_at: payload.date || payload.created_at || new Date().toISOString()
  };
}

describe('mapReviewPayload', () => {
  it('maps guest review with user_id as null instead of fake UUID', () => {
    const payload = {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      rating: 5,
      comment: 'Excellent craftsmanship',
      userName: 'Guest User'
    };
    const mapped = mapReviewPayload(payload, {});
    expect(mapped.user_id).toBeNull();
    expect(mapped.product_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(mapped.rating).toBe(5);
    expect(mapped.user_name).toBe('Guest User');
    expect(mapped.user_role).toBe('Customer');
  });

  it('maps logged-in user review with their profile UUID', () => {
    const authUserId = '987e6543-e89b-12d3-a456-426614174999';
    const payload = {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      rating: 4,
      comment: 'Great quality'
    };
    const mapped = mapReviewPayload(payload, { currentUserId: authUserId });
    expect(mapped.user_id).toBe(authUserId);
  });

  it('ignores non-UUID userId like "usr-guest" and treats as null', () => {
    const payload = {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      userId: 'usr-guest',
      rating: 5,
      comment: 'Loved it'
    };
    const mapped = mapReviewPayload(payload, {});
    expect(mapped.user_id).toBeNull();
  });
});
