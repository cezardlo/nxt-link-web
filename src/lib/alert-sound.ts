// src/lib/alert-sound.ts — Synthetic alert tones via Web Audio API

const STORAGE_KEY = 'nxt-alert-sound';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browsers require user gesture first)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Check whether the user has alert sounds enabled.
 * Default: enabled.
 */
export function isAlertSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== 'disabled';
}

/**
 * Toggle alert sound on or off and persist the preference.
 */
export function setAlertSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'enabled' : 'disabled');
}

/**
 * Play a single beep at the given frequency for `durationMs` milliseconds.
 */
function beep(ctx: AudioContext, frequency: number, startTime: number, durationMs: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency;

  // Envelope: quick attack, sustain, quick release
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.35, startTime + 0.01);
  gain.gain.setValueAtTime(0.35, startTime + durationMs / 1000 - 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + durationMs / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + durationMs / 1000);
}

/**
 * Play an alert sound based on severity.
 * - P0: Three rapid beeps at 880 Hz (high urgency)
 * - P1: Single beep at 660 Hz
 *
 * Respects localStorage preference. No-op when disabled or on the server.
 */
export function playAlertSound(severity: 'P0' | 'P1'): void {
  if (typeof window === 'undefined') return;
  if (!isAlertSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (severity === 'P0') {
      // Three rapid beeps — 120ms each, 60ms gap
      beep(ctx, 880, now, 120);
      beep(ctx, 880, now + 0.18, 120);
      beep(ctx, 880, now + 0.36, 120);
    } else {
      // Single beep at 660 Hz, 200ms
      beep(ctx, 660, now, 200);
    }
  } catch (err) {
    console.warn('[alert-sound] Failed to play alert:', err);
  }
}
