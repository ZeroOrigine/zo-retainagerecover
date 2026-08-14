import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/types/api';

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'question', 'other'], {
    required_error: 'Please select a feedback type.',
  }),
  message: z
    .string()
    .min(10, 'Your message must be at least 10 characters so we can understand your feedback.'),
  email: z.string().email('Please provide a valid email address.').optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot: a real browser leaves `company` empty. If it is filled, a bot did it.
    // Silently succeed and write nothing. (Turnstile verification would slot in here once
    // the founder provisions the Turnstile secret key.)
    if (typeof body?.company === 'string' && body.company.trim() !== '') {
      return NextResponse.json(successResponse({ received: true }), { status: 201 });
    }

    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Invalid input.';
      return NextResponse.json(errorResponse(firstError), { status: 400 });
    }

    const supabase = createClient();
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID ?? 'unknown';

    // Optionally attach user_id if authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('feedback').insert({
      type: parsed.data.type,
      message: parsed.data.message,
      email: parsed.data.email ?? null,
      user_id: user?.id ?? null,
      project_id: projectId,
    } as any);

    if (error) {
      return NextResponse.json(
        errorResponse('We could not save your feedback right now. Please try again later.'),
        { status: 500 },
      );
    }

    return NextResponse.json(
      successResponse({ received: true }),
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      errorResponse('Something went wrong. Please try again.'),
      { status: 500 },
    );
  }
}
