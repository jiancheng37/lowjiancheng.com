/* ──────────────────────────────────────────────────────────────────────────
   the darkroom — photos behind the bench camera's lens.
   Files live in public/gallery/. To add one: drop the file in, then add an
   entry here. Portrait (2:3) frames hang best; others are cropped to fit.
   The line shows them three at a time, in this order.
   ────────────────────────────────────────────────────────────────────────── */

export type Photo = {
  file: string;
  caption: string;
  alt: string;
};

export const GALLERY: Photo[] = [
  { file: 'fuji-road.jpg', caption: 'fuji, from the road', alt: 'Mount Fuji rising behind a quiet road, a small red car driving towards it' },
  { file: 'fuji-tractor.jpg', caption: 'fuji, behind a tractor', alt: 'A red tractor parked in front of Mount Fuji' },
  { file: 'fuji-windmill.jpg', caption: 'fuji, by the windmill', alt: 'An old windmill and a wooden bench with Mount Fuji behind them' },
  { file: 'jelly-pair.jpg', caption: 'two jellies, mid-drift', alt: 'Two pale jellyfish drifting one behind the other in a dark tank' },
  { file: 'sea-nettles.jpg', caption: 'sea nettles', alt: 'Amber sea nettles trailing long frilled tentacles against black water' },
  { file: 'moon-jellies.jpg', caption: 'moon jellies, a tank full', alt: 'Hundreds of small moon jellyfish glowing in a tall dark tank' },
];
