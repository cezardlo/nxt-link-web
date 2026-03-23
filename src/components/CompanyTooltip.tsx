'use client';

import { useState, useRef, type ReactNode } from 'react';
import { getCompanyLogoUrl, companyInitials } from '@/lib/utils/company-logos';

type Props = {
  name: string;
  website?: string;
  category?: string;
  ikerScore?: number;
  tags?: string[];
  children: ReactNode;
};

export function CompanyTooltip({ name, website, category, ikerScore, tags, children }: Props) {
  const [show, setShow] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoUrl = getCompanyLogoUrl(name, website);
  const initials = companyInitials(name);

  const ikerColor = (ikerScore ?? 0) >= 75 ? '#00ff88' : (ikerScore ?? 0) >= 50 ? '#ffb800' : '#6b7280';

  const handleEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 200);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
  };

  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {show && (
        <div className="absolute z-30 bottom-full left-0 mb-1 w-[220px] bg-black/95 border border-white/[0.10] backdrop-blur-md rounded-sm p-3 pointer-events-none">
          <div className="flex items-center gap-2.5 mb-2">
            {/* Logo */}
            <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-white/[0.06] flex items-center justify-center border border-white/[0.08]">
              {logoUrl && !imgError ? (
                <img
                  src={logoUrl}
                  alt={name}
                  width={28}
                  height={28}
                  className="w-full h-full object-contain bg-white/90 p-0.5"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="font-mono text-[8px] font-bold text-[#00d4ff]">{initials}</span>
              )}
            </div>
            {/* Name */}
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] text-white/70 font-medium truncate">{name}</div>
              {category && (
                <div className="font-mono text-[7px] text-white/25 tracking-wider uppercase">{category}</div>
              )}
            </div>
            {/* IKER */}
            {ikerScore !== undefined && (
              <div className="shrink-0 text-center">
                <span className="font-mono text-[12px] font-bold" style={{ color: ikerColor }}>{ikerScore}</span>
                <div className="font-mono text-[7px] tracking-[0.2em] text-white/15">IKER</div>
              </div>
            )}
          </div>
          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="font-mono text-[6px] tracking-wider text-white/20 border border-white/[0.06] rounded-sm px-1.5 py-0.5 uppercase">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
