'use client';

// /admin/dashboard — the operator dashboard Cesar asked for on 2026-08-04
// ("a dashboard how many people are in the website, traffic, accounts").
// Lives INSIDE the existing admin app (same AccessGate layout, same
// /api/admin/overview endpoint, same isAdminRequest server gate) — it is a
// new page in the existing console, not a new admin app.
//
// Every number comes straight from the live database via
// src/lib/admin/dashboard.ts — nothing is estimated or placeholdered. The
// traffic panel deliberately shows an honest "not connected yet" empty state
// because Vercel Web Analytics is not enabled on production (zero data
// exists); it lights up on its own once the coordinator turns analytics on
// and sets the two documented env vars.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, Globe,
  Inbox, Minus, Receipt, RefreshCw, Reply, Store, TrendingDown, TrendingUp,
  UserPlus, Users,
} from 'lucide-react';
import { AccessGate } from '@/components/AccessGate';
import { emptyOperatorDashboard, type OperatorDashboard } from '@/lib/admin/dashboard';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Pending hero — the number Cesar must act on, the most prominent thing here.
// ---------------------------------------------------------------------------

function PendingHero({ pending, loading }: { pending: number; loading: boolean }) {
  if (!loading && pending === 0) {
    return (
      <section aria-label="Vendor applications waiting for review" className="mb-8 flex items-center gap-4 rounded-2xl border border-[#BFE3C8] bg-[#F1FAF3] p-5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[#DDF1E3] text-[#2E7D46]">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-[#1F5B33]">All caught up</p>
          <p className="text-sm text-[#3E7A52]">No vendor applications waiting for review right now.</p>
        </div>
      </section>
    );
  }
  return (
    <section aria-label="Vendor applications waiting for review" className="mb-8 rounded-2xl border-2 border-[#E8B23A] bg-gradient-to-br from-[#FFF7E8] to-[#FDEFD3] p-6 shadow-[0_14px_40px_rgba(140,90,21,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-[#8C5A15] text-white">
            <ClipboardCheck className="h-7 w-7" />
          </span>
          <div>
            <p className="flex items-baseline gap-2">
              {loading ? (
                <span className="inline-block h-10 w-14 animate-pulse rounded-lg bg-[#F0DFC0]" aria-hidden="true" />
              ) : (
                <span className="text-5xl font-semibold tabular-nums tracking-tight text-[#8C5A15]">{fmt(pending)}</span>
              )}
              <span className="text-lg font-semibold text-[#8C5A15]">
                {pending === 1 ? 'vendor application' : 'vendor applications'}
              </span>
            </p>
            <p className="mt-1 text-sm font-medium text-[#A06A1B]">waiting on your review — approve, ask for info, or reject.</p>
          </div>
        </div>
        <Link
          href="/admin/vendor-applications"
          className="inline-flex items-center gap-2 rounded-xl bg-[#8C5A15] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#6E460F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C5A15]"
        >
          Review now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The funnel — the point of the page. One glance: where do people fall out?
// ---------------------------------------------------------------------------

type FunnelStep = { key: string; label: string; hint: string; value: number };

function Funnel({ funnel, loading }: { funnel: OperatorDashboard['funnel']; loading: boolean }) {
  const steps: FunnelStep[] = [
    { key: 'signedUp', label: 'Signed up', hint: 'vendor accounts on the site', value: funnel.signedUp },
    { key: 'applicationSubmitted', label: 'Application submitted', hint: 'filled out the vendor application', value: funnel.applicationSubmitted },
    { key: 'approved', label: 'Approved', hint: 'allowed to sell', value: funnel.approved },
    { key: 'publishedListing', label: 'Published a listing', hint: 'live on the marketplace', value: funnel.publishedListing },
  ];
  const max = Math.max(...steps.map((s) => s.value));
  const allZero = max === 0;

  return (
    <section aria-label="Vendor funnel" className="mb-8 rounded-2xl border border-[#E2DFEC] bg-white p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#6C5CE0]" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#615F72]">
          The vendor funnel — where people fall out
        </h2>
      </div>

      <ol className="mt-5 flex flex-col gap-1">
        {steps.map((step, i) => {
          const prev = i > 0 ? steps[i - 1] : null;
          const drop = prev ? prev.value - step.value : 0;
          const widthPct = max > 0 ? Math.max(4, Math.round((step.value / max) * 100)) : 4;
          const isLast = i === steps.length - 1;
          return (
            <li key={step.key}>
              {prev && (
                <p className="py-1 pl-1 text-xs font-medium text-[#8A88A0]" aria-hidden="true">
                  ↓{' '}
                  {drop > 0
                    ? `−${fmt(drop)} drop off here${prev.value > 0 ? ` (${Math.round((drop / prev.value) * 100)}%)` : ''}`
                    : drop < 0
                      ? `+${fmt(-drop)} more than the step above (invite lane skips the application)`
                      : 'no change'}
                </p>
              )}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div
                    role="img"
                    aria-label={`${step.label}: ${step.value}`}
                    className={`h-12 rounded-xl transition-all ${
                      isLast && step.value === 0
                        ? 'border-2 border-dashed border-[#C9C5DC] bg-[#F4F3FA]'
                        : 'bg-gradient-to-r from-[#6C5CE0] to-[#4A3DB0]'
                    }`}
                    style={{ width: loading ? '40%' : `${widthPct}%` }}
                  >
                    <span className={`flex h-full items-center px-4 text-lg font-semibold tabular-nums ${isLast && step.value === 0 ? 'text-[#8A88A0]' : 'text-white'}`}>
                      {loading ? '…' : fmt(step.value)}
                    </span>
                  </div>
                </div>
                <div className="w-56 flex-none">
                  <p className="text-sm font-semibold text-[#141320]">{step.label}</p>
                  <p className="text-xs text-[#615F72]">{step.hint}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 rounded-xl bg-[#F8F7FB] px-4 py-3 text-sm text-[#615F72]">
        {loading
          ? 'Reading the live database…'
          : allZero
            ? 'No vendor accounts yet — every step lights up as real people move through it.'
            : funnel.publishedListing === 0
              ? 'Nobody has published a listing yet — that last step is the one to unblock.'
              : `${fmt(funnel.publishedListing)} ${funnel.publishedListing === 1 ? 'vendor has' : 'vendors have'} a live listing.`}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Accounts + signups trend
// ---------------------------------------------------------------------------

function SignupTrend({ new7d, prev7d }: { new7d: number; prev7d: number }) {
  if (new7d === 0 && prev7d === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8A88A0]">
        <Minus className="h-3.5 w-3.5" /> no signups in either week
      </span>
    );
  }
  const up = new7d > prev7d;
  const flat = new7d === prev7d;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const label = flat ? 'same as the prior 7 days' : up ? `up from ${fmt(prev7d)} the prior 7 days` : `down from ${fmt(prev7d)} the prior 7 days`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${flat ? 'text-[#8A88A0]' : up ? 'text-[#2E7D46]' : 'text-[#CE4B43]'}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
    </span>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub?: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E2DFEC] bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFEDF5] text-[#4A3DB0]">
          <Icon className="h-5 w-5" />
        </span>
        {loading ? (
          <span className="h-8 w-12 animate-pulse rounded-md bg-[#EFEDF5]" aria-hidden="true" />
        ) : (
          <span className="text-3xl font-semibold tabular-nums text-[#141320]">{fmt(value)}</span>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-[#141320]">{label}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vendors by status — pending links straight to the review screen.
// ---------------------------------------------------------------------------

function VendorStatusRow({ status, loading }: { status: OperatorDashboard['vendorsByStatus']; loading: boolean }) {
  const chips: Array<{ label: string; value: number; href: string; tone: string }> = [
    { label: 'Pending', value: status.pending, href: '/admin/vendor-applications', tone: 'border-[#E8B23A] bg-[#FBF2E1] text-[#8C5A15]' },
    { label: 'Approved', value: status.approved, href: '/admin/directory', tone: 'border-[#BFE3C8] bg-[#F1FAF3] text-[#2E7D46]' },
    { label: 'Needs info', value: status.needsInfo, href: '/admin/vendor-applications', tone: 'border-[#C9B8F0] bg-[#F3EFFD] text-[#5B3FBF]' },
    { label: 'Rejected', value: status.rejected, href: '/admin/vendor-applications', tone: 'border-[#EFC4C1] bg-[#FBEFEE] text-[#CE4B43]' },
    { label: 'Restricted', value: status.restricted, href: '/admin/vendors', tone: 'border-[#E2DFEC] bg-[#F4F3FA] text-[#615F72]' },
  ];
  return (
    <section aria-label="Vendors by status" className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#615F72]">Vendors by status</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {chips.map((chip) => (
          <Link
            key={chip.label}
            href={chip.href}
            className={`group rounded-2xl border p-4 transition hover:shadow-[0_8px_30px_rgba(74,61,176,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2] ${chip.tone}`}
          >
            {loading ? (
              <span className="block h-7 w-10 animate-pulse rounded-md bg-black/10" aria-hidden="true" />
            ) : (
              <span className="block text-2xl font-semibold tabular-nums">{fmt(chip.value)}</span>
            )}
            <span className="mt-1 flex items-center gap-1 text-xs font-semibold">
              {chip.label}
              <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Traffic — honest empty state until Vercel Web Analytics is really on.
// ---------------------------------------------------------------------------

function TrafficPanel({ traffic, loading }: { traffic: OperatorDashboard['traffic']; loading: boolean }) {
  return (
    <section aria-label="Site traffic" className="mb-8 rounded-2xl border border-[#E2DFEC] bg-white p-6">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-[#6C5CE0]" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#615F72]">Site traffic (last 7 days)</h2>
      </div>

      {loading ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-[#F4F3FA]" aria-hidden="true" />
      ) : traffic.connected ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <StatTile icon={Users} label="Visitors" value={traffic.visitors7d ?? 0} loading={false} />
          <StatTile icon={BarChart3} label="Page views" value={traffic.pageviews7d ?? 0} loading={false} />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[#C9C5DC] bg-[#F8F7FB] p-5">
          <p className="font-semibold text-[#141320]">Traffic tracking isn&rsquo;t connected yet</p>
          <p className="mt-1 text-sm leading-6 text-[#615F72]">
            There are no visitor numbers to show — and this panel will never make one up. Turning on Vercel Web
            Analytics is already being handled; the moment it&rsquo;s live, real visitor and page-view counts
            appear here on their own.
          </p>
          <p className="mt-3 text-sm leading-6 text-[#8A88A0]" lang="es">
            El conteo de visitas aún no está conectado. No hay números que mostrar — y este panel nunca va a
            inventar uno. Ya se está activando Vercel Web Analytics; en cuanto quede listo, tus visitas y páginas
            vistas reales aparecen aquí solas.
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function OperatorDashboard() {
  const [data, setData] = useState<OperatorDashboard>(emptyOperatorDashboard());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      if (!res.ok || !json.ok || !json.dashboard) throw new Error(json.message || `HTTP ${res.status}`);
      setData(json.dashboard as OperatorDashboard);
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
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#615F72] transition hover:text-[#4A3DB0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]">
          <ArrowLeft className="h-4 w-4" /> Operator console
        </Link>

        <header className="mb-8 mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#6C5CE0]">NXT//LINK</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#141320]">Operator dashboard</h1>
            <p className="mt-2 max-w-2xl text-[#615F72]">
              Live numbers straight from the production database — accounts, the vendor funnel, and marketplace
              activity. Nothing here is estimated.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && !error && (
              <p className="text-xs text-[#8A88A0]">
                Updated {new Date(data.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DFEC] bg-white px-3 py-1.5 text-xs font-semibold text-[#615F72] transition hover:bg-[#EFEDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EFC4C1] bg-[#FBEFEE] p-4">
            <p className="text-sm font-medium text-[#CE4B43]">
              Couldn&rsquo;t load the live numbers. Nothing below is shown rather than something wrong.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EFC4C1] bg-white px-3 py-1 text-xs font-semibold text-[#CE4B43] transition hover:bg-[#F7E2E0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE4B43]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
        )}

        {!error && (
          <>
            <PendingHero pending={data.vendorsByStatus.pending} loading={loading} />
            <Funnel funnel={data.funnel} loading={loading} />

            <section aria-label="Accounts" className="mb-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#615F72]">Accounts</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatTile icon={Users} label="Total accounts" value={data.accounts.total} loading={loading}
                  sub={<span className="text-xs text-[#8A88A0]">{fmt(data.accounts.buyers)} buyers · {fmt(data.accounts.vendors)} vendors</span>} />
                <StatTile icon={UserPlus} label="New signups — last 7 days" value={data.accounts.new7d} loading={loading}
                  sub={<SignupTrend new7d={data.accounts.new7d} prev7d={data.accounts.prev7d} />} />
                <StatTile icon={UserPlus} label="New signups — last 30 days" value={data.accounts.new30d} loading={loading}
                  sub={<span className="text-xs text-[#8A88A0]">rolling 30-day window</span>} />
              </div>
            </section>

            <VendorStatusRow status={data.vendorsByStatus} loading={loading} />

            <section aria-label="Marketplace activity" className="mb-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#615F72]">Marketplace activity</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile icon={Store} label="Listings published" value={data.activity.listingsPublished} loading={loading} />
                <StatTile icon={Inbox} label="Requests posted" value={data.activity.requestsPosted} loading={loading} />
                <StatTile icon={Reply} label="Quotes sent" value={data.activity.quotesSent} loading={loading} />
                <StatTile icon={Receipt} label="Deals" value={data.activity.deals} loading={loading} />
              </div>
            </section>

            <TrafficPanel traffic={data.traffic} loading={loading} />
          </>
        )}
      </div>
    </div>
  );
}

export default function OperatorDashboardPage() {
  return (
    <AccessGate title="NXT//LINK Operator Dashboard">
      <OperatorDashboard />
    </AccessGate>
  );
}
