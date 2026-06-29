'use client';

import { useState, useRef, useEffect } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string }

export default function ChatWidget({ mode = 'public', locale = 'en' }: { mode?: 'public' | 'vendor'; locale?: 'en' | 'es' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const greeting = mode === 'vendor'
    ? (locale === 'es' ? 'Hola, soy el asistente de NXT//LINK. Te ayudo a registrar tu empresa y a describir lo que ofreces. ¿En qué trabajas?' : "Hi, I'm the NXT//LINK assistant. I can help you register your company and describe what you provide. What does your company do?")
    : (locale === 'es' ? 'Hola, soy el asistente de NXT//LINK. ¿Qué necesita tu almacén?' : "Hi, I'm the NXT//LINK assistant. What does your warehouse need?");
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: greeting }]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next); setInput(''); setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, mode, locale }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || '…' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: locale === 'es' ? 'Lo siento, hubo un problema. Intenta de nuevo.' : 'Sorry, something went wrong. Please try again.' }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="cw">
      <style>{CSS}</style>
      {open && (
        <div className="cw-panel">
          <div className="cw-head">
            <span className="cw-mk"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h12" /><path d="m13 8 4 4-4 4" /></svg></span>
            <div><b>NXT//LINK Assistant</b><small>{locale === 'es' ? 'AI · un humano da seguimiento' : 'AI · a human follows up'}</small></div>
            <button className="cw-x" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="cw-body" ref={scrollRef}>
            {messages.map((m, i) => <div key={i} className={'cw-msg ' + m.role}>{m.content}</div>)}
            {busy && <div className="cw-msg assistant cw-typing"><span /><span /><span /></div>}
          </div>
          <div className="cw-input">
            <input value={input} placeholder={locale === 'es' ? 'Escribe un mensaje…' : 'Type a message…'} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button onClick={send} disabled={busy}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
            </button>
          </div>
        </div>
      )}
      <button className="cw-fab" onClick={() => setOpen(!open)} aria-label="Open assistant">
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )}
      </button>
    </div>
  );
}

const CSS = `
.cw{--brand:#2563EB;--brand-2:#1D4ED8;--ink:#0F172A;--ink-2:#475569;--line:#E2E8F0;position:fixed;right:22px;bottom:22px;z-index:60;font-family:Inter,system-ui,sans-serif;}
.cw-fab{width:56px;height:56px;border-radius:50%;border:none;background:var(--brand);color:#fff;cursor:pointer;box-shadow:0 12px 28px -8px rgba(37,99,235,.6);display:grid;place-items:center;margin-left:auto;}
.cw-fab:hover{background:var(--brand-2);}
.cw-panel{width:min(380px,calc(100vw - 32px));height:min(560px,70vh);background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 30px 60px -20px rgba(15,23,42,.35);display:flex;flex-direction:column;overflow:hidden;margin-bottom:14px;}
.cw-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line);}
.cw-mk{width:30px;height:30px;border-radius:8px;background:var(--brand);display:grid;place-items:center;flex:none;}
.cw-head b{display:block;font:700 14px/1.2 Inter;color:var(--ink);}
.cw-head small{color:var(--ink-2);font-size:11px;}
.cw-x{margin-left:auto;border:none;background:none;color:var(--ink-2);cursor:pointer;font-size:14px;}
.cw-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#F8FAFC;}
.cw-msg{max-width:84%;padding:10px 13px;border-radius:14px;font:400 14px/1.5 Inter;white-space:pre-wrap;}
.cw-msg.assistant{background:#fff;border:1px solid var(--line);color:var(--ink);align-self:flex-start;border-bottom-left-radius:4px;}
.cw-msg.user{background:var(--brand);color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}
.cw-typing{display:flex;gap:4px;align-items:center;}
.cw-typing span{width:6px;height:6px;border-radius:50%;background:var(--ink-2);opacity:.4;animation:cwb 1s infinite;}
.cw-typing span:nth-child(2){animation-delay:.15s;}.cw-typing span:nth-child(3){animation-delay:.3s;}
@keyframes cwb{0%,60%,100%{opacity:.25;}30%{opacity:.9;}}
.cw-input{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line);background:#fff;}
.cw-input input{flex:1;padding:10px 13px;border:1px solid #CBD5E1;border-radius:10px;font:400 14px Inter;outline:none;}
.cw-input input:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(37,99,235,.15);}
.cw-input button{border:none;background:var(--brand);color:#fff;width:40px;border-radius:10px;cursor:pointer;display:grid;place-items:center;}
.cw-input button:hover{background:var(--brand-2);}.cw-input button:disabled{opacity:.5;}
`;
