'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export type TimelineEntry = {
  title: string;
  content: React.ReactNode;
};

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 10%', 'end 50%'],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full font-mono"
      ref={containerRef}
      style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
    >
      <div ref={ref} className="relative mx-auto max-w-7xl pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            {/* Sticky label column */}
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              {/* Dot */}
              <div
                className="h-10 absolute left-3 md:left-3 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a' }}
              >
                <div
                  className="h-4 w-4 rounded-full"
                  style={{
                    backgroundColor: '#ff6600',
                    boxShadow: '0 0 8px #ff660066',
                    border: '2px solid #ff660033',
                  }}
                />
              </div>

              {/* Year label */}
              <h3
                className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold"
                style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}
              >
                {item.title}
              </h3>
            </div>

            {/* Content column */}
            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3
                className="md:hidden block text-2xl mb-4 text-left font-bold"
                style={{
                  color: 'rgba(255,255,255,0.15)',
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  letterSpacing: '0.05em',
                }}
              >
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}

        {/* Animated gradient line */}
        <div
          style={{
            position: 'absolute',
            left: '18px',
            top: 0,
            overflow: 'hidden',
            width: '2px',
            height: `${height}px`,
          }}
        >
          {/* Background track */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent, #1a1a1a, transparent)',
            }}
          />
          {/* Animated fill */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: heightTransform,
              opacity: opacityTransform,
              background: 'linear-gradient(to bottom, #ff6600, #00d4ff, transparent)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
