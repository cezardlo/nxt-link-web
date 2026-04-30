'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';

const categories = ['Robots', 'AI tools', 'Vision systems', 'Warehouse tech', 'IoT sensors', 'Factory software'];
const timelines = ['ASAP', '30 days', '60-90 days', 'Just exploring'];

function encodeMailto(category: string, problem: string, timeline: string, email: string) {
  const subject = `Find my Top 5 ${category} vendors`;
  const body = [
    'Hi NXT Link,',
    '',
    'I want help finding my Top 5 vendors.',
    '',
    `Category: ${category}`,
    `Problem: ${problem || 'Not filled yet'}`,
    `Timeline: ${timeline}`,
    `Contact email: ${email || 'Not filled yet'}`,
    '',
    'Please send me the vendor hunt path.',
  ].join('\n');

  return `mailto:hello@nxtlinktech.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function VendorHuntForm() {
  const [category, setCategory] = useState(categories[0]);
  const [problem, setProblem] = useState('');
  const [timeline, setTimeline] = useState(timelines[0]);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const mailto = useMemo(() => encodeMailto(category, problem, timeline, email), [category, problem, timeline, email]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    setError('');

    try {
      const response = await fetch('/api/vendor-hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, problem, timeline, email }),
      });

      if (!response.ok) throw new Error('Request failed');
      setSubmitted(true);
    } catch {
      setError('Could not save it yet. You can still send it by email.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitRequest} className="rounded-[2rem] bg-[#f6f1e8] p-5 text-[#101810] shadow-[0_35px_110px_rgba(0,0,0,0.28)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#65705f]">Pick your hunt</p>
      <h2 className="mt-3 font-serif text-4xl leading-none">Find my Top 5.</h2>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition ${
              category === item
                ? 'border-[#101810] bg-[#101810] text-[#f6f1e8]'
                : 'border-[#ded7c9] bg-white/60 text-[#101810] hover:bg-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <textarea
        value={problem}
        onChange={(event) => setProblem(event.target.value)}
        placeholder="What problem are you trying to fix?"
        className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-[#ded7c9] bg-white/70 px-4 py-3 text-sm outline-none placeholder:text-[#8b9285] focus:border-[#101810]"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.1fr]">
        <select
          value={timeline}
          onChange={(event) => setTimeline(event.target.value)}
          className="rounded-2xl border border-[#ded7c9] bg-white/70 px-4 py-3 text-sm font-semibold outline-none focus:border-[#101810]"
        >
          {timelines.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          placeholder="your@email.com"
          className="rounded-2xl border border-[#ded7c9] bg-white/70 px-4 py-3 text-sm outline-none placeholder:text-[#8b9285] focus:border-[#101810]"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#101810] px-5 py-3 text-sm font-semibold text-[#f6f1e8] transition hover:bg-[#233022] disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? 'Starting...' : 'Start the hunt'}
        <ArrowRight className="h-4 w-4" />
      </button>

      {submitted && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#dfe8d7] px-4 py-3 text-sm font-semibold text-[#101810]">
          <CheckCircle2 className="h-4 w-4" />
          Got it. We will review your hunt request.
        </div>
      )}

      {error && (
        <a href={mailto} className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#101810]">
          <Mail className="h-4 w-4" />
          {error}
        </a>
      )}
    </form>
  );
}
