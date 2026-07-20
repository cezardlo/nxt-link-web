'use client';

import Link from 'next/link';
import {
  Building2, ClipboardCheck, Inbox, Wand2, Store, Receipt,
  Coins, Users, ArrowRight,
} from 'lucide-react';
import { AccessGate } from '@/components/AccessGate';

type AdminLink = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type AdminGroup = { heading: string; links: AdminLink[] };

const GROUPS: AdminGroup[] = [
  {
    heading: 'Vendors',
    links: [
      { href: '/admin/vendor-applications', title: 'Vendor applications', description: 'Review, approve, or reject companies that applied. Approving creates their live vendor profile.', icon: ClipboardCheck },
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
      { href: '/admin/marketplace', title: 'Listings', description: 'Review and moderate marketplace products & services.', icon: Store },
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

function AdminHome() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#6C5CE0]">NXT//LINK</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#141320]">Operator console</h1>
        <p className="mt-2 max-w-2xl text-[#615F72]">
          Manage vendors, buyer requests, listings, and commissions. Pick a section to get started.
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => (
          <section key={group.heading}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#615F72]">
              {group.heading}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.links.map((link) => {
                const Icon = link.icon;
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
  );
}

export default function AdminHomePage() {
  return (
    <AccessGate>
      <AdminHome />
    </AccessGate>
  );
}
