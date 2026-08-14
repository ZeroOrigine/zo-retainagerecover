// CANONICAL API route for the RetainageRecover release invoice collection.
//
// GET /api/invoices?page=1&limit=20&status=draft&project_id=<uuid>
//   -> 200 { data: { invoices: ReleaseInvoiceWithProject[], page, limit, total, has_more }, error: null }
//
// POST /api/invoices  body: { project_id, amount?, issue_date?, due_date?,
//                             invoice_number?, bill_to_name?, bill_to_email?,
//                             line_description? }
//   -> 201 { data: { invoice: ReleaseInvoiceWithProject }, error: null }
//   Send just project_id and the database trigger fills the amount from the
//   project's retainage, the bill-to block from the GC, net 30 terms, and the
//   next automatic invoice number. The result is ready to send.
//
// Persisted invoices are a paid capability; free accounts get the on-screen
// preview instead. Auth, checkout, billing, and webhook routes live in the
// auth step's files.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/db/errors';
import { createReleaseInvoice, listInvoices } from '@/lib/db/invoices';
import { getProject } from '@/lib/db/projects';
import { getEntitlement } from '@/lib/db/plans';
import type { InvoiceStatus } from '@/lib/db/types';

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'void'] as const;

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
    .enum(INVOICE_STATUSES, {
      errorMap: () => ({
        message: 'Status can be draft, sent, paid, or void.',
      }),
    })
    .optional(),
  project_id: z.string().uuid('That project id is not valid.').optional(),
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

const createInvoiceSchema = z
  .object({
    project_id: z
      .string({ required_error: 'Tell us which project this invoice is for.' })
      .uuid('That project id is not valid.'),
    amount: z.coerce
      .number({ invalid_type_error: 'Invoice amount needs to be a number.' })
      .positive('Invoice amount needs to be greater than zero.')
      .max(999_999_999_999, 'That amount is larger than we can invoice.')
      .optional(),
    issue_date: dateString.optional(),
    due_date: dateString.optional(),
    invoice_number: z
      .string()
      .trim()
      .min(1, 'An invoice number cannot be empty. Leave it out and we will assign one.')
      .max(50, 'Keep the invoice number under 50 characters.')
      .optional(),
    bill_to_name: z
      .string()
      .trim()
      .min(1, 'The bill-to name cannot be empty. Leave it out to use the GC from the project.')
      .max(200, 'Keep the bill-to name under 200 characters.')
      .optional(),
    bill_to_email: optionalEmail,
    line_description: z
      .string()
      .trim()
      .min(1, 'The line description cannot be empty. Leave it out and we will write it from the project.')
      .max(2000, 'Keep the line description under 2000 characters.')
      .optional(),
  })
  .refine(
    (value) =>
      !(value.issue_date && value.due_date) ||
      value.due_date >= value.issue_date,
    {
      message: 'The due date needs to be on or after the issue date.',
      path: ['due_date'],
    }
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
  console.error('[retainagerecover:api:invoices] unexpected error', error);
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

    const { page, limit, status, project_id } = parsed.data;
    const { invoices, total } = await listInvoices(supabase, user.id, {
      page,
      limit,
      status: status as InvoiceStatus | undefined,
      projectId: project_id,
    });

    return NextResponse.json({
      data: {
        invoices,
        page,
        limit,
        total,
        has_more: page * limit < total,
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

    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'Some fields need attention before we can create this invoice.',
        400,
        'VALIDATION_ERROR',
        fieldErrors(parsed.error)
      );
    }

    const entitlement = await getEntitlement(supabase, user.id);
    if (!entitlement.can_create_invoices) {
      return errorResponse(
        'Ready-to-send release invoices come with the Lifetime plan. Upgrade once and every closeout gets its invoice.',
        403,
        'UPGRADE_REQUIRED'
      );
    }

    const project = await getProject(supabase, user.id, parsed.data.project_id);
    if (!project) {
      return errorResponse(
        'We could not find that project. It may have been deleted.',
        404,
        'PROJECT_NOT_FOUND'
      );
    }
    if (project.status === 'archived') {
      return errorResponse(
        'This project is archived. Restore it to active before creating its release invoice.',
        409,
        'PROJECT_ARCHIVED'
      );
    }
    if (project.status === 'collected') {
      return errorResponse(
        'This retainage is already marked collected. Nice work. Create a new project if there is more to bill.',
        409,
        'ALREADY_COLLECTED'
      );
    }

    const invoice = await createReleaseInvoice(supabase, user.id, parsed.data);
    return NextResponse.json(
      { data: { invoice }, error: null },
      { status: 201 }
    );
  } catch (error) {
    return handleUnexpected(error);
  }
}
