// CANONICAL API route for a single RetainageRecover release invoice.
//
// GET /api/invoices/:id
//   -> 200 { data: { invoice: ReleaseInvoiceWithProject }, error: null }
//
// PATCH /api/invoices/:id  body: { status? } and/or draft field edits
//   -> 200 { data: { invoice: ReleaseInvoiceWithProject }, error: null }
//   Field edits are allowed only while the invoice is a draft. Status moves
//   follow draft to sent to paid, with void available from draft or sent.
//   Database triggers stamp sent_at and paid_at and keep the project status
//   in lockstep (paid marks the project collected, void frees it up).
//
// DELETE /api/invoices/:id
//   -> 200 { data: { deleted: true, id }, error: null }
//   Drafts and voided invoices only. Sent and paid invoices are records.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/db/errors';
import {
  assertInvoiceStatusTransition,
  deleteInvoice,
  getInvoice,
  updateInvoice,
} from '@/lib/db/invoices';

const idSchema = z.string().uuid('That invoice id is not valid.');

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

const updateInvoiceSchema = z
  .object({
    status: z
      .enum(['draft', 'sent', 'paid', 'void'], {
        errorMap: () => ({
          message: 'Status can be draft, sent, paid, or void.',
        }),
      })
      .optional(),
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
      .min(1, 'An invoice number cannot be empty.')
      .max(50, 'Keep the invoice number under 50 characters.')
      .optional(),
    bill_to_name: z
      .string()
      .trim()
      .min(1, 'The bill-to name cannot be empty.')
      .max(200, 'Keep the bill-to name under 200 characters.')
      .optional(),
    bill_to_email: optionalEmail,
    line_description: z
      .string()
      .trim()
      .min(1, 'The line description cannot be empty.')
      .max(2000, 'Keep the line description under 2000 characters.')
      .optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: 'Change at least one field before saving.' }
  )
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
  console.error('[retainagerecover:api:invoice] unexpected error', error);
  return errorResponse(
    'We hit a snag on our end. Give it a moment and try again.',
    500,
    'INTERNAL'
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) {
      return errorResponse('Please sign in to continue.', 401, 'UNAUTHORIZED');
    }

    const parsedId = idSchema.safeParse(params.id);
    if (!parsedId.success) {
      return errorResponse('That invoice id is not valid.', 400, 'INVALID_ID');
    }

    const invoice = await getInvoice(supabase, user.id, parsedId.data);
    if (!invoice) {
      return errorResponse(
        'We could not find that invoice. It may have been deleted.',
        404,
        'NOT_FOUND'
      );
    }

    return NextResponse.json({ data: { invoice }, error: null });
  } catch (error) {
    return handleUnexpected(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const parsedId = idSchema.safeParse(params.id);
    if (!parsedId.success) {
      return errorResponse('That invoice id is not valid.', 400, 'INVALID_ID');
    }

    const body = await readJsonBody(request);
    if (body === null) {
      return errorResponse(
        'We could not read that request. Send valid JSON.',
        400,
        'INVALID_JSON'
      );
    }

    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'Some fields need attention before we can save.',
        400,
        'VALIDATION_ERROR',
        fieldErrors(parsed.error)
      );
    }

    const existing = await getInvoice(supabase, user.id, parsedId.data);
    if (!existing) {
      return errorResponse(
        'We could not find that invoice. It may have been deleted.',
        404,
        'NOT_FOUND'
      );
    }

    const { status: nextStatus, ...fieldEdits } = parsed.data;
    const hasFieldEdits = Object.values(fieldEdits).some(
      (value) => value !== undefined
    );

    if (hasFieldEdits && existing.status !== 'draft') {
      return errorResponse(
        'Only draft invoices can be edited. Void this one and create a fresh invoice to make changes.',
        409,
        'INVOICE_LOCKED'
      );
    }

    if (nextStatus && nextStatus !== existing.status) {
      // Throws a ServiceError with a human message when the move is illegal.
      assertInvoiceStatusTransition(existing.status, nextStatus);
    }

    const invoice = await updateInvoice(
      supabase,
      user.id,
      parsedId.data,
      parsed.data
    );
    if (!invoice) {
      return errorResponse(
        'We could not find that invoice. It may have been deleted.',
        404,
        'NOT_FOUND'
      );
    }

    return NextResponse.json({ data: { invoice }, error: null });
  } catch (error) {
    return handleUnexpected(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const parsedId = idSchema.safeParse(params.id);
    if (!parsedId.success) {
      return errorResponse('That invoice id is not valid.', 400, 'INVALID_ID');
    }

    const { deleted, resyncPending } = await deleteInvoice(
      supabase,
      user.id,
      parsedId.data
    );
    if (!deleted) {
      return errorResponse(
        'We could not find that invoice. It may have been deleted already.',
        404,
        'NOT_FOUND'
      );
    }

    return NextResponse.json({
      data: {
        deleted: true,
        id: parsedId.data,
        resync_pending: resyncPending,
      },
      error: null,
    });
  } catch (error) {
    return handleUnexpected(error);
  }
}
