'use client';

import { useEffect, useState } from 'react';

// Truth rule: show the REAL live pipeline version or nothing. Never a
// hardcoded number that goes stale (the footer once said v4.1.2 for months).
export default function PipelineVersion() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/pulse', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d?.version) setVersion(d.version); })
      .catch(() => {});
  }, []);

  return (
    <p className="footer-version">
      {version ? `Pipeline v${version} · ` : ''}Building Honestly Since March 2026
    </p>
  );
}
