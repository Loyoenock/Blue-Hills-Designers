import { describe, it, expect } from 'vitest';

function isUUID(str?: string): boolean {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function mapWishlistPayload(payload: any, state: { currentUserId?: string; currentUser?: { id: string } }) {
  const activeUserId = state.currentUserId || state.currentUser?.id;
  const uid = payload.userId || payload.user_id || activeUserId;
  if (!uid || !isUUID(uid)) {
    // skip DB write for pure guests; local-only is fine
    return null;
  }
  return {
    ...(isUUID(payload.id) ? { id: payload.id } : {}),
    user_id: uid,
    product_id: payload.productId || payload.product_id,
    created_at: payload.createdAt || payload.created_at || new Date().toISOString()
  };
}

describe('Wishlist Toggle & Payload Mapping', () => {
  it('returns null payload for guest users without UUID', () => {
    const payload = { productId: '123e4567-e89b-12d3-a456-426614174000' };
    const mapped = mapWishlistPayload(payload, {});
    expect(mapped).toBeNull();
  });

  it('returns valid mapped payload for authenticated users with UUID', () => {
    const authUserId = '987e6543-e89b-12d3-a456-426614174999';
    const payload = { productId: '123e4567-e89b-12d3-a456-426614174000' };
    const mapped = mapWishlistPayload(payload, { currentUserId: authUserId });
    expect(mapped).not.toBeNull();
    expect(mapped?.user_id).toBe(authUserId);
    expect(mapped?.product_id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('ignores non-UUID demo user IDs', () => {
    const payload = { userId: 'demo-guest-123', productId: '123e4567-e89b-12d3-a456-426614174000' };
    const mapped = mapWishlistPayload(payload, {});
    expect(mapped).toBeNull();
  });
});
