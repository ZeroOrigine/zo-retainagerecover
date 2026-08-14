'use client';

import { useEffect, useState, useCallback } from 'react';

interface LiveStatsData {
  liveCount: number | null;
  totalCount: number | null;
}

export default function LiveStats() {
  // null = not loaded yet. We never show invented numbers (Rule: every number real).
  const [stats, setStats] = useState<LiveStatsData>({
    liveCount: null,
    totalCount: null,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      const data = await res.json();
      if (data?.ok) {
        setStats({ liveCount: data.liveCount, totalCount: data.totalCount });
      }
    } catch (e) {
      // Keep last-known values; never overwrite with a guess.
      console.log('Stats fetch skipped:', e);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchStats]);

  const show = (n: number | null) => (n === null ? '·' : String(n));

  return (
    <div className="hero-stats">
      <div className="stat">
        <div className="stat-value">8</div>
        <div className="stat-label">AI Minds</div>
      </div>
      <div className="stat">
        <div className="stat-value">{show(stats.liveCount)}</div>
        <div className="stat-label">Products Live</div>
      </div>
      <div className="stat">
        <div className="stat-value">{show(stats.totalCount)}</div>
        <div className="stat-label">Total Products</div>
      </div>
      <div className="stat">
        <div className="stat-value">$0</div>
        <div className="stat-label">Revenue So Far</div>
      </div>
    </div>
  );
}
