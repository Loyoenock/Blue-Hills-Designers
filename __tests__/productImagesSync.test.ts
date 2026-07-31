import { describe, it, expect } from 'vitest';

function isUUID(str?: string): boolean {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function mapProductImagePayload(payload: any) {
  return {
    ...(isUUID(payload.id) ? { id: payload.id } : {}),
    product_id: payload.productId || payload.product_id,
    image_url: payload.imageUrl || payload.image_url,
    display_order: Number(payload.displayOrder || payload.display_order) || 1
  };
}

describe('Product Images Sync & Payload Mapping', () => {
  it('omits id when not UUID so Postgres generates gen_random_uuid()', () => {
    const payload = {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      imageUrl: 'https://example.com/suit-front.jpg',
      displayOrder: 1
    };
    const mapped = mapProductImagePayload(payload);
    expect(mapped.id).toBeUndefined();
    expect(mapped.product_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(mapped.image_url).toBe('https://example.com/suit-front.jpg');
    expect(mapped.display_order).toBe(1);
  });

  it('preserves id when it is a valid UUID', () => {
    const customUUID = '987e6543-e89b-12d3-a456-426614174999';
    const payload = {
      id: customUUID,
      productId: '123e4567-e89b-12d3-a456-426614174000',
      imageUrl: 'https://example.com/suit-back.jpg',
      displayOrder: 2
    };
    const mapped = mapProductImagePayload(payload);
    expect(mapped.id).toBe(customUUID);
    expect(mapped.display_order).toBe(2);
  });

  it('correctly sets 1-based display_order for multiple images', () => {
    const images = ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'];
    const mappedImages = images.map((img, idx) => mapProductImagePayload({
      productId: '123e4567-e89b-12d3-a456-426614174000',
      imageUrl: img,
      displayOrder: idx + 1
    }));

    expect(mappedImages.length).toBe(3);
    expect(mappedImages[0].display_order).toBe(1);
    expect(mappedImages[1].display_order).toBe(2);
    expect(mappedImages[2].display_order).toBe(3);
  });
});
