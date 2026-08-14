// CANONICAL API route for a single RetainageRecover project.
//
// GET /api/projects/:id
//   -> 200 { data: { project: ProjectWithEligibility, invoices: ReleaseInvoiceRow[] }, error: null }
//
// PATCH /api/projects/:id  body: any subset of editable fields
//   -> 200 { data: { project: ProjectWithEligibility }, error: null }
//   status accepts only active or archived here; invoiced and collected are
//   managed automatically by the invoice triggers.
//
// DELETE /api/projects/:id
//   -> 200 { data: { deleted: true, id }, error: null }
//   Cascades to the project's invoices.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/db/errors';
import {
  deleteProject,
  getProject,
  updateProject,
} from '@/lib/db/projects';
import { listInvoicesForProject } from '@/lib/db/invoices';

const idSchema = z.string().uuid('That project id is not valid.');

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

const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'A project name cannot be empty.')
      .max(200, 'Keep the project name under 200 characters.')
      .optional(),
    project_number: optionalText(
      100,
      'Keep the project number under 100 characters.'
    ),
    gc_name: z
      .string()
      .trim()
      .min(1, 'The contractor name cannot be empty. It goes on your invoice.')
      .max(200, 'Keep the contractor name under 200 characters.')
      .optional(),
    gc_email: optionalEmail,
    contract_value: z.coerce
      .number({ invalid_type_error: 'Contract value needs to be a number.' })
      .positive('Contract value needs to be greater than zero.')
      .max(999_999_999_999, 'That contract value is larger than we can track.')
      .optional(),
    retainage_pct: z.coerce
      .number({
        invalid_type_error: 'Retainage percentage needs to be a number.',
      })
      .gt(0, 'Retainage percentage needs to be greater than zero.')
      .max(
        50,
        'Retainage above 50 percent is outside what we support. Double-check the contract.'
      )
      .optional(),
    completion_date: dateString.nullable().optional(),
    release_hold_days: z.coerce
      .number({ invalid_type_error: 'Hold days needs to be a whole number.' })
      .int('Hold days needs to be a whole number.')
      .min(0, 'Hold days cannot be negative.')
      .max(730, 'Hold days maxes out at 730, which is two years.')
      .optional(),
    notes: optionalText(5000, 'Keep notes under 5000 characters.'),
    status: z
      .enum(['active', 'archived'], {
        errorMap: () => ({
          message:
            'Status can only be set to active or archived here. Invoiced and collected update automatically from your invoices.',
        }),
      })
      .optional(),
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
  console.error('[retainagerecover:api:project] unexpected error', error);
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
      return errorResponse('That project id is not valid.', 400, 'INVALID_ID');
    }

    const project = await getProject(supabase, user.id, parsedId.data);
    if (!project) {
      return errorResponse(
        'We could not find that project. It may have been deleted.',
        404,
        'NOT_FOUND'
      );
    }

    const invoices = await listInvoicesForProject(
      supabase,
      user.id,
      parsedId.data
    );

    return NextResponse.json({ data: { project, invoices }, error: null });
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
      return errorResponse('That project id is not valid.', 400, 'INVALID_ID');
    }

    const body = await readJsonBody(request);
    if (body === null) {
      return errorResponse(
        'We could not read that request. Send valid JSON.',
        400,
        'INVALID_JSON'
      );
    }

    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'Some fields need attention before we can save.',
        400,
        'VALIDATION_ERROR',
        fieldErrors(parsed.error)
      );
    }

    const existing = await getProject(supabase, user.id, parsedId.data);
    if (!existing) {
      return errorResponse(
        'We could not find that project. It may have been deleted.',
        404,
        'NOT_FOUND'
      );
    }

    // Manual status changes: archiving is always allowed. Setting active is
    // only allowed from archived (or as a no-op). Invoiced and collected are
    // driven by the invoice lifecycle, never by hand, so the numbers on the
    // dashboard always match the paper trail.
    if (parsed.data.status === 'active') {
      const canActivate =
        existing.status === 'archived' || existing.status === 'active';
      if (!canActivate) {
        return errorResponse(
          'Invoiced and collected projects update automatically from their invoices. You can archive this project instead.',
          409,
          'STATUS_LOCKED'
        );
      }
    }

    const project = await updateProject(
      supabase,
      user.id,
      parsedId.data,
      parsed.data
    );
    if (!project) {
      return errorResponse(
        'We could not find that project. It may have been deleted.',
        404,
        'NOT_FOUND'
      );
    }

    return NextResponse.json({ data: { project }, error: null });
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
      return errorResponse('That project id is not valid.', 400, 'INVALID_ID');
    }

    const deleted = await deleteProject(supabase, user.id, parsedId.data);
    if (!deleted) {
      return errorResponse(
        'We could not find that project. It may have been deleted already.',
        404,
        'NOT_FOUND'
      );
    }

    return NextResponse.json({
      data: { deleted: true, id: parsedId.data },
      error: null,
    });
  } catch (error) {
    return handleUnexpected(error);
  }
}
