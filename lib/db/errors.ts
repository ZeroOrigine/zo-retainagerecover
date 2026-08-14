// CANONICAL service error type and database error translation for
// RetainageRecover.
//
// Services throw ServiceError with a human message, an HTTP status, and a
// stable machine code. Route handlers catch ServiceError and return it as
// JSON. Raw Postgres errors never reach a client.

export class ServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.code = code;
  }
}

interface DatabaseErrorShape {
  code?: string | null;
  message?: string | null;
}

export interface TranslateOptions {
  // Context-specific message for unique violations (23505).
  duplicateMessage?: string;
  // Context-specific message for check constraint violations (23514).
  checkMessage?: string;
}

// Postgres error codes we translate:
//   P0001            trigger raised exception, message already written for humans
//   23505            unique violation
//   23514            check constraint violation
//   23503            foreign key violation
//   22007 22008 22P02  bad date or id format
export function translateDatabaseError(
  error: DatabaseErrorShape | null | undefined,
  fallbackMessage: string,
  options: TranslateOptions = {}
): ServiceError {
  const code = error?.code ?? '';
  const message = error?.message ?? '';

  if (code === 'P0001' && message) {
    // Trigger messages in schema.sql are written for humans, pass them through.
    // The plan limit trigger message contains the phrase 'plan tracks up to'.
    const isPlanLimit = message.includes('plan tracks up to');
    return new ServiceError(
      message,
      isPlanLimit ? 403 : 409,
      isPlanLimit ? 'PLAN_LIMIT_REACHED' : 'CONFLICT'
    );
  }

  if (code === '23505') {
    return new ServiceError(
      options.duplicateMessage ??
        'That value is already in use. Try a different one.',
      409,
      'DUPLICATE'
    );
  }

  if (code === '23514') {
    return new ServiceError(
      options.checkMessage ??
        'One of those values is outside the allowed range. Double-check the numbers and dates.',
      400,
      'OUT_OF_RANGE'
    );
  }

  if (code === '23503') {
    return new ServiceError(
      'That record points at something that no longer exists. Refresh and try again.',
      409,
      'REFERENCE_MISSING'
    );
  }

  if (code === '22007' || code === '22008' || code === '22P02') {
    return new ServiceError(
      'One of those values is not in a format we understand. Check ids and dates and try again.',
      400,
      'INVALID_FORMAT'
    );
  }

  console.error('[retainagerecover:db] unhandled database error', code, message);
  return new ServiceError(fallbackMessage, 500, 'INTERNAL');
}
