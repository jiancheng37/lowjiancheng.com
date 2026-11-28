/* ──────────────────────────────────────────────────────────────────────────
   The first visit: sand on a plate. Grains are scattered over the dark
   screen, then the plate starts to vibrate (silently). Grains hop off
   wherever the plate moves and come to rest along the lines that stay still,
   drawing a Chladni figure. The note changes twice, the grains shake loose and
   find the new lines, and then every grain slides to one dot of the piano.
   The last frame is the scene's first frame, dot for dot, so the real render
   takes over without a seam.
   ────────────────────────────────────────────────────────────────────────── */

/* one frame of the dithered scene: which dots are lit (row 0 at the top), and the two colours it uses */
export type IntroDots = {
  w: number;
  h: number;
  on: Uint8Array;
  light: [number, number, number];
  dark: [number, number, number];
};

export type SandRun = { skip: () => void };

/* the plate's notes, as Chladni modes: f = cos(nπu)·cos(mπv) ± cos(mπu)·cos(nπv) on a square plate as wide as the
   screen's long side. Simple to intricate: a ring, rings within rings, then the ornate one that becomes the piano */
const MODES: { n: number; m: number; sign: number; at: number }[] = [
  { n: 2, m: 4, sign: 1, at: 500 },
  { n: 4, m: 6, sign: 1, at: 1450 },
  { n: 5, m: 9, sign: -1, at: 2400 },
];
const SPRINKLE = 420; // the grains land over this long (ms)
const SETTLE = 3350; // the plate goes still and the grains slide into the piano
const SLIDE = 950; // how long each grain's slide takes
const SPREAD = 420; // grains set off within this long of each other
const BEND = 0.45; // how far a grain's path bows out to one side, as a share of the distance it travels
const FIZZ = 1.6; // dots of jitter on the way, dying away as it lands
const HOLD = 140; // the finished picture, held before the scene takes over
const END = SETTLE + SPREAD + SLIDE + HOLD;

const DRIFT = 0.075; // how far toward the nearest still line a vibrating grain moves each frame (fraction of the way)
const MAX_STEP = 2.5; // dots per frame, at most
const HOP = 2.4; // the random hop where the plate moves most (dots)
const HOP_FLOOR = 0.45; // and on the still lines, so they shimmer rather than freeze

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/* position along a Hilbert curve: neighbours on the screen stay neighbours in the order, so pairing grains with
   dots in curve order sends each grain somewhere near it, and the slide reads as currents rather than a swarm */
const hilbert = (n: number, x0: number, y0: number) => {
  let x = x0;
  let y = y0;
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0;
    const ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        x = n - 1 - x;
        y = n - 1 - y;
      }
      const t = x;
      x = y;
      y = t;
    }
  }
  return d;
};

/* indices 0..count-1 sorted by the Hilbert position of cell(i) */
const IDX = 2 ** 21;
const curveOrder = (count: number, side: number, cellX: (i: number) => number, cellY: (i: number) => number) => {
  const keys = new Float64Array(count);
  for (let i = 0; i < count; i += 1) keys[i] = hilbert(side, cellX(i), cellY(i)) * IDX + i;
  keys.sort();
  const order = new Uint32Array(count);
  for (let k = 0; k < count; k += 1) order[k] = keys[k] - Math.floor(keys[k] / IDX) * IDX;
  return order;
};

const pack = ([r, g, b]: [number, number, number]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;

export const playSand = (canvas: HTMLCanvasElement, dots: IntroDots, onDone: () => void): SandRun => {
  const { w, h, on } = dots;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  let finished = false;
  let raf = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', finish);
    onDone();
  };
  if (!ctx) {
    finish();
    return { skip: finish };
  }
  /* a resize changes the grid under the sand, so the picture it's heading for no longer exists: just finish */
  window.addEventListener('resize', finish);

  /* where the grains end up: every lit dot of the scene, one grain each */
  let count = 0;
  for (let i = 0; i < on.length; i += 1) count += on[i];
  const targets = new Uint32Array(count);
  for (let i = 0, k = 0; i < on.length; i += 1) if (on[i]) targets[k++] = i;

  let side = 1;
  while (side < Math.max(w, h)) side <<= 1;

  /* the grains: thrown on at random, landing over the first moments */
  let seed = 0x2545f491;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const lands = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    x[i] = rnd() * w;
    y[i] = rnd() * h;
    lands[i] = SPRINKLE * Math.sqrt(rnd());
  }

  /* the current mode's shape, worked out once per column and once per row: f(x, y) = A[x]B[y] + s·C[x]D[y] */
  const A = new Float32Array(w);
  const Ad = new Float32Array(w);
  const C = new Float32Array(w);
  const Cd = new Float32Array(w);
  const B = new Float32Array(h);
  const Bd = new Float32Array(h);
  const D = new Float32Array(h);
  const Dd = new Float32Array(h);
  const S = Math.max(w, h);
  let sign = 1;
  let mode = -1;
  const setMode = (k: number) => {
    mode = k;
    const { n, m } = MODES[k];
    sign = MODES[k].sign;
    const pn = Math.PI * n;
    const pm = Math.PI * m;
    for (let c = 0; c < w; c += 1) {
      const u = (c + 0.5 - w / 2) / S + 0.5;
      A[c] = Math.cos(pn * u);
      Ad[c] = (-pn * Math.sin(pn * u)) / S;
      C[c] = Math.cos(pm * u);
      Cd[c] = (-pm * Math.sin(pm * u)) / S;
    }
    for (let r = 0; r < h; r += 1) {
      const v = (r + 0.5 - h / 2) / S + 0.5;
      B[r] = Math.cos(pm * v);
      Bd[r] = (-pm * Math.sin(pm * v)) / S;
      D[r] = Math.cos(pn * v);
      Dd[r] = (-pn * Math.sin(pn * v)) / S;
    }
  };

  /* the slide into the piano: where each grain starts from, and when it sets off */
  let sx: Float32Array | null = null;
  let sy: Float32Array | null = null;
  let bx: Float32Array | null = null; // each path's bend: the control point of a quadratic curve
  let by: Float32Array | null = null;
  let goal: Uint32Array | null = null;
  let delay: Float32Array | null = null;
  const beginSlide = () => {
    sx = x.slice();
    sy = y.slice();
    const grains = curveOrder(count, side, (i) => Math.min(w - 1, x[i] | 0), (i) => Math.min(h - 1, y[i] | 0));
    const spots = curveOrder(count, side, (i) => targets[i] % w, (i) => Math.floor(targets[i] / w));
    goal = new Uint32Array(count);
    delay = new Float32Array(count);
    bx = new Float32Array(count);
    by = new Float32Array(count);
    for (let k = 0; k < count; k += 1) {
      const i = grains[k];
      const g = targets[spots[k]];
      goal[i] = g;
      delay[i] = rnd() * SPREAD;
      /* bow each path out to one side by a random amount, so neighbours drift apart on the way instead of
         travelling as one rigid sheet */
      const gx = (g % w) + 0.5;
      const gy = Math.floor(g / w) + 0.5;
      const bend = (rnd() * 2 - 1) * BEND;
      bx[i] = (x[i] + gx) / 2 - (gy - y[i]) * bend;
      by[i] = (y[i] + gy) / 2 + (gx - x[i]) * bend;
    }
  };

  const img = ctx.createImageData(w, h);
  const px = new Uint32Array(img.data.buffer);
  const LIGHT = pack(dots.light);
  const DARK = pack(dots.dark);

  const t0 = performance.now();
  let last = t0;
  let modeAt = 0;
  const step = (now: number) => {
    if (finished) return;
    const t = now - t0;
    const k = Math.min(3, (now - last) / (1000 / 60)); // frames' worth of motion since the last one
    last = now;
    if (t >= END) {
      finish();
      return;
    }

    if (t < SETTLE) {
      let next = -1;
      MODES.forEach((md, i) => {
        if (t >= md.at) next = i;
      });
      if (next !== mode && next >= 0) {
        setMode(next);
        modeAt = t;
      }
      if (mode >= 0) {
        /* the plate builds up to full swing over a moment after each change of note */
        const e = Math.min(1, (t - modeAt) / 140);
        const pull = Math.min(1, DRIFT * e * k);
        const hop = HOP * e * Math.sqrt(k);
        const floor = HOP_FLOOR * e * Math.sqrt(k);
        for (let i = 0; i < count; i += 1) {
          const c = x[i] | 0;
          const r = y[i] | 0;
          const f = A[c] * B[r] + sign * C[c] * D[r];
          const fx = Ad[c] * B[r] + sign * Cd[c] * D[r];
          const fy = A[c] * Bd[r] + sign * C[c] * Dd[r];
          /* a step toward f = 0 (the still line), capped where the slope is too gentle to trust */
          const g2 = fx * fx + fy * fy + 1e-9;
          let dx = ((-f * fx) / g2) * pull;
          let dy = ((-f * fy) / g2) * pull;
          const len = Math.hypot(dx, dy);
          if (len > MAX_STEP) {
            dx *= MAX_STEP / len;
            dy *= MAX_STEP / len;
          }
          /* and a hop, bigger where the plate moves more */
          const a = Math.abs(f) * 0.5 * hop + floor;
          dx += (rnd() * 2 - 1) * a;
          dy += (rnd() * 2 - 1) * a;
          x[i] = Math.min(w - 0.001, Math.max(0, x[i] + dx));
          y[i] = Math.min(h - 0.001, Math.max(0, y[i] + dy));
        }
      }
    } else {
      if (!goal) beginSlide();
      const g = goal!;
      const d = delay!;
      const ox = sx!;
      const oy = sy!;
      const cx = bx!;
      const cy = by!;
      const ts = t - SETTLE;
      for (let i = 0; i < count; i += 1) {
        const p = easeInOut(Math.min(1, Math.max(0, (ts - d[i]) / SLIDE)));
        const q = 1 - p;
        const gx = (g[i] % w) + 0.5;
        const gy = Math.floor(g[i] / w) + 0.5;
        const fizz = p > 0 && p < 1 ? FIZZ * q : 0;
        const nx = q * q * ox[i] + 2 * q * p * cx[i] + p * p * gx + (rnd() * 2 - 1) * fizz;
        const ny = q * q * oy[i] + 2 * q * p * cy[i] + p * p * gy + (rnd() * 2 - 1) * fizz;
        x[i] = Math.min(w - 0.001, Math.max(0, nx));
        y[i] = Math.min(h - 0.001, Math.max(0, ny));
      }
    }

    px.fill(DARK);
    for (let i = 0; i < count; i += 1) {
      if (t >= lands[i]) px[(y[i] | 0) * w + (x[i] | 0)] = LIGHT;
    }
    ctx.putImageData(img, 0, 0);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return { skip: finish };
};
