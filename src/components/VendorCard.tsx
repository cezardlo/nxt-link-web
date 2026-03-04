import type { ReactNode } from 'react';
import { Vendor } from '@prisma/client';

type VendorCardProps = {
  vendor: Vendor;
  actions?: ReactNode;
};

export function VendorCard({ vendor, actions }: VendorCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{vendor.name}</h3>
          <p className="text-xs text-slate-500">{vendor.email}</p>
        </div>
        {actions}
      </div>
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <p>
          <span className="font-medium">Tags:</span> {vendor.tags}
        </p>
        <p>
          <span className="font-medium">Contact:</span> {vendor.contactName ?? 'N/A'}
        </p>
        <p>
          <span className="font-medium">Website:</span> {vendor.website ?? 'N/A'}
        </p>
      </div>
    </article>
  );
}

