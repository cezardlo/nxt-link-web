'use client';
import { useState, useEffect } from 'react';

interface SectionNavProps {
  sections: Array<{ id: string; label: string }>;
  accentColor?: string;
}

export function SectionNav({ sections, accentColor = '#00d4ff' }: SectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id || '');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach(section => {
      const el = document.getElementById(section.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setActiveId(section.id);
            }
          });
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  return (
    <div className="sticky top-11 z-[9] bg-black/92 border-b border-white/5 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide py-1.5">
        {sections.map(section => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              className="font-mono text-[8px] tracking-[0.2em] uppercase whitespace-nowrap px-3 py-1 rounded-sm transition-colors shrink-0"
              style={{
                color: isActive ? accentColor : 'rgba(255,255,255,0.25)',
                backgroundColor: isActive ? `${accentColor}10` : 'transparent',
                borderBottom: isActive ? `1px solid ${accentColor}60` : '1px solid transparent',
              }}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
