import { Glyph, GLYPHS } from './hanzi';

/* ──────────────────────────────────────────────────────────────────────────
   The lettering on the lid, in square dots. It shows the name, or 建 or 成 written in stroke order: each
   character's dots switch on stroke by stroke, along the line a brush would follow; the name, coming back, is
   written left to right in a slanted pen sweep. Whatever was there before crumbles away, its dots dropping one
   by one.
   ────────────────────────────────────────────────────────────────────────── */

export type GlyphKey = keyof typeof GLYPHS;
type LayerKey = 'name' | GlyphKey;

/* at/until: when the dot appears and disappears; order: for a character's dots, which stroke and how far along */
type Dot = { x: number; y: number; vx: number; vy: number; hx: number; hy: number; at: number; until: number; order: number };
type Layer = { dots: Dot[]; state: 'in' | 'out' | 'gone' };

const DOT = 6; // dot size and grid step, in canvas px: neighbours touch, so the shape reads solid
const RIM = 5; // a dark border round every dot, so the lettering stays clear of the lid
const STROKE_MS = 170; // how long each stroke of a character takes to write
const NAME_MS = 650; // how long the name takes to write back in, left to right
const SLANT = 0.3; // the pen sweep leans like handwriting: lower dots of a column come a touch later
const NAME_BACK = 160; // leaving a character waits this long before the name returns, so moving straight on to
// the other character goes from one to the other without the name flashing up in between
const FONT = (size: number) => `500 ${size}px Geist, 'Helvetica Neue', Arial, sans-serif`;

export type NameDots = {
  /* re-sample the name (once the web font has loaded) */
  resample: () => void;
  /* show a character instead of the name, or the name again */
  setGlyph: (key: GlyphKey | null) => void;
  /* advance and redraw; true if the canvas changed */
  step: (now: number) => boolean;
};

export const createNameDots = (canvas: HTMLCanvasElement, still: boolean): NameDots => {
  const W = canvas.width;
  const H = canvas.height;
  const g = canvas.getContext('2d')!;
  const scratch = document.createElement('canvas');
  scratch.width = W;
  scratch.height = H;
  const sg = scratch.getContext('2d', { willReadFrequently: true })!;

  const dot = (x: number, y: number, order = 0): Dot => ({ x, y, vx: 0, vy: 0, hx: x, hy: y, at: 0, until: Infinity, order });

  /* grid points inside the name, drawn on the scratch canvas */
  const namePoints = () => {
    sg.clearRect(0, 0, W, H);
    sg.fillStyle = '#fff';
    let size = 176;
    sg.font = FONT(size);
    const w = sg.measureText('jian cheng').width;
    if (w > 940) {
      size = Math.floor((size * 940) / w);
      sg.font = FONT(size);
    }
    sg.textAlign = 'center';
    sg.textBaseline = 'middle';
    sg.fillText('jian cheng', W / 2, H / 2 - 16);
    const px = sg.getImageData(0, 0, W, H).data;
    const dots: Dot[] = [];
    for (let y = DOT / 2; y < H; y += DOT) {
      for (let x = DOT / 2; x < W; x += DOT) {
        if (px[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 120) dots.push(dot(x, y));
      }
    }
    /* order along the pen sweep, 0 at the first dot it reaches and 1 at the last */
    const sweep = (d: Dot) => d.hx + (d.hy - H / 2) * SLANT;
    const lo = Math.min(...dots.map(sweep));
    const hi = Math.max(...dots.map(sweep));
    dots.forEach((d) => {
      d.order = (sweep(d) - lo) / Math.max(1, hi - lo);
    });
    return dots;
  };

  /* a character, with each dot timed by its stroke and how far along that stroke's median it sits */
  const glyphDots = (glyph: Glyph) => {
    const size = H * 0.94;
    const s = size / 1024;
    const ox = W / 2 - size / 2;
    const oy = H / 2 - size / 2 - 6;
    const m = new DOMMatrix([s, 0, 0, -s, ox, oy + 900 * s]);
    const paths = glyph.strokes.map((d) => {
      const p = new Path2D();
      p.addPath(new Path2D(d), m);
      return p;
    });
    const medians = glyph.medians.map((line) => line.map(([x, y]) => [ox + x * s, oy + (900 - y) * s] as [number, number]));
    const dots: Dot[] = [];
    for (let y = DOT / 2; y < H; y += DOT) {
      for (let x = DOT / 2; x < W; x += DOT) {
        const k = paths.findIndex((p) => sg.isPointInPath(p, x, y));
        if (k < 0) continue;
        /* nearest point along the median, as a fraction of its length */
        const line = medians[k];
        let walked = 0;
        let best = Infinity;
        let along = 0;
        for (let i = 1; i < line.length; i += 1) {
          const [ax, ay] = line[i - 1];
          const [bx, by] = line[i];
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len)));
          const d = Math.hypot(ax + (bx - ax) * t - x, ay + (by - ay) * t - y);
          if (d < best) {
            best = d;
            along = walked + len * t;
          }
          walked += len;
        }
        dots.push(dot(x, y, k + (walked ? along / walked : 0) * 0.85));
      }
    }
    return dots;
  };

  const layers: Record<LayerKey, Layer> = {
    name: { dots: namePoints(), state: 'in' },
    jian: { dots: [], state: 'gone' },
    cheng: { dots: [], state: 'gone' },
  };
  let shown: LayerKey = 'name';
  let nameBackAt: number | null = null;
  let busy = true; // something is moving or waiting to; once it's all still, step() does nothing

  /* first: the name as the page loads, already there; after that, it's written back in each time */
  const putIn = (key: LayerKey, now: number, first = false) => {
    const layer = layers[key];
    if (key !== 'name' && !layer.dots.length) layer.dots = glyphDots(GLYPHS[key]);
    layer.state = 'in';
    layer.dots.forEach((d) => {
      d.x = d.hx;
      d.y = d.hy;
      d.vx = 0;
      d.vy = 0;
      d.until = Infinity;
      if (still || first) d.at = 0;
      else d.at = now + (key === 'name' ? 60 + d.order * NAME_MS : 120 + d.order * STROKE_MS);
    });
    shown = key;
    busy = true;
  };

  const dropOut = (key: LayerKey, now: number) => {
    const layer = layers[key];
    if (layer.state === 'gone') return;
    layer.state = 'out';
    layer.dots.forEach((d) => {
      d.until = still ? 0 : now + Math.random() * 380;
      d.vx = (Math.random() - 0.5) * 3;
      d.vy = 1 + Math.random() * 3;
    });
    busy = true;
  };

  const draw = (now: number) => {
    g.clearRect(0, 0, W, H);
    const visible: Dot[] = [];
    (Object.values(layers) as Layer[]).forEach((l) => {
      if (l.state === 'gone') return;
      l.dots.forEach((d) => {
        if (now >= d.at && now < d.until) visible.push(d);
      });
    });
    g.fillStyle = '#000';
    visible.forEach((d) => g.fillRect(Math.round(d.x - DOT / 2 - RIM), Math.round(d.y - DOT / 2 - RIM), DOT + RIM * 2, DOT + RIM * 2));
    g.fillStyle = '#fff';
    visible.forEach((d) => g.fillRect(Math.round(d.x - DOT / 2), Math.round(d.y - DOT / 2), DOT, DOT));
  };

  let last = performance.now();

  const api: NameDots = {
    resample() {
      layers.name.dots = namePoints();
      if (shown === 'name') putIn('name', performance.now(), true);
      else layers.name.state = 'gone';
      busy = true;
    },
    setGlyph(key) {
      const now = performance.now();
      if (key === null) {
        if (shown !== 'name' && nameBackAt === null) nameBackAt = still ? now : now + NAME_BACK;
        busy = true;
        return;
      }
      nameBackAt = null;
      if (key === shown) return;
      dropOut(shown, now);
      putIn(key, now);
    },
    step(now) {
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      if (nameBackAt !== null && now >= nameBackAt) {
        nameBackAt = null;
        dropOut(shown, now);
        putIn('name', now);
      }
      if (!busy) return false;
      let moving = nameBackAt !== null;
      (Object.values(layers) as Layer[]).forEach((l) => {
        if (l.state === 'gone') return;
        let alive = false;
        l.dots.forEach((d) => {
          if (now >= d.until) return;
          alive = true;
          if (now < d.at) {
            moving = true;
            return;
          }
          if (l.state === 'out') {
            /* crumbling: each dot drops a little before it goes */
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy += 0.6 * dt;
            moving = true;
          }
        });
        if (l.state === 'out' && !alive) l.state = 'gone';
      });
      draw(now);
      busy = moving;
      return true;
    },
  };
  draw(last);
  return api;
};
