'use client';

// CANONICAL settings: the business identity that prints on every release invoice.
import { useEffect, useState } from 'react';
import { apiFetch, type MeData } from '@/lib/core/api';

interface ProfileData {
  profile: MeData['profile'];
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200';
const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

export default function SettingsPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', company_name: '', company_address: '', company_phone: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, tone: 'ok' | 'err' = 'ok') {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 4500);
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    const res = await apiFetch<MeData>('/api/me');
    if (!res.ok || !res.data) {
      setLoadError(res.error);
      setLoading(false);
      return;
    }
    setMe(res.data);
    setForm({
      full_name: res.data.profile.full_name ?? '',
      company_name: res.data.profile.company_name ?? '',
      company_address: res.data.profile.company_address ?? '',
      company_phone: res.data.profile.company_phone ?? '',
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    const res = await apiFetch<ProfileData>('/api/me', {
      method: 'PATCH',
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok || !res.data) {
      if (res.fields) setFieldErrors(res.fields);
      showToast(res.error ?? 'We could not save those changes.', 'err');
      return;
    }
    setMe((prev) => (prev ? { ...prev, profile: res.data!.profile } : prev));
    showToast('Saved. Your invoices will use these details.');
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-9 w-48 rounded-lg bg-slate-200 shimmer" />
        <div className="h-80 rounded-xl bg-slate-200 shimmer" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{loadError}</p>
        <button onClick={load} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Try again</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl text-slate-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-slate-600">These details print in the From block of every release invoice you send.</p>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4">
          <div>
            <label className={labelCls}>Account email</label>
            <input className={`${inputCls} bg-slate-50 text-slate-500`} value={me?.profile.email ?? ''} readOnly aria-readonly="true" />
            <p className="mt-1 text-xs text-slate-400">Sign-in email. It also prints on your invoices.</p>
          </div>
          <div>
            <label htmlFor="full_name" className={labelCls}>Your name</label>
            <input id="full_name" className={inputCls} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Sam Alvarez" />
            {fieldErrors.full_name && <p className="mt-1 text-xs text-red-600">{fieldErrors.full_name}</p>}
          </div>
          <div>
            <label htmlFor="company_name" className={labelCls}>Company name</label>
            <input id="company_name" className={inputCls} value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Alvarez Electric LLC" />
            {fieldErrors.company_name && <p className="mt-1 text-xs text-red-600">{fieldErrors.company_name}</p>}
          </div>
          <div>
            <label htmlFor="company_address" className={labelCls}>Company address</label>
            <textarea id="company_address" className={inputCls} rows={3} value={form.company_address} onChange={(e) => setForm((f) => ({ ...f, company_address: e.target.value }))} placeholder={'214 Industrial Way\nSuite B\nMesa, AZ 85201'} />
            {fieldErrors.company_address && <p className="mt-1 text-xs text-red-600">{fieldErrors.company_address}</p>}
          </div>
          <div>
            <label htmlFor="company_phone" className={labelCls}>Phone</label>
            <input id="company_phone" className={inputCls} value={form.company_phone} onChange={(e) => setForm((f) => ({ ...f, company_phone: e.target.value }))} placeholder="(480) 555-0134" />
            {fieldErrors.company_phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.company_phone}</p>}
          </div>
        </div>
        <button type="submit" disabled={saving} className="mt-6 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save details'}
        </button>
      </form>

      {toast && (
        <div className={`rr-pop fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.tone === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
