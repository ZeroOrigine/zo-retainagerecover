-- ============================================================================
-- RetainageRecover : retainage tracking + release invoicing for subcontractors
-- Product slug   : retainagerecover  (shared database, every object prefixed)
-- Apply order    : extensions > enums > tables > indexes > functions > triggers
--                  > row level security > seed data. Single pass, no fix blocks.
-- Manifest note  : declare public_content_tables = ["retainagerecover_plans"]
--                  (pricing catalog, read-only to anon, no user columns).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 2. ENUMS (prefixed: types share a namespace across products)
-- ---------------------------------------------------------------------------
CREATE TYPE retainagerecover_project_status AS ENUM
  ('active', 'invoiced', 'collected', 'archived');

CREATE TYPE retainagerecover_invoice_status AS ENUM
  ('draft', 'sent', 'paid', 'void');

CREATE TYPE retainagerecover_subscription_status AS ENUM
  ('trialing', 'active', 'past_due', 'canceled', 'incomplete',
   'incomplete_expired', 'unpaid', 'paused');

CREATE TYPE retainagerecover_payment_status AS ENUM
  ('pending', 'succeeded', 'failed', 'refunded');

CREATE TYPE retainagerecover_billing_type AS ENUM
  ('free', 'one_time', 'recurring');

-- ---------------------------------------------------------------------------
-- 3. TABLES
-- ---------------------------------------------------------------------------

-- 3.1 Pricing catalog. Public content table: no user columns, anon may read
--     active rows, all writes happen through the service role only.
CREATE TABLE retainagerecover_plans (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_key      text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text NOT NULL,
  billing_type  retainagerecover_billing_type NOT NULL DEFAULT 'one_time',
  price_cents   integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency      text NOT NULL DEFAULT 'usd',
  project_limit integer CHECK (project_limit IS NULL OR project_limit > 0),
  features      jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE retainagerecover_plans IS
  'Pricing catalog. project_limit NULL means unlimited. Prices live here, never in env vars.';

-- 3.2 Profiles: extends auth.users. Also carries the business identity that
--     appears in the "from" block of a release invoice, plus the invoice counter.
CREATE TABLE retainagerecover_profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  full_name       text,
  company_name    text,
  company_address text,
  company_phone   text,
  role            text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  invoice_seq     integer NOT NULL DEFAULT 1000 CHECK (invoice_seq >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE retainagerecover_profiles IS
  'One row per auth user. invoice_seq feeds automatic invoice numbering.';

-- 3.3 Subscriptions: Stripe billing state, one row per user. Written only by
--     the service role (webhook); users read their own row.
CREATE TABLE retainagerecover_subscriptions (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id             text NOT NULL DEFAULT 'retainagerecover',
  plan_key               text NOT NULL DEFAULT 'free' REFERENCES retainagerecover_plans(plan_key),
  status                 retainagerecover_subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE retainagerecover_subscriptions IS
  'Billing state per user. plan_key is flipped to lifetime by the Stripe webhook after a one time purchase.';

-- 3.4 Payments: one time charges (the primary revenue path for this product).
--     Written only by the service role (webhook); users read their own rows.
CREATE TABLE retainagerecover_payments (
  id                         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id                 text NOT NULL DEFAULT 'retainagerecover',
  plan_key                   text NOT NULL REFERENCES retainagerecover_plans(plan_key),
  stripe_checkout_session_id text,
  stripe_payment_intent_id   text,
  amount_cents               integer NOT NULL CHECK (amount_cents >= 0),
  currency                   text NOT NULL DEFAULT 'usd',
  status                     retainagerecover_payment_status NOT NULL DEFAULT 'pending',
  receipt_url                text,
  paid_at                    timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- 3.5 Projects: the kernel. Retainage amount and release eligible date are
--     stored generated columns (immutable expressions), so they can be indexed
--     directly and can never drift from the inputs.
CREATE TABLE retainagerecover_projects (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id            text NOT NULL DEFAULT 'retainagerecover',
  name                  text NOT NULL CHECK (btrim(name) <> ''),
  project_number        text,
  gc_name               text NOT NULL CHECK (btrim(gc_name) <> ''),
  gc_email              text,
  contract_value        numeric(14,2) NOT NULL CHECK (contract_value > 0),
  retainage_pct         numeric(5,2) NOT NULL CHECK (retainage_pct > 0 AND retainage_pct <= 50),
  retainage_amount      numeric(14,2) GENERATED ALWAYS AS
                          (round((contract_value * retainage_pct) / 100.0, 2)) STORED,
  completion_date       date,
  release_hold_days     integer NOT NULL DEFAULT 0
                          CHECK (release_hold_days >= 0 AND release_hold_days <= 730),
  release_eligible_date date GENERATED ALWAYS AS
                          (completion_date + release_hold_days) STORED,
  status                retainagerecover_project_status NOT NULL DEFAULT 'active',
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN retainagerecover_projects.retainage_amount IS
  'Money left on the table for this job. Derived, always correct.';
COMMENT ON COLUMN retainagerecover_projects.release_eligible_date IS
  'completion_date plus release_hold_days. NULL until completion_date is set.';

-- 3.6 Release invoices: the ready to send document. A BEFORE INSERT trigger
--     snapshots bill-to details, amount, terms, and assigns the invoice number,
--     so the API can insert just (user_id, project_id) and get a full invoice.
CREATE TABLE retainagerecover_release_invoices (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       text NOT NULL DEFAULT 'retainagerecover',
  project_id       uuid NOT NULL REFERENCES retainagerecover_projects(id) ON DELETE CASCADE,
  invoice_number   text NOT NULL,
  amount           numeric(14,2) NOT NULL CHECK (amount > 0),
  issue_date       date NOT NULL DEFAULT CURRENT_DATE,
  due_date         date NOT NULL,
  bill_to_name     text NOT NULL,
  bill_to_email    text,
  line_description text NOT NULL,
  status           retainagerecover_invoice_status NOT NULL DEFAULT 'draft',
  sent_at          timestamptz,
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retainagerecover_release_invoices_number_unique UNIQUE (user_id, invoice_number),
  CONSTRAINT retainagerecover_release_invoices_due_after_issue CHECK (due_date >= issue_date)
);

-- 3.7 Stripe webhook idempotency ledger. Infra table: service role only.
CREATE TABLE retainagerecover_stripe_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     text NOT NULL UNIQUE,
  event_type   text NOT NULL,
  payload      jsonb,
  processed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. INDEXES (plain columns and stored generated columns only; lower() is the
--    single functional index and it is immutable)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX retainagerecover_profiles_email_lower_key
  ON retainagerecover_profiles (lower(email));

CREATE INDEX retainagerecover_projects_user_idx
  ON retainagerecover_projects (user_id);
CREATE INDEX retainagerecover_projects_user_status_idx
  ON retainagerecover_projects (user_id, status);
CREATE INDEX retainagerecover_projects_active_eligible_idx
  ON retainagerecover_projects (user_id, release_eligible_date)
  WHERE status = 'active';

CREATE INDEX retainagerecover_release_invoices_user_idx
  ON retainagerecover_release_invoices (user_id);
CREATE INDEX retainagerecover_release_invoices_project_idx
  ON retainagerecover_release_invoices (project_id);
CREATE INDEX retainagerecover_release_invoices_user_status_idx
  ON retainagerecover_release_invoices (user_id, status);

CREATE INDEX retainagerecover_subscriptions_customer_idx
  ON retainagerecover_subscriptions (stripe_customer_id);
CREATE UNIQUE INDEX retainagerecover_subscriptions_stripe_sub_key
  ON retainagerecover_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX retainagerecover_subscriptions_plan_idx
  ON retainagerecover_subscriptions (plan_key);

CREATE INDEX retainagerecover_payments_user_idx
  ON retainagerecover_payments (user_id);
CREATE INDEX retainagerecover_payments_plan_idx
  ON retainagerecover_payments (plan_key);
CREATE INDEX retainagerecover_payments_user_succeeded_idx
  ON retainagerecover_payments (user_id)
  WHERE status = 'succeeded';
CREATE UNIQUE INDEX retainagerecover_payments_session_key
  ON retainagerecover_payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX retainagerecover_payments_intent_key
  ON retainagerecover_payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX retainagerecover_stripe_events_created_idx
  ON retainagerecover_stripe_events (created_at);
CREATE INDEX retainagerecover_stripe_events_type_idx
  ON retainagerecover_stripe_events (event_type);

CREATE INDEX retainagerecover_plans_active_idx
  ON retainagerecover_plans (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- 5. FUNCTIONS
-- ---------------------------------------------------------------------------

-- 5.1 Generic updated_at touch.
CREATE OR REPLACE FUNCTION retainagerecover_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 5.2 Admin check. SECURITY DEFINER so admin policies never recurse into
--     the profiles RLS policies.
CREATE OR REPLACE FUNCTION retainagerecover_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM retainagerecover_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 5.3 Auto-provision profile and free-plan billing row on signup.
CREATE OR REPLACE FUNCTION retainagerecover_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.retainagerecover_profiles (id, email, full_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.retainagerecover_subscriptions (user_id, plan_key, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5.4 Enforce the plan project limit at the database level so a free account
--     cannot bypass the API to track extra projects. Runs as invoker: RLS on
--     subscriptions, plans, and projects already scopes every read correctly.
CREATE OR REPLACE FUNCTION retainagerecover_enforce_project_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  SELECT p.project_limit
    INTO v_limit
    FROM retainagerecover_subscriptions s
    JOIN retainagerecover_plans p ON p.plan_key = s.plan_key
   WHERE s.user_id = NEW.user_id;

  IF NOT FOUND THEN
    SELECT p.project_limit
      INTO v_limit
      FROM retainagerecover_plans p
     WHERE p.plan_key = 'free';
  END IF;

  IF v_limit IS NOT NULL THEN
    SELECT count(*)
      INTO v_count
      FROM retainagerecover_projects
     WHERE user_id = NEW.user_id;

    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Your current plan tracks up to % projects. Upgrade to Lifetime for unlimited projects.', v_limit
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5.5 Prepare a release invoice: snapshot bill-to details and amount from the
--     project, default terms, and assign the next invoice number atomically.
CREATE OR REPLACE FUNCTION retainagerecover_prepare_invoice()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_project retainagerecover_projects%ROWTYPE;
  v_seq     integer;
BEGIN
  SELECT *
    INTO v_project
    FROM retainagerecover_projects
   WHERE id = NEW.project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'We could not find that project for this invoice.';
  END IF;

  IF v_project.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'This invoice does not belong to the project owner.';
  END IF;

  IF NEW.amount IS NULL THEN
    NEW.amount := v_project.retainage_amount;
  END IF;

  IF NEW.bill_to_name IS NULL THEN
    NEW.bill_to_name := v_project.gc_name;
  END IF;

  IF NEW.bill_to_email IS NULL THEN
    NEW.bill_to_email := v_project.gc_email;
  END IF;

  IF NEW.line_description IS NULL THEN
    NEW.line_description := 'Retainage release for ' || v_project.name
      || ': ' || v_project.retainage_pct::text
      || '% retainage held on contract value of '
      || to_char(v_project.contract_value, 'FM999,999,999,990.00');
  END IF;

  IF NEW.due_date IS NULL THEN
    NEW.due_date := NEW.issue_date + 30;
  END IF;

  IF NEW.invoice_number IS NULL OR btrim(NEW.invoice_number) = '' THEN
    UPDATE retainagerecover_profiles
       SET invoice_seq = invoice_seq + 1
     WHERE id = NEW.user_id
    RETURNING invoice_seq INTO v_seq;

    IF v_seq IS NULL THEN
      RAISE EXCEPTION 'Your profile is missing, so we could not assign an invoice number.';
    END IF;

    NEW.invoice_number := 'RET-' || lpad(v_seq::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$$;

-- 5.6 Stamp sent_at and paid_at when an invoice status changes.
CREATE OR REPLACE FUNCTION retainagerecover_stamp_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status <> 'sent' AND NEW.sent_at IS NULL THEN
    NEW.sent_at := now();
  END IF;

  IF NEW.status = 'paid' AND OLD.status <> 'paid' AND NEW.paid_at IS NULL THEN
    NEW.paid_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- 5.7 Keep project status in lockstep with its invoices.
CREATE OR REPLACE FUNCTION retainagerecover_sync_project_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE retainagerecover_projects
       SET status = 'invoiced'
     WHERE id = NEW.project_id
       AND status = 'active';

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    UPDATE retainagerecover_projects
       SET status = 'collected'
     WHERE id = NEW.project_id
       AND status <> 'archived';

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'void' AND OLD.status <> 'void' THEN
    UPDATE retainagerecover_projects
       SET status = 'active'
     WHERE id = NEW.project_id
       AND status = 'invoiced'
       AND NOT EXISTS (
         SELECT 1
         FROM retainagerecover_release_invoices ri
         WHERE ri.project_id = NEW.project_id
           AND ri.id <> NEW.id
           AND ri.status IN ('draft', 'sent', 'paid')
       );
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. TRIGGERS
-- ---------------------------------------------------------------------------
CREATE TRIGGER retainagerecover_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_handle_new_user();

CREATE TRIGGER retainagerecover_plans_touch
  BEFORE UPDATE ON retainagerecover_plans
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_set_updated_at();

CREATE TRIGGER retainagerecover_profiles_touch
  BEFORE UPDATE ON retainagerecover_profiles
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_set_updated_at();

CREATE TRIGGER retainagerecover_subscriptions_touch
  BEFORE UPDATE ON retainagerecover_subscriptions
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_set_updated_at();

CREATE TRIGGER retainagerecover_payments_touch
  BEFORE UPDATE ON retainagerecover_payments
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_set_updated_at();

CREATE TRIGGER retainagerecover_projects_touch
  BEFORE UPDATE ON retainagerecover_projects
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_set_updated_at();

CREATE TRIGGER retainagerecover_release_invoices_touch
  BEFORE UPDATE ON retainagerecover_release_invoices
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_set_updated_at();

CREATE TRIGGER retainagerecover_stripe_events_touch
  BEFORE UPDATE ON retainagerecover_stripe_events
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_set_updated_at();

CREATE TRIGGER retainagerecover_projects_limit
  BEFORE INSERT ON retainagerecover_projects
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_enforce_project_limit();

CREATE TRIGGER retainagerecover_invoices_prepare
  BEFORE INSERT ON retainagerecover_release_invoices
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_prepare_invoice();

CREATE TRIGGER retainagerecover_invoices_stamp
  BEFORE UPDATE ON retainagerecover_release_invoices
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_stamp_invoice_status();

CREATE TRIGGER retainagerecover_invoices_sync_project
  AFTER INSERT OR UPDATE ON retainagerecover_release_invoices
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_sync_project_status();

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
--    Service role bypasses RLS, so webhooks and admin jobs need no policies.
-- ---------------------------------------------------------------------------
ALTER TABLE retainagerecover_plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainagerecover_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainagerecover_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainagerecover_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainagerecover_projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainagerecover_release_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainagerecover_stripe_events    ENABLE ROW LEVEL SECURITY;

-- Plans: declared public catalog (no user columns). Anon and authenticated can
-- read active plans so the landing page can render pricing from the database.
CREATE POLICY "retainagerecover_plans_read_anon" ON retainagerecover_plans
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "retainagerecover_plans_read_authenticated" ON retainagerecover_plans
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Profiles: keyed by id = auth.uid().
CREATE POLICY "retainagerecover_profiles_owner" ON retainagerecover_profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "retainagerecover_profiles_admin_read" ON retainagerecover_profiles
  FOR SELECT TO authenticated
  USING (retainagerecover_is_admin());

-- Projects: canonical owner policy.
CREATE POLICY "retainagerecover_projects_owner" ON retainagerecover_projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'retainagerecover')
  WITH CHECK (user_id = auth.uid() AND product_id = 'retainagerecover');

-- Release invoices: canonical owner policy.
CREATE POLICY "retainagerecover_release_invoices_owner" ON retainagerecover_release_invoices
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'retainagerecover')
  WITH CHECK (user_id = auth.uid() AND product_id = 'retainagerecover');

-- Subscriptions: users read their own billing state. Writes are entitlement
-- changes and belong to the service role webhook only, so no user write policy.
CREATE POLICY "retainagerecover_subscriptions_owner" ON retainagerecover_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'retainagerecover');

CREATE POLICY "retainagerecover_subscriptions_admin_read" ON retainagerecover_subscriptions
  FOR SELECT TO authenticated
  USING (retainagerecover_is_admin());

-- Payments: users read their own receipts. Writes are webhook only.
CREATE POLICY "retainagerecover_payments_owner" ON retainagerecover_payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'retainagerecover');

CREATE POLICY "retainagerecover_payments_admin_read" ON retainagerecover_payments
  FOR SELECT TO authenticated
  USING (retainagerecover_is_admin());

-- Stripe events: RLS enabled with zero policies. Service role only.

-- ---------------------------------------------------------------------------
-- 8. SEED DATA
-- ---------------------------------------------------------------------------
INSERT INTO retainagerecover_plans
  (plan_key, name, description, billing_type, price_cents, currency,
   project_limit, features, is_active, sort_order)
VALUES
  (
    'free',
    'Free',
    'Track your first projects, see the exact date each retainage release becomes eligible, and preview your release invoice.',
    'free',
    0,
    'usd',
    3,
    '["Track up to 3 projects", "Automatic retainage math", "Release eligibility countdown", "Release invoice preview"]'::jsonb,
    true,
    1
  ),
  (
    'lifetime',
    'Lifetime',
    'Pay once and keep it. Unlimited projects and ready-to-send release invoices for every closeout.',
    'one_time',
    4900,
    'usd',
    NULL,
    '["Unlimited projects", "Ready-to-send release invoices", "Automatic invoice numbering", "Sent and paid tracking", "Every future update included"]'::jsonb,
    true,
    2
  )
ON CONFLICT (plan_key) DO NOTHING;

-- Self-validation patches
-- ============================================================================
-- SELF-VALIDATION PATCH: security hardening. Append after the base schema.
-- ============================================================================

-- P1. Privilege escalation guard on profiles.role.
-- The owner RLS policy is FOR ALL, so without this trigger a user could
-- UPDATE their own row to role = 'admin' (or DELETE it and re-INSERT with
-- role = 'admin') and unlock the admin read policies on profiles,
-- subscriptions, and payments. Only the service role may set roles.
CREATE OR REPLACE FUNCTION retainagerecover_guard_profile_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Silently keep the old role: profile PATCHes never legitimately send it.
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER retainagerecover_profiles_guard_role
  BEFORE INSERT OR UPDATE ON retainagerecover_profiles
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_guard_profile_role();

-- P2. Database backstop for the paid invoice capability.
-- The API refuses invoice creation for free accounts, but the owner RLS
-- policy alone would let a free user INSERT rows straight through PostgREST.
-- Mirrors the project-limit pattern. Named so it fires BEFORE
-- retainagerecover_invoices_prepare (same event triggers run alphabetically).
CREATE OR REPLACE FUNCTION retainagerecover_enforce_invoice_entitlement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_billing retainagerecover_billing_type;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT p.billing_type
    INTO v_billing
    FROM retainagerecover_subscriptions s
    JOIN retainagerecover_plans p ON p.plan_key = s.plan_key
   WHERE s.user_id = NEW.user_id;

  IF NOT FOUND OR v_billing = 'free' THEN
    RAISE EXCEPTION 'Ready-to-send release invoices come with the Lifetime plan. Upgrade once to unlock them.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER retainagerecover_invoices_entitlement
  BEFORE INSERT ON retainagerecover_release_invoices
  FOR EACH ROW EXECUTE FUNCTION retainagerecover_enforce_invoice_entitlement();