/** Извлечение ссылок из текста комментария + очистка для отображения. */

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

/** Подпись перед конкретным URL — сегмент текста с прошлого URL до начала этого. */
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

/**
 * Все уникальные http(s) ссылки по порядку появления.
 * Подписи: «Обзор», нумерованные пункты, текст перед «—» и т.д.
 */
export function extractLinks(text: string): { label: string; url: string }[] {
  if (!text || !text.trim()) return [];
  const links: { label: string; url: string }[] = [];
  const seen = new Set<string>();

  const urlRegex = /https?:\/\/[^\s<>\u00a0]+/gi;
  let match: RegExpExecArray | null;
  let prevEnd = 0;
  let linkIndex = 0;

  while ((match = urlRegex.exec(text)) !== null) {
    const raw = match[0];
    let url = trimUrlTrailingJunk(raw);
    if (!/^https?:\/\//i.test(url)) continue;

    const segment = text.slice(prevEnd, match.index);
    let label = extractLabelFromSegment(segment);

    if (!label) {
      const before = text.slice(Math.max(0, match.index - 100), match.index);
      const obzorOnly = before.match(/(?:^|[\s,;•\n])(Обзор(?:\s*\d+)?)\s*[-–—:]*\s*$/i);
      if (obzorOnly) label = obzorOnly[1].trim();
    }

    if (!label) {
      linkIndex += 1;
      label = `Ссылка ${linkIndex}`;
    }

    if (!seen.has(url)) {
      seen.add(url);
      links.push({ label, url });
    }
    prevEnd = match.index + raw.length;
  }

  return links;
}

export function cleanComment(text: string): string {
  return text
    .replace(/https?:\/\/[^\s<>\u00a0]+/gi, '')
    .replace(/\d+\)\s*[-–—:]?\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
