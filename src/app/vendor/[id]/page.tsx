'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, ArrowLeft, Building2, Package, Radio, Calendar } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { PageTransition } from '@/components/PageTransition';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Vendor {
  ID: number;
  company_name: string;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  sector: string | null;
  hq_country: string | null;
  hq_city: string | null;
  iker_score: number | null;
  tags: string[] | null;
  funding_stage: string | null;
  employee_count_range: string | null;
  industries: string[] | null;
  credibility_score: number | null;
}

interface Product {
  id: string;
  product_name: string;
  company: string | null;
  category: string | null;
  description: string | null;
  maturity: string | null;
  price_range: string | null;
  use_cases: string[] | null;
  deployment: string | null;
}

interface Signal {
  id: string;
  title: string;
  signal_type: string | null;
  industry: string | null;
  importance_score: number | null;
  discovered_at: string;
  source: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CompanyLogo({ url, name }: { url: string | null; name: string }) {
  const [err, setErr] = useState(false);
  const domain = url ? (() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return null; } })() : null;
  const initials = name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

  if (domain && !err) {
    return (
      <img src={`https://logo.clearbit.com/${domain}`} alt={name} width={72} height={72}
        className="w-18 h-18 rounded-2xl object-contain"
        style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.06)', padding: 8 }}
        onError={() => setErr(true)} />
    );
  }
  return (
    <div className="rounded-2xl flex items-center justify-center text-xl font-bold"
      style={{ width: 72, height: 72, background: 'rgba(14,165,233,0.12)', color: '#0EA5E9' }}>
      {initials}
    </div>
  );
}

function scoreColor(s: number | null) {
  if (!s) return '#6B7280';
  if (s >= 85) return '#10B981';
  if (s >= 65) return '#F59E0B';
  return '#6B7280';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

const SIGNAL_TYPE_COLOR: Record<string, string> = {
  technology: '#0EA5E9', product_launch: '#F97316', funding_round: '#8B5CF6',
  contract_award: '#10B981', patent_filing: '#06B6D4', market_shift: '#F59E0B',
  partnership: '#EC4899',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex gap-4">
        <div className="w-18 h-18 rounded-2xl bg-white/[0.06]" style={{ width: 72, height: 72 }} />
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-white/[0.06] rounded w-1/2" />
          <div className="h-4 bg-white/[0.04] rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-white/[0.04] rounded" />
        <div className="h-4 bg-white/[0.04] rounded w-5/6" />
        <div className="h-4 bg-white/[0.04] rounded w-4/6" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadVendor();
  }, [id]);

  async function loadVendor() {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setNotFound(true);
        return;
      }

      const supabase = createClient();

      // Cards link by the text `id` column (e.g. UUID or short hex hash),
      // but legacy/external links sometimes carry the numeric "ID". Query
      // by text id first; if that misses and the URL looks numeric, fall
      // back to the bigint column.
      const SELECT = '"ID", id, company_name, company_url, description, primary_category, sector, hq_country, hq_city, iker_score, tags, funding_stage, employee_count_range, industries, credibility_score';
      let { data: vendorData } = await supabase
        .from('vendors')
        .select(SELECT)
        .eq('id', id)
        .maybeSingle();

      if (!vendorData && /^\d+$/.test(id)) {
        const r = await supabase
          .from('vendors')
          .select(SELECT)
          .eq('"ID"', Number(id))
          .maybeSingle();
        vendorData = r.data;
      }

      if (!vendorData) {
        setNotFound(true);
        return;
      }

      setVendor(vendorData as Vendor);

      // Load products for this company
      const { data: productData } = await supabase
        .from('products')
        .select('id, product_name, company, category, description, maturity, price_range, use_cases, deployment')
        .ilike('company', `%${vendorData.company_name}%`)
        .limit(12);

      setProducts(productData ?? []);

      // Load signals mentioning this company
      const { data: signalData } = await supabase
        .from('intel_signals')
        .select('id, title, signal_type, industry, importance_score, discovered_at, source')
        .ilike('company', `%${vendorData.company_name}%`)
        .not('source', 'ilike', '%arxiv%')
        .order('discovered_at', { ascending: false })
        .limit(8);

      setSignals(signalData ?? []);
    } catch (err) {
      console.error('[vendor detail] error:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div style={{ background: '#07090A', minHeight: '100vh', color: '#D4D8DC' }}>
          <Skeleton />
        </div>
      </PageTransition>
    );
  }

  if (notFound || !vendor) {
    return (
      <PageTransition>
        <div style={{ background: '#07090A', minHeight: '100vh', color: '#D4D8DC' }} className="flex flex-col items-center justify-center gap-4 p-8">
          <Building2 className="w-12 h-12 text-[#4A5568]" />
          <p className="text-[#4A5568]">Company not found</p>
          <Link href="/vendors" className="text-[#0EA5E9] text-sm hover:underline">← Back to all companies</Link>
        </div>
      </PageTransition>
    );
  }

  const score = vendor.iker_score;
  const sc = scoreColor(score);

  return (
    <PageTransition>
      <div style={{ background: '#07090A', minHeight: '100vh', color: '#D4D8DC' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-20">

          {/* Back */}
          <Link href="/vendors" className="inline-flex items-center gap-1.5 text-[#4A5568] hover:text-[#0EA5E9] text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All companies
          </Link>

          {/* ── Company Header ── */}
          <div className="rounded-2xl border border-white/[0.08] p-6 mb-6" style={{ background: '#0D1117' }}>
            <div className="flex items-start gap-4">
              <CompanyLogo url={vendor.company_url} name={vendor.company_name} />
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white mb-1">{vendor.company_name}</h1>
                <div className="flex flex-wrap gap-2 mb-3">
                  {vendor.sector && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">{vendor.sector}</span>
                  )}
                  {vendor.primary_category && vendor.primary_category !== vendor.sector && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.05] text-[#6B7280]">{vendor.primary_category}</span>
                  )}
                  {(vendor.hq_city || vendor.hq_country) && (
                    <span className="text-xs text-[#4A5568]">📍 {vendor.hq_city ? `${vendor.hq_city}, ` : ''}{vendor.hq_country}</span>
                  )}
                  {vendor.employee_count_range && (
                    <span className="text-xs text-[#4A5568]">👥 {vendor.employee_count_range}</span>
                  )}
                  {vendor.funding_stage && (
                    <span className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-[#6B7280]">{vendor.funding_stage}</span>
                  )}
                </div>
                {vendor.description && (
                  <p className="text-sm leading-6 text-[#9CA3AF]">{vendor.description}</p>
                )}
              </div>
              {/* Score */}
              <div className="shrink-0 text-center">
                <div className="text-3xl font-mono font-bold" style={{ color: sc }}>{score ?? '—'}</div>
                <div className="text-[9px] font-mono text-[#4A5568] tracking-widest mt-0.5">IKER SCORE</div>
              </div>
            </div>

            {/* Tags */}
            {vendor.tags && vendor.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-white/[0.05]">
                {vendor.tags.slice(0, 8).map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-[#6B7280]">{t}</span>
                ))}
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex gap-3 mt-5">
              {vendor.company_url && (
                <a href={vendor.company_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{ background: '#0EA5E9' }}>
                  Visit Website <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {vendor.company_url && (
                <a href={`mailto:info@${vendor.company_url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[#0EA5E9] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/40 transition-colors">
                  Contact
                </a>
              )}
            </div>
          </div>

          {/* ── Products ── */}
          {products.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-[#0EA5E9]" />
                <h2 className="text-sm font-semibold text-white">Products & Solutions</h2>
                <span className="text-xs text-[#4A5568]">{products.length} found</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map(p => (
                  <div key={p.id} className="rounded-xl border border-white/[0.06] p-4 hover:border-white/[0.1] transition-colors" style={{ background: '#0D1117' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{p.product_name}</div>
                        {p.category && <div className="text-[10px] text-[#0EA5E9]/70 mt-0.5">{p.category}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {p.maturity && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: p.maturity === 'mature' ? '#10B98115' : p.maturity === 'growing' ? '#0EA5E915' : '#8B5CF615',
                              color: p.maturity === 'mature' ? '#10B981' : p.maturity === 'growing' ? '#0EA5E9' : '#8B5CF6',
                            }}>
                            {p.maturity.toUpperCase()}
                          </span>
                        )}
                        {p.price_range && <span className="text-[10px] text-[#4A5568]">{p.price_range}</span>}
                      </div>
                    </div>
                    {p.description && <p className="text-[11px] leading-5 text-[#6B7280] line-clamp-2">{p.description}</p>}
                    {p.use_cases && p.use_cases.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.use_cases.slice(0, 3).map(u => (
                          <span key={u} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-[#4A5568]">{u}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Latest Signals ── */}
          {signals.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-4 h-4 text-[#0EA5E9]" />
                <h2 className="text-sm font-semibold text-white">Latest Intelligence</h2>
                <span className="text-xs text-[#4A5568]">Recent signals about this company</span>
              </div>
              <div className="space-y-2">
                {signals.map(s => {
                  const typeColor = SIGNAL_TYPE_COLOR[s.signal_type ?? ''] ?? '#6B7280';
                  return (
                    <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.05] hover:border-white/[0.1] transition-colors" style={{ background: '#0D1117' }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: typeColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 leading-5">{s.title}</p>
                        <div className="flex gap-3 mt-1">
                          {s.signal_type && (
                            <span className="text-[10px] font-mono" style={{ color: typeColor }}>{s.signal_type.replace(/_/g, ' ').toUpperCase()}</span>
                          )}
                          {s.industry && <span className="text-[10px] text-[#4A5568]">{s.industry}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#4A5568] shrink-0">{timeAgo(s.discovered_at)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── No products or signals fallback ── */}
          {products.length === 0 && signals.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] p-8 text-center" style={{ background: '#0D1117' }}>
              <p className="text-[#4A5568] text-sm">No product or signal data yet for this company.</p>
              {vendor.company_url && (
                <a href={vendor.company_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-[#0EA5E9] text-sm hover:underline">
                  Visit their website <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* ── Footer meta ── */}
          <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[10px] text-[#4A5568] font-mono">COMPANY ID: {vendor.ID}</span>
            <Link href="/vendors" className="text-[10px] text-[#4A5568] hover:text-[#0EA5E9] transition-colors">
              ← All companies
            </Link>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
