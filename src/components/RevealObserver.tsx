'use client';

import { useEffect } from 'react';

export default function RevealObserver() {
  useEffect(() => {
    // Standard reveal observer
    const observerOptions: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    // Observe all existing .reveal elements
    document.querySelectorAll('.reveal').forEach((el) => {
      observer.observe(el);
    });

    // Watch for dynamically-added .reveal elements (e.g. from client components)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains('reveal')) {
              observer.observe(node);
            }
            node.querySelectorAll('.reveal').forEach((el) => {
              observer.observe(el);
            });
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Manifesto block observer
    const manifestoObserverOptions: IntersectionObserverInit = {
      threshold: 0.3,
      rootMargin: '0px 0px -100px 0px',
    };

    const manifestoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, manifestoObserverOptions);

    document.querySelectorAll('.m-block').forEach((el) => {
      manifestoObserver.observe(el);
    });

    return () => {
      observer.disconnect();
      manifestoObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
