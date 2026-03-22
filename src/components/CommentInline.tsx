import { parseCommentSegments } from '../utils/commentLinks';

type Props = {
  text: string;
  html?: string;
};

function parseHtmlSegments(html: string) {
  if (!html.trim() || typeof DOMParser === 'undefined') return [];

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [];

  const segments: ReturnType<typeof parseCommentSegments> = [];

  const pushText = (value: string) => {
    if (!value) return;
    const last = segments[segments.length - 1];
    if (last?.kind === 'text') {
      last.text += value;
      return;
    }
    segments.push({ kind: 'text', text: value });
  };

  const walk = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent ?? '');
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    if (node.tagName === 'BR') {
      pushText('\n');
      return;
    }

    if (node.tagName === 'A') {
      const url = node.getAttribute('href')?.trim() ?? '';
      const label = node.textContent?.trim() ?? '';
      if (/^https?:\/\//i.test(url) && label) {
        segments.push({ kind: 'link', label, url });
        return;
      }
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
  };

  for (const child of Array.from(root.childNodes)) {
    walk(child);
  }

  return segments;
}

export function CommentInline({ text, html }: Props) {
  const htmlSegments = parseHtmlSegments(html ?? '');
  const segments = htmlSegments.length > 0 ? htmlSegments : parseCommentSegments(text);
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
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              color: '#22d3ee',
              fontWeight: 600,
              textDecoration: 'underline',
              textDecorationColor: 'rgba(34,211,238,0.45)',
              textUnderlineOffset: '3px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {seg.label}
          </a>
        );
      })}
    </p>
  );
}
