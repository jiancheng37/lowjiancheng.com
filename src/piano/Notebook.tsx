/* ──────────────────────────────────────────────────────────────────────────
   The notebook on the bench: "off the keys", written up. The pages are real
   text laid exactly over the 3D pages (DitherPiano maps each one onto its
   page with a perspective transform every frame). Each entry opens on a
   left-hand page with its photo; the writing runs on across the pages after.
   ────────────────────────────────────────────────────────────────────────── */

import React, { useEffect, useRef } from 'react';
import { developPhoto } from './dither';
import { OFF_KEYS } from './offKeys';

export type NotebookPage =
  | { kind: 'photo'; entry: number }
  | { kind: 'text'; entry: number; paras: string[] }
  | { kind: 'blank'; entry: number };

export type NotebookLayout = { pages: NotebookPage[]; starts: number[] };

/* table of contents for the list beside the book: which entry is open, where each starts, and how to get there */
export const BookContext = React.createContext<{
  goTo: (entry: number) => void;
  current: number | null;
  pageOf: (entry: number) => number | null;
}>({ goTo: () => undefined, current: null, pageOf: () => null });

/* Lay every entry out on pages of the given size, measuring real text in a hidden page so nothing overflows.
   On a two-page spread each entry starts on a left-hand page; a blank page is slipped in where needed. */
export const layoutNotebook = (size: { w: number; h: number }, single: boolean): NotebookLayout => {
  const sheet = document.createElement('div');
  sheet.className = 'nb-page nb-measure';
  sheet.style.width = `${size.w}px`;
  sheet.style.height = `${size.h}px`;
  sheet.innerHTML =
    '<div class="nb-inner"><header class="nb-head"><span>off the keys</span></header><div class="nb-text"></div><footer class="nb-foot"><span class="nb-num">00</span></footer></div>';
  document.body.appendChild(sheet);
  const text = sheet.querySelector('.nb-text') as HTMLElement;
  const fits = () => text.scrollHeight <= text.clientHeight + 1;
  const render = (paras: string[]) =>
    text.replaceChildren(
      ...paras.map((t) => {
        const p = document.createElement('p');
        p.textContent = t;
        return p;
      }),
    );

  const split = (body: string) => {
    const out: string[][] = [];
    const queue = body.split(/\n\n+/);
    let cur: string[] = [];
    while (queue.length) {
      const para = queue.shift()!;
      render([...cur, para]);
      if (fits()) {
        cur.push(para);
        continue;
      }
      /* the paragraph runs over: keep as many words as fit, carry the rest to the next page */
      const words = para.split(' ');
      let lo = 0;
      let hi = words.length - 1;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        render([...cur, words.slice(0, mid).join(' ')]);
        if (fits()) lo = mid;
        else hi = mid - 1;
      }
      if (lo === 0) {
        if (!cur.length) cur.push(para); // a page too small for even a line: let it run, rather than loop
        else queue.unshift(para);
      } else {
        cur.push(words.slice(0, lo).join(' '));
        queue.unshift(words.slice(lo).join(' '));
      }
      out.push(cur);
      cur = [];
    }
    if (cur.length) out.push(cur);
    return out;
  };

  const pages: NotebookPage[] = [];
  const starts: number[] = [];
  OFF_KEYS.forEach((entry, i) => {
    if (!single && pages.length % 2 === 1) pages.push({ kind: 'blank', entry: i - 1 });
    starts.push(pages.length);
    pages.push({ kind: 'photo', entry: i });
    split(entry.body).forEach((paras) => pages.push({ kind: 'text', entry: i, paras }));
  });
  if (!single && pages.length % 2 === 1) pages.push({ kind: 'blank', entry: OFF_KEYS.length - 1 });
  sheet.remove();
  return { pages, starts };
};

/* an entry's opening page: what it is, its title, and its photo developing onto the paper. A photo develops
   once; met again (say, after riding over on a turning page) it's simply there */
const developed = new Set<number>();
const PhotoPage: React.FC<{ entry: number; shown: boolean; dot: number }> = ({ entry, shown, dot }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const e = OFF_KEYS[entry];
  const src = `${process.env.PUBLIC_URL}/off/${e.photo}`;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const first = shown && !developed.has(entry);
    if (shown) developed.add(entry);
    return developPhoto(canvas, src, { dot, develop: shown, delay: first ? 200 : 0, duration: first ? 1300 : 1 });
  }, [src, shown, dot, entry]);
  return (
    <div className="nb-opening">
      <p className="nb-label">{e.label}</p>
      <h3 className="nb-title">{e.title}</h3>
      <figure className="nb-photo">
        <canvas ref={canvasRef} role="img" aria-label={e.alt} />
        <figcaption>
          fig. d.{entry + 1} — {e.caption}
        </figcaption>
      </figure>
    </div>
  );
};

type PageProps = {
  page: NotebookPage | undefined;
  number: number;
  size: { w: number; h: number };
  shown: boolean;
  back: boolean;
  next: boolean;
  dot: number;
  onTurn: (dir: 1 | -1) => void;
  side: 'left' | 'right' | 'leaf';
};

/* one page of the open book; swipe across it, or use the corner arrows, to turn */
export const NotebookPageView = React.forwardRef<HTMLDivElement, PageProps>(
  ({ page, number, size, shown, back, next, dot, onTurn, side }, ref) => {
    const swipe = useRef<number | null>(null);
    const entry = page ? OFF_KEYS[page.entry] : null;
    return (
      <div
        ref={ref}
        className={`nb-page is-${side}${shown ? ' is-shown' : ''}`}
        style={{ width: size.w, height: size.h }}
        aria-hidden={!shown || side === 'leaf'}
        onPointerDown={(e) => {
          swipe.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipe.current === null) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (dx < -40 && next) onTurn(1);
          else if (dx > 40 && back) onTurn(-1);
        }}
      >
        <div className="nb-inner" key={number}>
          <header className="nb-head">
            <span>off the keys</span>
            <span>{page && page.kind !== 'blank' ? entry?.label : ''}</span>
          </header>
          {page?.kind === 'photo' && <PhotoPage entry={page.entry} shown={shown} dot={dot} />}
          {page?.kind === 'text' && (
            <div className="nb-text">
              {page.paras.map((t, i) => (
                <p key={`${number}-${t.slice(0, 24)}`} style={{ '--i': i } as React.CSSProperties}>
                  {t}
                </p>
              ))}
            </div>
          )}
          {(!page || page.kind === 'blank') && <div className="nb-text" />}
          <footer className="nb-foot">
            {back ? (
              <button type="button" className="nb-turn" onClick={() => onTurn(-1)} aria-label="Previous page" tabIndex={shown ? 0 : -1}>
                ←
              </button>
            ) : (
              <span />
            )}
            <span className="nb-num">{number}</span>
            {next ? (
              <button type="button" className="nb-turn" onClick={() => onTurn(1)} aria-label="Next page" tabIndex={shown ? 0 : -1}>
                →
              </button>
            ) : (
              <span />
            )}
          </footer>
        </div>
      </div>
    );
  },
);
NotebookPageView.displayName = 'NotebookPageView';

/* the CSS transform that lays a w×h box exactly onto a quad on screen (corners TL, TR, BR, BL as x,y pairs) */
export const quadTransform = (w: number, h: number, q: number[]) => {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const k = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + k * y3;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${k / h},0,0,1,0,${x0},${y0},0,1)`;
};

/* the pages arrive and leave through the dots: a 4×4 ordered pattern, three CSS pixels a cell like the scene's own
   dither, filling in (or emptying out) one level at a time */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const DOT_MASKS = Array.from({ length: 17 }, (_, level) => {
  const cells = BAYER4.map((v, i) => (v < level ? `<rect x='${(i % 4) * 3}' y='${Math.floor(i / 4) * 3}' width='3' height='3'/>` : '')).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' shape-rendering='crispEdges'>${cells}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
});

export const setDotMask = (el: HTMLElement, level: number) => {
  const style = el.style as CSSStyleDeclaration & { webkitMaskImage: string; webkitMaskSize: string };
  if (level >= 16) {
    style.maskImage = '';
    style.webkitMaskImage = '';
    return;
  }
  style.maskImage = DOT_MASKS[Math.max(0, level)];
  style.webkitMaskImage = DOT_MASKS[Math.max(0, level)];
  style.maskSize = '12px 12px';
  style.webkitMaskSize = '12px 12px';
};

export const dissolve = (els: HTMLElement[], into: boolean, ms = 360) =>
  new Promise<void>((resolve) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const level = Math.round((into ? p : 1 - p) * 16);
      els.forEach((el) => setDotMask(el, level));
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
