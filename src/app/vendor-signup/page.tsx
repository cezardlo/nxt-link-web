'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  'Transportation Management', 'Warehouse Management', 'Real-Time Visibility',
  'Telematics & ELD', 'Customs & Cross-Border', 'Yard & Dock',
  'Cold Chain & IoT', 'Pallets & Pooling', 'Forklifts & Material Handling',
  'Conveyors & Robotics', 'Vision, Sensors & Safety', 'Agentic AI Orchestration',
  'AI Freight Automation', 'Automated Storage & Retrieval', 'Supply Chain Planning'
];

export default function VendorSignupPage() {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', website: '',
    category: '', description: '', cross_border_ready: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: any) => setForm({ ...form, [key]: value });

  const handleSubmit = async () => {
    if (!form.company_name || !form.contact_name || !form.email || !form.category) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from('vendor_applications').insert(form);
      await supabase.from('leads').insert({
        name: form.contact_name, email: form.email, company: form.company_name,
        source: 'vendor_signup', category_interest: form.category,
        notes: `Vendor application: ${form.description}`
      });
      setDone(true);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#10B98122', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Application Received!</h1>
        <p style={{ color: '#9CA3AF', fontSize: 16, lineHeight: 1.6 }}>Thanks for applying. Our team will review your solution and reach out within 48 hours.</p>
        <a href="/" style={{ display: 'inline-block', marginTop: 24, padding: '12px 24px', background: '#7C5CFC', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>← Back to NXT//LINK</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#F3F4F6', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1A1A24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -1, textDecoration: 'none', color: '#F3F4F6' }}>
          NXT<span style={{ color: '#7C5CFC' }}>//</span>LINK
        </a>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7C5CFC', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>FOR TECHNOLOGY VENDORS</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>List Your Solution</h1>
          <p style={{ color: '#9CA3AF', fontSize: 16, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
            Join 197+ vendors in our catalog. Get matched with factories, warehouses, and logistics companies across the El Paso–Juárez Borderplex.
          </p>
        </div>

        {/* Form */}
        <div style={{ background: '#111118', border: '1px solid #2A2A35', borderRadius: 18, padding: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#D1D5DB' }}>Company Name <span style={{ color: '#7C5CFC' }}>*</span></label>
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 10, color: '#F3F4F6', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#D1D5DB' }}>Contact Name <span style={{ color: '#7C5CFC' }}>*</span></label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 10, color: '#F3F4F6', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#D1D5DB' }}>Email <span style={{ color: '#7C5CFC' }}>*</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 10, color: '#F3F4F6', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#D1D5DB' }}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 10, color: '#F3F4F6', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#D1D5DB' }}>Website</label>
              <input type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" style={{ width: '100%', padding: '10px 14px', background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 10, color: '#F3F4F6', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#D1D5DB' }}>Category <span style={{ color: '#7C5CFC' }}>*</span></label>
              <select value={form.category} onChange={e => set('category', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 10, color: '#F3F4F6', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#D1D5DB' }}>Describe Your Solution</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="What does your solution do? Who is it for?" style={{ width: '100%', padding: '10px 14px', background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 10, color: '#F3F4F6', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#D1D5DB', margin: '20px 0 24px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.cross_border_ready} onChange={e => set('cross_border_ready', e.target.checked)} style={{ accentColor: '#7C5CFC', width: 18, height: 18 }} />
            Cross-border ready (El Paso ↔ Juárez operations)
          </label>

          {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '14px', background: submitting ? '#4A3D8F' : '#7C5CFC', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', transition: '.2s' }}>
            {submitting ? 'Submitting...' : 'Submit Application →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, marginTop: 20 }}>
          We review all applications within 48 hours. Questions? Email <a href="mailto:contact@nxtlinktech.com" style={{ color: '#A78BFA' }}>contact@nxtlinktech.com</a>
        </p>
      </div>
    </div>
  );
}
