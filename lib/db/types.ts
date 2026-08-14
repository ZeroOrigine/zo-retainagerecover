// CANONICAL shared database row and domain types for RetainageRecover.
// Every step (API routes, dashboard, auth, billing) imports these types
// instead of redeclaring shapes, so field names cannot drift between the
// API and its consumers.

export type ProjectStatus = 'active' | 'invoiced' | 'collected' | 'archived';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export type BillingType = 'free' | 'one_time' | 'recurring';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface PlanRow {
  id: string;
  plan_key: string;
  name: string;
  description: string;
  billing_type: BillingType;
  price_cents: number;
  currency: string;
  project_limit: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  project_number: string | null;
  gc_name: string;
  gc_email: string | null;
  contract_value: number;
  retainage_pct: number;
  retainage_amount: number;
  completion_date: string | null;
  release_hold_days: number;
  release_eligible_date: string | null;
  status: ProjectStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Computed context the API adds to every project it returns. The UI shows
// insight, not raw rows: how many days until this money can be invoiced.
export interface ProjectWithEligibility extends ProjectRow {
  is_eligible: boolean;
  // Days from today until the release eligible date. Zero or negative means
  // eligible now. Null means no completion date has been set yet.
  days_until_eligible: number | null;
}

export interface ProjectTotals {
  // Active plus invoiced projects: retainage not yet collected.
  outstanding_count: number;
  outstanding_amount: number;
  // Active projects whose release eligible date is today or earlier.
  eligible_now_count: number;
  eligible_now_amount: number;
  // Active projects whose release eligible date is in the future.
  upcoming_count: number;
  upcoming_amount: number;
  // Active projects with no completion date, so no eligible date yet.
  missing_date_count: number;
  missing_date_amount: number;
  invoiced_count: number;
  invoiced_amount: number;
  collected_count: number;
  collected_amount: number;
}

export interface ReleaseInvoiceRow {
  id: string;
  user_id: string;
  project_id: string;
  invoice_number: string;
  amount: number;
  issue_date: string;
  due_date: string;
  bill_to_name: string;
  bill_to_email: string | null;
  line_description: string;
  status: InvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseInvoiceWithProject extends ReleaseInvoiceRow {
  project: {
    id: string;
    name: string;
    project_number: string | null;
    gc_name: string;
  } | null;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_key: string;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  plan_key: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
}

// The single authoritative answer to "what is this account allowed to do".
// Produced only by lib/db/plans.ts getEntitlement.
export interface Entitlement {
  plan_key: string;
  plan_name: string;
  billing_type: BillingType;
  price_cents: number;
  project_limit: number | null;
  project_count: number;
  can_add_project: boolean;
  can_create_invoices: boolean;
}
