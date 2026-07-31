import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';
import { getSupabaseClient } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

describe('Logout and Session Cleanup in Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logout() clears currentUser, currentUserId, wishlist, and savedAddresses', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    (getSupabaseClient as any).mockReturnValue({
      auth: {
        signOut: mockSignOut,
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });

    useStore.setState({
      currentUser: {
        id: 'usr-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '12345678',
        role: 'Customer',
        spending: 100,
        rewardsPoints: 50,
      },
      currentUserId: 'usr-123',
      wishlist: ['prod-1'],
      savedAddresses: [
        { id: 'addr-1', userId: 'usr-123', name: 'Home', isDefault: true, country: 'Uganda', district: 'Kampala', city: 'Kampala', address: 'Main St', createdAt: '2026-01-01' }
      ]
    });

    expect(useStore.getState().currentUser?.name).toBe('Jane Doe');
    expect(useStore.getState().currentUserId).toBe('usr-123');
    expect(useStore.getState().wishlist.length).toBe(1);

    await useStore.getState().logout();

    expect(useStore.getState().currentUser).toBeNull();
    expect(useStore.getState().currentUserId).toBeNull();
    expect(useStore.getState().wishlist).toEqual([]);
    expect(useStore.getState().savedAddresses).toEqual([]);
  });

  it('fetchLatestState() without auth session does NOT restore currentUser or currentUserId', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
    const createSelectChain = () => {
      const chain: any = {
        data: [],
        error: null,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: any) => resolve({ data: [], error: null })
      };
      return chain;
    };

    const mockFrom = vi.fn().mockImplementation(() => ({
      select: () => createSelectChain()
    }));

    (getSupabaseClient as any).mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom
    });

    useStore.setState({
      currentUser: null,
      currentUserId: null
    });

    await useStore.getState().fetchLatestState();

    expect(useStore.getState().currentUser).toBeNull();
    expect(useStore.getState().currentUserId).toBeNull();
  });
});
