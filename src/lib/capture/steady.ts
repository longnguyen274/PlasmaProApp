export type SteadySource = 'device_motion' | 'preview_frames';
export interface SteadySample { at: number; quiet: boolean | null; reason: string; source: SteadySource }
export const HOLD_MS = 3000;
export const MAX_SAMPLE_AGE = 800;
export interface HoldState { since: number | null; lastSampleAt: number | null; fired: boolean }
export const emptyHold = (): HoldState => ({ since: null, lastSampleAt: null, fired: false });

// Convenience shutter only. These exploratory thresholds do not validate measurement quality.
export function advanceHold(state: HoldState, sample: SteadySample | null, now: number, enabled: boolean) {
  if (state.fired) return { state, progress: 1, fire: false };
  const fresh = sample && now >= sample.at && now - sample.at <= MAX_SAMPLE_AGE;
  if (!enabled || !fresh || sample.quiet !== true) return { state: emptyHold(), progress: 0, fire: false };
  const gap = state.lastSampleAt !== null && sample.at - state.lastSampleAt > MAX_SAMPLE_AGE;
  const since = gap || state.since === null ? now : state.since;
  const progress = Math.min(1, Math.max(0, (now - since) / HOLD_MS));
  return { state: { since, lastSampleAt: sample.at, fired: progress === 1 }, progress, fire: progress === 1 };
}

export function phoneQuiet(acceleration: { x: number; y: number; z: number } | null, rotation: { alpha: number; beta: number; gamma: number } | null): boolean | null {
  if (!acceleration || !rotation) return null;
  const a = [acceleration.x, acceleration.y, acceleration.z], r = [rotation.alpha, rotation.beta, rotation.gamma];
  if (![...a, ...r].every(Number.isFinite)) return null;
  return Math.hypot(...a) < 0.22 && Math.hypot(...r) < 2.5;
}
export function frameQuiet(previous: Uint8ClampedArray | null, next: Uint8ClampedArray): boolean | null {
  if (!previous || previous.length !== next.length || next.length < 64) return null;
  let changed = 0, sum = 0;
  for (let i = 0; i < next.length; i += 4) {
    const difference = Math.abs((next[i] + next[i + 1] + next[i + 2] - previous[i] - previous[i + 1] - previous[i + 2]) / 3);
    sum += difference; changed += Number(difference > 15);
  }
  return sum / (next.length / 4) < 3 && changed / (next.length / 4) < 0.04;
}
