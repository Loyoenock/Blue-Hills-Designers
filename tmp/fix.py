import re

def fix_store():
    with open('store/useStore.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update mapToSupabasePayload case saved_addresses
    saved_addr_case = """    case 'saved_addresses': {
      const currentUserId = state.currentUser?.id;
      const rawUserId = payload.userId || payload.user_id;
      const validUserId = rawUserId && isUUID(rawUserId)
        ? rawUserId
        : (currentUserId && isUUID(currentUserId) ? currentUserId : null);

      const out: any = {
        user_id: validUserId,
        label: payload.label || 'Home',
        country: payload.country || 'Uganda',
        district: payload.district || '',
        city: payload.city || '',
        address: payload.address || payload.streetAddress || '',
        is_default: payload.isDefault !== undefined ? Boolean(payload.isDefault) : (payload.is_default !== undefined ? Boolean(payload.is_default) : false)
      };
      if (payload.id && isUUID(payload.id)) {
        out.id = payload.id;
      }
      return out;
    }"""

    if "case 'saved_addresses':" in content:
        content = re.sub(
            r"case 'saved_addresses':[\s\S]*?(?=case '|default:|\n\s*\}\s*\n)",
            saved_addr_case + "\n\n    ",
            content
        )
    else:
        content = content.replace("default:", saved_addr_case + "\n\n    default:")

    # 2. Update fetchSavedAddresses
    new_fetch_saved = """  fetchSavedAddresses: async () => {
    const currentUserId = get().currentUser?.id;
    if (!currentUserId || !isUUID(currentUserId)) {
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('user_id', currentUserId);
      if (error) throw error;
      if (data) {
        const mapped = data.map((addr: any) => ({
          id: addr.id,
          userId: addr.user_id,
          label: addr.label || 'Home',
          country: addr.country || 'Uganda',
          district: addr.district || '',
          city: addr.city || '',
          address: addr.address || addr.street_address || '',
          isDefault: Boolean(addr.is_default),
          is_default: Boolean(addr.is_default),
          createdAt: addr.created_at
        }));
        set({ savedAddresses: mapped });
      }
    } catch (err) {
      console.error('Failed to fetch saved addresses:', err);
    }
  },"""

    if "fetchSavedAddresses:" in content:
        content = re.sub(
            r"fetchSavedAddresses:[\s\S]*?(?=\n\s*[a-zA-Z0-9_]+:|\n\s*\},)",
            new_fetch_saved.strip(),
            content
        )

    # 3. Update addSavedAddress
    new_add_saved = """  addSavedAddress: async (addrInput: any) => {
    const currentUserId = get().currentUser?.id;
    const isAuthUser = currentUserId && isUUID(currentUserId);
    const id = isUUID(addrInput?.id) ? addrInput.id : crypto.randomUUID();
    const isDef = addrInput.isDefault ?? addrInput.is_default ?? false;
    const newAddr = {
      id,
      userId: isAuthUser ? currentUserId : undefined,
      label: addrInput.label || 'Home',
      country: addrInput.country || 'Uganda',
      district: addrInput.district || '',
      city: addrInput.city || '',
      address: addrInput.address || addrInput.streetAddress || '',
      isDefault: Boolean(isDef),
      is_default: Boolean(isDef)
    };

    const prev = get().savedAddresses || [];
    let updatedList = [...prev];
    if (newAddr.isDefault) {
      updatedList = updatedList.map((a: any) => ({ ...a, isDefault: false, is_default: false }));
    }
    updatedList.push(newAddr);
    set({ savedAddresses: updatedList });

    if (!isAuthUser) {
      return { success: true, data: newAddr };
    }

    const payload = mapToSupabasePayload('saved_addresses', newAddr, get());
    const { data, error } = await safeSupabaseUpsert('saved_addresses', payload);
    if (error) {
      set({ savedAddresses: prev });
      return { success: false, error: error.message || 'Failed to add address' };
    }
    return { success: true, data: data ? data[0] : newAddr };
  },"""

    if "addSavedAddress:" in content:
        content = re.sub(
            r"addSavedAddress:[\s\S]*?(?=\n\s*[a-zA-Z0-9_]+:|\n\s*\},)",
            new_add_saved.strip(),
            content
        )

    # 4. Update updateSavedAddress / updateAddress
    new_update_saved = """  updateSavedAddress: async (id: string, updates: any) => {
    const currentUserId = get().currentUser?.id;
    const isAuthUser = currentUserId && isUUID(currentUserId);
    const prev = get().savedAddresses || [];

    const isDefSetting = updates.isDefault ?? updates.is_default;
    let updatedList = prev.map((a: any) => {
      if (a.id === id) {
        const isDef = isDefSetting !== undefined ? Boolean(isDefSetting) : (a.isDefault ?? a.is_default ?? false);
        return {
          ...a,
          ...updates,
          isDefault: isDef,
          is_default: isDef
        };
      }
      if (isDefSetting) {
        return { ...a, isDefault: false, is_default: false };
      }
      return a;
    });
    set({ savedAddresses: updatedList });

    const targetAddr = updatedList.find((a: any) => a.id === id);
    if (!isAuthUser || !isUUID(id) || !targetAddr) {
      return { success: true };
    }

    const payload = mapToSupabasePayload('saved_addresses', targetAddr, get());
    const { error } = await safeSupabaseUpsert('saved_addresses', payload);
    if (error) {
      set({ savedAddresses: prev });
      return { success: false, error: error.message || 'Failed to update address' };
    }
    return { success: true };
  },"""

    if "updateSavedAddress:" in content:
        content = re.sub(
            r"updateSavedAddress:[\s\S]*?(?=\n\s*[a-zA-Z0-9_]+:|\n\s*\},)",
            new_update_saved.strip(),
            content
        )

    # 5. Update deleteSavedAddress
    new_delete_saved = """  deleteSavedAddress: async (id: string) => {
    const currentUserId = get().currentUser?.id;
    const isAuthUser = currentUserId && isUUID(currentUserId);
    const prev = get().savedAddresses || [];
    set({ savedAddresses: prev.filter((a: any) => a.id !== id) });

    if (!isAuthUser || !isUUID(id)) {
      return { success: true };
    }

    const supabase = getSupabaseClient();
    if (!supabase) return { success: true };
    try {
      const { error } = await supabase.from('saved_addresses').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      set({ savedAddresses: prev });
      return { success: false, error: err.message || 'Failed to delete address' };
    }
  },"""

    if "deleteSavedAddress:" in content:
        content = re.sub(
            r"deleteSavedAddress:[\s\S]*?(?=\n\s*[a-zA-Z0-9_]+:|\n\s*\},)",
            new_delete_saved.strip(),
            content
        )

    with open('store/useStore.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('store/useStore.ts updated successfully')

fix_store()
