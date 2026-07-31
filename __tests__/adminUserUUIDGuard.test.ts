import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';
import { isUUID } from '@/lib/utils';

describe('Admin User UUID Pre-flight Guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isUUID correctly identifies valid and invalid UUIDs', () => {
    expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
    
    expect(isUUID('usr-staff')).toBe(false);
    expect(isUUID('usr-admin')).toBe(false);
    expect(isUUID('usr-1')).toBe(false);
    expect(isUUID('usr-manager')).toBe(false);
    expect(isUUID('random-string')).toBe(false);
  });

  it('adminDeleteUser rejects non-UUID ids immediately without network layer calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await useStore.getState().adminDeleteUser('usr-staff', 'Master Admin', 'Super Admin');

    expect(result.success).toBe(false);
    expect(result.error).toContain('This record only exists locally and has no corresponding database entry to delete/update');
    
    // Verify network layer fetch was NEVER called
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('adminUpdateUser rejects non-UUID ids immediately without network layer calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await useStore.getState().adminUpdateUser(
      'usr-admin',
      { name: 'Attempted Update Name' },
      'Master Admin',
      'Super Admin'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('This record only exists locally and has no corresponding database entry to delete/update');
    
    // Verify network layer fetch was NEVER called
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('deleteCoupon rejects non-UUID demo ids via safeSupabaseDelete guard without network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await useStore.getState().deleteCoupon('cpn-demo-1', 'Master Admin', 'Super Admin');

    expect(result.success).toBe(false);
    expect(result.error).toContain('This record only exists locally and has no corresponding database entry to delete/update');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('deleteProduct rejects non-UUID demo ids via safeSupabaseDelete guard without network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await useStore.getState().deleteProduct('prod-1', 'Master Admin', 'Super Admin');

    expect(result.success).toBe(false);
    expect(result.error).toContain('This record only exists locally and has no corresponding database entry to delete/update');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
