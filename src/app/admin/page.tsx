'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Building2, ClipboardCheck, Inbox, Wand2, Store, Receipt,
  Coins, Users, ArrowRight, Send, AlertCircle, Reply, RefreshCw, LayoutDashboard,
} from 'lucide-react';
import { AccessGate } from '@/components/AccessGate';
import { EMPTY_ADMIN_OVERVIEW_COUNTS, type AdminOverviewCounts } from '@/lib/admin/overview';

type AdminLink = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Which overview count (if any) this link should show a nav badge for. */
  badgeKey?: keyof AdminOverviewCounts;
};

type AdminGroup = { heading: string; links: AdminLink[] };

const GROUPS: AdminGroup[] = [
  {
    heading: 'Insights',
    links: [
      { href: '/admin/dashboard', title: 'Operator dashboard', description: 'Live accounts, the vendor funnel, marketplace activity, and traffic — straight from the database.', icon: LayoutDashboard, badgeKey: 'pendingVendorApplications' },
    ],
  },
  {
    heading: 'Vendors',
    links: [
      { href: '/admin/invites', title: 'Vendor invites', description: 'Invite a vendor you met: three fields, they get a personal link, reminders run automatically.', icon: Send },
      { href: '/admin/vendor-applications', title: 'Vendor applications', description: 'Review, approve, or reject companies that applied. Approving creates their live vendor profile.', icon: ClipboardCheck, badgeKey: 'pendingVendorApplications' },
      { href: '/admin/vendors', title: 'Vendor moderation', description: 'Suspend, ban, or reactivate vendors, with a full audit trail.', icon: Building2 },
      { href: '/admin/directory', title: 'Vendor directory', description: 'Browse and manage the full vendor catalog.', icon: Users },
    ],
  },
  {
    heading: 'Buyer requests',
    links: [
      { href: '/admin/requests', title: 'Buyer requests (RFQs)', description: 'See incoming buyer requests and their status.', icon: Inbox },
      { href: '/admin/match', title: 'Match & dispatch', description: 'Rank matching vendors for a request and push it to their inboxes.', icon: Wand2 },
    ],
  },
  {
    heading: 'Marketplace',
    links: [
      { href: '/admin/marketplace', title: 'Listings', description: 'Review and moderate marketplace products & services.', icon: Store, badgeKey: 'listingsAwaitingReview' },
    ],
  },
  {
    heading: 'Money',
    links: [
      { href: '/admin/deals', title: 'Deals & commission co-pilot', description: 'Log deals in plain English; fees are computed automatically.', icon: Receipt },
      { href: '/admin/commissions', title: 'Commissions', description: 'Track commissions owed and collected.', icon: Coins },
    ],
  },
];

type AttentionCard = {
  key: keyof AdminOverviewCounts;
  href: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: 'warning' | 'info';
};

// Every card links into the existing admin screen that already handles that
// queue — this dashboard adds visibility, not a new workflow. "Open
// disputes" is deliberately absent: no disputes table exists yet (verified
// against supabase/migrations — see src/lib/admin/overview.ts header).
const ATTENTION_CARDS: AttentionCard[] = [
  {
    key: 'pendingVendorApplications',
    href: '/admin/vendor-applications',
    label: 'Pending vendor applications',
    hint: 'Companies that applied on /apply and are waiting on your approve/reject.',
    icon: ClipboardCheck,
    tint: 'warning',
  },
  {
    key: 'listingsAwaitingReview',
    href: '/admin/marketplace#listings-review',
    label: 'Listings awaiting review',
    hint: 'AI-drafted products/services that need a human look before they can publish.',
    icon: AlertCircle,
    tint: 'warning',
  },
  {
    key: 'newClientRequests7d',
    href: '/admin/requests',
    label: 'New client requests (7 days)',
    hint: 'Buyer requests received in the last week.',
    icon: Inbox,
    tint: 'info',
  },
  {
    key: 'quotesAwaitingBuyerDecision',
    href: '/admin/marketplace#leads',
    label: 'Quotes awaiting buyer decision',
    hint: 'Informational — vendors have responded; the buyer hasn’t accepted or declined yet.',
    icon: Reply,
    tint: 'info',
  },
];

const TINT_CLASSES: Record<AttentionCard['tint'], { chip: string; count: string }> = {
  warning: { chip: 'bg-[var(--spec-warning-bg,#FBF2E1)] text-[#8C5A15]', count: 'text-[#8C5A15]' },
  info: { chip: 'bg-[var(--spec-info-bg,#E9EFFB)] text-[#2F5AA8]', count: 'text-[#2F5AA8]' },
};

function NeedsAttention({
  counts,
  loading,
  error,
  onRetry,
}: {
  counts: AdminOverviewCounts;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#615F72]">
          Needs your attention
        </h2>
        {error && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DFEC] bg-white px-3 py-1 text-xs font-semibold text-[#615F72] transition hover:bg-[#EFEDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-[#CE4B43]">
          Couldn&rsquo;t load live counts. The rest of the console still works &mdash; try again, or open each
          section directly below.
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ATTENTION_CARDS.map((card) => {
          const Icon = card.icon;
          const tint = TINT_CLASSES[card.tint];
          const count = counts[card.key];
          return (
            <Link
              key={card.key}
              href={card.href}
              className="group flex flex-col gap-3 rounded-2xl border border-[#E2DFEC] bg-white p-4 transition hover:border-[#6C5CE0] hover:shadow-[0_8px_30px_rgba(74,61,176,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint.chip}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {loading ? (
                  <span className="h-7 w-10 animate-pulse rounded-md bg-[#EFEDF5]" aria-hidden="true" />
                ) : (
                  <span className={`text-2xl font-semibold tabular-nums ${error ? 'text-[#615F72]' : tint.count}`}>
                    {error ? '—' : count}
                  </span>
                )}
              </div>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-medium text-[#141320]">
                  {card.label}
                  <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-[#615F72]">{card.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NavBadge({ count }: { count: number | undefined }) {
  if (!count) return null;
  return (
    <span
      aria-label={`${count} pending`}
      className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--spec-warning-bg,#FBF2E1)] px-1.5 text-[11px] font-bold text-[#8C5A15]"
    >
      {count}
    </span>
  );
}

function AdminHome() {
  const [counts, setCounts] = useState<AdminOverviewCounts>(EMPTY_ADMIN_OVERVIEW_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || `HTTP ${res.status}`);
      setCounts(json.counts as AdminOverviewCounts);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7FB]">
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#6C5CE0]">NXT//LINK</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#141320]">Operator console</h1>
        <p className="mt-2 max-w-2xl text-[#615F72]">
          Manage vendors, buyer requests, listings, and commissions. Pick a section to get started.
        </p>
      </header>

      <NeedsAttention counts={counts} loading={loading} error={error} onRetry={() => void load()} />

      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => (
          <section key={group.heading}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#615F72]">
              {group.heading}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.links.map((link) => {
                const Icon = link.icon;
                const badgeCount = link.badgeKey ? counts[link.badgeKey] : undefined;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-start gap-3 rounded-2xl border border-[#E2DFEC] bg-white p-4 transition hover:border-[#6C5CE0] hover:shadow-[0_8px_30px_rgba(74,61,176,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
                  >
                    <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#EFEDF5] text-[#4A3DB0]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-medium text-[#141320]">
                        {link.title}
                        {!loading && !error && <NavBadge count={badgeCount} />}
                        <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                      </span>
                      <span className="mt-0.5 block text-sm text-[#615F72]">{link.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <AccessGate>
      <AdminHome />
    </AccessGate>
  );
}
