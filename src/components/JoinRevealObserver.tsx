'use client';

import { useEffect } from 'react';

export default function JoinRevealObserver() {
  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach((el) => {
      observer.observe(el);
    });

    // Scroll to tiers button
    const scrollBtn = document.getElementById('scroll-to-tiers-btn');
    if (scrollBtn) {
      const handler = () => {
        const tiers = document.getElementById('tiers');
        if (tiers) tiers.scrollIntoView({ behavior: 'smooth' });
      };
      scrollBtn.addEventListener('click', handler);
      return () => {
        observer.disconnect();
        scrollBtn.removeEventListener('click', handler);
      };
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
