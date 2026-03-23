'use client';

import { type ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  accentColor?: string;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
};

/**
 * Shared card primitive — black bg, thin border, optional accent left bar.
 * Use across all pages for consistent card styling.
 */
export function Card({ children, accentColor, className = '', hover = true, onClick }: CardProps) {
  const base = `bg-black border border-white/[0.08] rounded-sm p-4 relative overflow-hidden transition-all duration-200${
    hover ? ' hover:border-white/[0.15] hover:bg-white/[0.01]' : ''
  }`;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      className={`${base} ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {accentColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ backgroundColor: accentColor }}
        />
      )}
      {children}
    </Tag>
  );
}
