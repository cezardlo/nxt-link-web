'use client';

import { useState, useRef, useEffect } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-scout',
  display: 'swap',
});

interface Msg { role: 'user' | 'assistant'; content: string }

const SCOUT_ICON = (
  <svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="14" r="4" stroke="currentColor" strokeWidth="1.8" /><circle cx="16" cy="14" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M12 14V10M8 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

// NXT//LINK Scout — premium brand chat (IBM Plex Sans + violet), wired to /api/chat.
export default function ChatWidget({ mode = 'public', locale = 'en' }: { mode?: 'public' | 'vendor'; locale?: 'en' | 'es' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const greeting = mode === 'vendor'
    ? (locale === 'es' ? 'Hola, soy Scout de NXT//LINK. Te ayudo a registrar tu empresa y a describir lo que ofreces. ¿En qué trabaja tu empresa?' : "Hi, I'm Scout from NXT//LINK. I can help you register your company and describe what you provide. What does your company do?")
    : (locale === 'es' ? 'Hola, soy Scout de NXT//LINK. ¿Qué necesita tu almacén?' : "Hi, I'm Scout from NXT//LINK. What does your warehouse need?");
  const starters = mode === 'vendor'
    ? (locale === 'es' ? ['¿Cómo registro mi empresa?', 'Sube un folleto', '¿Qué zonas cubren?'] : ['How do I register my company?', 'Upload a brochure', 'Which areas do you cover?'])
    : (locale === 'es' ? ['Necesito montacargas', 'Busco personal', 'No estoy seguro'] : ['I need forklift service', 'I need staffing', "I'm not sure yet"]);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: greeting }]);
  const [showStarters, setShowStarters] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, open]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    setShowStarters(false);
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
    <div className={`scout ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className={'sc-box' + (open ? ' open' : '')}>
        <div className="sc-head">
          <div className="sc-av-wrap"><span className="sc-av">{SCOUT_ICON}</span><span className="sc-dot" /></div>
          <div className="sc-titles"><div className="sc-title">NXT//LINK Scout</div><div className="sc-sub">{locale === 'es' ? 'AI · un humano da seguimiento' : 'AI · a human follows up'}</div></div>
          <button className="sc-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="sc-msgs" ref={scrollRef}>
          {messages.map((m, i) => m.role === 'user'
            ? <div key={i} className="sc-user">{m.content}</div>
            : <div key={i} className="sc-bot-wrap"><span className="sc-av sm">{SCOUT_ICON}</span><div className="sc-bot">{m.content}</div></div>)}
          {busy && <div className="sc-bot-wrap"><span className="sc-av sm">{SCOUT_ICON}</span><div className="sc-typing"><span /><span /><span /></div></div>}
          {showStarters && !busy && (
            <div className="sc-starters">{starters.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
          )}
        </div>
        <div className="sc-input">
          <input value={input} placeholder={locale === 'es' ? 'Pregúntame lo que sea…' : 'Ask me anything…'} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button onClick={() => send()} disabled={busy} aria-label="Send"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" /></svg></button>
        </div>
      </div>
      <button className={'sc-fab' + (open ? ' open' : '')} onClick={() => setOpen(!open)} aria-label="Open Scout chat">
        {open
          ? <svg viewBox="0 0 24 24" fill="#fff"><path d="M18 6 6 18M6 6l12 12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>
          : <svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="14" r="4" stroke="#fff" strokeWidth="1.9" /><circle cx="16" cy="14" r="4" stroke="#fff" strokeWidth="1.9" /><path d="M12 14V10M8 10h8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></svg>}
      </button>
    </div>
  );
}

const CSS = `
.scout{--bg:#F8F7FB;--bg2:#fff;--surf2:#EFEDF5;--ink:#141320;--ink2:#3B3A4A;--muted:#615F72;--muted2:#8A87A0;--line:#E2DFEC;--p:#6C5CE0;--p2:#4A3DB0;--pd:#4A3DB0;--pbg:rgba(108,92,224,.1);--green:#2F9E6A;
  font-family:var(--font-ibm-plex-sans-scout),'IBM Plex Sans',system-ui,sans-serif;}
.sc-fab{position:fixed;bottom:28px;right:28px;z-index:150;width:60px;height:60px;border-radius:50%;background:var(--p);border:none;cursor:pointer;box-shadow:0 4px 24px rgba(124,92,252,.45);display:flex;align-items:center;justify-content:center;transition:.3s;}
.sc-fab:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(124,92,252,.55);}
.sc-fab svg{width:26px;height:26px;}
.sc-box{position:fixed;bottom:100px;right:28px;z-index:150;width:370px;max-width:calc(100vw - 56px);height:480px;max-height:calc(100vh - 140px);background:var(--bg2);border:1px solid var(--line);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(12px) scale(.97);pointer-events:none;transition:opacity .2s,transform .2s;box-shadow:0 12px 40px rgba(20,19,32,.18);}
.sc-box.open{opacity:1;transform:none;pointer-events:auto;}
.sc-head{padding:15px 18px;background:linear-gradient(135deg,var(--p),var(--pd));display:flex;align-items:center;gap:12px;}
.sc-av-wrap{position:relative;}
.sc-av{width:30px;height:30px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;}
.sc-av svg{width:16px;height:16px;}
.sc-av.sm{width:28px;height:28px;background:var(--pbg);color:var(--p2);}
.sc-av.sm svg{width:14px;height:14px;}
.sc-dot{width:8px;height:8px;background:var(--green);border-radius:50%;position:absolute;bottom:0;right:0;border:2px solid var(--pd);}
.sc-titles{flex:1;min-width:0;}
.sc-title{font-size:15px;font-weight:600;color:#fff;}
.sc-sub{font-size:11px;color:rgba(255,255,255,.75);margin-top:1px;}
.sc-x{border:none;background:none;color:rgba(255,255,255,.85);cursor:pointer;font-size:14px;}
.sc-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--bg);}
.sc-msgs::-webkit-scrollbar{width:4px;}.sc-msgs::-webkit-scrollbar-thumb{background:var(--muted2);border-radius:2px;}
.sc-bot-wrap{display:flex;gap:8px;align-items:flex-start;align-self:flex-start;max-width:90%;}
.sc-bot,.sc-user{padding:11px 15px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;}
.sc-bot{background:var(--surf2);color:var(--ink);border-bottom-left-radius:4px;}
.sc-user{background:var(--p);color:#fff;align-self:flex-end;border-bottom-right-radius:4px;max-width:85%;}
.sc-typing{padding:12px 16px;background:var(--surf2);border-radius:14px;border-bottom-left-radius:4px;display:flex;gap:4px;}
.sc-typing span{width:6px;height:6px;background:var(--muted);border-radius:50%;animation:scTyp 1.2s infinite;}
.sc-typing span:nth-child(2){animation-delay:.2s;}.sc-typing span:nth-child(3){animation-delay:.4s;}
@keyframes scTyp{0%,100%{opacity:.3;transform:translateY(0);}50%{opacity:1;transform:translateY(-4px);}}
.sc-starters{display:flex;flex-direction:column;gap:7px;margin-top:4px;align-items:flex-start;}
.sc-starters button{background:var(--pbg);border:1px solid rgba(108,92,224,.25);color:var(--p2);font-family:inherit;font-size:13px;padding:8px 13px;border-radius:99px;cursor:pointer;transition:.15s;}
.sc-starters button:hover{background:rgba(108,92,224,.18);}
.sc-input{padding:12px 16px;border-top:1px solid var(--line);display:flex;gap:10px;background:var(--bg2);}
.sc-input input{flex:1;font-family:inherit;font-size:14px;padding:10px 14px;background:var(--bg);border:1px solid var(--line);border-radius:99px;color:var(--ink);outline:none;}
.sc-input input:focus{border-color:var(--p);}
.sc-input button{width:38px;height:38px;border-radius:50%;background:var(--p);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s;flex-shrink:0;}
.sc-input button:hover{background:var(--pd);}.sc-input button:disabled{opacity:.5;}
.sc-input button svg{width:18px;height:18px;}
@media(max-width:768px){.sc-box{bottom:88px;right:12px;width:320px;max-width:calc(100vw - 24px);height:440px;}.sc-fab{bottom:20px;right:20px;width:52px;height:52px;}}
`;
