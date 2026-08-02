import { describe, it, expect } from 'vitest';

function mapNewsletterPayload(payload: { id?: string; email?: string; date?: string; subscribedAt?: string }) {
  const isUUID = (str?: string) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  
  return {
    ...(payload.id && isUUID(payload.id) ? { id: payload.id } : {}),
    email: (payload.email || '').trim().toLowerCase(),
    subscribed_at: payload.date || payload.subscribedAt || new Date().toISOString()
  };
}

describe('mapNewsletterPayload', () => {
  it('omits non-UUID id so DB can generate UUID default', () => {
    const payload = { id: 'sub-12345678', email: 'Test@Example.com', date: '2026-07-31' };
    const mapped = mapNewsletterPayload(payload);
    expect(mapped.id).toBeUndefined();
    expect(mapped.email).toBe('test@example.com');
  });

  it('includes valid UUID id when provided', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    const payload = { id: validUUID, email: 'Executive@Example.com' };
    const mapped = mapNewsletterPayload(payload);
    expect(mapped.id).toBe(validUUID);
    expect(mapped.email).toBe('executive@example.com');
  });

  it('identifies duplicate constraint errors and returns clear message', () => {
    const handleDbError = (errStr: string) => {
      const isDuplicate = errStr.includes('23505') ||
        errStr.toLowerCase().includes('duplicate') ||
        errStr.toLowerCase().includes('already') ||
        errStr.toLowerCase().includes('unique');

      return isDuplicate ? 'This email is already subscribed.' : errStr;
    };

    expect(handleDbError('duplicate key value violates unique constraint "newsletter_subscribers_email_unique"')).toBe('This email is already subscribed.');
    expect(handleDbError('Postgres error 23505')).toBe('This email is already subscribed.');
    expect(handleDbError('Connection failed')).toBe('Connection failed');
  });
});
