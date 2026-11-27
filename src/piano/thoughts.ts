/* ──────────────────────────────────────────────────────────────────────────
   thoughts — short notes, newest first.
   To add one: copy an entry, put it at the top, and write.
   `date` is shown as written (e.g. 'nov 2026'). Blank lines in `body`
   start a new paragraph.
   ────────────────────────────────────────────────────────────────────────── */

export type Thought = {
  date: string;
  title: string;
  body: string;
};

export const THOUGHTS: Thought[] = [
  {
    date: 'nov 2026',
    title: '[your first thought — a title]',
    body: '[write it here. a few sentences is plenty.]\n\n[a second paragraph, if you want one.]',
  },
  {
    date: 'oct 2026',
    title: '[another thought]',
    body: '[delete these placeholders once you have real ones.]',
  },
];
