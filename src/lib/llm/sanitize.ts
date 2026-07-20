const INJECTION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bignore (all|any|previous|prior) instructions\b/gi, reason: 'ignore_instructions' },
  { pattern: /\bdisregard (all|any|previous|prior) instructions\b/gi, reason: 'disregard_instructions' },
  { pattern: /\bsystem prompt\b/gi, reason: 'system_prompt_reference' },
  { pattern: /\bdeveloper mode\b/gi, reason: 'developer_mode_reference' },
  { pattern: /\bact as\b/gi, reason: 'role_override_phrase' },
  { pattern: /\byou are chatgpt\b/gi, reason: 'model_identity_override' },
  { pattern: /<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, reason: 'embedded_script' },
  { pattern: /```[\s\S]*?```/g, reason: 'code_fence_block' },
];

type SanitizationSummary = {
  sanitized_text: string;
  risk_score: number;
  flags: string[];
  removed_chars: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sanitizeUntrustedLlmInput(rawText: string, maxChars = 15000): SanitizationSummary {
  const original = rawText || '';
  let sanitized = original
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const flags = new Set<string>();
  for (const { pattern, reason } of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      flags.add(reason);
      sanitized = sanitized.replace(pattern, ' [REDACTED] ');
    }
  }

  sanitized = sanitized.replace(/\s+/g, ' ').trim().slice(0, maxChars);
  const removedChars = Math.max(0, original.length - sanitized.length);
  const riskScore = Number(
    clamp(flags.size * 0.18 + (removedChars > 0 ? 0.08 : 0), 0, 1).toFixed(2),
  );

  return {
    sanitized_text: sanitized,
    risk_score: riskScore,
    flags: Array.from(flags),
    removed_chars: removedChars,
  };
}

export function boundedDataPrompt(label: string, content: string): string {
  return `${label} (UNTRUSTED DATA START)\n${content}\n${label} (UNTRUSTED DATA END)`;
}

