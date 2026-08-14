export type ApiResponse<T> =
  | { data: T; error: null; status: 'success' }
  | { data: null; error: string; status: 'error' };

export function successResponse<T>(data: T): ApiResponse<T> {
  return { data, error: null, status: 'success' };
}

export function errorResponse(error: string): ApiResponse<never> {
  return { data: null, error, status: 'error' };
}
