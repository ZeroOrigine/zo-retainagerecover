// CANONICAL project service for RetainageRecover.
// A project is the kernel: contract value, retainage percent, completion
// date, hold days. The database derives retainage_amount and
// release_eligible_date; this service adds the human context on top: is the
// money claimable today, and if not, how many days remain.

import type { SupabaseClient } from '@supabase/supabase-js';
import { translateDatabaseError } from '@/lib/db/errors';
import type {
  ProjectRow,
  ProjectStatus,
  ProjectTotals,
  ProjectWithEligibility,
} from '@/lib/db/types';

const PROJECT_COLUMNS =
  'id, user_id, name, project_number, gc_name, gc_email, contract_value, retainage_pct, retainage_amount, completion_date, release_hold_days, release_eligible_date, status, notes, created_at, updated_at';

const MILLISECONDS_PER_DAY = 86_400_000;

const PROJECT_CHECK_MESSAGE =
  'Double-check the numbers: contract value must be greater than zero, retainage must be between 0 and 50 percent, and hold days must be 730 or fewer.';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// Date-only comparison in UTC. Deterministic and timezone-free, matching how
// the database stores the dates.
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function withEligibility(project: ProjectRow): ProjectWithEligibility {
  if (!project.release_eligible_date) {
    return { ...project, is_eligible: false, days_until_eligible: null };
  }
  const daysUntilEligible = Math.round(
    (Date.parse(project.release_eligible_date) - Date.parse(todayIsoDate())) /
      MILLISECONDS_PER_DAY
  );
  return {
    ...project,
    is_eligible: project.status === 'active' && daysUntilEligible <= 0,
    days_until_eligible: daysUntilEligible,
  };
}

export interface ListProjectsOptions {
  page: number;
  limit: number;
  status?: ProjectStatus;
  eligibleOnly?: boolean;
}

export async function listProjects(
  supabase: SupabaseClient,
  userId: string,
  options: ListProjectsOptions
): Promise<{ projects: ProjectWithEligibility[]; total: number }> {
  const from = (options.page - 1) * options.limit;
  const to = from + options.limit - 1;

  let query = supabase
    .from('retainagerecover_projects')
    .select(PROJECT_COLUMNS, { count: 'exact' })
    .eq('user_id', userId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.eligibleOnly) {
    query = query
      .eq('status', 'active')
      .not('release_eligible_date', 'is', null)
      .lte('release_eligible_date', todayIsoDate());
  }

  const { data, error, count } = await query
    .order('release_eligible_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not load your projects. Give it a moment and try again.'
    );
  }

  return {
    projects: ((data ?? []) as ProjectRow[]).map(withEligibility),
    total: count ?? 0,
  };
}

export async function getProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<ProjectWithEligibility | null> {
  const { data, error } = await supabase
    .from('retainagerecover_projects')
    .select(PROJECT_COLUMNS)
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not load that project. Give it a moment and try again.'
    );
  }
  return data ? withEligibility(data as ProjectRow) : null;
}

export interface ProjectCreateInput {
  name: string;
  project_number?: string | null;
  gc_name: string;
  gc_email?: string | null;
  contract_value: number;
  retainage_pct: number;
  completion_date?: string | null;
  release_hold_days?: number;
  notes?: string | null;
}

export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  input: ProjectCreateInput
): Promise<ProjectWithEligibility> {
  const { data, error } = await supabase
    .from('retainagerecover_projects')
    .insert({ user_id: userId, ...input })
    .select(PROJECT_COLUMNS)
    .single();

  if (error) {
    // The plan limit trigger raises P0001 here when the account is full.
    // translateDatabaseError passes that human message through as a 403.
    throw translateDatabaseError(
      error,
      'We could not save that project. Give it a moment and try again.',
      { checkMessage: PROJECT_CHECK_MESSAGE }
    );
  }
  return withEligibility(data as ProjectRow);
}

export interface ProjectUpdateInput {
  name?: string;
  project_number?: string | null;
  gc_name?: string;
  gc_email?: string | null;
  contract_value?: number;
  retainage_pct?: number;
  completion_date?: string | null;
  release_hold_days?: number;
  notes?: string | null;
  status?: 'active' | 'archived';
}

export async function updateProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  updates: ProjectUpdateInput
): Promise<ProjectWithEligibility | null> {
  const { data, error } = await supabase
    .from('retainagerecover_projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not save those project changes. Give it a moment and try again.',
      { checkMessage: PROJECT_CHECK_MESSAGE }
    );
  }
  return data ? withEligibility(data as ProjectRow) : null;
}

export async function deleteProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('retainagerecover_projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not delete that project. Give it a moment and try again.'
    );
  }
  return data !== null;
}

// One pass over the user's projects, aggregated into the numbers the
// dashboard leads with: how much retainage is out there, how much is
// claimable today, and how much has already come home.
export async function getProjectTotals(
  supabase: SupabaseClient,
  userId: string
): Promise<ProjectTotals> {
  const { data, error } = await supabase
    .from('retainagerecover_projects')
    .select('status, retainage_amount, release_eligible_date')
    .eq('user_id', userId);

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not total up your retainage. Give it a moment and try again.'
    );
  }

  const rows = (data ?? []) as Array<
    Pick<ProjectRow, 'status' | 'retainage_amount' | 'release_eligible_date'>
  >;

  const today = todayIsoDate();
  const totals: ProjectTotals = {
    outstanding_count: 0,
    outstanding_amount: 0,
    eligible_now_count: 0,
    eligible_now_amount: 0,
    upcoming_count: 0,
    upcoming_amount: 0,
    missing_date_count: 0,
    missing_date_amount: 0,
    invoiced_count: 0,
    invoiced_amount: 0,
    collected_count: 0,
    collected_amount: 0,
  };

  for (const row of rows) {
    const amount = Number(row.retainage_amount) || 0;

    if (row.status === 'active' || row.status === 'invoiced') {
      totals.outstanding_count += 1;
      totals.outstanding_amount += amount;
    }

    if (row.status === 'active') {
      if (!row.release_eligible_date) {
        totals.missing_date_count += 1;
        totals.missing_date_amount += amount;
      } else if (row.release_eligible_date <= today) {
        totals.eligible_now_count += 1;
        totals.eligible_now_amount += amount;
      } else {
        totals.upcoming_count += 1;
        totals.upcoming_amount += amount;
      }
    } else if (row.status === 'invoiced') {
      totals.invoiced_count += 1;
      totals.invoiced_amount += amount;
    } else if (row.status === 'collected') {
      totals.collected_count += 1;
      totals.collected_amount += amount;
    }
  }

  totals.outstanding_amount = roundMoney(totals.outstanding_amount);
  totals.eligible_now_amount = roundMoney(totals.eligible_now_amount);
  totals.upcoming_amount = roundMoney(totals.upcoming_amount);
  totals.missing_date_amount = roundMoney(totals.missing_date_amount);
  totals.invoiced_amount = roundMoney(totals.invoiced_amount);
  totals.collected_amount = roundMoney(totals.collected_amount);

  return totals;
}
