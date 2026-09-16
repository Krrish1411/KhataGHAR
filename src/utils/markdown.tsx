import React, { type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Tiny, high-performance, safe markdown renderer (no innerHTML).      */
/* Supports: # headings, **bold**, *italic*, ~~strike~~, ==highlight==,*/
/* ++underline++, `code`, ``` fences, > quotes, - lists, 1. lists,     */
/* - [ ] / - [x] checklists, --- rules, [links](url).                  */
/* ------------------------------------------------------------------ */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Token regex: code, bold, underline(++), highlight(==), italic, strike, link, wiki [[note]]
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\+\+[^+]+\+\+)|(==[^=]+==)|(\*[^*]+\*)|(~~[^~]+~~)|(\[[^\]]+\]\((?:https?:\/\/)[^)\s]+\))|(\[\[[^\]]+\]\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${k++}`;

    if (tok.startsWith('`')) {
      out.push(
        <code key={key} className="md-code font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-moss border border-line text-pine-700 dark:text-pine-300">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith('**')) {
      out.push(<strong key={key} className="font-bold text-ink">{inline(tok.slice(2, -2), key)}</strong>);
    } else if (tok.startsWith('++')) {
      out.push(<u key={key} className="underline decoration-pine-500 underline-offset-2">{inline(tok.slice(2, -2), key)}</u>);
    } else if (tok.startsWith('==')) {
      out.push(
        <mark key={key} className="bg-amber-200/60 dark:bg-amber-500/30 text-ink px-1 rounded">
          {inline(tok.slice(2, -2), key)}
        </mark>
      );
    } else if (tok.startsWith('~~')) {
      out.push(<s key={key} className="line-through text-ink/50">{inline(tok.slice(2, -2), key)}</s>);
    } else if (tok.startsWith('*')) {
      out.push(<em key={key} className="italic text-ink/90">{inline(tok.slice(1, -1), key)}</em>);
    } else if (tok.startsWith('[[') && tok.endsWith(']]')) {
      const inner = tok.slice(2, -2);
      const parts = inner.split('|');
      const target = parts[0].trim();
      const label = parts[1]?.trim() || target;
      out.push(
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold bg-pine-50 dark:bg-pine-950/60 text-pine-700 dark:text-pine-300 border border-pine-300/40"
          title={`Note reference: ${target}`}
        >
          📝 {label}
        </span>
      );
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (mm) {
        out.push(
          <a
            key={key}
            href={mm[2]}
            target="_blank"
            rel="noreferrer"
            className="text-pine-600 dark:text-pine-400 underline underline-offset-2 hover:text-pine-700 break-all"
          >
            {mm[1]}
          </a>
        );
      } else {
        out.push(tok);
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(src: string): ReactNode {
  if (!src) return null;
  const lines = src.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const k = `b${key++}`;

    if (line.trim() === '') {
      i++;
      continue;
    }

    // Code Fence ```
    if (line.trim().startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre
          key={k}
          className="font-mono text-xs p-3 rounded-xl bg-slate-900 text-slate-100 border border-line overflow-x-auto max-w-full my-2.5 leading-relaxed"
        >
          <code>{buf.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Headings
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      if (lvl === 1) {
        blocks.push(
          <h1 key={k} className="font-display text-xl sm:text-2xl font-black text-ink pb-1.5 border-b border-line mt-3 mb-1 break-words">
            {inline(h[2], k)}
          </h1>
        );
      } else if (lvl === 2) {
        blocks.push(
          <h2 key={k} className="font-display text-lg sm:text-xl font-extrabold text-ink pb-1 border-b border-line/60 mt-3 mb-1 break-words">
            {inline(h[2], k)}
          </h2>
        );
      } else if (lvl === 3) {
        blocks.push(
          <h3 key={k} className="font-display text-base font-bold text-ink mt-2 mb-0.5 break-words">
            {inline(h[2], k)}
          </h3>
        );
      } else {
        blocks.push(
          <h4 key={k} className="font-display text-xs font-bold uppercase tracking-wider text-ink/60 mt-2 mb-0.5 break-words">
            {inline(h[2], k)}
          </h4>
        );
      }
      i++;
      continue;
    }

    // Horizontal Rule ---
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(<hr key={k} className="border-none border-t border-dashed border-line my-3" />);
      i++;
      continue;
    }

    // Blockquote >
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={k}
          className="border-l-3 border-pine-500 pl-3 py-1 text-ink/80 italic my-2 bg-moss/40 rounded-r-lg"
        >
          {inline(buf.join(' '), k)}
        </blockquote>
      );
      continue;
    }

    // Checklists & Lists
    const check = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line);
    if (check || /^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: ReactNode[] = [];
      let ii = 0;
      while (i < lines.length) {
        const l = lines[i];
        const c = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(l);
        const ul = /^\s*[-*]\s+(.*)$/.exec(l);
        const ol = /^\s*\d+\.\s+(.*)$/.exec(l);

        if (c) {
          const isDone = Boolean(c[1].trim());
          items.push(
            <li key={`${k}-${ii++}`} className="flex items-start gap-2.5 text-xs sm:text-sm list-none my-0.5">
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded mt-0.5 shrink-0 border text-[10px] font-bold ${
                  isDone
                    ? 'bg-pine-600 border-pine-600 text-white'
                    : 'border-line bg-card text-transparent'
                }`}
              >
                ✓
              </span>
              <span className={`break-words ${isDone ? 'line-through text-ink/40' : 'text-ink'}`}>
                {inline(c[2], `${k}-${ii}`)}
              </span>
            </li>
          );
          i++;
        } else if (ul && !ordered) {
          items.push(
            <li key={`${k}-${ii++}`} className="text-xs sm:text-sm list-disc ml-4 my-0.5 text-ink break-words">
              {inline(ul[1], `${k}-${ii}`)}
            </li>
          );
          i++;
        } else if (ol && ordered) {
          items.push(
            <li key={`${k}-${ii++}`} className="text-xs sm:text-sm list-decimal ml-4 my-0.5 text-ink break-words">
              {inline(ol[1], `${k}-${ii}`)}
            </li>
          );
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        ordered ? (
          <ol key={k} className="my-1.5 space-y-0.5">
            {items}
          </ol>
        ) : (
          <ul key={k} className="my-1.5 space-y-0.5">
            {items}
          </ul>
        )
      );
      continue;
    }

    // Standard Paragraph
    blocks.push(
      <p key={k} className="text-xs sm:text-sm leading-relaxed text-ink my-1 break-words">
        {inline(line, k)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1 w-full max-w-full overflow-hidden break-words">{blocks}</div>;
}
