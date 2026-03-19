import { IKERBadge } from '@/components/intelligence/IKERBadge';

type Props = {
  vendor: {
    id?: string;
    name: string;
    category?: string;
    ikerScore?: number;
    website?: string;
    description?: string;
  };
};

export function VendorCard({ vendor }: Props) {
  return (
    <article
      style={{
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 4,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{vendor.name}</div>
          {vendor.category && (
            <div
              style={{
                marginTop: 4,
                color: 'rgba(255,255,255,0.45)',
                fontSize: 10,
                letterSpacing: '0.08em',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              }}
            >
              {vendor.category.toUpperCase()}
            </div>
          )}
        </div>
        <IKERBadge score={vendor.ikerScore ?? 0} compact />
      </div>
      {vendor.description && (
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 1.5 }}>
          {vendor.description}
        </p>
      )}
      {vendor.website && (
        <a
          href={vendor.website}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 8,
            color: '#00d4ff',
            fontSize: 10,
            textDecoration: 'none',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          }}
        >
          OPEN VENDOR
        </a>
      )}
    </article>
  );
}

