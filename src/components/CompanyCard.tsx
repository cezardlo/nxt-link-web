'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCompanyLogoUrl, companyInitials } from '@/lib/utils/company-logos';

// ─── Types ────────────────────────────────────────────────────────────────────

type CompanyCardProps = {
  id: string;
  name: string;
  website: string;
  category: string;
  tags: string[];
  ikerScore: number;
  accentColor: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CompanyCard({
  id,
  name,
  website,
  category,
  tags,
  ikerScore,
  accentColor,
}: CompanyCardProps) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getCompanyLogoUrl(name, website);
  const initials = companyInitials(name);

  // IKER color: green ≥75, gold ≥50, dim <50
  const ikerColor =
    ikerScore >= 75 ? '#00ff88' : ikerScore >= 50 ? '#ffb800' : '#6b7280';

  return (
    <Link
      href={`/vendor/${id}`}
      className="group flex items-center gap-4 p-4 bg-white/[0.015] border border-white/[0.05] rounded-sm hover:bg-white/[0.035] hover:border-white/[0.10] transition-all duration-200"
    >
      {/* Logo or initials fallback */}
      <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-white/[0.06] flex items-center justify-center border border-white/[0.08]">
        {logoUrl && !imgError ? (
          <Image
            src={logoUrl}
            alt={name}
            width={40}
            height={40}
            className="w-full h-full object-contain bg-white/90 p-0.5"
            onError={() => setImgError(true)}
            loading="lazy"
            unoptimized
          />
        ) : (
          <span
            className="font-mono text-[11px] font-bold"
            style={{ color: accentColor }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Name + tags */}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] text-white/65 font-medium truncate group-hover:text-white/85 transition-colors">
          {name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-[7px] tracking-[0.15em] text-white/20 uppercase">
            {category}
          </span>
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="font-mono text-[6px] tracking-wider px-1.5 py-px rounded-sm"
              style={{
                color: `${accentColor}99`,
                border: `1px solid ${accentColor}20`,
                backgroundColor: `${accentColor}08`,
              }}
            >
              {tag.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* IKER Score */}
      <div className="shrink-0 flex flex-col items-center gap-0.5">
        <span
          className="font-mono text-[14px] font-bold leading-none"
          style={{ color: ikerColor, textShadow: `0 0 8px ${ikerColor}50` }}
        >
          {ikerScore}
        </span>
        <span className="font-mono text-[5px] tracking-[0.3em] text-white/15">IKER</span>
      </div>

      {/* Arrow */}
      <span className="font-mono text-[10px] text-white/10 group-hover:text-white/30 transition-colors shrink-0">
        →
      </span>
    </Link>
  );
}
