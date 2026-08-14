// CANONICAL account endpoint for RetainageRecover.
//
// GET /api/me
//   -> 200 {
//        data: {
//          profile: ProfileRow,
//          plan:   { plan_key, plan_name, billing_type, price_cents, can_create_invoices },
//          usage:  { project_count, project_limit, can_add_project },
//          totals: ProjectTotals
//        },
//        error: null
//      }
//
// PATCH /api/me  body: { full_name?, company_name?, company_address?, company_phone? }
//   -> 200 { data: { profile: ProfileRow }, error: null }
//
// The dashboard consumes these exact field names. If a field is added here,
// add its consumer in the same change; nothing ships unread.
// Auth, checkout, billing, and webhook routes live in the auth step's files.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/db/errors';
import { ensureProfile, updateProfile } from '@/lib/db/profiles';
import { getEntitlement } from '@/lib/db/plans';
import { getProjectTotals } from '@/lib/db/projects';

// Empty strings clear a field (stored as null); absent keys leave it alone.
const optionalText = (maxLength: number, tooLongMessage: string) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? null : value,
    z.string().trim().max(maxLength, tooLongMessage).nullable().optional()
  );

const updateProfileSchema = z
  .object({
    full_name: optionalText(200, 'Keep your name under 200 characters.'),
    company_name: optionalText(
      200,
      'Keep the company name under 200 characters.'
    ),
    company_address: optionalText(
      500,
      'Keep the address under 500 characters.'
    ),
    company_phone: optionalText(
      50,
      'Keep the phone number under 50 characters.'
    ),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: 'Change at least one field before saving.' }
  );

function errorResponse(
  message: string,
  status: number,
  code: string,
  fields?: Record<string, string>
) {
  const body: {
    data: null;
    error: string;
    code: string;
    fields?: Record<string, string>;
  } = { data: null, error: message, code };
  if (fields) {
    body.fields = fields;
  }
  return NextResponse.json(body, { status });
}

async function readJsonBody(request: NextRequest): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'body';
    if (!fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

function handleUnexpected(error: unknown) {
  if (error instanceof ServiceError) {
    return errorResponse(error.message, error.status, error.code);
  }
  console.error('[retainagerecover:api:me] unexpected error', error);
  return errorResponse(
    'We hit a snag on our end. Give it a moment and try again.',
    500,
    'INTERNAL'
  );
}

export async function GET() {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) {
      return errorResponse('Please sign in to continue.', 401, 'UNAUTHORIZED');
    }

    const [profile, entitlement, totals] = await Promise.all([
      ensureProfile(supabase, { id: user.id, email: user.email ?? null }),
      getEntitlement(supabase, user.id),
      getProjectTotals(supabase, user.id),
    ]);

    return NextResponse.json({
      data: {
        profile,
        plan: {
          plan_key: entitlement.plan_key,
          plan_name: entitlement.plan_name,
          billing_type: entitlement.billing_type,
          price_cents: entitlement.price_cents,
          can_create_invoices: entitlement.can_create_invoices,
        },
        usage: {
          project_count: entitlement.project_count,
          project_limit: entitlement.project_limit,
          can_add_project: entitlement.can_add_project,
        },
        totals,
      },
      error: null,
    });
  } catch (error) {
    return handleUnexpected(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) {
      return errorResponse('Please sign in to continue.', 401, 'UNAUTHORIZED');
    }

    const verdict = await rateLimitCheck(
      'retainagerecover_write',
      clientIp(request, user.id),
      200,
      5000
    );
    if (!verdict.allowed) {
      return NextResponse.json(
        {
          data: null,
          error: 'Too many requests for today. The counter resets tomorrow.',
        },
        { status: 429 }
      );
    }

    const body = await readJsonBody(request);
    if (body === null) {
      return errorResponse(
        'We could not read that request. Send valid JSON.',
        400,
        'INVALID_JSON'
      );
    }

    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'Some fields need attention before we can save.',
        400,
        'VALIDATION_ERROR',
        fieldErrors(parsed.error)
      );
    }

    await ensureProfile(supabase, { id: user.id, email: user.email ?? null });
    const profile = await updateProfile(supabase, user.id, parsed.data);

    return NextResponse.json({ data: { profile }, error: null });
  } catch (error) {
    return handleUnexpected(error);
  }
}
