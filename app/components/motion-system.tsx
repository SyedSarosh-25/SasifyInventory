'use client';

import { useEffect } from 'react';

export function MotionSystem() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let cleanup = () => {};

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.context(() => {
        const heroItems = gsap.utils.toArray<HTMLElement>(
          '.hero-kicker, .hero-copy > p, .hero-discovery, .hero-actions',
        );
        if (heroItems.length) {
          gsap.from(heroItems, {
            autoAlpha: 0,
            y: 18,
            duration: 0.72,
            stagger: 0.09,
            delay: 0.08,
            ease: 'power3.out',
            clearProps: 'opacity,visibility,transform',
          });
          gsap.from('.brand-constellation', {
            autoAlpha: 0,
            scale: 0.96,
            duration: 0.9,
            delay: 0.16,
            ease: 'power3.out',
            clearProps: 'opacity,visibility,transform',
          });
          gsap.from('.hero-proof > *', {
            autoAlpha: 0,
            y: 10,
            duration: 0.55,
            stagger: 0.07,
            delay: 0.42,
            ease: 'power2.out',
            clearProps: 'opacity,visibility,transform',
          });
        }

        gsap.utils.toArray<HTMLElement>(
          '.featured-heading, .section-heading, .reviews-heading, .about-identity, .detail-identity',
        ).forEach((heading) => {
          const targets = Array.from(heading.children);
          if (!targets.length) return;
          gsap.from(targets, {
            autoAlpha: 0,
            y: 20,
            duration: 0.68,
            stagger: 0.08,
            ease: 'power3.out',
            clearProps: 'opacity,visibility,transform',
            scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
          });
        });

        gsap.utils.toArray<HTMLElement>(
          '.featured-grid, .product-grid, .why-sasify-column, .payment-methods-grid, '
          + '.guide-plans, .guide-answers, .faq-list, .related-grid, .access-comparison',
        ).forEach((container) => {
          const items = Array.from(container.children);
          if (!items.length) return;
          gsap.from(items, {
            autoAlpha: 0,
            y: 24,
            duration: 0.62,
            stagger: { amount: Math.min(0.48, items.length * 0.06) },
            ease: 'power3.out',
            clearProps: 'opacity,visibility,transform',
            scrollTrigger: { trigger: container, start: 'top 90%', once: true },
          });
        });

        gsap.utils.toArray<HTMLElement>(
          '.why-sasify-center, .reviews-carousel-toolbar, .reviews-grid, .deal-proofs-toolbar, .deal-proofs-track, .inventory-action, .comparison-note, '
          + '.detail-content > .description-section, .about-page > .description-section, '
          + '.policy-page > .policy-section, .related-section, .purchase-summary',
        ).forEach((block) => {
          gsap.from(block, {
            autoAlpha: 0,
            y: 22,
            duration: 0.7,
            ease: 'power3.out',
            clearProps: 'opacity,visibility,transform',
            scrollTrigger: { trigger: block, start: 'top 91%', once: true },
          });
        });
      }, document.body);

      const emblem = document.querySelector<HTMLElement>('.why-sasify-emblem');
      const emblemFace = emblem?.querySelector<HTMLElement>('.why-sasify-emblem-face');
      const removeEmblemMotion = (() => {
        if (!emblem || !emblemFace || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};

        const rotateX = gsap.quickTo(emblem, 'rotationX', { duration: 0.45, ease: 'power3.out' });
        const rotateY = gsap.quickTo(emblem, 'rotationY', { duration: 0.45, ease: 'power3.out' });
        const lift = gsap.quickTo(emblem, 'y', { duration: 0.45, ease: 'power3.out' });
        const float = gsap.to(emblemFace, { y: -5, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });

        const handlePointerMove = (event: PointerEvent) => {
          const bounds = emblem.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - 0.5;
          const y = (event.clientY - bounds.top) / bounds.height - 0.5;
          rotateX(4 - y * 18);
          rotateY(x * 20);
          lift(-7);
        };
        const resetTilt = () => {
          rotateX(8);
          rotateY(-9);
          lift(0);
        };

        emblem.addEventListener('pointermove', handlePointerMove);
        emblem.addEventListener('pointerleave', resetTilt);
        return () => {
          emblem.removeEventListener('pointermove', handlePointerMove);
          emblem.removeEventListener('pointerleave', resetTilt);
          float.kill();
          gsap.killTweensOf([emblem, emblemFace]);
        };
      })();

      cleanup = () => {
        removeEmblemMotion();
        context.revert();
      };
      void document.fonts.ready.then(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
}
