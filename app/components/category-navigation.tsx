'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

type Props = {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
};

export function CategoryNavigation({ categories, activeCategory, onChange }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const stripId = useId();
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const update = () => {
      const previous = strip.scrollLeft > 1;
      const next = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
      setCanScroll((current) => current.previous === previous && current.next === next
        ? current : { previous, next });
    };
    update();
    strip.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(strip);
    for (const button of strip.children) observer.observe(button);
    return () => {
      strip.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [categories]);

  const scroll = (direction: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollBy({
      left: direction * Math.max(1, strip.clientWidth * 0.8),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  return <div className="category-navigation" role="group" aria-label="Product categories">
    <button type="button" className="category-scroll-button" aria-label="Previous categories"
      title="Previous categories" aria-controls={stripId} disabled={!canScroll.previous} onClick={() => scroll(-1)}>
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
    </button>
    <div id={stripId} ref={stripRef} className="category-strip">
      {categories.map((category) => <button type="button" key={category} onClick={() => onChange(category)}
        onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })}
        aria-pressed={activeCategory === category} className={activeCategory === category ? 'active' : ''}>{category}</button>)}
    </div>
    <button type="button" className="category-scroll-button" aria-label="Next categories"
      title="Next categories" aria-controls={stripId} disabled={!canScroll.next} onClick={() => scroll(1)}>
      <ChevronRight className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>;
}
