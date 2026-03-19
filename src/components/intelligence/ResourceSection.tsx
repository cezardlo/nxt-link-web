import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ResourceSection({ title, subtitle, children }: Props) {
  return (
    <section
      style={{
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 4,
        padding: 12,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            color: '#00d4ff',
            fontSize: 10,
            letterSpacing: '0.12em',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          }}
        >
          {title.toUpperCase()}
        </div>
        {subtitle && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

