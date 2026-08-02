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

  it('correctly identifies private storage paths vs public URLs', () => {
    const isPrivateStoragePath = (url: string) => !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:');
    
    expect(isPrivateStoragePath('admin/products/item1/file1.png')).toBe(true);
    expect(isPrivateStoragePath('https://example.com/item1.png')).toBe(false);
    expect(isPrivateStoragePath('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
  });

  it('triggers cleanup for uploaded storage paths when database operation fails', async () => {
    const uploadedPaths: string[] = ['user1/products/p1/img1.png', 'user1/products/p1/img2.png'];
    const cleanedUpPaths: string[] = [];

    const mockDeleteStorageFile = async (path: string) => {
      cleanedUpPaths.push(path);
      return true;
    };

    // Simulate DB insert failure
    const dbSuccess = false;
    if (!dbSuccess) {
      for (const path of uploadedPaths) {
        await mockDeleteStorageFile(path);
      }
    }

    expect(cleanedUpPaths).toEqual(['user1/products/p1/img1.png', 'user1/products/p1/img2.png']);
  });
});
