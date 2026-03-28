'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* --- types --- */
interface Vendor {
  id: string;
  company_name: string;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  sector: string | null;
  hq_country: string | null;
  hq_city: string | null;
  iker_score: number | null;
  credibility_score: number | null;
  tags: string[] | null;
  funding_stage: string | null;
  employee_count_range: string | null;
  industries: string[] | null;
}

interface SectorInfo {
  name: string;
  count: number;
}

/* --- constants --- */
const SECTOR_COLORS: Record<string, string> = {
  'Logistics': '#3b82f6',
  'Manufacturing': '#f59e0b',
  'Robotics': '#8b5cf6',
  'Defense': '#ef4444',
  'Trucking': '#10b981',
  'Trucking OEM': '#059669',
  'Trucking Technology': '#34d399',
  'Trucking Carrier': '#6ee7b7',
  'Trucking Services': '#a7f3d0',
  'AI / ML': '#ec4899',
  'Technology': '#6366f1',
  'Supply Chain Technology': '#0ea5e9',
  'Cybersecurity': '#f43f5e',
  'Energy': '#eab308',
  'IoT': '#14b8a6',
  'Warehousing': '#a855f7',
  'FinTech': '#22c55e',
  'Defense & Intelligence': '#dc2626',
  'Analytics': '#0284c7',
};

const SCORE_COLOR = (s: number | null) => {
  if (!s) return '#4b5563';
  if (s >= 90) return '#22c55e';
  if (s >= 75) return '#3b82f6';
  if (s >= 60) return '#f59e0b';
  return '#6b7280';
};

/* --- VendorCard --- */
function VendorCard({ v }: { v: Vendor }) {
  const [expanded, setExpanded] = useState(false);
  const sColor = SECTOR_COLORS[v.sector || ''] || '#6b7280';

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderLeft: `3px solid ${sColor}`,
        borderRadius: 8,
        padding: '16px 20px',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {v.company_url ? (
              <a
                href={v.company_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f9fafb', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}
              >
                {v.company_name}
              </a>
            ) : (
              <span style={{ color: '#f9fafb', fontSize: 16, fontWeight: 700 }}>{v.company_name}</span>
            )}
            {v.funding_stage && (
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: v.funding_stage === 'public' ? '#1e3a5f' : '#312e81',
                color: v.funding_stage === 'public' ? '#60a5fa' : '#a78bfa',
                textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5
              }}>
                {v.funding_stage}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {v.sector && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: `${sColor}20`, color: sColor, fontWeight: 600,
              }}>
                {v.sector}
              </span>
            )}
            {v.primary_category && v.primary_category !== v.sector && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: '#1f2937', color: '#9ca3af', fontWeight: 500,
              }}>
                {v.primary_category}
              </span>
            )}
            {v.hq_city && v.hq_country && (
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                {v.hq_city}, {v.hq_country}
              </span>
            )}
            {!v.hq_city && v.hq_country && (
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                {v.hq_country}
              </span>
            )}
            {v.employee_count_range && (
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                {v.employee_count_range}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div style={{
          minWidth: 44, height: 44, borderRadius: 8,
          background: `${SCORE_COLOR(v.iker_score)}15`,
          border: `1px solid ${SCORE_COLOR(v.iker_score)}40`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: SCORE_COLOR(v.iker_score) }}>
            {v.iker_score ?? '-'}
          </span>
          <span style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>SCORE</span>
        </div>
      </div>

      {/* Description preview */}
      {v.description && (
        <p style={{
          fontSize: 13, color: '#9ca3af', margin: '10px 0 0', lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 999 : 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {v.description}
        </p>
      )}

      {/* Tags */}
      {v.tags && v.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
          {(expanded ? v.tags : v.tags.slice(0, 5)).map((tag, i) => (
            <span key={i} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 3,
              background: '#1e293b', color: '#64748b', fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
          {!expanded && v.tags.length > 5 && (
            <span style={{ fontSize: 10, color: '#4b5563' }}>+{v.tags.length - 5}</span>
          )}
        </div>
      )}

      {/* Expand toggle */}
      {(v.description || (v.tags && v.tags.length > 5)) && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer',
            fontSize: 11, marginTop: 8, padding: 0, fontWeight: 600,
          }}
        >
          {expanded ? '^ LESS' : 'v MORE'}
        </button>
      )}
    </div>
  );
}

/* --- Main Page --- */
export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [sectors, setSectors] = useState<SectorInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 50;

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeSector) params.set('sector', activeSector);
      if (search) params.set('search', search);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const res = await fetch(`/api/vendors?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVendors(data.vendors || []);
      setTotal(data.total || 0);
      if (data.sectors) setSectors(data.sectors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [activeSector, search, offset]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setOffset(0);
  };

  const handleSector = (s: string | null) => {
    setActiveSector(s);
    setOffset(0);
  };

  // Stats
  const avgScore = vendors.length
    ? Math.round(vendors.reduce((sum, v) => sum + (v.iker_score || 0), 0) / vendors.length)
    : 0;
  const countriesSet = new Set(vendors.map(v => v.hq_country).filter(Boolean));

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#f9fafb' }}>
      {/* Nav */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', borderBottom: '1px solid #1f2937',
        background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/briefing" style={{ color: '#6b7280', fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>
            BRIEFING
          </Link>
          <Link href="/map" style={{ color: '#6b7280', fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>
            MAP
          </Link>
          <Link href="/conferences" style={{ color: '#6b7280', fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>
             EVENTS
          </Link>
          <Link href="/industry" style={{ color: '#6b7280', fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>
            INDUSTRY
          </Link>
          <span style={{ color: '#3b82f6', fontSize: 11, letterSpacing: 1, borderBottom: '1px solid #3b82f6' }}>
             VENDORS
          </span>
        </div>
        <span style={{ color: '#6b7280', fontSize: 10, letterSpacing: 2 }}>{'NXT'} {'//'}  {'LINK'}</span>
      </div>

      {/* Header */}
      <div style={{
        padding: '32px 24px 24px',
        borderBottom: '1px solid #1f2937',
        maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
            {'NXT'}<span style={{ color: '#3b82f6' }}>{'//'}</span>{'LINK'}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4,
            background: '#1e3a5f', color: '#60a5fa', fontWeight: 700,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            VENDOR INTEL
          </span>
        </div>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          {total} vendors tracked across {sectors.length} sectors
        </p>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap',
        }}>
          {[
            { label: 'TOTAL VENDORS', value: total },
            { label: 'SECTORS', value: sectors.length },
            { label: 'AVG SCORE', value: avgScore },
            { label: 'COUNTRIES', value: countriesSet.size },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f9fafb' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 6,
              background: '#111827', border: '1px solid #1f2937',
              color: '#f9fafb', fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '10px 20px', borderRadius: 6, border: 'none',
              background: '#3b82f6', color: '#fff', fontWeight: 700,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            SEARCH
          </button>
          {(search || activeSector) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setActiveSector(null); setOffset(0); }}
              style={{
                padding: '10px 16px', borderRadius: 6, border: '1px solid #374151',
                background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Sector filters */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20,
        }}>
          <button
            onClick={() => handleSector(null)}
            style={{
              padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: !activeSector ? '#3b82f6' : '#1f2937',
              color: !activeSector ? '#fff' : '#9ca3af',
            }}
          >
            ALL
          </button>
          {sectors.slice(0, 15).map((s) => (
            <button
              key={s.name}
              onClick={() => handleSector(s.name)}
              style={{
                padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                background: activeSector === s.name ? (SECTOR_COLORS[s.name] || '#3b82f6') : '#1f2937',
                color: activeSector === s.name ? '#fff' : '#9ca3af',
              }}
            >
              {s.name.toUpperCase()} ({s.count})
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            padding: 20, textAlign: 'center', color: '#ef4444',
            background: '#1c1017', borderRadius: 8, border: '1px solid #7f1d1d',
          }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{error}</p>
            <button
              onClick={fetchVendors}
              style={{
                padding: '8px 20px', borderRadius: 6, border: 'none',
                background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}
            >
              RETRY
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            <div style={{ fontSize: 14 }}>Loading vendors...</div>
          </div>
        )}

        {/* Vendor grid */}
        {!loading && !error && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: 12,
            }}>
              {vendors.map((v) => (
                <VendorCard key={v.id} v={v} />
              ))}
            </div>

            {vendors.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                No vendors found{search ? ` matching "${search}"` : activeSector ? ` in ${activeSector}` : ''}.
              </div>
            )}

            {/* Pagination */}
            {vendors.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, paddingBottom: 40,
              }}>
                {offset > 0 && (
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    style={{
                      padding: '8px 20px', borderRadius: 6, border: '1px solid #374151',
                      background: '#111827', color: '#9ca3af', fontWeight: 600, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    PREV
                  </button>
                )}
                <span style={{ padding: '8px 0', fontSize: 12, color: '#6b7280' }}>
                  {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
                </span>
                {offset + PAGE_SIZE < total && (
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    style={{
                      padding: '8px 20px', borderRadius: 6, border: '1px solid #374151',
                      background: '#111827', color: '#9ca3af', fontWeight: 600, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    NEXT
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
