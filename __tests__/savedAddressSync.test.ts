import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';

describe('Saved Address Sync & Rollback Behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    useStore.setState({
      currentUserId: '123e4567-e89b-12d3-a456-426614174000',
      currentUser: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Customer',
      },
      savedAddresses: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          userId: '123e4567-e89b-42d3-a456-426614174000',
          label: 'Home',
          country: 'Uganda',
          district: 'Kampala',
          city: 'Kampala',
          address: '123 Initial St',
          isDefault: true,
          is_default: true,
        },
      ],
    });
  });

  it('addSavedAddress rolls back optimistic state on 403 API failure', async () => {
    // Mock global fetch to return 403 Access Denied
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/db')) {
        return {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({ error: 'Access Denied: Table "saved_addresses" is not authorized for operations.' }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const initialAddresses = useStore.getState().savedAddresses;
    expect(initialAddresses.length).toBe(1);

    const result = await useStore.getState().addSavedAddress({
      label: 'Work',
      country: 'Uganda',
      district: 'Kampala',
      city: 'Kampala',
      address: '456 Commercial Rd',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Access Denied');

    // State should have rolled back to initial state
    const currentAddresses = useStore.getState().savedAddresses;
    expect(currentAddresses.length).toBe(1);
    expect(currentAddresses[0].address).toBe('123 Initial St');
  });

  it('updateSavedAddress rolls back optimistic state on 403 API failure', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/db')) {
        return {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({ error: 'Access Denied: Table "saved_addresses" is not authorized for operations.' }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const targetId = '11111111-1111-4111-8111-111111111111';
    const result = await useStore.getState().updateSavedAddress(targetId, {
      address: '789 Updated St',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Access Denied');

    // State should have rolled back
    const currentAddresses = useStore.getState().savedAddresses;
    expect(currentAddresses.length).toBe(1);
    expect(currentAddresses[0].address).toBe('123 Initial St');
  });

  it('addSavedAddress retains optimistic state on 200 API success', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/db')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [{ id: '22222222-2222-4222-8222-222222222222', label: 'Office' }] }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const result = await useStore.getState().addSavedAddress({
      label: 'Office',
      country: 'Uganda',
      district: 'Kampala',
      city: 'Kampala',
      address: '100 Business Park',
    });

    expect(result.success).toBe(true);

    const currentAddresses = useStore.getState().savedAddresses;
    expect(currentAddresses.length).toBe(2);
    expect(currentAddresses.find((a: any) => a.label === 'Office')).toBeDefined();
  });

  it('updateSavedAddress retains optimistic state on 200 API success', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/db')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [{ id: '11111111-1111-4111-8111-111111111111' }] }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const targetId = '11111111-1111-4111-8111-111111111111';
    const result = await useStore.getState().updateSavedAddress(targetId, {
      address: '789 Updated St',
    });

    expect(result.success).toBe(true);

    const currentAddresses = useStore.getState().savedAddresses;
    expect(currentAddresses.length).toBe(1);
    expect(currentAddresses[0].address).toBe('789 Updated St');
  });
});
