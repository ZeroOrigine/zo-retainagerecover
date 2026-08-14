import { createAdminClient } from '@/lib/supabase/admin';

export async function getProfile(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, project_id, stripe_customer_id, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error('Could not load your profile. Please try again.');
  }

  return data;
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string; avatar_url?: string },
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, email, full_name, avatar_url, project_id, updated_at')
    .single();

  if (error) {
    throw new Error('Could not update your profile. Please try again.');
  }

  return data;
}

export async function deleteAccount(userId: string) {
  const supabase = createAdminClient();

  // Delete profile (subscriptions and feedback will cascade or remain for records)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    throw new Error(
      'Could not delete your account. Please contact support for help.',
    );
  }

  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    throw new Error(
      'Your data was removed but we could not fully delete your account. Please contact support.',
    );
  }

  return { deleted: true };
}
