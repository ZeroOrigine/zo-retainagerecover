// CANONICAL API route for the RetainageRecover project collection.
//
// GET /api/projects?page=1&limit=20&status=active&eligible=true
//   -> 200 { data: { projects: ProjectWithEligibility[], page, limit, total, has_more }, error: null }
//   Sorted by release_eligible_date ascending (most urgent money first),
//   projects without a date last. eligible=true returns only active projects
//   whose release date is today or earlier.
//
// POST /api/projects  body: { name, gc_name, contract_value, retainage_pct, ... }
//   -> 201 { data: { project: ProjectWithEligibility }, error: null }
//   The database derives retainage_amount and release_eligible_date.
//
// Auth, checkout, billing, and webhook routes live in the auth step's files.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/db/errors';
import { createProject, listProjects } from '@/lib/db/projects';
import { getEntitlement } from '@/lib/db/plans';
import type { ProjectStatus } from '@/lib/db/types';

const PROJECT_STATUSES = [
  'active',
  'invoiced',
  'collected',
  'archived',
] as const;

const listQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'Page needs to be a whole number.' })
    .int('Page needs to be a whole number.')
    .min(1, 'Page starts at 1.')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit needs to be a whole number.' })
    .int('Limit needs to be a whole number.')
    .min(1, 'Limit starts at 1.')
    .max(100, 'Limit maxes out at 100 per page.')
    .default(20),
  status: z
    .enum(PROJECT_STATUSES, {
      errorMap: () => ({
        message: 'Status can be active, invoiced, collected, or archived.',
      }),
    })
    .optional(),
  eligible: z
    .enum(['true', 'false'], {
      errorMap: () => ({ message: 'eligible can be true or false.' }),
    })
    .optional(),
  // QA-034: accept an optional offset for callers that paginate by row count
  // (e.g. the dashboard loop) instead of page numbers. Zod would otherwise
  // strip the unknown key, so every offset iteration silently re-fetched
  // page 1 and duplicated rows. We keep page/limit as the canonical inputs
  // and derive an effective page from offset when offset is supplied.
  offset: z.coerce
    .number({ invalid_type_error: 'Offset needs to be a whole number.' })
    .int('Offset needs to be a whole number.')
    .min(0, 'Offset cannot be negative.')
    .optional(),
});

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format for dates.');

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .string()
    .trim()
    .email('That email does not look quite right. Mind checking it?')
    .max(320, 'That email is too long.')
    .nullable()
    .optional()
);

const optionalText = (maxLength: number, tooLongMessage: string) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? null : value,
    z.string().trim().max(maxLength, tooLongMessage).nullable().optional()
  );

const createProjectSchema = z.object({
  name: z
    .string({
      required_error: 'Give this project a name so you can find it later.',
    })
    .trim()
    .min(1, 'Give this project a name so you can find it later.')
    .max(200, 'Keep the project name under 200 characters.'),
  project_number: optionalText(
    100,
    'Keep the project number under 100 characters.'
  ),
  gc_name: z
    .string({
      required_error:
        'Add the general contractor name. It goes on your release invoice.',
    })
    .trim()
    .min(1, 'Add the general contractor name. It goes on your release invoice.')
    .max(200, 'Keep the contractor name under 200 characters.'),
  gc_email: optionalEmail,
  contract_value: z.coerce
    .number({
      required_error:
        'Enter the contract value so we can calculate your retainage.',
      invalid_type_error: 'Contract value needs to be a number.',
    })
    .positive('Contract value needs to be greater than zero.')
    .max(999_999_999_999, 'That contract value is larger than we can track.'),
  retainage_pct: z.coerce
    .number({
      required_error: 'Enter the retainage percentage from your contract.',
      invalid_type_error: 'Retainage percentage needs to be a number.',
    })
    .gt(0, 'Retainage percentage needs to be greater than zero.')
    .max(
      50,
      'Retainage above 50 percent is outside what we support. Double-check the contract.'
    ),
  completion_date: dateString.nullable().optional(),
  release_hold_days: z.coerce
    .number({ invalid_type_error: 'Hold days needs to be a whole number.' })
    .int('Hold days needs to be a whole number.')
    .min(0, 'Hold days cannot be negative.')
    .max(730, 'Hold days maxes out at 730, which is two years.')
    .optional(),
  notes: optionalText(5000, 'Keep notes under 5000 characters.'),
});

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
  console.error('[retainagerecover:api:projects] unexpected error', error);
  return errorResponse(
    'We hit a snag on our end. Give it a moment and try again.',
    500,
    'INTERNAL'
  );
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) {
      return errorResponse('Please sign in to continue.', 401, 'UNAUTHORIZED');
    }

    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return errorResponse(
        'Those list filters are not valid.',
        400,
        'VALIDATION_ERROR',
        fieldErrors(parsed.error)
      );
    }

    const { page, limit, status, eligible, offset } = parsed.data;
    // If an offset is provided, derive the effective page from it so that
    // row-count-based callers advance instead of re-reading page 1.
    const effectivePage =
      offset !== undefined ? Math.floor(offset / limit) + 1 : page;
    const { projects, total } = await listProjects(supabase, user.id, {
      page: effectivePage,
      limit,
      status: status as ProjectStatus | undefined,
      eligibleOnly: eligible === 'true',
    });

    return NextResponse.json({
      data: {
        projects,
        page: effectivePage,
        limit,
        total,
        has_more: effectivePage * limit < total,
      },
      error: null,
    });
  } catch (error) {
    return handleUnexpected(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) {
      return errorResponse('Please sign in to continue.', 401, 'UNAUTHORIZED');
    }

    // QA-020 CANONICAL ORDER (replicate in every write handler): call
    // getSessionUser() and reject unauthenticated requests BEFORE any
    // rate-limit check, then key rateLimitCheck to the signed-in user via
    // clientIp(request, user.id). Never call rateLimitCheck on a spoofable
    // IP-header key ahead of auth. Applies to: me PATCH, projects/[id]
    // PATCH/DELETE, invoices POST, and invoices/[id] PATCH/DELETE.
    const verdict = await rateLimitCheck(
      'retainagerecover_write:project_create',
      clientIp(request, user.id),
      200,
      5000
    );
    if (!verdict.allowed) {
      return errorResponse(
        'Too many requests for today. The counter resets tomorrow.',
        429,
        'RATE_LIMITED'
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

    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'Some fields need attention before we can save this project.',
        400,
        'VALIDATION_ERROR',
        fieldErrors(parsed.error)
      );
    }

    // Friendly gate first. The database trigger enforces the same limit as a
    // backstop, so a race can never sneak past the plan.
    const entitlement = await getEntitlement(supabase, user.id);
    if (!entitlement.can_add_project) {
      return errorResponse(
        `Your ${entitlement.plan_name} plan tracks up to ${entitlement.project_limit} projects. Upgrade once to Lifetime for unlimited projects.`,
        403,
        'PLAN_LIMIT_REACHED'
      );
    }

    const project = await createProject(supabase, user.id, parsed.data);
    return NextResponse.json(
      { data: { project }, error: null },
      { status: 201 }
    );
  } catch (error) {
    return handleUnexpected(error);
  }
}
