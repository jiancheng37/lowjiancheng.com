/* ──────────────────────────────────────────────────────────────────────────
   Which visitor this is. The first time someone opens the site it asks
   /api/visitor for the next number (a global count that never resets) and
   keeps it, so refreshing or coming back shows the same number and doesn't
   count them twice. Anywhere the API isn't there (local dev, previews) the
   number simply stays hidden.
   ────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';

const KEY = 'jc-visitor';

const remembered = (): number | null => {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};

/* only where the counter actually runs: the live site and its Vercel previews */
const hasCounter = () => /(^|\.)lowjiancheng\.com$|\.vercel\.app$/.test(window.location.hostname);

let asking: Promise<number | null> | null = null;
const ask = () => {
  if (!asking) {
    asking = fetch('/api/visitor', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const n = body && typeof body.n === 'number' && body.n > 0 ? body.n : null;
        if (n) {
          try {
            window.localStorage.setItem(KEY, String(n));
          } catch {
            /* private mode: the number just won't be remembered */
          }
        }
        return n;
      })
      .catch(() => null);
  }
  return asking;
};

export const useVisitor = () => {
  const [n, setN] = useState<number | null>(remembered);
  useEffect(() => {
    if (n !== null || !hasCounter()) return undefined;
    let gone = false;
    ask().then((v) => {
      if (!gone && v) setN(v);
    });
    return () => {
      gone = true;
    };
  }, [n]);
  return n;
};

/* the number the way a mechanical counter shows it: at least four digits */
export const counterDigits = (n: number) => String(n).padStart(4, '0');
