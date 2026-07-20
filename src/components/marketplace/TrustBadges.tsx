'use client';

import type { ReactNode } from 'react';
import { ShieldCheck, FileCheck, Award, Clock } from 'lucide-react';

// Graded vendor trust badges (design spec §03 "Status & trust badges").
// Driven by vendor_profiles.verification_level — a cumulative ladder — with
// status/insured fallbacks so vendors below the new tiers keep today's
// "Verified business" badge instead of losing trust signals.

export const VERIFICATION_LADDER = [
  'registered',
  'email_confirmed',
  'profile_created',
  'business_reviewed',
  'identity_verified',
  'insurance_reviewed',
  'certifications_reviewed',
  'active',
] as const;

export function levelAtLeast(level: string | null | undefined, target: string): boolean {
  if (!level) return false;
  const have = VERIFICATION_LADDER.indexOf(level as (typeof VERIFICATION_LADDER)[number]);
  const want = VERIFICATION_LADDER.indexOf(target as (typeof VERIFICATION_LADDER)[number]);
  return have >= 0 && want >= 0 && have >= want;
}

export const TRUST_BADGES_CSS = `
.tbx{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.tbx span{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:99px;white-space:nowrap;}
.tbx span svg{width:12px;height:12px;flex:none;}
.tbx .trust{background:rgba(52,211,153,.1);color:#34D399;border:1px solid rgba(52,211,153,.25);}
.tbx .cert{background:rgba(124,92,252,.12);color:#C4B5FD;border:1px solid rgba(124,92,252,.3);}
.tbx .pend{background:rgba(251,191,36,.1);color:#FBBF24;border:1px solid rgba(251,191,36,.25);}
.tbx.sm span{font-size:9.5px;padding:3px 7px;}
`;

export function TrustBadges({
  verified,
  verificationLevel,
  insured,
  pending,
  size,
}: {
  verified?: boolean;
  verificationLevel?: string | null;
  insured?: boolean;
  pending?: boolean;
  size?: 'sm' | 'md';
}) {
  const identity = levelAtLeast(verificationLevel, 'identity_verified');
  const insurance = insured || levelAtLeast(verificationLevel, 'insurance_reviewed');
  const certified = levelAtLeast(verificationLevel, 'certifications_reviewed');
  // Spec icon system: lucide at 1.75px stroke.
  const icon = { strokeWidth: 1.75, 'aria-hidden': true } as const;
  const badges: { cls: string; label: string; title: string; ic: ReactNode }[] = [];

  if (identity) {
    badges.push({ cls: 'trust', label: 'Verified identity', title: 'Owner identity verified by NXT//LINK', ic: <ShieldCheck {...icon} /> });
  } else if (verified) {
    badges.push({ cls: 'trust', label: 'Verified business', title: 'Business reviewed and approved by NXT//LINK', ic: <ShieldCheck {...icon} /> });
  }
  if (insurance) badges.push({ cls: 'trust', label: 'Insurance reviewed', title: 'Proof of insurance on file', ic: <FileCheck {...icon} /> });
  if (certified) badges.push({ cls: 'cert', label: 'Certified', title: 'Industry certifications reviewed', ic: <Award {...icon} /> });
  if (pending && badges.length === 0) badges.push({ cls: 'pend', label: 'Pending review', title: 'Awaiting NXT//LINK review', ic: <Clock {...icon} /> });

  if (badges.length === 0) return null;
  return (
    <div className={size === 'sm' ? 'tbx sm' : 'tbx'}>
      {badges.map((b) => (
        <span key={b.label} className={b.cls} title={b.title}>{b.ic}{b.label}</span>
      ))}
    </div>
  );
}
