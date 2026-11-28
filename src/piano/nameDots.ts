import { Glyph, GLYPHS } from './hanzi';

/* ──────────────────────────────────────────────────────────────────────────
   The lettering on the lid, in square dots. It shows the name, or 建 or 成 written in stroke order: each
   character's dots switch on stroke by stroke, along the line a brush would follow; the name, coming back, is
   written left to right in a slanted pen sweep. Whatever was there before crumbles away, its dots dropping one
   by one.
   ────────────────────────────────────────────────────────────────────────── */

export type GlyphKey = keyof typeof GLYPHS;
type LayerKey = 'name' | GlyphKey;

/* at/until: when the dot appears and disappears; order: how far along the writing it comes; size: its square */
type Dot = { x: number; y: number; vx: number; vy: number; hx: number; hy: number; at: number; until: number; order: number; size: number };
type Layer = { dots: Dot[]; state: 'in' | 'out' | 'gone' };

const DOT = 6; // dot size and grid step, in canvas px: neighbours touch, so the shape reads solid
const RIM = 5; // a dark border round every dot, so the lettering stays clear of the lid
const STROKE_MS = 170; // how long each stroke of a character takes to write
const NAME_MS = 1500; // how long the signature takes to write
const NAME_DOT = 4; // the signature's strokes are thin, so its dots are finer than a character's
const NAME_RIM = 3;
const NAME_BACK = 160; // leaving a character waits this long before the name returns, so moving straight on to
// the other character goes from one to the other without the name flashing up in between
/* the signature's hand */
export const SIGNATURE = 'Mrs Saint Delafield';
const FONT = (size: number) => `${size}px "${SIGNATURE}", cursive`;
/* whether the signature font itself is loaded (document.fonts.check says yes to a family it has never heard of) */
const handReady = () => {
  let ok = false;
  document.fonts?.forEach((f) => {
    if (f.family.replace(/["']/g, '') === SIGNATURE && f.status === 'loaded') ok = true;
  });
  return ok;
};

export type NameDots = {
  /* re-sample the name (once the web font has loaded) */
  resample: () => void;
  /* show a character instead of the name, or the name again */
  setGlyph: (key: GlyphKey | null) => void;
  /* the lid is blank until asked: write the name in (at once, with instant), or let whatever is there crumble */
  setName: (on: boolean, instant?: boolean) => void;
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

  const dot = (x: number, y: number, order = 0, size = DOT): Dot => ({ x, y, vx: 0, vy: 0, hx: x, hy: y, at: 0, until: Infinity, order, size });

  /* the signature, in fine dots, each timed by where a pen tracing it would be. The pen starts at the leftmost
     dot and keeps moving to the nearest dot it hasn't inked, inking a brush-width around it as it goes, so it runs
     along each stroke the way a hand would; when nothing is near, it lifts and jumps to the closest dot left, which
     costs a little time, like a pen lifting between letters. Each dot's order is the distance the pen had travelled */
  let inHand = false; // sampled from the signature font itself, not a fallback
  const namePoints = () => {
    inHand = handReady();
    sg.clearRect(0, 0, W, H);
    sg.fillStyle = '#fff';
    let size = 260;
    sg.font = FONT(size);
    const w = sg.measureText('jian cheng').width;
    if (w > 900) {
      size = Math.floor((size * 900) / w);
      sg.font = FONT(size);
    }
    sg.textAlign = 'center';
    sg.textBaseline = 'middle';
    sg.fillText('jian cheng', W / 2, H / 2);
    const px = sg.getImageData(0, 0, W, H).data;
    const dots: Dot[] = [];
    for (let y = NAME_DOT / 2; y < H; y += NAME_DOT) {
      for (let x = NAME_DOT / 2; x < W; x += NAME_DOT) {
        if (px[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 110) dots.push(dot(x, y, 0, NAME_DOT));
      }
    }
    if (!dots.length) return dots;
    /* a grid of cells, so "nearest unvisited" only looks next door */
    const CELL = NAME_DOT * 4;
    const cells = new Map<string, Dot[]>();
    const key = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
    dots.forEach((d) => {
      const k = key(d.hx, d.hy);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k)!.push(d);
    });
    const done = new Set<Dot>();
    const near = (x: number, y: number, r: number) => {
      const out: Dot[] = [];
      const cr = Math.ceil(r / CELL);
      const cx = Math.floor(x / CELL);
      const cy = Math.floor(y / CELL);
      for (let i = -cr; i <= cr; i += 1) {
        for (let j = -cr; j <= cr; j += 1) {
          cells.get(`${cx + i},${cy + j}`)?.forEach((d) => {
            if (!done.has(d) && Math.hypot(d.hx - x, d.hy - y) <= r) out.push(d);
          });
        }
      }
      return out;
    };
    const BRUSH = NAME_DOT * 1.6;
    const STEP = NAME_DOT * 3;
    const LIFT = NAME_DOT * 30; // a pen lift costs as much time as this much travel
    let pen = dots.reduce((a, d) => (d.hx < a.hx ? d : a));
    let dir = { x: 1, y: 0 };
    let travelled = 0;
    while (done.size < dots.length) {
      for (const d of near(pen.hx, pen.hy, BRUSH)) {
        d.order = travelled;
        done.add(d);
      }
      done.add(pen);
      pen.order = Math.min(pen.order || travelled, travelled);
      /* carry on the way the pen was heading if it can */
      const next = near(pen.hx, pen.hy, STEP);
      let best: Dot | null = null;
      let score = Infinity;
      for (const d of next) {
        const dx = d.hx - pen.hx;
        const dy = d.hy - pen.hy;
        const len = Math.hypot(dx, dy) || 1;
        const sc = len - 0.6 * NAME_DOT * ((dx * dir.x + dy * dir.y) / len);
        if (sc < score) {
          score = sc;
          best = d;
        }
      }
      if (!best) {
        /* lift: the closest dot left anywhere, favouring the next letter along */
        let far = Infinity;
        for (const d of dots) {
          if (done.has(d)) continue;
          const dist = Math.hypot(d.hx - pen.hx, d.hy - pen.hy) + Math.max(0, pen.hx - d.hx) * 2;
          if (dist < far) {
            far = dist;
            best = d;
          }
        }
        if (!best) break;
        travelled += LIFT;
      } else {
        const b = best as Dot;
        const len = Math.hypot(b.hx - pen.hx, b.hy - pen.hy) || 1;
        dir = { x: (b.hx - pen.hx) / len, y: (b.hy - pen.hy) / len };
        travelled += len;
      }
      pen = best as Dot;
    }
    dots.forEach((d) => {
      d.order /= Math.max(1, travelled);
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
    name: { dots: namePoints(), state: 'gone' },
    jian: { dots: [], state: 'gone' },
    cheng: { dots: [], state: 'gone' },
  };
  let shown: LayerKey | null = null;
  let nameOn = false;
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

  const dropOut = (key: LayerKey | null, now: number) => {
    if (key === null) return;
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
    visible.forEach((d) => {
      const rim = d.size === DOT ? RIM : NAME_RIM;
      g.fillRect(Math.round(d.x - d.size / 2 - rim), Math.round(d.y - d.size / 2 - rim), d.size + rim * 2, d.size + rim * 2);
    });
    g.fillStyle = '#fff';
    visible.forEach((d) => g.fillRect(Math.round(d.x - d.size / 2), Math.round(d.y - d.size / 2), d.size, d.size));
  };

  let last = performance.now();

  /* nothing else on the page uses the signature font, so the browser won't fetch it unless asked; ask once the
     stylesheet declaring it is in, and write the name again in the real hand if it was already going */
  const fetchHand = () => {
    document.fonts
      ?.load(`200px "${SIGNATURE}"`)
      .then(() => {
        if (inHand || !handReady()) return;
        layers.name.dots = namePoints();
        if (shown === 'name') putIn('name', performance.now());
        else layers.name.state = 'gone';
      })
      .catch(() => undefined);
  };
  document.fonts?.ready.then(fetchHand).catch(() => undefined);

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
        if (!nameOn) {
          /* outside the name section a character just crumbles; there's no name to come back */
          dropOut(shown, now);
          shown = null;
        } else if (shown !== 'name' && nameBackAt === null) nameBackAt = still ? now : now + NAME_BACK;
        busy = true;
        return;
      }
      nameBackAt = null;
      if (key === shown) return;
      dropOut(shown, now);
      putIn(key, now);
    },
    setName(on, instant = false) {
      const now = performance.now();
      nameOn = on;
      nameBackAt = null;
      if (on) {
        if (shown === 'name') return;
        /* the font may have arrived since the name was last sampled */
        if (!inHand && handReady()) layers.name.dots = namePoints();
        else if (!inHand) fetchHand();
        dropOut(shown, now);
        putIn('name', now, instant);
      } else {
        dropOut(shown, now);
        shown = null;
      }
      busy = true;
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
