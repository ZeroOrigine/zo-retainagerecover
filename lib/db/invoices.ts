// CANONICAL release invoice service for RetainageRecover.
// The database BEFORE INSERT trigger snapshots amount, bill-to details,
// terms, and the invoice number, so creating a ready-to-send invoice takes
// just (user_id, project_id). This service adds ownership scoping, status
// flow rules, and project resync after deletes.

import type { SupabaseClient } from '@supabase/supabase-js';
import { ServiceError, translateDatabaseError } from '@/lib/db/errors';
import type {
  InvoiceStatus,
  ReleaseInvoiceRow,
  ReleaseInvoiceWithProject,
} from '@/lib/db/types';

const INVOICE_COLUMNS =
  'id, user_id, project_id, invoice_number, amount, issue_date, due_date, bill_to_name, bill_to_email, line_description, status, sent_at, paid_at, created_at, updated_at';

const INVOICE_WITH_PROJECT_COLUMNS = `${INVOICE_COLUMNS}, project:retainagerecover_projects(id, name, project_number, gc_name)`;

const DUPLICATE_NUMBER_MESSAGE =
  'That invoice number is already in use. Pick a different one, or leave it blank and we will number it for you.';

const INVOICE_CHECK_MESSAGE =
  'The due date needs to be on or after the issue date, and the amount needs to be greater than zero.';

// The only legal status moves. Everything else is a locked record.
const INVOICE_STATUS_FLOW: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'void'],
  sent: ['paid', 'void'],
  paid: [],
  void: [],
};

export function assertInvoiceStatusTransition(
  current: InvoiceStatus,
  next: InvoiceStatus
): void {
  if (current === next) {
    return;
  }
  const allowed = INVOICE_STATUS_FLOW[current];
  if (allowed.includes(next)) {
    return;
  }
  if (allowed.length === 0) {
    throw new ServiceError(
      `This invoice is ${current}, so its status is locked. Create a new invoice for this project if you need one.`,
      409,
      'INVALID_TRANSITION'
    );
  }
  throw new ServiceError(
    `A ${current} invoice can move to ${allowed.join(' or ')}, not to ${next}.`,
    409,
    'INVALID_TRANSITION'
  );
}

export interface ListInvoicesOptions {
  page: number;
  limit: number;
  status?: InvoiceStatus;
  projectId?: string;
}

export async function listInvoices(
  supabase: SupabaseClient,
  userId: string,
  options: ListInvoicesOptions
): Promise<{ invoices: ReleaseInvoiceWithProject[]; total: number }> {
  const from = (options.page - 1) * options.limit;
  const to = from + options.limit - 1;

  let query = supabase
    .from('retainagerecover_release_invoices')
    .select(INVOICE_WITH_PROJECT_COLUMNS, { count: 'exact' })
    .eq('user_id', userId);

  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.projectId) {
    query = query.eq('project_id', options.projectId);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not load your invoices. Give it a moment and try again.'
    );
  }

  return {
    invoices: (data ?? []) as unknown as ReleaseInvoiceWithProject[],
    total: count ?? 0,
  };
}

export async function listInvoicesForProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<ReleaseInvoiceRow[]> {
  const { data, error } = await supabase
    .from('retainagerecover_release_invoices')
    .select(INVOICE_COLUMNS)
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not load the invoices for that project. Give it a moment and try again.'
    );
  }
  return (data ?? []) as ReleaseInvoiceRow[];
}

export async function getInvoice(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
): Promise<ReleaseInvoiceWithProject | null> {
  const { data, error } = await supabase
    .from('retainagerecover_release_invoices')
    .select(INVOICE_WITH_PROJECT_COLUMNS)
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not load that invoice. Give it a moment and try again.'
    );
  }
  return (data as unknown as ReleaseInvoiceWithProject | null) ?? null;
}

export interface InvoiceCreateInput {
  project_id: string;
  amount?: number;
  issue_date?: string;
  due_date?: string;
  invoice_number?: string;
  bill_to_name?: string;
  bill_to_email?: string | null;
  line_description?: string;
}

export async function createReleaseInvoice(
  supabase: SupabaseClient,
  userId: string,
  input: InvoiceCreateInput
): Promise<ReleaseInvoiceWithProject> {
  const { data, error } = await supabase
    .from('retainagerecover_release_invoices')
    .insert({ user_id: userId, ...input })
    .select(INVOICE_WITH_PROJECT_COLUMNS)
    .single();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not create that invoice. Give it a moment and try again.',
      {
        duplicateMessage: DUPLICATE_NUMBER_MESSAGE,
        checkMessage: INVOICE_CHECK_MESSAGE,
      }
    );
  }
  return data as unknown as ReleaseInvoiceWithProject;
}

export interface InvoiceUpdateInput {
  status?: InvoiceStatus;
  amount?: number;
  issue_date?: string;
  due_date?: string;
  invoice_number?: string;
  bill_to_name?: string;
  bill_to_email?: string | null;
  line_description?: string;
}

export async function updateInvoice(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string,
  updates: InvoiceUpdateInput
): Promise<ReleaseInvoiceWithProject | null> {
  const { data, error } = await supabase
    .from('retainagerecover_release_invoices')
    .update(updates)
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .select(INVOICE_WITH_PROJECT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not save those invoice changes. Give it a moment and try again.',
      {
        duplicateMessage: DUPLICATE_NUMBER_MESSAGE,
        checkMessage: INVOICE_CHECK_MESSAGE,
      }
    );
  }
  return (data as unknown as ReleaseInvoiceWithProject | null) ?? null;
}

// Deleting is for drafts and voided invoices only. Sent and paid invoices
// are business records and stay put.
export interface DeleteInvoiceResult {
  deleted: boolean;
  // True when the project resync check could not confirm the project's
  // status after the delete. The UI should prompt a refresh so a stale
  // 'invoiced' status is not shown as final.
  resyncPending: boolean;
}

export async function deleteInvoice(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
): Promise<DeleteInvoiceResult> {
  const { data: existing, error: fetchError } = await supabase
    .from('retainagerecover_release_invoices')
    .select('id, project_id, status')
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw translateDatabaseError(
      fetchError,
      'We could not load that invoice. Give it a moment and try again.'
    );
  }
  if (!existing) {
    return { deleted: false, resyncPending: false };
  }

  const status = existing.status as InvoiceStatus;
  if (status === 'sent' || status === 'paid') {
    throw new ServiceError(
      'Sent and paid invoices stay in your records. Void a sent invoice instead of deleting it.',
      409,
      'INVOICE_LOCKED'
    );
  }

  const { error: deleteError } = await supabase
    .from('retainagerecover_release_invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('user_id', userId);

  if (deleteError) {
    throw translateDatabaseError(
      deleteError,
      'We could not delete that invoice. Give it a moment and try again.'
    );
  }

  const resyncOk = await resyncProjectAfterInvoiceRemoval(
    supabase,
    userId,
    existing.project_id as string
  );
  return { deleted: true, resyncPending: !resyncOk };
}

// The database sync trigger flips a project to invoiced on invoice INSERT,
// but nothing fires on DELETE. If the last live invoice for a project is
// removed, put the project back to active so its retainage shows as
// claimable again.
// Returns true when the resync ran to a known-good end state, false when the
// count query or the status update failed and the project may be stuck in
// 'invoiced'. The caller surfaces the false case so the UI can prompt a
// refresh.
async function resyncProjectAfterInvoiceRemoval(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('retainagerecover_release_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .in('status', ['draft', 'sent', 'paid']);

  if (error) {
    // The project may stay marked invoiced. This self-corrects the next time
    // an invoice is created or voided, but we report it so the caller can
    // return a resync_pending warning and the UI can prompt a refresh.
    console.error(
      '[retainagerecover:db] project resync check failed',
      error.code,
      error.message
    );
    return false;
  }

  if ((count ?? 0) === 0) {
    const { error: updateError } = await supabase
      .from('retainagerecover_projects')
      .update({ status: 'active' })
      .eq('id', projectId)
      .eq('user_id', userId)
      .eq('status', 'invoiced');

    if (updateError) {
      // The project could not be flipped back to active, so a stale
      // 'invoiced' status may linger. Report it so deleteInvoice returns
      // resyncPending: true and the consumer can prompt a refresh.
      console.error(
        '[retainagerecover:db] project resync update failed',
        updateError.code,
        updateError.message
      );
      return false;
    }
  }
  return true;
}
