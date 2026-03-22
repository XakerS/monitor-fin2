/** Разбор комментария: текст + встроенные ссылки (как в таблице). */

export type CommentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; label: string; url: string };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function trimUrlTrailingJunk(url: string): string {
  let u = url.trim();
  u = u.replace(/[.,;:'»]+$/u, '');
  for (let k = 0; k < 8 && u.length > 0; k++) {
    const last = u[u.length - 1];
    const opens = (u.match(/\(/g) || []).length;
    const closes = (u.match(/\)/g) || []).length;
    if (last === ')' && closes > opens) u = u.slice(0, -1);
    else if (/^[)\]"'»]$/.test(last)) u = u.slice(0, -1);
    else break;
  }
  return u;
}

/** Подпись перед конкретным URL — фрагмент текста от прошлого URL до начала этого. */
function extractLabelFromSegment(segment: string): string {
  const t = segment.replace(/\s+$/u, '');
  if (!t) return '';
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] ?? '';

  const obzor = last.match(/(?:^|[\s,;•·])\s*(Обзор(?:\s*\d+)?)\s*[-–—:]*\s*$/i);
  if (obzor) return obzor[1].trim();

  const num = last.match(
    /(?:^|[\s,;])(\d+\))\s*[«"]?([А-Яа-яёЁA-Za-z0-9\s.+:]+?)[»"]?\s*[-–—:]*\s*$/,
  );
  if (num) return num[2].trim();

  const dash = last.match(
    /([А-Яа-яёЁA-Za-z][А-Яа-яёЁA-Za-z0-9\s.+]{0,46}?)\s*[-–—]\s*$/,
  );
  if (dash) return dash[1].trim();

  const tailWords = last.split(/\s+/).slice(-4).join(' ');
  if (tailWords.length >= 2 && tailWords.length <= 42) return tailWords;

  return '';
}

/** Убираем подпись с конца сегмента (чтобы не дублировать её рядом со ссылкой). */
function stripTrailingLabel(segment: string, label: string): string {
  const L = label.trim();
  if (!L) return segment;
  try {
    const re = new RegExp(`${escapeRegExp(L)}\\s*$`, 'iu');
    return segment.replace(re, '').replace(/\s+$/u, '');
  } catch {
    return segment;
  }
}

/**
 * Комментарий → чередование текста и ссылок (все URL по порядку, без слияния дубликатов).
 * Текст ссылки — как в таблице («Обзор» и т.д.), URL не показываем в тексте.
 */
export function parseCommentSegments(text: string): CommentSegment[] {
  if (!text?.trim()) return [];

  const segments: CommentSegment[] = [];
  const urlRegex = /https?:\/\/[^\s<>\u00a0]+/gi;
  let match: RegExpExecArray | null;
  let prevEnd = 0;

  while ((match = urlRegex.exec(text)) !== null) {
    const raw = match[0];
    const url = trimUrlTrailingJunk(raw);
    if (!/^https?:\/\//i.test(url)) {
      prevEnd = match.index + raw.length;
      continue;
    }

    const segmentBefore = text.slice(prevEnd, match.index);
    let label = extractLabelFromSegment(segmentBefore);

    if (!label) {
      const before = text.slice(Math.max(0, match.index - 140), match.index);
      const obzorOnly = before.match(/(?:^|[\s,;•\n])(Обзор(?:\s*\d+)?)\s*[-–—:]*\s*$/i);
      if (obzorOnly) label = obzorOnly[1].trim();
    }

    if (!label) label = 'Обзор';

    const plainBefore = stripTrailingLabel(segmentBefore, label);
    if (plainBefore) segments.push({ kind: 'text', text: plainBefore });

    segments.push({ kind: 'link', label, url });
    prevEnd = match.index + raw.length;
  }

  const rest = text.slice(prevEnd);
  if (rest) segments.push({ kind: 'text', text: rest });

  if (segments.length === 0) return [{ kind: 'text', text: text }];
  return segments;
}

export function extractLinks(text: string): { label: string; url: string }[] {
  return parseCommentSegments(text)
    .filter((s): s is { kind: 'link'; label: string; url: string } => s.kind === 'link')
    .map((s) => ({ label: s.label, url: s.url }));
}

export function cleanComment(text: string): string {
  return text
    .replace(/https?:\/\/[^\s<>\u00a0]+/gi, '')
    .replace(/\d+\)\s*[-–—:]?\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
