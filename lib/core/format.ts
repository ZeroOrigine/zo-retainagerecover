// CANONICAL formatting helpers for the RetainageRecover UI.

export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  const safe = Number.isFinite(n as number) ? (n as number) : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatMoneyExact(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  const safe = Number.isFinite(n as number) ? (n as number) : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Not set';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDateOnly(iso));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const base = parseDateOnly(iso).getTime() + days * 86_400_000;
  return new Date(base).toISOString().slice(0, 10);
}

export function eligibilityLabel(
  daysUntil: number | null,
  status: string,
  hasDate: boolean
): string {
  if (status === 'invoiced') return 'Invoiced';
  if (status === 'collected') return 'Collected';
  if (status === 'archived') return 'Archived';
  if (!hasDate) return 'Needs a completion date';
  if (daysUntil === null) return 'Needs a completion date';
  if (daysUntil <= 0) return 'Eligible now';
  if (daysUntil === 1) return 'Eligible tomorrow';
  return `Eligible in ${daysUntil} days`;
}

export function eligibilityTone(
  daysUntil: number | null,
  status: string,
  hasDate: boolean
): string {
  if (status === 'invoiced') return 'bg-blue-100 text-blue-700';
  if (status === 'collected') return 'bg-emerald-100 text-emerald-700';
  if (status === 'archived') return 'bg-slate-100 text-slate-500';
  if (!hasDate || daysUntil === null) return 'bg-orange-100 text-orange-700';
  if (daysUntil <= 0) return 'bg-emerald-600 text-white';
  if (daysUntil <= 30) return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-600';
}
