import * as XLSX from 'xlsx';
import { Monitor, Rating, ParseResult } from '../types';

const SPREADSHEET_ID = '1wTcNBG28l6VL7BXuO_vIlj0ncRNvrCEExy-iGrNFARU';
const GID = '1877328082';

/** Google Sheets export as .xlsx — сохраняет гиперссылки (напр. «Обзор» → URL), в отличие от CSV. */
const XLSX_EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&gid=${GID}`;

function extractResolutionCategory(res: string): string {
  const lower = res.toLowerCase().replace(/\s/g, '');
  if (lower.includes('3840') || lower.includes('uhd') || lower.includes('4k')) return 'UHD/4K';
  if (lower.includes('3440x1440') || lower.includes('wqhd') || lower.includes('uwqhd')) return 'UWQHD';
  if (lower.includes('2560x1440') || lower.includes('qhd')) return 'QHD';
  if (lower.includes('2560x1080') || lower.includes('wfhd') || lower.includes('uwfhd')) return 'UWFHD';
  if (lower.includes('5120') || lower.includes('5k')) return '5K';
  if (lower.includes('1920x1080') || lower.includes('fullhd') || lower.includes('fhd')) return 'FullHD';
  if (lower.includes('1920') && lower.includes('1080')) return 'FullHD';
  if (lower.includes('2560') && lower.includes('1440')) return 'QHD';
  return res.split('\n')[0].trim() || '?';
}

function isValidRating(r: string): r is Rating {
  return ['S', 'A', 'B', 'C', 'D', 'E', 'F'].includes(r.trim().toUpperCase());
}

function isHeaderOrSeparator(name: string, row: string[]): boolean {
  const n = name.toUpperCase();
  if (n === 'МАНИТОР' || n === 'МОНИТОР' || n === 'MONITOR') return true;
  if (/^(FULLHD|QHD|UHD|WFHD|WQHD|4K|5K)\s/i.test(n) && !(row[3] || '').trim()) return true;
  return false;
}

/** Оценка — справа налево первая ячейка S–F (колонка ≥ O). */
function findRatingColumn(row: string[]): number {
  if (row.length < 14) return -1;
  for (let c = row.length - 1; c >= 14; c--) {
    const v = (row[c] || '').trim().toUpperCase();
    if (!v) continue;
    if (isValidRating(v)) return c;
  }
  return -1;
}

/** Все HYPERLINK из формулы (в т.ч. локаль с «;»). */
function extractHyperlinksFromFormula(f: string | undefined): { url: string; label: string }[] {
  if (!f || !/HYPERLINK/i.test(f)) return [];
  const results: { url: string; label: string }[] = [];
  const seen = new Set<string>();

  const patterns = [
    /HYPERLINK\s*\(\s*"([^"]+)"\s*[,;]\s*"([^"]*)"\s*\)/gi,
    /HYPERLINK\s*\(\s*'([^']+)'\s*[,;]\s*'([^']*)'\s*\)/gi,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(f)) !== null) {
      const url = m[1].trim();
      if (url.startsWith('#') || !/^https?:\/\//i.test(url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      results.push({ url, label: m[2].trim() });
    }
  }

  const oneArg = /HYPERLINK\s*\(\s*"([^"]+)"\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = oneArg.exec(f)) !== null) {
    const url = m[1].trim();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    results.push({ url, label: '' });
  }

  return results;
}

function extractLinksFromCellHtml(h: string | undefined): { url: string; label: string }[] {
  if (!h) return [];
  const out: { url: string; label: string }[] = [];
  const re = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(h)) !== null) {
    out.push({
      url: m[1].trim(),
      label: m[2].replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

/**
 * Текст ячейки + гиперссылка из XLSX + HYPERLINK() из формулы + теги <a> из HTML.
 * Нужно, чтобы в комментарии оказались все URL (в т.ч. несколько «Обзор»).
 */
function getCellTextWithHyperlink(ws: XLSX.WorkSheet, r: number, c: number): string {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr] as {
    w?: string;
    v?: unknown;
    l?: { Target?: string };
    f?: string;
    h?: string;
  } | undefined;
  if (!cell) return '';

  let text = '';
  if (cell.w != null && String(cell.w).trim()) text = String(cell.w).trim();
  else if (cell.v != null) text = String(cell.v).trim();

  const link = typeof cell.l?.Target === 'string' ? cell.l.Target.trim() : '';

  let base = '';
  if (!link) {
    base = text;
  } else if (!text || text === link) {
    base = link;
  } else if (text.includes(link)) {
    base = text;
  } else {
    base = `${text} ${link}`;
  }

  for (const { url, label } of extractLinksFromCellHtml(cell.h)) {
    if (!url || base.includes(url)) continue;
    const lab = label || 'Обзор';
    if (lab && base.endsWith(lab)) base = `${base} ${url}`;
    else base = `${base} ${lab} ${url}`.trim();
  }

  for (const { url, label } of extractHyperlinksFromFormula(cell.f)) {
    if (!url || base.includes(url)) continue;
    const lab = label.trim();
    if (lab && base.endsWith(lab)) base = `${base} ${url}`;
    else if (lab) base = `${base} ${lab} ${url}`.trim();
    else base = `${base} ${url}`.trim();
  }

  return base.trim();
}

function sheetToRows(ws: XLSX.WorkSheet): string[][] {
  const ref = ws['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    const maxC = range.e.c;
    for (let c = 0; c <= maxC; c++) {
      row.push(getCellTextWithHyperlink(ws, r, c));
    }
    rows.push(row);
  }
  return rows;
}

async function fetchWorksheet(): Promise<{ ws: XLSX.WorkSheet | null; error?: string }> {
  const urls = [
    XLSX_EXPORT_URL,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(XLSX_EXPORT_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(XLSX_EXPORT_URL)}`,
  ];

  let lastErr = '';
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        lastErr = `${response.status}`;
        continue;
      }
      const buf = await response.arrayBuffer();
      if (buf.byteLength < 500) {
        lastErr = 'пустой ответ';
        continue;
      }
      const wb = XLSX.read(buf, { type: 'array', cellDates: false, cellFormula: true });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        lastErr = 'нет листов';
        continue;
      }
      const ws = wb.Sheets[sheetName];
      if (!ws || !ws['!ref']) {
        lastErr = 'лист не найден';
        continue;
      }
      return { ws };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return { ws: null, error: lastErr || 'сеть' };
}

export async function fetchMonitors(): Promise<ParseResult> {
  const errors: string[] = [];
  const monitors: Monitor[] = [];

  const { ws, error: fetchErr } = await fetchWorksheet();
  if (!ws) {
    return {
      monitors: [],
      errors: [
        'Не удалось загрузить таблицу (.xlsx). Проверьте интернет и доступность Google Sheets.',
        fetchErr ? `Детали: ${fetchErr}` : '',
      ].filter(Boolean),
      lastMonitor: '',
      lastParsedSheetRow: 0,
      lastRowNameInSheet: '',
      lastRowSheetRow: 0,
      timestamp: new Date(),
      totalRows: 0,
    };
  }

  const rows = sheetToRows(ws);

  if (rows.length < 2) {
    return {
      monitors: [],
      errors: ['Таблица пуста или имеет неверный формат.'],
      lastMonitor: '',
      lastParsedSheetRow: 0,
      lastRowNameInSheet: '',
      lastRowSheetRow: 0,
      timestamp: new Date(),
      totalRows: 0,
    };
  }

  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const joined = row.join(' ').toLowerCase();
    if (joined.includes('манитор') || joined.includes('монитор') || joined.includes('разрешение')) {
      headerIndex = i;
      break;
    }
  }

  const dataRows = rows.slice(headerIndex + 1);

  /** Последняя строка таблицы с непустым названием в колонке A (1-based номер строки в файле). */
  let lastRowNameInSheet = '';
  let lastRowSheetRow = 0;
  for (let i = dataRows.length - 1; i >= 0; i--) {
    const name = (dataRows[i][0] || '').trim();
    if (!name) continue;
    if (isHeaderOrSeparator(name, dataRows[i])) continue;
    lastRowNameInSheet = name;
    lastRowSheetRow = headerIndex + i + 2;
    break;
  }

  let lastValidMonitor = '';
  let lastParsedSheetRow = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    try {
      const name = (row[0] || '').trim();
      if (!name) continue;
      if (isHeaderOrSeparator(name, row)) continue;

      const resolution = (row[1] || '').trim();
      const ratingCol = findRatingColumn(row);
      const ratingRaw = ratingCol >= 0 ? (row[ratingCol] || '').trim().toUpperCase() : '';

      let rating = '';
      if (ratingCol >= 0) {
        const val = (row[ratingCol] || '').trim().toUpperCase();
        if (isValidRating(val)) rating = val;
      }

      if (!rating) {
        if (resolution && name.length > 2) {
          errors.push(`Строка ${headerIndex + i + 2}: «${name}» — оценка не найдена (значение: "${ratingRaw}")`);
        }
        continue;
      }

      const comment = ratingCol > 0 ? (row[ratingCol - 1] || '').trim() : '';

      const monitor: Monitor = {
        name,
        resolution: resolution.replace(/\n/g, ' '),
        resolutionCategory: extractResolutionCategory(resolution),
        diagonal: (row[2] || '').trim(),
        panel: (row[3] || '').trim(),
        matrixType: (row[4] || '').trim(),
        refreshRate: (row[5] || '').trim(),
        contrast: (row[6] || '').trim(),
        gtg80: (row[7] || '').trim(),
        gtg100: (row[8] || '').trim(),
        overdrive: (row[9] || '').trim(),
        srgb: (row[10] || '').trim(),
        adobe: (row[11] || '').trim(),
        dciP3: (row[12] || '').trim(),
        minBrightness: (row[13] || '').trim(),
        maxBrightness: (row[14] || '').trim(),
        comment,
        rating: rating as Rating,
        rowIndex: headerIndex + i + 2,
      };

      monitors.push(monitor);
      lastValidMonitor = name;
      lastParsedSheetRow = monitor.rowIndex;
    } catch (e) {
      errors.push(`Строка ${headerIndex + i + 2}: ошибка парсинга — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    monitors,
    errors,
    lastMonitor: lastValidMonitor,
    lastParsedSheetRow,
    lastRowNameInSheet: lastRowNameInSheet || lastValidMonitor,
    lastRowSheetRow: lastRowSheetRow || lastParsedSheetRow,
    timestamp: new Date(),
    totalRows: dataRows.length,
  };
}
