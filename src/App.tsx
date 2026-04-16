import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommentInline } from './components/CommentInline';
import { fetchMonitors } from './services/sheetsParser';
import { Monitor, ParseResult, Rating, RATING_CONFIG } from './types';
import { bestIndicesForRow, type CompareRowId } from './utils/compareHighlights';
import { ozonSearchUrl, wildberriesSearchUrl, yandexMarketSearchUrl } from './utils/marketplaceUrls';

type ThemeMode = 'dark' | 'light';

type AppTheme = {
  mode: ThemeMode;
  pageBackground: string;
  headerBackground: string;
  headerBorder: string;
  surface: string;
  surfaceSoft: string;
  surfaceStrong: string;
  border: string;
  subtleBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentSoftStrong: string;
  accentBorder: string;
  success: string;
  warning: string;
  danger: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  specBackground: string;
  specLabel: string;
  specValue: string;
  buttonSubtleBackground: string;
  buttonSubtleBorder: string;
  buttonSubtleText: string;
  comparePanelBackground: string;
  comparePanelHeader: string;
  comparePanelBorder: string;
  compareStickyBackground: string;
  compareHeaderBackground: string;
  compareCellBackground: string;
  compareCellBorder: string;
  compareHighlightBackground: string;
  compareHighlightBorder: string;
  compareHighlightText: string;
  link: string;
  linkUnderline: string;
  skeletonCard: string;
  skeletonStrong: string;
  skeletonSoft: string;
  emptyIcon: string;
};

type RatingTone = {
  border: string;
  cardBg: string;
};

type BadgeTone = {
  bg: string;
  text: string;
  border: string;
};

const THEME_STORAGE_KEY = 'monitor-finder-theme';

const ratingOrder: Record<Rating, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };

const themes: Record<ThemeMode, AppTheme> = {
  dark: {
    mode: 'dark',
    pageBackground: 'linear-gradient(135deg, #030712, #0f172a, #020617)',
    headerBackground: 'rgba(0,0,0,0.62)',
    headerBorder: 'rgba(255,255,255,0.08)',
    surface: 'rgba(17,24,39,0.6)',
    surfaceSoft: 'rgba(17,24,39,0.4)',
    surfaceStrong: 'rgba(15,23,42,0.86)',
    border: 'rgba(255,255,255,0.08)',
    subtleBorder: 'rgba(255,255,255,0.05)',
    textPrimary: '#f8fafc',
    textSecondary: '#d1d5db',
    textMuted: '#6b7280',
    accent: '#22d3ee',
    accentSoft: 'rgba(6,182,212,0.1)',
    accentSoftStrong: 'rgba(6,182,212,0.15)',
    accentBorder: 'rgba(6,182,212,0.25)',
    success: '#34d399',
    warning: '#facc15',
    danger: '#f87171',
    inputBackground: 'rgba(0,0,0,0.3)',
    inputBorder: 'rgba(255,255,255,0.1)',
    inputText: '#ffffff',
    specBackground: 'rgba(0,0,0,0.25)',
    specLabel: '#6b7280',
    specValue: '#e5e7eb',
    buttonSubtleBackground: 'rgba(0,0,0,0.25)',
    buttonSubtleBorder: 'rgba(255,255,255,0.15)',
    buttonSubtleText: '#9ca3af',
    comparePanelBackground: 'linear-gradient(180deg, rgba(15,23,42,0.99) 0%, rgba(3,7,18,0.98) 100%)',
    comparePanelHeader: 'linear-gradient(90deg, rgba(6,182,212,0.08), transparent 40%)',
    comparePanelBorder: 'rgba(6,182,212,0.45)',
    compareStickyBackground: '#030712',
    compareHeaderBackground: 'rgba(17,24,39,0.85)',
    compareCellBackground: 'rgba(15,23,42,0.5)',
    compareCellBorder: 'rgba(255,255,255,0.04)',
    compareHighlightBackground: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(16,185,129,0.08))',
    compareHighlightBorder: 'rgba(34,211,238,0.35)',
    compareHighlightText: '#2dd4bf',
    link: '#22d3ee',
    linkUnderline: 'rgba(34,211,238,0.45)',
    skeletonCard: 'rgba(17,24,39,0.4)',
    skeletonStrong: 'rgba(75,85,99,0.3)',
    skeletonSoft: 'rgba(75,85,99,0.18)',
    emptyIcon: '#9ca3af',
  },
  light: {
    mode: 'light',
    pageBackground: 'linear-gradient(135deg, #f8fafc, #eef4ff 50%, #f7fbff)',
    headerBackground: 'rgba(255,255,255,0.82)',
    headerBorder: 'rgba(148,163,184,0.22)',
    surface: 'rgba(255,255,255,0.9)',
    surfaceSoft: 'rgba(255,255,255,0.78)',
    surfaceStrong: 'rgba(255,255,255,0.95)',
    border: 'rgba(148,163,184,0.24)',
    subtleBorder: 'rgba(148,163,184,0.16)',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    accent: '#0891b2',
    accentSoft: 'rgba(8,145,178,0.09)',
    accentSoftStrong: 'rgba(8,145,178,0.14)',
    accentBorder: 'rgba(8,145,178,0.24)',
    success: '#059669',
    warning: '#b45309',
    danger: '#dc2626',
    inputBackground: 'rgba(248,250,252,0.96)',
    inputBorder: 'rgba(148,163,184,0.28)',
    inputText: '#0f172a',
    specBackground: 'rgba(241,245,249,0.95)',
    specLabel: '#64748b',
    specValue: '#0f172a',
    buttonSubtleBackground: 'rgba(241,245,249,0.9)',
    buttonSubtleBorder: 'rgba(148,163,184,0.3)',
    buttonSubtleText: '#475569',
    comparePanelBackground: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.98) 100%)',
    comparePanelHeader: 'linear-gradient(90deg, rgba(8,145,178,0.08), transparent 40%)',
    comparePanelBorder: 'rgba(8,145,178,0.34)',
    compareStickyBackground: '#f8fafc',
    compareHeaderBackground: 'rgba(255,255,255,0.94)',
    compareCellBackground: 'rgba(248,250,252,0.94)',
    compareCellBorder: 'rgba(148,163,184,0.12)',
    compareHighlightBackground: 'linear-gradient(135deg, rgba(8,145,178,0.12), rgba(16,185,129,0.08))',
    compareHighlightBorder: 'rgba(8,145,178,0.28)',
    compareHighlightText: '#0f766e',
    link: '#0f766e',
    linkUnderline: 'rgba(15,118,110,0.35)',
    skeletonCard: 'rgba(255,255,255,0.8)',
    skeletonStrong: 'rgba(148,163,184,0.32)',
    skeletonSoft: 'rgba(148,163,184,0.18)',
    emptyIcon: '#94a3b8',
  },
};

const ratingTones: Record<ThemeMode, Record<Rating, RatingTone>> = {
  dark: {
    S: { border: '#d97706', cardBg: 'rgba(120,53,15,0.25)' },
    A: { border: '#10b981', cardBg: 'rgba(6,78,59,0.2)' },
    B: { border: '#06b6d4', cardBg: 'rgba(8,51,68,0.2)' },
    C: { border: '#4b5563', cardBg: 'rgba(31,41,55,0.3)' },
    D: { border: '#ca8a04', cardBg: 'rgba(113,63,18,0.15)' },
    E: { border: '#374151', cardBg: 'rgba(31,41,55,0.2)' },
    F: { border: '#dc2626', cardBg: 'rgba(127,29,29,0.15)' },
  },
  light: {
    S: { border: '#b45309', cardBg: 'rgba(245,158,11,0.12)' },
    A: { border: '#059669', cardBg: 'rgba(16,185,129,0.11)' },
    B: { border: '#0284c7', cardBg: 'rgba(14,165,233,0.1)' },
    C: { border: '#64748b', cardBg: 'rgba(148,163,184,0.14)' },
    D: { border: '#a16207', cardBg: 'rgba(234,179,8,0.13)' },
    E: { border: '#64748b', cardBg: 'rgba(203,213,225,0.4)' },
    F: { border: '#dc2626', cardBg: 'rgba(239,68,68,0.1)' },
  },
};

const colorBadgeTones: Record<ThemeMode, Record<'srgb' | 'dciP3' | 'adobe' | 'brightness', BadgeTone>> = {
  dark: {
    srgb: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd', border: 'rgba(59,130,246,0.25)' },
    dciP3: { bg: 'rgba(168,85,247,0.15)', text: '#c4b5fd', border: 'rgba(168,85,247,0.25)' },
    adobe: { bg: 'rgba(249,115,22,0.15)', text: '#fdba74', border: 'rgba(249,115,22,0.25)' },
    brightness: { bg: 'rgba(234,179,8,0.15)', text: '#fde68a', border: 'rgba(234,179,8,0.25)' },
  },
  light: {
    srgb: { bg: 'rgba(59,130,246,0.12)', text: '#1d4ed8', border: 'rgba(59,130,246,0.22)' },
    dciP3: { bg: 'rgba(139,92,246,0.12)', text: '#7c3aed', border: 'rgba(139,92,246,0.22)' },
    adobe: { bg: 'rgba(249,115,22,0.12)', text: '#c2410c', border: 'rgba(249,115,22,0.22)' },
    brightness: { bg: 'rgba(234,179,8,0.16)', text: '#a16207', border: 'rgba(234,179,8,0.24)' },
  },
};

const externalLinkTones: Record<ThemeMode, Record<'telegram' | 'youtube', BadgeTone>> = {
  dark: {
    telegram: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
    youtube: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', border: 'rgba(239,68,68,0.2)' },
  },
  light: {
    telegram: { bg: 'rgba(59,130,246,0.1)', text: '#1d4ed8', border: 'rgba(59,130,246,0.24)' },
    youtube: { bg: 'rgba(239,68,68,0.1)', text: '#b91c1c', border: 'rgba(239,68,68,0.24)' },
  },
};

const marketplaceTones: Record<ThemeMode, Record<'ozon' | 'wildberries' | 'market', BadgeTone>> = {
  dark: {
    ozon: { bg: 'linear-gradient(180deg, rgba(37,99,235,0.35), rgba(29,78,216,0.25))', text: '#dbeafe', border: 'rgba(59,130,246,0.5)' },
    wildberries: { bg: 'linear-gradient(180deg, rgba(126,34,206,0.4), rgba(88,28,135,0.3))', text: '#f3e8ff', border: 'rgba(168,85,247,0.45)' },
    market: { bg: 'linear-gradient(180deg, rgba(202,138,4,0.35), rgba(161,98,7,0.28))', text: '#fef9c3', border: 'rgba(234,179,8,0.45)' },
  },
  light: {
    ozon: { bg: 'linear-gradient(180deg, rgba(59,130,246,0.16), rgba(37,99,235,0.12))', text: '#1d4ed8', border: 'rgba(59,130,246,0.28)' },
    wildberries: { bg: 'linear-gradient(180deg, rgba(168,85,247,0.14), rgba(126,34,206,0.11))', text: '#7c3aed', border: 'rgba(168,85,247,0.28)' },
    market: { bg: 'linear-gradient(180deg, rgba(234,179,8,0.18), rgba(202,138,4,0.12))', text: '#92400e', border: 'rgba(234,179,8,0.3)' },
  },
};

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

function SpecItem({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: AppTheme;
}) {
  return (
    <div
      style={{
        background: theme.specBackground,
        borderRadius: '8px',
        padding: '6px 10px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          color: theme.specLabel,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '13px',
          color: theme.specValue,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function ColorBadge({
  label,
  value,
  bg,
  textColor,
  borderColor,
}: {
  label: string;
  value: string;
  bg: string;
  textColor: string;
  borderColor: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '10px',
        fontWeight: 600,
        background: bg,
        color: textColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      {label}: {value}
    </span>
  );
}

function MonitorCard({
  monitor,
  compareActive,
  onToggleCompare,
  theme,
}: {
  monitor: Monitor;
  compareActive: boolean;
  onToggleCompare: () => void;
  theme: AppTheme;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RATING_CONFIG[monitor.rating];
  const tones = ratingTones[theme.mode][monitor.rating];
  const badges = colorBadgeTones[theme.mode];
  const marketplaces = marketplaceTones[theme.mode];

  return (
    <div
      style={{
        borderRadius: '12px',
        border: `2px solid ${tones.border}`,
        background: tones.cardBg,
        transition: 'transform 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
        boxShadow: theme.mode === 'light' ? '0 12px 30px rgba(15,23,42,0.06)' : 'none',
      }}
    >
      <div style={{ padding: '16px 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <h3
            style={{
              color: theme.textPrimary,
              fontWeight: 600,
              fontSize: '14px',
              lineHeight: '1.4',
              flex: 1,
              whiteSpace: 'pre-line',
            }}
          >
            {monitor.name}
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                border: `1px solid ${tones.border}`,
                background: tones.cardBg,
                color: tones.border,
              }}
            >
              {cfg.emoji} {monitor.rating}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare();
              }}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 600,
                borderRadius: '6px',
                border: compareActive ? `1px solid ${theme.accent}` : `1px solid ${theme.buttonSubtleBorder}`,
                background: compareActive ? theme.accentSoftStrong : theme.buttonSubtleBackground,
                color: compareActive ? theme.accent : theme.buttonSubtleText,
                cursor: 'pointer',
              }}
            >
              {compareActive ? '✓ В сравнении' : '⚖ Сравнить'}
            </button>
          </div>
        </div>

        <p
          style={{
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '12px',
            color: tones.border,
          }}
        >
          {cfg.label}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
          <SpecItem label="Разрешение" value={monitor.resolutionCategory} theme={theme} />
          <SpecItem label="Диагональ" value={monitor.diagonal ? `${monitor.diagonal}"` : '—'} theme={theme} />
          <SpecItem label="Матрица" value={monitor.matrixType || '—'} theme={theme} />
          <SpecItem label="Частота" value={monitor.refreshRate ? `${monitor.refreshRate} Гц` : '—'} theme={theme} />
          <SpecItem label="Контраст" value={monitor.contrast || '—'} theme={theme} />
          <SpecItem label="GtG 80%" value={monitor.gtg80 || '—'} theme={theme} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
          {monitor.srgb && monitor.srgb !== '?' && (
            <ColorBadge
              label="sRGB"
              value={monitor.srgb}
              bg={badges.srgb.bg}
              textColor={badges.srgb.text}
              borderColor={badges.srgb.border}
            />
          )}
          {monitor.dciP3 && monitor.dciP3 !== '?' && (
            <ColorBadge
              label="DCI-P3"
              value={monitor.dciP3}
              bg={badges.dciP3.bg}
              textColor={badges.dciP3.text}
              borderColor={badges.dciP3.border}
            />
          )}
          {monitor.adobe && monitor.adobe !== '?' && (
            <ColorBadge
              label="Adobe"
              value={monitor.adobe}
              bg={badges.adobe.bg}
              textColor={badges.adobe.text}
              borderColor={badges.adobe.border}
            />
          )}
          {monitor.maxBrightness && monitor.maxBrightness !== '?' && (
            <ColorBadge
              label="Ярк."
              value={`${monitor.maxBrightness} нит`}
              bg={badges.brightness.bg}
              textColor={badges.brightness.text}
              borderColor={badges.brightness.border}
            />
          )}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${theme.subtleBorder}` }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          style={{
            width: '100%',
            padding: '8px 16px',
            fontSize: '12px',
            color: theme.textMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span>{expanded ? 'Скрыть подробности' : 'Подробнее'}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div
            style={{
              padding: '0 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            {monitor.panel && (
              <div>
                <span style={{ color: theme.textMuted }}>Панель: </span>
                <span style={{ color: theme.textSecondary, whiteSpace: 'pre-line' }}>{monitor.panel}</span>
              </div>
            )}
            {monitor.overdrive && monitor.overdrive !== '?' && (
              <div>
                <span style={{ color: theme.textMuted }}>Overdrive: </span>
                <span style={{ color: theme.textSecondary }}>{monitor.overdrive}</span>
              </div>
            )}
            {monitor.gtg100 && monitor.gtg100 !== '?' && (
              <div>
                <span style={{ color: theme.textMuted }}>GtG 100%: </span>
                <span style={{ color: theme.textSecondary }}>{monitor.gtg100}</span>
              </div>
            )}
            {monitor.minBrightness && monitor.minBrightness !== '?' && (
              <div>
                <span style={{ color: theme.textMuted }}>Мин. яркость: </span>
                <span style={{ color: theme.textSecondary }}>~{monitor.minBrightness} нит</span>
              </div>
            )}
            {monitor.comment.trim() && (
              <div>
                <span style={{ color: theme.textMuted }}>Комментарий: </span>
                <CommentInline text={monitor.comment} html={monitor.commentHtml} theme={theme} />
              </div>
            )}

            <div
              style={{
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: `1px solid ${theme.subtleBorder}`,
              }}
            >
              <span
                style={{
                  color: theme.textMuted,
                  fontSize: '11px',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Поиск по названию
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <a
                  href={ozonSearchUrl(monitor.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: marketplaces.ozon.bg,
                    color: marketplaces.ozon.text,
                    border: `1px solid ${marketplaces.ozon.border}`,
                    textDecoration: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Найти на Ozon
                </a>
                <a
                  href={wildberriesSearchUrl(monitor.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: marketplaces.wildberries.bg,
                    color: marketplaces.wildberries.text,
                    border: `1px solid ${marketplaces.wildberries.border}`,
                    textDecoration: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Найти на Wildberries
                </a>
                <a
                  href={yandexMarketSearchUrl(monitor.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: marketplaces.market.bg,
                    color: marketplaces.market.text,
                    border: `1px solid ${marketplaces.market.border}`,
                    textDecoration: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Найти на Я.Маркет
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  theme: AppTheme;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: theme.textMuted,
          marginBottom: '4px',
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: theme.inputBackground,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: '8px',
          color: theme.inputText,
          fontSize: '13px',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ComparePanel({
  monitors,
  onClear,
  collapsed,
  onToggleCollapsed,
  theme,
}: {
  monitors: Monitor[];
  onClear: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  theme: AppTheme;
}) {
  if (monitors.length < 2) return null;

  const rowDefs: { label: string; rowId: CompareRowId | null; values: string[] }[] = [
    {
      label: 'Оценка',
      rowId: 'rating',
      values: monitors.map((monitor) => `${RATING_CONFIG[monitor.rating].emoji} ${monitor.rating}`),
    },
    { label: 'Класс разрешения', rowId: null, values: monitors.map((monitor) => monitor.resolutionCategory) },
    { label: 'Разрешение', rowId: null, values: monitors.map((monitor) => monitor.resolution) },
    { label: 'Диагональ', rowId: null, values: monitors.map((monitor) => (monitor.diagonal ? `${monitor.diagonal}"` : '—')) },
    { label: 'Панель', rowId: null, values: monitors.map((monitor) => monitor.panel || '—') },
    { label: 'Матрица', rowId: null, values: monitors.map((monitor) => monitor.matrixType || '—') },
    { label: 'Частота', rowId: 'hz', values: monitors.map((monitor) => (monitor.refreshRate ? `${monitor.refreshRate} Гц` : '—')) },
    { label: 'Контраст', rowId: 'contrast', values: monitors.map((monitor) => monitor.contrast || '—') },
    { label: 'GtG 80%', rowId: 'gtg80', values: monitors.map((monitor) => monitor.gtg80 || '—') },
    { label: 'GtG 100%', rowId: 'gtg100', values: monitors.map((monitor) => monitor.gtg100 || '—') },
    { label: 'Overdrive', rowId: null, values: monitors.map((monitor) => monitor.overdrive || '—') },
    { label: 'sRGB', rowId: 'srgb', values: monitors.map((monitor) => monitor.srgb || '—') },
    { label: 'Adobe RGB', rowId: 'adobe', values: monitors.map((monitor) => monitor.adobe || '—') },
    { label: 'DCI-P3', rowId: 'dciP3', values: monitors.map((monitor) => monitor.dciP3 || '—') },
    { label: 'Яркость мин.', rowId: 'minBrightness', values: monitors.map((monitor) => monitor.minBrightness || '—') },
    { label: 'Яркость макс.', rowId: 'maxBrightness', values: monitors.map((monitor) => monitor.maxBrightness || '—') },
  ];

  const highlightSets = useMemo(() => {
    const map = new Map<string, Set<number>>();
    const pairs: { label: string; rowId: CompareRowId }[] = [
      { label: 'Оценка', rowId: 'rating' },
      { label: 'Частота', rowId: 'hz' },
      { label: 'Контраст', rowId: 'contrast' },
      { label: 'GtG 80%', rowId: 'gtg80' },
      { label: 'GtG 100%', rowId: 'gtg100' },
      { label: 'sRGB', rowId: 'srgb' },
      { label: 'Adobe RGB', rowId: 'adobe' },
      { label: 'DCI-P3', rowId: 'dciP3' },
      { label: 'Яркость мин.', rowId: 'minBrightness' },
      { label: 'Яркость макс.', rowId: 'maxBrightness' },
    ];

    for (const { label, rowId } of pairs) {
      const best = bestIndicesForRow(monitors, rowId);
      if (best) map.set(label, best);
    }

    return map;
  }, [monitors]);

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 100,
        bottom: collapsed ? '16px' : 0,
        right: collapsed ? '16px' : 0,
        left: collapsed ? 'auto' : 0,
        width: collapsed ? 'min(320px, calc(100vw - 32px))' : '100%',
        maxHeight: collapsed ? 'none' : 'min(72vh, 580px)',
        background: theme.comparePanelBackground,
        border: collapsed ? `1px solid ${theme.comparePanelBorder}` : undefined,
        borderTop: collapsed ? undefined : `1px solid ${theme.comparePanelBorder}`,
        borderRadius: collapsed ? '16px' : 0,
        boxShadow:
          theme.mode === 'dark'
            ? collapsed
              ? '0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(6,182,212,0.12)'
              : '0 -12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(6,182,212,0.12)'
            : collapsed
              ? '0 12px 28px rgba(15,23,42,0.14), 0 0 0 1px rgba(148,163,184,0.14)'
              : '0 -12px 40px rgba(15,23,42,0.12), 0 0 0 1px rgba(148,163,184,0.14)',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '14px 18px',
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
          background: theme.comparePanelHeader,
        }}
      >
        <div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary, letterSpacing: '-0.02em' }}>
            Сравнение
          </span>
          <span style={{ fontSize: '13px', color: theme.textMuted, marginLeft: '8px' }}>{monitors.length} моделей</span>
          {!collapsed && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: theme.textMuted }}>
              Подсветка: лучшее значение в строке (оценка S→F, Гц и % выше, GtG ниже)
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Развернуть панель сравнения' : 'Свернуть панель сравнения'}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
            style={{
              width: '36px',
              height: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              border: `1px solid ${theme.buttonSubtleBorder}`,
              background: theme.buttonSubtleBackground,
              color: theme.textSecondary,
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            {collapsed ? '↗' : '▾'}
          </button>
          <button
            type="button"
            onClick={onClear}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '10px',
              border: `1px solid ${theme.mode === 'dark' ? 'rgba(239,68,68,0.4)' : 'rgba(220,38,38,0.24)'}`,
              background: theme.mode === 'dark' ? 'rgba(239,68,68,0.12)' : 'rgba(254,226,226,0.9)',
              color: theme.mode === 'dark' ? '#fca5a5' : '#b91c1c',
              cursor: 'pointer',
            }}
          >
            Очистить
          </button>
        </div>
      </div>

      {collapsed ? (
        <div
          style={{
            padding: '0 18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '12px', color: theme.textMuted }}>В сравнении сейчас:</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {monitors.map((monitor) => (
              <span
                key={monitor.rowIndex}
                style={{
                  fontSize: '12px',
                  lineHeight: 1.35,
                  color: theme.textSecondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {monitor.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ overflow: 'auto', padding: '14px 16px 24px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '12px',
            minWidth: `${Math.max(520, monitors.length * 168)}px`,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  background: theme.compareStickyBackground,
                  textAlign: 'left',
                  padding: '12px 12px',
                  color: theme.textMuted,
                  fontWeight: 600,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderBottom: `1px solid ${theme.border}`,
                  minWidth: '128px',
                  verticalAlign: 'bottom',
                }}
              >
                Параметр
              </th>
              {monitors.map((monitor) => {
                const tones = ratingTones[theme.mode][monitor.rating];
                return (
                  <th
                    key={monitor.rowIndex}
                    style={{
                      padding: '12px 12px',
                      fontWeight: 700,
                      borderBottom: `1px solid ${theme.border}`,
                      verticalAlign: 'bottom',
                      maxWidth: '220px',
                      borderLeft: `3px solid ${tones.border}`,
                      background: theme.compareHeaderBackground,
                      borderRadius: '10px 10px 0 0',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        lineHeight: 1.35,
                        whiteSpace: 'pre-line',
                        color: theme.textPrimary,
                        fontSize: '12px',
                      }}
                    >
                      {monitor.name}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: tones.border,
                      }}
                    >
                      {RATING_CONFIG[monitor.rating].emoji} {RATING_CONFIG[monitor.rating].label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rowDefs.map((row) => {
              const best = highlightSets.get(row.label);
              return (
                <tr key={row.label}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      background: theme.compareStickyBackground,
                      color: theme.textMuted,
                      padding: '10px 12px',
                      borderBottom: `1px solid ${theme.subtleBorder}`,
                      fontWeight: 600,
                      fontSize: '11px',
                    }}
                  >
                    {row.label}
                  </td>
                  {row.values.map((value, index) => {
                    const isBest = best?.has(index);
                    return (
                      <td
                        key={`${row.label}-${index}`}
                        style={{
                          color: theme.textSecondary,
                          padding: '10px 12px',
                          borderBottom: `1px solid ${theme.subtleBorder}`,
                          verticalAlign: 'top',
                          whiteSpace: 'pre-line',
                          background: isBest ? theme.compareHighlightBackground : theme.compareCellBackground,
                          boxShadow: isBest ? `inset 0 0 0 1px ${theme.compareHighlightBorder}` : 'none',
                          borderLeft: index === 0 ? undefined : `1px solid ${theme.compareCellBorder}`,
                        }}
                      >
                        {isBest && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginRight: '6px',
                              fontSize: '10px',
                              color: theme.compareHighlightText,
                              fontWeight: 700,
                            }}
                          >
                            ★
                          </span>
                        )}
                        {value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme);
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [resFilter, setResFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('recommended');
  const [matrixFilter, setMatrixFilter] = useState('all');
  const [diagonalFilter, setDiagonalFilter] = useState('all');
  const [refreshFilter, setRefreshFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [showErrors, setShowErrors] = useState(false);
  const [showLastMonitor, setShowLastMonitor] = useState(false);
  const [compareRowIndices, setCompareRowIndices] = useState<number[]>([]);
  const [compareCollapsed, setCompareCollapsed] = useState(false);

  const theme = themes[themeMode];
  const socialLinks = externalLinkTones[themeMode];

  const toggleCompare = useCallback((rowIndex: number) => {
    setCompareRowIndices((prev) => {
      if (prev.includes(rowIndex)) return prev.filter((row) => row !== rowIndex);
      if (prev.length >= 4) return prev;
      return [...prev, rowIndex];
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMonitors();
      setData(result);
      setCompareRowIndices([]);
      setCompareCollapsed(false);

      if (result.monitors.length === 0 && result.errors.length > 0) {
        setError(result.errors[0]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Неизвестная ошибка загрузки');
      setData({
        monitors: [],
        errors: ['Критическая ошибка при загрузке данных'],
        lastMonitor: '',
        lastParsedSheetRow: 0,
        lastRowNameInSheet: '',
        lastRowSheetRow: 0,
        timestamp: new Date(),
        totalRows: 0,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const filterOptions = useMemo(() => {
    if (!data) {
      return { resolutions: [] as string[], diagonals: [] as string[], matrices: [] as string[] };
    }

    const resolutions = [...new Set(data.monitors.map((monitor) => monitor.resolutionCategory))].filter(Boolean).sort();
    const diagonals = [...new Set(data.monitors.map((monitor) => monitor.diagonal))]
      .filter(Boolean)
      .sort((a, b) => parseFloat(a) - parseFloat(b));
    const matrices = [...new Set(data.monitors.map((monitor) => {
      const matrixType = (monitor.matrixType || '').split('\n')[0].trim().toUpperCase();
      if (matrixType.includes('IPS')) return 'IPS';
      if (matrixType.includes('VA')) return 'VA';
      if (matrixType.includes('TN')) return 'TN';
      if (matrixType.includes('OLED')) return 'OLED';
      return matrixType;
    }))]
      .filter((value) => value && value !== '?' && value !== '—')
      .sort();

    return { resolutions, diagonals, matrices };
  }, [data]);

  const filteredMonitors = useMemo(() => {
    if (!data) return [];

    let result = [...data.monitors];

    if (search) {
      const query = search.toLowerCase();
      result = result.filter((monitor) =>
        monitor.name.toLowerCase().includes(query) ||
        monitor.panel.toLowerCase().includes(query) ||
        monitor.comment.toLowerCase().includes(query) ||
        monitor.matrixType.toLowerCase().includes(query),
      );
    }

    if (resFilter !== 'all') {
      result = result.filter((monitor) => monitor.resolutionCategory === resFilter);
    }

    if (ratingFilter === 'recommended') {
      result = result.filter((monitor) => ['S', 'A', 'B'].includes(monitor.rating));
    } else if (ratingFilter !== 'all') {
      result = result.filter((monitor) => monitor.rating === ratingFilter);
    }

    if (matrixFilter !== 'all') {
      result = result.filter((monitor) => (monitor.matrixType || '').toUpperCase().includes(matrixFilter));
    }

    if (diagonalFilter !== 'all') {
      result = result.filter((monitor) => monitor.diagonal === diagonalFilter);
    }

    if (refreshFilter !== 'all') {
      result = result.filter((monitor) => {
        const hz = parseInt(monitor.refreshRate, 10);
        if (Number.isNaN(hz)) return refreshFilter === 'unknown';

        switch (refreshFilter) {
          case '60-75':
            return hz >= 60 && hz <= 75;
          case '144':
            return hz >= 100 && hz <= 144;
          case '165-180':
            return hz >= 165 && hz <= 180;
          case '200-280':
            return hz >= 200 && hz <= 280;
          case '300+':
            return hz >= 300;
          default:
            return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return ratingOrder[a.rating] - ratingOrder[b.rating];
        case 'refresh':
          return (parseInt(b.refreshRate, 10) || 0) - (parseInt(a.refreshRate, 10) || 0);
        case 'diagonal':
          return (parseFloat(a.diagonal) || 0) - (parseFloat(b.diagonal) || 0);
        case 'name':
          return a.name.localeCompare(b.name, 'ru');
        default:
          return 0;
      }
    });

    return result;
  }, [data, diagonalFilter, matrixFilter, ratingFilter, refreshFilter, resFilter, search, sortBy]);

  const compareMonitors = useMemo(() => {
    if (!data) return [];
    const byRow = new Map(data.monitors.map((monitor) => [monitor.rowIndex, monitor]));
    return compareRowIndices.map((rowIndex) => byRow.get(rowIndex)).filter((monitor): monitor is Monitor => monitor != null);
  }, [compareRowIndices, data]);

  useEffect(() => {
    if (compareMonitors.length < 2) {
      setCompareCollapsed(false);
    }
  }, [compareMonitors.length]);

  const ratingCounts = useMemo(() => {
    if (!data) return {} as Record<Rating, number>;
    const counts: Record<string, number> = {};
    for (const monitor of data.monitors) {
      counts[monitor.rating] = (counts[monitor.rating] || 0) + 1;
    }
    return counts as Record<Rating, number>;
  }, [data]);

  const themeButtonLabel = themeMode === 'dark' ? '☀ Светлая тема' : '🌙 Темная тема';

  return (
    <div style={{ minHeight: '100vh', background: theme.pageBackground }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderBottom: `1px solid ${theme.headerBorder}`,
          background: theme.headerBackground,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: theme.textPrimary, margin: 0 }}>
                🖥️ Гайд по мониторам
              </h1>
              <p style={{ fontSize: '14px', color: theme.textMuted, margin: '2px 0 0' }}>
                by <span style={{ color: theme.accent, fontWeight: 600 }}>Гоша</span>, <span style={{ color: theme.accent, fontWeight: 600 }}>djun</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                aria-label={themeButtonLabel}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: theme.accentSoft,
                  color: theme.accent,
                  border: `1px solid ${theme.accentBorder}`,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {themeButtonLabel}
              </button>
              <a
                href="https://t.me/djun1"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: socialLinks.telegram.bg,
                  color: socialLinks.telegram.text,
                  border: `1px solid ${socialLinks.telegram.border}`,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                ✈️ Telegram
              </a>
              <a
                href="https://www.youtube.com/@djunn"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: socialLinks.youtube.bg,
                  color: socialLinks.youtube.text,
                  border: `1px solid ${socialLinks.youtube.border}`,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                ▶️ YouTube
              </a>
            </div>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px 16px',
          paddingBottom: compareMonitors.length >= 2 && !compareCollapsed ? 'min(35vh, 280px)' : '24px',
        }}
      >
        <div
          style={{
            marginBottom: '24px',
            background: theme.surface,
            borderRadius: '12px',
            border: `1px solid ${theme.border}`,
            padding: '16px',
            boxShadow: theme.mode === 'light' ? '0 16px 36px rgba(15,23,42,0.06)' : 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: theme.warning }}>
                  ⏳ Загрузка таблицы (XLSX)…
                </div>
              ) : error ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: theme.danger }}>
                  ❌ {error}
                </div>
              ) : data && data.errors.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: theme.success }}>
                  ✅ Данные загружены
                </div>
              ) : data && data.errors.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowErrors((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: theme.mode === 'dark' ? '#fb923c' : '#c2410c',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ⚠️ Загружено, ошибок: <span style={{ color: theme.danger, fontWeight: 700 }}>{data.errors.length}</span>
                </button>
              ) : null}

              {data && !loading && (
                <div style={{ fontSize: '13px', color: theme.textMuted }}>
                  Мониторов: <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{data.monitors.length}</span>
                </div>
              )}

              {data && !loading && (
                <div style={{ fontSize: '13px', color: theme.textMuted }}>
                  Обновлено: <span style={{ color: theme.textSecondary }}>{data.timestamp.toLocaleString('ru-RU')}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: theme.accentSoft,
                color: theme.accent,
                border: `1px solid ${theme.accentBorder}`,
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              🔄 Обновить из таблицы
            </button>
          </div>

          {data && !loading && (data.lastRowNameInSheet || data.lastMonitor) && (
            <div style={{ marginTop: '12px', borderTop: `1px solid ${theme.subtleBorder}`, paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowLastMonitor((prev) => !prev)}
                style={{
                  fontSize: '12px',
                  color: theme.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span
                  style={{
                    transition: 'transform 0.2s',
                    transform: showLastMonitor ? 'rotate(90deg)' : 'none',
                    display: 'inline-block',
                  }}
                >
                  ▶
                </span>
                Проверить актуальность: последняя строка в таблице
              </button>

              {showLastMonitor && (
                <div
                  style={{
                    marginTop: '8px',
                    paddingLeft: '16px',
                    borderLeft: `2px solid ${theme.accentBorder}`,
                    fontSize: '13px',
                    color: theme.textSecondary,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div>
                    <span style={{ color: theme.textMuted, display: 'block', marginBottom: '4px' }}>
                      Нижняя строка с названием (колонка A)
                    </span>
                    <strong style={{ color: theme.accent }}>{data.lastRowNameInSheet || '—'}</strong>
                    {data.lastRowSheetRow > 0 && (
                      <span style={{ color: theme.textMuted, marginLeft: '8px' }}>— строка {data.lastRowSheetRow}</span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: theme.textMuted, display: 'block', marginBottom: '4px' }}>
                      Последний успешно распарсенный (с оценкой)
                    </span>
                    <strong style={{ color: theme.mode === 'dark' ? '#a5f3fc' : '#0f766e' }}>{data.lastMonitor || '—'}</strong>
                    {data.lastParsedSheetRow > 0 && (
                      <span style={{ color: theme.textMuted, marginLeft: '8px' }}>— строка {data.lastParsedSheetRow}</span>
                    )}
                  </div>
                  {data.totalRows > 0 && (
                    <div style={{ fontSize: '12px', color: theme.textMuted }}>Строк данных под заголовком: {data.totalRows}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {showErrors && data && data.errors.length > 0 && (
            <div style={{ marginTop: '12px', borderTop: `1px solid ${theme.subtleBorder}`, paddingTop: '12px' }}>
              <div
                style={{
                  background: theme.mode === 'dark' ? 'rgba(239,68,68,0.05)' : 'rgba(254,242,242,0.95)',
                  border: `1px solid ${theme.mode === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.18)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                <p style={{ fontSize: '12px', color: theme.danger, fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>
                  Ошибки парсинга:
                </p>
                {data.errors.map((message, index) => (
                  <p
                    key={index}
                    style={{
                      fontSize: '11px',
                      color: theme.mode === 'dark' ? 'rgba(252,165,165,0.78)' : '#b91c1c',
                      margin: '2px 0',
                    }}
                  >
                    {message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {data && !loading && (
          <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setRatingFilter((prev) => (prev === 'recommended' ? 'all' : 'recommended'))}
              style={{
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border:
                  ratingFilter === 'recommended'
                    ? `1px solid ${theme.accentBorder}`
                    : `1px solid ${theme.buttonSubtleBorder}`,
                background: ratingFilter === 'recommended' ? theme.accentSoftStrong : theme.buttonSubtleBackground,
                color: ratingFilter === 'recommended' ? theme.accent : theme.buttonSubtleText,
                cursor: 'pointer',
              }}
            >
              ⭐ Рекомендуемые
            </button>
            {(['S', 'A', 'B', 'C', 'D', 'E', 'F'] as Rating[]).map((rating) => {
              const count = ratingCounts[rating] || 0;
              if (count === 0) return null;

              const tone = ratingTones[themeMode][rating];
              const isActive = ratingFilter === rating;
              const config = RATING_CONFIG[rating];

              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setRatingFilter(isActive ? 'all' : rating)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    border: isActive ? `1px solid ${tone.border}` : `1px solid ${theme.buttonSubtleBorder}`,
                    background: isActive ? tone.cardBg : theme.buttonSubtleBackground,
                    color: isActive ? tone.border : theme.buttonSubtleText,
                    cursor: 'pointer',
                  }}
                >
                  {config.emoji} {config.label} <span style={{ opacity: 0.6 }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        <div
          style={{
            marginBottom: '24px',
            background: theme.surfaceSoft,
            borderRadius: '12px',
            border: `1px solid ${theme.border}`,
            padding: '16px',
            boxShadow: theme.mode === 'light' ? '0 14px 36px rgba(15,23,42,0.05)' : 'none',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Поиск по названию, панели, комментарию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: theme.inputBackground,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: '8px',
                color: theme.inputText,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <SelectFilter
              label="Разрешение"
              value={resFilter}
              onChange={setResFilter}
              theme={theme}
              options={[
                { value: 'all', label: 'Все' },
                ...filterOptions.resolutions.map((resolution) => ({ value: resolution, label: resolution })),
              ]}
            />
            <SelectFilter
              label="Оценка"
              value={ratingFilter}
              onChange={setRatingFilter}
              theme={theme}
              options={[
                { value: 'recommended', label: '⭐ Рекомендуемые (S/A/B)' },
                { value: 'all', label: 'Все оценки' },
                { value: 'S', label: '👑 S-Tier' },
                { value: 'A', label: '✅ Лучший выбор' },
                { value: 'B', label: '👍 Хороший вариант' },
                { value: 'C', label: '➖ Нормально' },
                { value: 'D', label: '⚠️ Лучше избегать' },
                { value: 'E', label: '❓ Нет информации' },
                { value: 'F', label: '🚫 Не рекомендуется' },
              ]}
            />
            <SelectFilter
              label="Матрица"
              value={matrixFilter}
              onChange={setMatrixFilter}
              theme={theme}
              options={[
                { value: 'all', label: 'Все' },
                ...filterOptions.matrices.map((matrix) => ({ value: matrix, label: matrix })),
              ]}
            />
            <SelectFilter
              label="Диагональ"
              value={diagonalFilter}
              onChange={setDiagonalFilter}
              theme={theme}
              options={[
                { value: 'all', label: 'Все' },
                ...filterOptions.diagonals.map((diagonal) => ({ value: diagonal, label: `${diagonal}"` })),
              ]}
            />
            <SelectFilter
              label="Частота"
              value={refreshFilter}
              onChange={setRefreshFilter}
              theme={theme}
              options={[
                { value: 'all', label: 'Все' },
                { value: '60-75', label: '60–75 Гц' },
                { value: '144', label: '100–144 Гц' },
                { value: '165-180', label: '165–180 Гц' },
                { value: '200-280', label: '200–280 Гц' },
                { value: '300+', label: '300+ Гц' },
              ]}
            />
            <SelectFilter
              label="Сортировка"
              value={sortBy}
              onChange={setSortBy}
              theme={theme}
              options={[
                { value: 'rating', label: 'По оценке' },
                { value: 'refresh', label: 'По частоте ↓' },
                { value: 'diagonal', label: 'По диагонали ↑' },
                { value: 'name', label: 'По названию' },
              ]}
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', color: theme.textSecondary, margin: 0 }}>
            {loading ? (
              'Загрузка...'
            ) : (
              <>
                Найдено: <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{filteredMonitors.length}</span>
                {data && <span style={{ color: theme.textMuted }}> из {data.monitors.length}</span>}
              </>
            )}
          </p>
        </div>

        {loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${theme.subtleBorder}`,
                  background: theme.skeletonCard,
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    height: '20px',
                    background: theme.skeletonStrong,
                    borderRadius: '6px',
                    width: '70%',
                    marginBottom: '12px',
                  }}
                />
                <div
                  style={{
                    height: '14px',
                    background: theme.skeletonSoft,
                    borderRadius: '6px',
                    width: '40%',
                    marginBottom: '16px',
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Array.from({ length: 4 }).map((__, innerIndex) => (
                    <div
                      key={innerIndex}
                      style={{
                        height: '40px',
                        background: theme.skeletonSoft,
                        borderRadius: '8px',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <>
            {filteredMonitors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 16px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px', color: theme.emptyIcon }}>🔍</div>
                <p style={{ color: theme.textSecondary, fontSize: '18px', margin: '0 0 4px' }}>Мониторы не найдены</p>
                <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0 }}>
                  Попробуйте изменить фильтры или поисковый запрос
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '16px',
                }}
              >
                {filteredMonitors.map((monitor, index) => (
                  <MonitorCard
                    key={`${monitor.name}-${monitor.rowIndex}-${index}`}
                    monitor={monitor}
                    compareActive={compareRowIndices.includes(monitor.rowIndex)}
                    onToggleCompare={() => toggleCompare(monitor.rowIndex)}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {compareMonitors.length >= 2 && (
        <ComparePanel
          monitors={compareMonitors}
          onClear={() => setCompareRowIndices([])}
          collapsed={compareCollapsed}
          onToggleCollapsed={() => setCompareCollapsed((prev) => !prev)}
          theme={theme}
        />
      )}

      <footer style={{ borderTop: `1px solid ${theme.subtleBorder}`, marginTop: '64px', padding: '24px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px', textAlign: 'center' }}>
          <p style={{ color: theme.textMuted, fontSize: '13px', margin: 0 }}>
            Данные из{' '}
            <a
              href="https://docs.google.com/spreadsheets/d/1wTcNBG28l6VL7BXuO_vIlj0ncRNvrCEExy-iGrNFARU/edit?gid=1877328082"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.link, textDecoration: 'underline' }}
            >
              таблицы Гоши
            </a>{' '}
            • Сайт создан для удобного подбора монитора
          </p>
        </div>
      </footer>
    </div>
  );
}
