// CANONICAL profile service for RetainageRecover.
// The profile carries the business identity that appears in the from block
// of a release invoice: company name, address, and phone.

import type { SupabaseClient } from '@supabase/supabase-js';
import { translateDatabaseError } from '@/lib/db/errors';
import type { ProfileRow } from '@/lib/db/types';

// invoice_seq and role stay server-side; they are never returned by the API.
const PROFILE_COLUMNS =
  'id, email, full_name, company_name, company_address, company_phone, created_at, updated_at';

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('retainagerecover_profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not load your profile. Give it a moment and try again.'
    );
  }
  return (data as ProfileRow | null) ?? null;
}

// The signup trigger creates the profile row for every new account. This
// upsert covers accounts created before the schema was applied, so a missing
// row never turns into a broken dashboard.
export async function ensureProfile(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<ProfileRow> {
  const existing = await getProfile(supabase, user.id);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('retainagerecover_profiles')
    .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not set up your profile. Give it a moment and try again.'
    );
  }
  return data as ProfileRow;
}

export interface ProfileUpdateInput {
  full_name?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  company_phone?: string | null;
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: ProfileUpdateInput
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('retainagerecover_profiles')
    .update(updates)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not save your profile changes. Give it a moment and try again.'
    );
  }
  return data as ProfileRow;
}
