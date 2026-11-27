/* ──────────────────────────────────────────────────────────────────────────
   Photos in the site's own dots (an 8×8 ordered dither in ink and paper),
   for the darkroom prints and the notebook. They can "develop": the image
   comes up out of the dark, brightest parts first.
   ────────────────────────────────────────────────────────────────────────── */

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35,
  11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);
const PAPER_RGB = [236, 232, 222];
const INK_RGB = [27, 26, 29];

export const STILL = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Draws `src` into `canvas` (cropped to fill it) one dither dot per `dot` CSS pixels. With `develop` it fades
   up from black after `delay` ms; without, it waits as a blank, unexposed sheet. Returns a function that stops it. */
export const developPhoto = (
  canvas: HTMLCanvasElement,
  src: string,
  { dot, develop, delay = 0, duration = 1700 }: { dot: number; develop: boolean; delay?: number; duration?: number },
) => {
  let raf = 0;
  let gone = false;
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (gone || !ctx) return;
    const w = Math.max(1, Math.round(canvas.clientWidth / dot));
    const h = Math.max(1, Math.round(canvas.clientHeight / dot));
    canvas.width = w;
    canvas.height = h;
    const k = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k);
    /* tones as if shot through a red filter, the old black-and-white landscape trick: blue sky drops
       darker, so snow, cloud and anything in front of it stands out. Then stretch to the full range */
    const px = ctx.getImageData(0, 0, w, h).data;
    const lum = new Float32Array(w * h);
    const hist = new Uint32Array(256);
    for (let i = 0; i < w * h; i += 1) {
      const v = (0.75 * px[i * 4] + 0.25 * px[i * 4 + 1]) / 255;
      lum[i] = v;
      hist[Math.min(255, Math.floor(v * 256))] += 1;
    }
    const level = (q: number) => {
      let seen = 0;
      for (let b = 0; b < 256; b += 1) {
        seen += hist[b];
        if (seen >= q * w * h) return b / 255;
      }
      return 1;
    };
    const lo = level(0.02);
    const hi = Math.max(lo + 0.05, level(0.98));
    for (let i = 0; i < w * h; i += 1) lum[i] = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo))) ** 1.35;

    const out = ctx.createImageData(w, h);
    const paint = (exposure: number) => {
      const d = out.data;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const i = y * w + x;
          const c = lum[i] * exposure > BAYER[(y & 7) * 8 + (x & 7)] ? PAPER_RGB : INK_RGB;
          d[i * 4] = c[0];
          d[i * 4 + 1] = c[1];
          d[i * 4 + 2] = c[2];
          d[i * 4 + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
    };
    if (!develop || STILL) {
      paint(develop ? 1 : 0);
      return;
    }
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      paint(1 - (1 - p) ** 2.4);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  img.src = src;
  return () => {
    gone = true;
    cancelAnimationFrame(raf);
  };
};
