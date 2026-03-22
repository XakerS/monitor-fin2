import { parseCommentSegments } from '../utils/commentLinks';

type Props = {
  text: string;
};

/** Комментарий как в таблице: обычный текст + кликабельные подписи (Обзор и др.), без отдельного списка ссылок. */
export function CommentInline({ text }: Props) {
  const segments = parseCommentSegments(text);
  if (segments.length === 0) return null;

  return (
    <p
      style={{
        color: '#d1d5db',
        marginTop: '4px',
        marginBottom: 0,
        whiteSpace: 'pre-line',
        lineHeight: 1.55,
        fontSize: '12px',
      }}
    >
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return <span key={i}>{seg.text}</span>;
        }
        return (
          <a
            key={i}
            href={seg.url}
            target="_blank"
            rel="noopener noreferrer"
            title={seg.url}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: '#22d3ee',
              fontWeight: 600,
              textDecoration: 'underline',
              textDecorationColor: 'rgba(34,211,238,0.45)',
              textUnderlineOffset: '3px',
            }}
          >
            {seg.label}
          </a>
        );
      })}
    </p>
  );
}
