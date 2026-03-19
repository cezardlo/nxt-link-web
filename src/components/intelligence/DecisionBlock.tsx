import type { DecisionPayload } from '@/lib/brain';

type Props = {
  data: DecisionPayload;
};

const COLOR = '#ff6600';

export function DecisionBlock({ data }: Props) {
  return (
    <section
      style={{
        background: '#0d0d0d',
        border: `1px solid ${COLOR}33`,
        borderLeft: `3px solid ${COLOR}`,
        borderRadius: 4,
        padding: 14,
      }}
    >
      <div
        style={{
          marginBottom: 6,
          color: COLOR,
          fontSize: 10,
          letterSpacing: '0.12em',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        }}
      >
        ONE THING TO DO TODAY
      </div>
      <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{data.headline}</div>
      <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, lineHeight: 1.45 }}>{data.detail}</div>
      {(data.timeline || data.trigger) && (
        <div
          style={{
            marginTop: 8,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 10,
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          }}
        >
          {[data.timeline, data.trigger].filter(Boolean).join('  |  ')}
        </div>
      )}
    </section>
  );
}

