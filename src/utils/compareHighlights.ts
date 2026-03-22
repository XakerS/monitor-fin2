import type { Monitor, Rating } from '../types';

const RATING_SCORE: Record<Rating, number> = {
  S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6,
};

function parseNumLoose(s: string): number | null {
  if (!s || s === '—' || s === '?') return null;
  const m = s.replace(/,/g, '.').match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  return parseFloat(m[0].replace(',', '.'));
}

function parsePercent(s: string): number | null {
  const n = parseNumLoose(s);
  return n != null && !Number.isNaN(n) ? n : null;
}

function parseContrast(s: string): number | null {
  const m = s.match(/(\d+)\s*[:：]\s*1/i) || s.match(/(\d+)\s*\/\s*1/i);
  if (m) return parseInt(m[1], 10);
  return parseNumLoose(s);
}

export type CompareRowId =
  | 'rating'
  | 'hz'
  | 'gtg80'
  | 'gtg100'
  | 'srgb'
  | 'adobe'
  | 'dciP3'
  | 'maxBrightness'
  | 'minBrightness'
  | 'contrast';

/** Индексы мониторов с лучшим значением в строке (может быть несколько при ничьей). */
export function bestIndicesForRow(
  monitors: Monitor[],
  rowId: CompareRowId,
): Set<number> | null {
  const n = monitors.length;
  if (n < 2) return null;

  const scores: (number | null)[] = monitors.map(() => null);
  let mode: 'min' | 'max' = 'max';

  switch (rowId) {
    case 'rating':
      for (let i = 0; i < n; i++) {
        scores[i] = RATING_SCORE[monitors[i].rating];
      }
      mode = 'min';
      break;
    case 'hz':
      for (let i = 0; i < n; i++) {
        const v = parseNumLoose(monitors[i].refreshRate);
        scores[i] = v != null && v > 0 ? v : null;
      }
      break;
    case 'gtg80':
    case 'gtg100': {
      const key = rowId === 'gtg80' ? 'gtg80' : 'gtg100';
      for (let i = 0; i < n; i++) {
        const v = parseNumLoose(monitors[i][key]);
        scores[i] = v != null && v > 0 ? v : null;
      }
      mode = 'min';
      break;
    }
    case 'srgb':
      for (let i = 0; i < n; i++) scores[i] = parsePercent(monitors[i].srgb);
      break;
    case 'adobe':
      for (let i = 0; i < n; i++) scores[i] = parsePercent(monitors[i].adobe);
      break;
    case 'dciP3':
      for (let i = 0; i < n; i++) scores[i] = parsePercent(monitors[i].dciP3);
      break;
    case 'maxBrightness':
      for (let i = 0; i < n; i++) scores[i] = parseNumLoose(monitors[i].maxBrightness);
      break;
    case 'minBrightness':
      for (let i = 0; i < n; i++) scores[i] = parseNumLoose(monitors[i].minBrightness);
      break;
    case 'contrast':
      for (let i = 0; i < n; i++) scores[i] = parseContrast(monitors[i].contrast);
      break;
    default:
      return null;
  }

  const valid = scores.map((s, i) => (s != null && !Number.isNaN(s) ? s : null));
  const usable = valid.filter((s): s is number => s != null);
  if (usable.length < 2) return null;

  const best =
    mode === 'min'
      ? Math.min(...usable)
      : Math.max(...usable);

  const out = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (valid[i] != null && valid[i] === best) out.add(i);
  }
  return out.size > 0 && out.size < n ? out : null;
}
