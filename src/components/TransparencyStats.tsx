'use client';

import { useEffect, useState, useCallback } from 'react';

export default function TransparencyStats() {
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [totalSpend, setTotalSpend] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      const data = await res.json();
      if (data?.ok) {
        if (typeof data.liveCount === 'number') setLiveCount(data.liveCount);
        if (typeof data.totalSpend === 'number') setTotalSpend(data.totalSpend);
      }
    } catch (e) {
      console.log('Transparency stats fetch skipped:', e);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const num = (n: number | null) => (n === null ? '·' : String(n));
  const money = (n: number | null) =>
    n === null ? '·' : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="metrics-grid reveal">
      <div className="metric">
        <div className="metric-value">{num(liveCount)}</div>
        <div className="metric-label">Products Live</div>
      </div>
      <div className="metric">
        <div className="metric-value">40</div>
        <div className="metric-label">Cognitive Skills</div>
      </div>
      <div className="metric">
        <div className="metric-value">{money(totalSpend)}</div>
        <div className="metric-label">Total Invested</div>
      </div>
      <div className="metric">
        <div className="metric-value">$0</div>
        <div className="metric-label">Revenue So Far</div>
      </div>
      <div className="metric">
        <div className="metric-value">$704</div>
        <div className="metric-label">Monthly Budget</div>
      </div>
      <div className="metric">
        <div className="metric-value">$0</div>
        <div className="metric-label">Founder Salary</div>
      </div>
    </div>
  );
}
