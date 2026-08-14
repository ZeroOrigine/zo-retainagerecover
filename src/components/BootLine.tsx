'use client';

import { useEffect, useState } from 'react';

const LINE = '> autonomous institution online. eight minds active. every number below is real.';

export default function BootLine() {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= LINE.length) return;
    const t = setTimeout(() => setN(n + 1), 24);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <p className="mc-boot" aria-label={LINE}>
      {LINE.slice(0, n)}<span className="mc-cursor">_</span>
    </p>
  );
}
