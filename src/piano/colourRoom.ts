import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/* ──────────────────────────────────────────────────────────────────────────
   The room with the house lights on. The 1-bit stage is drawn for the dither: flat Phong, outlines, a black void.
   None of that survives being seen in colour, so the colour pass swaps in a second dressing of the same scene:
   physically based materials with reflections, rounded edges, textures painted on canvases at load, a properly
   built camera, and a room around the piano, cut away like an architect's model so the walls nearest the camera
   drop out of the way wherever it orbits. enter() and leave() wrap every colour render, so the stage never sees
   any of it.
   ────────────────────────────────────────────────────────────────────────── */

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* a seeded random, so the room is dressed the same on every visit */
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
};

const tex = (c: HTMLCanvasElement, opts: { repeat?: [number, number]; srgb?: boolean } = {}) => {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  return t;
};

/* fine per-pixel noise over whatever is on the canvas */
const grain = (g: CanvasRenderingContext2D, w: number, h: number, amount: number, seed = 7) => {
  const r = rng(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
};

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

/* ── painted textures ── */

/* oak planks, random lengths, staggered; tiles both ways. The canvas is 2.24 m square */
const floorTextures = () => {
  const S = 1024;
  const [c, g] = canvas(S, S);
  const [bc, bg] = canvas(S, S);
  bg.fillStyle = '#fff';
  bg.fillRect(0, 0, S, S);
  const r = rng(11);
  const ROWS = 16;
  const rh = S / ROWS;
  for (let row = 0; row < ROWS; row += 1) {
    let x = -r() * 400;
    while (x < S) {
      const len = 260 + r() * 420;
      const y = row * rh;
      const tone = r();
      const x0 = x;
      const draw = (ox: number) => {
        g.save();
        g.beginPath();
        g.rect(x0 + ox, y, len, rh);
        g.clip();
        g.fillStyle = hsl(28 + tone * 8, 34 + tone * 10, 40 + tone * 13);
        g.fillRect(x0 + ox, y, len, rh);
        /* the grain: long, slightly wavy streaks, and now and then a knot the streaks bend round */
        const knot = r() < 0.25 ? { kx: x0 + ox + r() * len, ky: y + r() * rh } : null;
        for (let k = 0; k < 26; k += 1) {
          const gy = y + r() * rh;
          g.strokeStyle = `rgba(${r() < 0.5 ? '60,35,18' : '255,230,190'},${0.05 + r() * 0.12})`;
          g.lineWidth = 0.6 + r() * 1.8;
          g.beginPath();
          const ph = r() * 10;
          for (let px = x0 + ox; px <= x0 + ox + len; px += 12) {
            let py = gy + Math.sin(px * 0.01 + ph) * 2.2;
            if (knot) {
              const dx = px - knot.kx;
              py += (14 * (gy - knot.ky)) / (Math.abs(gy - knot.ky) + 6) * Math.exp(-(dx * dx) / 900);
            }
            if (px === x0 + ox) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.stroke();
        }
        if (knot) {
          const kg = g.createRadialGradient(knot.kx, knot.ky, 0, knot.kx, knot.ky, 7);
          kg.addColorStop(0, 'rgba(50,28,14,0.8)');
          kg.addColorStop(1, 'rgba(50,28,14,0)');
          g.fillStyle = kg;
          g.fillRect(knot.kx - 8, knot.ky - 8, 16, 16);
        }
        g.restore();
        /* the seams, for both the colour and the bump */
        [g, bg].forEach((cx, i) => {
          cx.fillStyle = i ? '#000' : 'rgba(30,18,10,0.85)';
          cx.fillRect(x0 + ox, y, len, 2);
          cx.fillRect(x0 + ox, y, 2, rh);
        });
      };
      draw(0);
      if (x + len > S) draw(-S);
      if (x < 0) draw(S);
      x += len;
    }
  }
  grain(g, S, S, 10);
  const map = tex(c, { repeat: [1, 1] });
  const bump = tex(bc, { repeat: [1, 1], srgb: false });
  return { map, bump };
};

/* a round, hand-knotted rug: borders of small repeating motifs, a field with a central medallion, and the colour
   banding (abrash) of hand-dyed wool */
const rugTexture = () => {
  const S = 1024;
  const R = S / 2;
  const [c, g] = canvas(S, S);
  const MADDER = '#8a3a2d';
  const INDIGO = '#25304a';
  const CREAM = '#e6d7b8';
  const OCHRE = '#c08a3e';
  const TEAL = '#3f6a66';
  const INK = '#1e1a1b';
  g.translate(R, R);
  const disc = (r: number, fill: string) => {
    g.beginPath();
    g.arc(0, 0, r * R, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  };
  const around = (n: number, r: number, draw: (a: number) => void) => {
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      g.save();
      g.rotate(a);
      g.translate(0, -r * R);
      draw(a);
      g.restore();
    }
  };
  const diamond = (w: number, h: number, fill: string) => {
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(w, 0);
    g.lineTo(0, h);
    g.lineTo(-w, 0);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  const star = (n: number, ro: number, ri: number, fill: string) => {
    g.beginPath();
    for (let i = 0; i < n * 2; i += 1) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = (i % 2 ? ri : ro) * R;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  disc(1, INK);
  disc(0.985, INDIGO);
  around(64, 0.94, () => {
    diamond(9, 13, CREAM);
    diamond(4, 6, MADDER);
  });
  around(128, 0.94, (a) => {
    if (Math.round((a / (Math.PI * 2)) * 128) % 2) {
      g.fillStyle = OCHRE;
      g.fillRect(-1.5, -3, 3, 6);
    }
  });
  disc(0.895, OCHRE);
  disc(0.885, CREAM);
  /* a running zigzag in the guard band */
  g.beginPath();
  for (let i = 0; i <= 180; i += 1) {
    const a = (i / 180) * Math.PI * 2;
    const rr = (i % 2 ? 0.865 : 0.82) * R;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.strokeStyle = MADDER;
  g.lineWidth = 4;
  g.stroke();
  disc(0.8, INDIGO);
  disc(0.788, MADDER);
  /* the field: small flowers set out on rings */
  const r = rng(5);
  [0.7, 0.6, 0.5, 0.41].forEach((rr, k) => {
    around(18 + k * -2, rr, () => {
      g.rotate((r() - 0.5) * 0.3);
      [0, 1, 2, 3].forEach((q) => {
        g.save();
        g.rotate((q * Math.PI) / 2);
        diamond(3, 7, k % 2 ? CREAM : OCHRE);
        g.restore();
      });
      g.beginPath();
      g.arc(0, 0, 2.6, 0, Math.PI * 2);
      g.fillStyle = INDIGO;
      g.fill();
    });
  });
  /* the medallion */
  star(16, 0.33, 0.27, CREAM);
  star(16, 0.315, 0.255, INDIGO);
  star(8, 0.22, 0.15, OCHRE);
  star(8, 0.205, 0.137, TEAL);
  disc(0.11, CREAM);
  disc(0.095, MADDER);
  around(8, 0.06, () => diamond(4, 9, CREAM));
  disc(0.02, INK);
  g.setTransform(1, 0, 0, 1, 0, 0);
  /* abrash: each batch of wool dyed a touch differently, in rows across the rug */
  for (let y = 0; y < S; y += 6 + Math.floor(r() * 40)) {
    g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,220'},${r() * 0.07})`;
    g.fillRect(0, y, S, 6 + r() * 30);
  }
  /* knots: a tight weave you can see up close */
  g.globalAlpha = 0.07;
  g.fillStyle = '#000';
  for (let y = 0; y < S; y += 3) for (let x = (y / 3) % 2; x < S; x += 3) g.fillRect(x, y, 1, 1);
  g.globalAlpha = 1;
  grain(g, S, S, 26, 9);
  /* keep the outside of the circle transparent-free: it's never seen, the geometry is round */
  return tex(c);
};

/* soft limewash: big faint clouds over fine grit */
const plasterTexture = (base: string, seed: number) => {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  const r = rng(seed);
  for (let i = 0; i < 90; i += 1) {
    const x = r() * S;
    const y = r() * S;
    const rad = 40 + r() * 140;
    const light = r() < 0.5;
    [-S, 0, S].forEach((ox) =>
      [-S, 0, S].forEach((oy) => {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, light ? 'rgba(255,250,240,0.07)' : 'rgba(90,70,50,0.06)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }),
    );
  }
  grain(g, S, S, 14, seed + 1);
  return tex(c, { repeat: [1, 1] });
};

/* straight-grained wood: spruce for the soundboard, walnut for the metronome and the shelves */
const woodTexture = (h: number, s: number, l: number, lines: number, seed: number, vertical = true) => {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = hsl(h, s, l);
  g.fillRect(0, 0, S, S);
  const r = rng(seed);
  for (let i = 0; i < lines; i += 1) {
    const p = r() * S;
    const ph = r() * 6;
    g.strokeStyle = `hsla(${h} ${s}% ${l - 14 - r() * 10}% / ${0.12 + r() * 0.3})`;
    g.lineWidth = 0.5 + r() * 2.2;
    g.beginPath();
    for (let q = 0; q <= S; q += 8) {
      const w = p + Math.sin(q * 0.012 + ph) * 3 + Math.sin(q * 0.05 + ph) * 0.8;
      if (vertical) g.lineTo(w, q);
      else g.lineTo(q, w);
    }
    g.stroke();
  }
  grain(g, S, S, 10, seed + 3);
  return tex(c, { repeat: [1, 1] });
};

/* a bump map of little bumps: pebbled leatherette, or the weave of book cloth */
const pebbleTexture = (seed: number, dots = 2600, size = 3) => {
  const S = 256;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  const r = rng(seed);
  for (let i = 0; i < dots; i += 1) {
    const x = r() * S;
    const y = r() * S;
    const gr = g.createRadialGradient(x, y, 0, x, y, size);
    gr.addColorStop(0, `rgba(${r() < 0.6 ? 255 : 0},${r() < 0.6 ? 255 : 0},255,0.5)`);
    gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr;
    g.fillRect(x - size, y - size, size * 2, size * 2);
  }
  return tex(c, { repeat: [3, 3], srgb: false });
};

/* fine ridges round a ring, for the knurled grips on the lens and dials */
const knurlTexture = (n: number) => {
  const [c, g] = canvas(512, 8);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 8);
  g.fillStyle = '#fff';
  const w = 512 / n;
  for (let i = 0; i < n; i += 1) g.fillRect(i * w, 0, w * 0.5, 8);
  return tex(c, { srgb: false });
};

/* the view out of the window: a pale sky over the soft, out-of-focus green of a garden */
const windowTexture = () => {
  const [c, g] = canvas(512, 768);
  const sky = g.createLinearGradient(0, 0, 0, 768);
  sky.addColorStop(0, '#bcd3e6');
  sky.addColorStop(0.55, '#eef1ea');
  sky.addColorStop(1, '#f7eedc');
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 768);
  const r = rng(21);
  g.filter = 'blur(18px)';
  for (let i = 0; i < 40; i += 1) {
    const x = r() * 512;
    const y = 430 + r() * 340;
    g.fillStyle = hsl(90 + r() * 40, 25 + r() * 20, 30 + r() * 22);
    g.beginPath();
    g.ellipse(x, y, 40 + r() * 90, 30 + r() * 70, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.filter = 'none';
  return tex(c);
};

/* the big print on the wall: a quiet abstract, a low sun and a few lines of a stave */
const artTexture = () => {
  const [c, g] = canvas(768, 1024);
  g.fillStyle = '#ece4d3';
  g.fillRect(0, 0, 768, 1024);
  g.fillStyle = '#c9772f';
  g.beginPath();
  g.arc(470, 420, 210, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#28324a';
  g.fillRect(0, 620, 768, 404);
  g.fillStyle = '#8a3a2d';
  g.beginPath();
  g.moveTo(0, 620);
  g.quadraticCurveTo(300, 520, 768, 640);
  g.lineTo(768, 700);
  g.quadraticCurveTo(320, 600, 0, 690);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(30,26,27,0.75)';
  g.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) {
    g.beginPath();
    g.moveTo(90, 150 + i * 18);
    g.lineTo(420, 150 + i * 18);
    g.stroke();
  }
  g.fillStyle = 'rgba(30,26,27,0.8)';
  [[140, 186], [200, 168], [262, 204], [330, 150]].forEach(([x, y]) => {
    g.beginPath();
    g.ellipse(x, y, 11, 8, -0.4, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x + 9, y - 60, 3, 60);
  });
  grain(g, 768, 1024, 18, 4);
  return tex(c);
};

/* a smaller print: a strip of keys, cut paper */
const keysPrintTexture = () => {
  const [c, g] = canvas(512, 640);
  g.fillStyle = '#e9e1cf';
  g.fillRect(0, 0, 512, 640);
  g.fillStyle = '#1e1a1b';
  const keys = [1, 1, 0, 1, 1, 1, 0];
  for (let i = 0; i < 9; i += 1) {
    g.fillRect(40 + i * 48, 120, 4, 420);
    if (keys[i % 7] && i < 8) g.fillRect(40 + i * 48 + 30, 120, 30, 250);
  }
  g.fillStyle = '#c9772f';
  g.fillRect(40, 560, 432, 10);
  grain(g, 512, 640, 16, 8);
  return tex(c);
};

/* the dial behind the metronome's pendulum, marked from 40 to 208 */
const scaleTexture = () => {
  const [c, g] = canvas(128, 512);
  g.fillStyle = '#efe6cf';
  g.fillRect(0, 0, 128, 512);
  g.fillStyle = '#2a2420';
  g.font = '500 15px Georgia, serif';
  g.textAlign = 'right';
  const marks = [40, 50, 60, 72, 84, 96, 108, 120, 132, 144, 160, 176, 192, 208];
  marks.forEach((m, i) => {
    const y = 40 + i * 32;
    g.fillRect(86, y - 1, 26, 2);
    g.fillText(String(m), 78, y + 5);
  });
  return tex(c);
};

/* a soft round glow, for the bulb */
const glowTexture = () => {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,236,200,1)');
  gr.addColorStop(0.25, 'rgba(255,214,150,0.45)');
  gr.addColorStop(1, 'rgba(255,200,130,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
};

export type ColourRefs = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  piano: THREE.Group;
  bench: THREE.Group;
  cam: THREE.Group;
  metronome: THREE.Group;
  lamp: THREE.Group;
  cord: THREE.Group;
  lampBulb: THREE.Mesh;
  bead: THREE.Mesh;
  /* the middle of the room, on the floor */
  centre: THREE.Vector3;
  /* the piano's outline from above: x across, y from the keyboard toward the tail */
  outline: THREE.Vector2[];
  legs: [number, number][];
  stringPositions: ArrayLike<number>;
  bassStrings: number;
  inkLine: THREE.Material;
  /* stage materials, and a few particular meshes, to dress differently */
  mats: Record<
    | 'lacquer' | 'lid' | 'ivory' | 'whiteKeys' | 'ebony' | 'blackKeys' | 'plate' | 'board' | 'brass' | 'walnut' | 'paper'
    | 'silver' | 'cover' | 'name' | 'rug' | 'roleBars',
    THREE.Material
  >;
  seat: THREE.Mesh;
  lights: {
    spot: THREE.SpotLight;
    hemi: THREE.HemisphereLight;
    rim: THREE.DirectionalLight;
    bounce: THREE.PointLight;
    house: THREE.AmbientLight;
  };
};

export type ColourWorld = { enter: (camera: THREE.Camera) => void; leave: () => void };

export const createColourWorld = (o: ColourRefs): ColourWorld => {
  const { scene, mats } = o;
  const C = o.centre;

  /* reflections: a stand-in for this very room, dim and warm, with the window bright on one side and the lamp's
     glow overhead. Black lacquer is only ever as good as what it reflects, and a generic bright studio turns it
     grey; this keeps it black with a window sliding across it */
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x1d1915);
  const envBox = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: 0x2b241e, side: THREE.BackSide }));
  envBox.position.y = 2;
  const envFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: 0x3a2a1c }));
  envFloor.rotation.x = -Math.PI / 2;
  envFloor.position.y = -0.9;
  const envWindow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8f0ff).multiplyScalar(5) }));
  envWindow.position.set(0.8, 1.6, -5.9);
  const envWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.6), new THREE.MeshBasicMaterial({ color: 0x6b5f50 }));
  envWall.position.set(0, 2.6, -5.95);
  const envLamp = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd29a).multiplyScalar(3) }));
  envLamp.rotation.x = Math.PI / 2;
  envLamp.position.set(0, 4.9, 0);
  const envSide = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1df).multiplyScalar(1.2) }));
  envSide.position.set(5.9, 1.8, 1);
  envSide.rotation.y = -Math.PI / 2;
  envScene.add(envBox, envFloor, envWall, envWindow, envLamp);
  envSide.geometry.dispose();
  const pmrem = new THREE.PMREMGenerator(o.renderer);
  const envTex = pmrem.fromScene(envScene, 0.02).texture;
  pmrem.dispose();

  const leather = pebbleTexture(3, 3400, 2.4);
  const cloth = pebbleTexture(8, 5000, 1.4);
  const knurl = knurlTexture(90);
  const fine = knurlTexture(160);

  /* ── the colour materials ── */
  const lacquer = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0b,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMapIntensity: 1.3,
  });
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.18 });
  const ebony = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb48f4c, metalness: 0.85, roughness: 0.36 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8b26a, metalness: 1, roughness: 0.2 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdcdcd6, metalness: 1, roughness: 0.22 });
  const satin = new THREE.MeshStandardMaterial({ color: 0xc9c8c2, metalness: 1, roughness: 0.38, bumpMap: fine, bumpScale: 0.6 });
  const blackMetal = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.42 });
  const spruce = new THREE.MeshStandardMaterial({ map: woodTexture(36, 50, 56, 160, 2), roughness: 0.55 });
  const walnut = new THREE.MeshStandardMaterial({ map: woodTexture(22, 38, 26, 120, 6), roughness: 0.42 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xf2ede1, roughness: 0.92 });
  const bookCloth = new THREE.MeshStandardMaterial({ color: 0x4b2027, roughness: 0.9, bumpMap: cloth, bumpScale: 0.5 });
  const leatherMat = new THREE.MeshPhysicalMaterial({
    color: 0x121112,
    roughness: 0.55,
    bumpMap: leather,
    bumpScale: 0.35,
    clearcoat: 0.25,
    clearcoatRoughness: 0.5,
  });
  const nameGold = new THREE.MeshStandardMaterial({
    map: (mats.name as THREE.MeshBasicMaterial).map,
    color: 0xf0cf86,
    metalness: 1,
    roughness: 0.28,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const rug = new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1, bumpMap: cloth, bumpScale: 0.7 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.3 });
  const bulb = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  [lacquer, ivory, ebony, gold, brass, walnut, paper, bookCloth, leatherMat, spruce, chrome].forEach((m) => {
    m.polygonOffset = true;
    m.polygonOffsetFactor = 1;
    m.polygonOffsetUnits = 1;
  });

  const byStage = new Map<THREE.Material, THREE.Material>([
    [mats.lacquer, lacquer],
    [mats.lid, lacquer],
    [mats.ivory, ivory],
    [mats.whiteKeys, ivory],
    [mats.ebony, ebony],
    [mats.blackKeys, ebony],
    [mats.plate, gold],
    [mats.board, spruce],
    [mats.brass, brass],
    [mats.walnut, walnut],
    [mats.paper, paper],
    [mats.silver, chrome],
    [mats.cover, bookCloth],
    [mats.name, nameGold],
    [mats.rug, rug],
    [mats.roleBars, steel],
  ]);
  const byMesh = new Map<THREE.Object3D, THREE.Material>([
    [o.lampBulb, bulb],
    [o.bead, brass],
    [o.seat, leatherMat],
  ]);
  /* anything else keeps its colour and picture, and gets a plain, fairly matt surface */
  const converted = new Map<THREE.Material, THREE.Material>();
  const convert = (m: THREE.Material) => {
    if (!converted.has(m)) {
      const src = m as THREE.MeshLambertMaterial;
      if (src.type === 'MeshBasicMaterial') converted.set(m, m);
      else {
        const n = new THREE.MeshStandardMaterial({
          color: src.color,
          map: src.map,
          roughness: 0.75,
          side: src.side,
          transparent: src.transparent,
          alphaTest: src.alphaTest,
        });
        n.polygonOffset = src.polygonOffset;
        n.polygonOffsetFactor = src.polygonOffsetFactor;
        n.polygonOffsetUnits = src.polygonOffsetUnits;
        converted.set(m, n);
      }
    }
    return converted.get(m)!;
  };

  /* boxes get softened edges, the way nothing real is ever knife-sharp */
  const rounded = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  const roundOf = (g: THREE.BufferGeometry) => {
    if (!rounded.has(g)) {
      const p = (g as THREE.BoxGeometry).parameters;
      const r = Math.min(0.012, Math.min(p.width, p.height, p.depth) * 0.16);
      rounded.set(g, r > 0.0008 ? new RoundedBoxGeometry(p.width, p.height, p.depth, 3, r) : g);
    }
    return rounded.get(g)!;
  };

  /* ── sort the stage into what's swapped, what's hidden, what's left alone ── */
  type Swap = { m: THREE.Mesh; stageMat: THREE.Material | THREE.Material[]; mat: THREE.Material; stageGeo: THREE.BufferGeometry; geo: THREE.BufferGeometry };
  const swaps: Swap[] = [];
  const hidden: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.userData.stageOnly) {
      hidden.push(obj);
      return;
    }
    const line = obj as THREE.Line;
    if (line.isLine || (obj as THREE.Points).isPoints) {
      if (line.material !== o.inkLine) hidden.push(obj);
      return;
    }
    const m = obj as THREE.Mesh;
    if (!m.isMesh || obj.type === 'Sprite') return;
    const stageMat = m.material as THREE.Material;
    if (Array.isArray(m.material) || stageMat.visible === false) return;
    const base = (m.userData.baseMat as THREE.Material) ?? stageMat;
    const mat = byMesh.get(m) ?? byStage.get(base) ?? byStage.get(stageMat) ?? convert(stageMat);
    const geo = (m.userData.colourGeo as THREE.BufferGeometry) ?? (m.geometry.type === 'BoxGeometry' ? roundOf(m.geometry) : m.geometry);
    if (mat !== stageMat || geo !== m.geometry) swaps.push({ m, stageMat, mat, stageGeo: m.geometry, geo });
  });

  /* everything only the colour pass sees */
  const world = new THREE.Group();
  world.visible = false;
  scene.add(world);
  const onlyIn = (parent: THREE.Object3D, ...objs: THREE.Object3D[]) => {
    const g = new THREE.Group();
    g.visible = false;
    g.add(...objs);
    parent.add(g);
    attached.push(g);
    return g;
  };
  const attached: THREE.Object3D[] = [];
  const shadowed = <T extends THREE.Mesh>(m: T, cast = true) => {
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };

  /* ── the room: a floor slab and four walls, each with panelled wainscot, a rail and a skirting board ── */
  const HALF = 3.05;
  const H = 3.05;
  const floorTex = floorTextures();
  floorTex.map.repeat.set((HALF * 2) / 2.24, (HALF * 2) / 2.24);
  floorTex.bump.repeat.copy(floorTex.map.repeat);
  const oak = new THREE.MeshStandardMaterial({ map: floorTex.map, bumpMap: floorTex.bump, bumpScale: 0.6, roughness: 0.48, envMapIntensity: 0.7 });
  const slabSide = new THREE.MeshStandardMaterial({ color: 0x3a3029, roughness: 0.9 });
  const slab = shadowed(
    new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 0.24, 0.3, HALF * 2 + 0.24), [slabSide, slabSide, oak, slabSide, slabSide, slabSide]),
    false,
  );
  slab.position.set(C.x, -0.15, C.z);
  world.add(slab);

  const plaster = new THREE.MeshStandardMaterial({ map: plasterTexture('#d9cbb4', 31), roughness: 0.95 });
  const paint = new THREE.MeshStandardMaterial({ color: 0x56604f, roughness: 0.55, envMapIntensity: 0.6 });
  const paintDeep = new THREE.MeshStandardMaterial({ color: 0x4a5344, roughness: 0.5, envMapIntensity: 0.6 });
  const cutEdge = new THREE.MeshStandardMaterial({ color: 0x2c2723, roughness: 0.9 });

  /* soft darkening where floor meets wall: the light that never quite gets into a corner */
  const [sc, sg] = canvas(4, 128);
  const sgr = sg.createLinearGradient(0, 0, 0, 128);
  sgr.addColorStop(0, 'rgba(20,12,6,0.55)');
  sgr.addColorStop(1, 'rgba(20,12,6,0)');
  sg.fillStyle = sgr;
  sg.fillRect(0, 0, 4, 128);
  const skirtShade = new THREE.MeshBasicMaterial({ map: tex(sc), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });

  type Wall = { g: THREE.Group; p: THREE.Vector3; n: THREE.Vector3 };
  const walls: Wall[] = [];
  const makeWall = (angle: number, len: number) => {
    /* local x runs along the wall, local +z faces into the room */
    const g = new THREE.Group();
    const n = V(-Math.sin(angle), 0, -Math.cos(angle)).multiplyScalar(-1);
    const p = C.clone().addScaledVector(n, -HALF);
    g.position.copy(p);
    g.rotation.y = angle;
    const body = shadowed(new THREE.Mesh(new THREE.BoxGeometry(len, H, 0.14), [plaster, plaster, cutEdge, plaster, plaster, plaster]), false);
    body.position.set(0, H / 2, -0.07);
    g.add(body);
    const WH = 0.98;
    const board = shadowed(new THREE.Mesh(new THREE.BoxGeometry(len, WH, 0.02), paint), false);
    board.position.set(0, WH / 2, 0.01);
    g.add(board);
    const panels = Math.max(1, Math.round(len / 0.78));
    const pw = len / panels;
    for (let i = 0; i < panels; i += 1) {
      const panel = shadowed(new THREE.Mesh(new RoundedBoxGeometry(pw - 0.16, WH - 0.36, 0.024, 2, 0.008), paintDeep), false);
      panel.position.set(-len / 2 + pw * (i + 0.5), 0.14 + (WH - 0.14) / 2 + 0.02, 0.026);
      g.add(panel);
    }
    const rail = shadowed(new THREE.Mesh(new RoundedBoxGeometry(len, 0.05, 0.045, 2, 0.012), paint), false);
    rail.position.set(0, WH, 0.024);
    const skirting = shadowed(new THREE.Mesh(new RoundedBoxGeometry(len, 0.15, 0.035, 2, 0.008), paint), false);
    skirting.position.set(0, 0.075, 0.02);
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.45), skirtShade);
    shade.rotation.x = -Math.PI / 2;
    shade.position.set(0, 0.003, 0.26);
    g.add(rail, skirting, shade);
    world.add(g);
    walls.push({ g, p, n });
    return g;
  };
  const back = makeWall(0, HALF * 2); // at -z, facing +z
  const left = makeWall(Math.PI / 2, HALF * 2); // at -x, facing +x
  makeWall(-Math.PI / 2, HALF * 2); // at +x, facing -x
  makeWall(Math.PI, HALF * 2); // at +z, facing -z

  /* the back wall: a tall window onto the garden, a curtain either side */
  {
    const wx = 0.55;
    const win = new THREE.Group();
    win.position.set(wx, 0, 0);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.95), new THREE.MeshBasicMaterial({ map: windowTexture() }));
    glass.position.set(0, 1.07 + 0.975, 0.004);
    win.add(glass);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xefe9dd, roughness: 0.5 });
    const bar = (w: number, h: number, x: number, y: number, d = 0.06) => {
      const b = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.008), frameMat), false);
      b.position.set(x, y, d / 2);
      win.add(b);
    };
    bar(1.46, 0.08, 0, 1.07 + 1.95 + 0.04); // head
    bar(0.08, 2.07, -0.69, 1.07 + 0.975);
    bar(0.08, 2.07, 0.69, 1.07 + 0.975);
    bar(1.56, 0.06, 0, 1.04, 0.16); // sill
    bar(0.035, 1.95, 0, 1.07 + 0.975, 0.04); // mullions
    [0.48, 0.97, 1.46].forEach((y) => bar(1.3, 0.03, 0, 1.07 + y, 0.04));
    /* curtains: heavy linen in deep folds, on a brass rod */
    const linen = new THREE.MeshStandardMaterial({ color: 0xe6ddca, roughness: 1, side: THREE.DoubleSide });
    [-1, 1].forEach((side) => {
      const geo = new THREE.PlaneGeometry(0.5, 2.55, 60, 12);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const t = (y + 1.275) / 2.55; // 0 at the hem, 1 at the rod
        pos.setZ(i, 0.05 * Math.sin(x * 38 + side) * (0.75 + 0.25 * t) + 0.09);
        pos.setX(i, x * (0.82 + 0.18 * t) + (1 - t) * side * 0.03);
      }
      geo.computeVertexNormals();
      const c = shadowed(new THREE.Mesh(geo, linen), false);
      c.position.set(side * 0.93, 1.275 + 0.32, 0);
      win.add(c);
    });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.5, 12), brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 2.92, 0.13);
    win.add(rod);
    [-1.27, 1.27].forEach((x) => {
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), brass);
      fin.position.set(x, 2.92, 0.13);
      win.add(fin);
    });
    back.add(win);
  }

  /* daylight from the window, cool against the lamp */
  const daylight = new THREE.DirectionalLight(0xdfe8ff, 0);
  daylight.position.set(C.x + 0.6, 3.2, C.z - 6);
  daylight.target.position.copy(C);
  scene.add(daylight, daylight.target);

  /* the left wall: two framed prints */
  {
    const frame = (w: number, h: number, map: THREE.Texture, x: number, y: number) => {
      const f = new THREE.Group();
      const moulding = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w + 0.1, h + 0.1, 0.04, 2, 0.01), blackMetal), true);
      const matBoard = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.02, h + 0.02), new THREE.MeshStandardMaterial({ color: 0xf3eee3, roughness: 0.95 }));
      matBoard.position.z = 0.0205;
      const art = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, h * 0.82), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }));
      art.position.z = 0.021;
      f.add(moulding, matBoard, art);
      f.position.set(x, y, 0.03);
      left.add(f);
    };
    frame(0.78, 1.02, artTexture(), 1.35, 1.85);
    frame(0.4, 0.5, keysPrintTexture(), 0.45, 1.62);
  }

  /* the right wall: a bookcase, full */
  {
    const caseG = new THREE.Group();
    const CW = 1.5;
    const CH = 2.1;
    const CD = 0.32;
    const shelfMat = walnut;
    const plank = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const p = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.006), shelfMat));
      p.position.set(x, y, z);
      caseG.add(p);
    };
    plank(0.035, CH, CD, -CW / 2, CH / 2, CD / 2);
    plank(0.035, CH, CD, CW / 2, CH / 2, CD / 2);
    plank(CW + 0.06, 0.04, CD + 0.02, 0, CH, CD / 2);
    plank(CW, 0.01, 0.01, 0, CH / 2, 0.005); // back rail
    const levels = [0.06, 0.48, 0.9, 1.32, 1.72];
    levels.forEach((y) => plank(CW - 0.035, 0.03, CD, 0, y, CD / 2));
    const back2 = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshStandardMaterial({ color: 0x2f2620, roughness: 0.9 }));
    back2.position.set(0, CH / 2, 0.004);
    caseG.add(back2);
    const r = rng(77);
    const SPINES = [0x7a2e26, 0x25304a, 0xc08a3e, 0xe6d7b8, 0x3f5a46, 0x1e1a1b, 0x8b6a4f, 0x4b2027, 0xb7a58a, 0x34465e];
    const books: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const q = new THREE.Quaternion();
    levels.forEach((y0, li) => {
      if (li === levels.length) return;
      let x = -CW / 2 + 0.03;
      const top = (levels[li + 1] ?? CH) - y0 - 0.06;
      while (x < CW / 2 - 0.06) {
        if (r() < 0.07) {
          x += 0.05 + r() * 0.12; // a gap
          continue;
        }
        if (r() < 0.08) {
          /* a short stack lying flat */
          const n = 2 + Math.floor(r() * 3);
          const w = 0.17 + r() * 0.06;
          let yy = y0 + 0.015;
          for (let k = 0; k < n; k += 1) {
            const t = 0.025 + r() * 0.02;
            books.push({
              m: new THREE.Matrix4().compose(V(x + w / 2, yy + t / 2, CD * 0.5), q.identity(), V(w, t, 0.2 + r() * 0.05)),
              c: new THREE.Color(SPINES[Math.floor(r() * SPINES.length)]),
            });
            yy += t;
          }
          x += w + 0.02;
          continue;
        }
        const w = 0.022 + r() * 0.035;
        const h = Math.min(top, 0.2 + r() * 0.12);
        const d = 0.17 + r() * 0.08;
        books.push({
          m: new THREE.Matrix4().compose(V(x + w / 2, y0 + 0.015 + h / 2, CD - d / 2 - 0.02), q.identity(), V(w, h, d)),
          c: new THREE.Color(SPINES[Math.floor(r() * SPINES.length)]).offsetHSL(0, 0, (r() - 0.5) * 0.08),
        });
        x += w + 0.002;
      }
    });
    const bookMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 1, 0.06), new THREE.MeshStandardMaterial({ roughness: 0.8 }), books.length);
    books.forEach((b, i) => {
      bookMesh.setMatrixAt(i, b.m);
      bookMesh.setColorAt(i, b.c);
    });
    bookMesh.castShadow = true;
    bookMesh.receiveShadow = true;
    caseG.add(bookMesh);
    /* a vase on top */
    const vase = shadowed(
      new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            [0, 0], [0.05, 0], [0.07, 0.05], [0.065, 0.12], [0.035, 0.2], [0.03, 0.24], [0.04, 0.26],
          ].map(([x, y]) => new THREE.Vector2(x, y)),
          28,
        ),
        new THREE.MeshPhysicalMaterial({ color: 0x8a3a2d, roughness: 0.25, clearcoat: 1 }),
      ),
    );
    vase.position.set(0.45, CH + 0.02, CD / 2);
    caseG.add(vase);
    caseG.position.set(-1.45, 0, 0);
    left.add(caseG);
  }

  /* a fiddle-leaf fig in the back corner */
  {
    const plant = new THREE.Group();
    const pot = shadowed(
      new THREE.Mesh(
        new THREE.LatheGeometry(
          [[0, 0.0], [0.15, 0], [0.17, 0.02], [0.21, 0.36], [0.2, 0.38], [0.185, 0.38], [0.18, 0.35]].map(([x, y]) => new THREE.Vector2(x, y)),
          36,
        ),
        new THREE.MeshPhysicalMaterial({ color: 0xe9e2d3, roughness: 0.35, clearcoat: 0.6 }),
      ),
    );
    const soil = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 1 }));
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.34;
    plant.add(pot, soil);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.8 });
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.bezierCurveTo(0.07, 0.03, 0.11, 0.16, 0.06, 0.25);
    leafShape.bezierCurveTo(0.04, 0.28, 0.01, 0.29, 0, 0.3);
    leafShape.bezierCurveTo(-0.01, 0.29, -0.04, 0.28, -0.06, 0.25);
    leafShape.bezierCurveTo(-0.11, 0.16, -0.07, 0.03, 0, 0);
    const leafGeo = new THREE.ShapeGeometry(leafShape, 10);
    const lp = leafGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < lp.count; i += 1) {
      const x = lp.getX(i);
      const y = lp.getY(i);
      lp.setZ(i, x * x * 3 - Math.abs(x) * 0.15 + y * y * -0.35); // cupped along the midrib, drooping at the tip
    }
    leafGeo.computeVertexNormals();
    const r = rng(41);
    const leaves: THREE.Matrix4[] = [];
    const tints: THREE.Color[] = [];
    [
      [1.55, 0.0, 0.0],
      [1.25, 0.07, 0.05],
      [1.0, -0.06, 0.03],
    ].forEach(([h, lean, lean2]) => {
      const curve = new THREE.CatmullRomCurve3([V(0, 0.34, 0), V(lean * 0.5, h * 0.5, lean2 * 0.5), V(lean, h, lean2)]);
      const stem = shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.011, 6), stemMat));
      plant.add(stem);
      const n = Math.round(h * 13);
      for (let k = 0; k < n; k += 1) {
        const t = 0.35 + (k / n) * 0.65;
        const at = curve.getPoint(t);
        const yaw = k * 2.4 + r() * 0.6;
        const s = 0.75 + r() * 0.55 - (t > 0.92 ? 0.25 : 0);
        const m = new THREE.Matrix4().compose(
          at,
          new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.9 + r() * 0.5, yaw, (r() - 0.5) * 0.4, 'YXZ')),
          V(s, s, s),
        );
        leaves.push(m);
        tints.push(new THREE.Color().setHSL(0.27 + r() * 0.04, 0.42 + r() * 0.15, 0.2 + r() * 0.08));
      }
    });
    const leafMesh = new THREE.InstancedMesh(
      leafGeo,
      new THREE.MeshPhysicalMaterial({ roughness: 0.45, side: THREE.DoubleSide, clearcoat: 0.3, sheen: 0.3 }),
      leaves.length,
    );
    leaves.forEach((m, i) => {
      leafMesh.setMatrixAt(i, m);
      leafMesh.setColorAt(i, tints[i]);
    });
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    plant.add(leafMesh);
    plant.position.set(C.x - HALF + 0.42, 0, C.z - HALF + 0.42);
    world.add(plant);
  }

  /* contact shadows painted onto the rug: the dark under the piano, the bench and the plant, where no lamp reaches */
  {
    const X0 = -1.7;
    const Z0 = -2.6;
    const SX = 3.4;
    const SZ = 4.6;
    const PX = 150;
    const [cc, cg] = canvas(Math.round(SX * PX), Math.round(SZ * PX));
    const at = (x: number, z: number) => [(x - X0) * PX, (z - Z0) * PX] as const;
    cg.filter = 'blur(26px)';
    cg.fillStyle = 'rgba(0,0,0,0.55)';
    cg.beginPath();
    o.outline.forEach((p, i) => {
      const [x, y] = at(p.x, -p.y);
      if (i) cg.lineTo(x, y);
      else cg.moveTo(x, y);
    });
    cg.closePath();
    cg.fill();
    const [bx, bz] = at(-0.4, 0.66 - 0.19);
    cg.fillStyle = 'rgba(0,0,0,0.4)';
    cg.fillRect(bx, bz, 0.8 * PX, 0.38 * PX);
    cg.filter = 'blur(5px)';
    cg.fillStyle = 'rgba(0,0,0,0.85)';
    [...o.legs, [0, -0.34] as [number, number], [-0.34, 0.52], [0.34, 0.52], [-0.34, 0.8], [0.34, 0.8]].forEach(([x, z]) => {
      const [px, pz] = at(x, z);
      cg.beginPath();
      cg.arc(px, pz, 0.06 * PX, 0, Math.PI * 2);
      cg.fill();
    });
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(SX, SZ),
      new THREE.MeshBasicMaterial({ map: tex(cc), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.set(X0 + SX / 2, 0.005, Z0 + SZ / 2);
    world.add(contact);
  }

  /* ── the piano's own extras ── */
  /* brass caster cups under the legs */
  const casters = o.legs.map(([x, z]) => {
    const g = new THREE.Group();
    const cup = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.03, 28), brass));
    cup.position.y = 0.015;
    const ferrule = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 24), brass));
    ferrule.position.y = 0.055;
    g.add(cup, ferrule);
    g.position.set(x, 0, z);
    return g;
  });
  /* strings in steel, the bass ones copper-wound */
  const stringGeo = new THREE.BufferGeometry();
  stringGeo.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(o.stringPositions), 3));
  const segs = o.stringPositions.length / 6;
  const cols: number[] = [];
  for (let i = 0; i < segs; i += 1) {
    const c = i >= segs - o.bassStrings ? [0.72, 0.45, 0.25] : [0.82, 0.81, 0.78];
    cols.push(...c, ...c);
  }
  stringGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const strings = new THREE.LineSegments(stringGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
  onlyIn(o.piano, strings, ...casters);

  /* the metronome's scale, behind the pendulum */
  {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.13), new THREE.MeshStandardMaterial({ map: scaleTexture(), roughness: 0.6 }));
    plate.position.set(0, 0.105, 0.0345);
    plate.rotation.x = -0.146;
    const plinth = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.018, 0.11, 2, 0.005), walnut));
    plinth.position.y = 0.009;
    plinth.rotation.y = 0;
    onlyIn(o.metronome, plate, plinth);
  }

  /* ── the camera: a rangefinder, properly built ── */
  {
    const g = new THREE.Group();
    const add = (m: THREE.Mesh, x: number, y: number, z: number) => {
      shadowed(m);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    add(new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.058, 0.04, 3, 0.009), leatherMat), 0, -0.004, 0);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.133, 0.022, 0.043, 3, 0.007), satin), 0, 0.034, 0);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.133, 0.011, 0.043, 3, 0.004), satin), 0, -0.035, 0);
    /* rangefinder and viewfinder windows, and the frame-line window between them */
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1116, roughness: 0.04, metalness: 0, clearcoat: 1, envMapIntensity: 2 });
    add(new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.012, 0.004, 2, 0.002), glass), -0.045, 0.034, 0.0215);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.016, 0.012, 0.004, 2, 0.002), glass), 0.044, 0.034, 0.0215);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.008, 0.003, 2, 0.0015), new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.3 })), 0.024, 0.034, 0.0215);
    /* the lens: mount, focus ring with its tab, aperture ring, a hood, and the glass */
    const lensG = new THREE.Group();
    lensG.rotation.x = Math.PI / 2;
    lensG.position.set(0, -0.002, 0.02);
    const ring = (rTop: number, rBot: number, h: number, y: number, mat: THREE.Material) => {
      const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 48), mat));
      m.position.y = y;
      lensG.add(m);
    };
    const knurled = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, metalness: 0.5, roughness: 0.45, bumpMap: knurl, bumpScale: 2 });
    ring(0.027, 0.027, 0.006, 0.003, chrome);
    ring(0.024, 0.024, 0.012, 0.012, blackMetal);
    ring(0.0255, 0.0255, 0.009, 0.0225, knurled);
    ring(0.023, 0.023, 0.006, 0.03, chrome);
    ring(0.024, 0.024, 0.008, 0.037, knurled);
    ring(0.026, 0.022, 0.014, 0.048, blackMetal);
    const tab = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.008, 0.005, 0.012, 2, 0.002), chrome));
    tab.position.set(0, 0.022, -0.026);
    lensG.add(tab);
    const front = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 12, 0, Math.PI * 2, 0, 0.6), glass);
    front.scale.set(0.62, 0.25, 0.62);
    front.position.y = 0.05;
    lensG.add(front);
    /* the coated element inside, catching a faint violet-green */
    const coat = new THREE.Mesh(new THREE.CircleGeometry(0.016, 32), new THREE.MeshPhysicalMaterial({ color: 0x1c1430, roughness: 0.05, iridescence: 1, iridescenceIOR: 1.8, clearcoat: 1 }));
    coat.rotation.x = -Math.PI / 2;
    coat.position.y = 0.0485;
    lensG.add(coat);
    g.add(lensG);
    /* on top: shutter dial, release with its collar, advance lever, rewind knob, the accessory shoe */
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.007, 36), new THREE.MeshStandardMaterial({ color: 0xd2d1cb, metalness: 1, roughness: 0.3, bumpMap: knurl, bumpScale: 1.5 })), 0.033, 0.0485, -0.004);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0055, 0.006, 20), chrome), 0.051, 0.048, 0.008);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.004, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })), 0.051, 0.0525, 0.008);
    const lever = add(new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.003, 0.008, 2, 0.0012), chrome), 0.05, 0.0485, -0.014);
    lever.rotation.y = 0.5;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 30), new THREE.MeshStandardMaterial({ color: 0xd2d1cb, metalness: 1, roughness: 0.3, bumpMap: knurl, bumpScale: 1.5 })), -0.046, 0.05, -0.004);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.004, 0.018, 2, 0.0015), chrome), -0.008, 0.047, -0.002);
    /* strap lugs, and a small red badge */
    [-1, 1].forEach((s) => {
      const lug = add(new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0013, 8, 16), chrome), s * 0.0675, 0.026, 0);
      lug.rotation.y = Math.PI / 2;
    });
    const badge = add(new THREE.Mesh(new THREE.CircleGeometry(0.0042, 20), new THREE.MeshStandardMaterial({ color: 0xc2232b, roughness: 0.3 })), -0.024, 0.033, 0.02155);
    badge.castShadow = false;
    g.position.y = 0.004;
    onlyIn(o.cam, g);
  }

  /* ── the lamp: green enamel outside, white inside, brass trim, a cloth flex and a bead chain to pull ── */
  {
    const outer = new THREE.MeshPhysicalMaterial({ color: 0x1f3a2e, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
    const inner = new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.6, emissive: 0xffd9a0, emissiveIntensity: 0.55, side: THREE.BackSide });
    const shadeGeo = new THREE.CylinderGeometry(0.06, 0.18, 0.24, 64, 1, true);
    const shadeOut = new THREE.Mesh(shadeGeo, outer);
    const shadeIn = new THREE.Mesh(shadeGeo, inner);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.006, 10, 72), brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.12;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.062, 0.035, 40), brass);
    crown.position.y = 0.137;
    const flex = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 8, 8), new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.9 }));
    flex.position.y = 0.155 + 4;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(0.3, 0.3, 1);
    glow.position.copy(o.lampBulb.position);
    onlyIn(o.lamp, shadeOut, shadeIn, rim, crown, flex, glow);
    /* the chain, bead by bead, down to the brass pull */
    const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045, 8, 6), brass, 26);
    for (let i = 0; i < 26; i += 1) beads.setMatrixAt(i, new THREE.Matrix4().makeTranslation(0, -i * 0.0115, 0));
    onlyIn(o.cord, beads);
  }
  const pendant = new THREE.PointLight(0xffc98a, 0, 4.5, 2);
  o.lampBulb.add(pendant);

  /* ── switching ── */
  const L = o.lights;
  let saved: {
    bg: THREE.Color | THREE.Texture | null;
    fogNear: number;
    fogFar: number;
    spot: number;
    penumbra: number;
    radius: number;
    hemi: number;
    hemiSky: THREE.Color;
    hemiGround: THREE.Color;
    rim: number;
    bounce: number;
    house: number;
    lampVisible: boolean;
    vis: boolean[];
  } | null = null;
  const BG = new THREE.Color(0xe7dfd2);
  const camPos = new THREE.Vector3();

  return {
    enter(camera) {
      const fog = scene.fog as THREE.Fog;
      saved = {
        bg: scene.background,
        fogNear: fog.near,
        fogFar: fog.far,
        spot: L.spot.intensity,
        penumbra: L.spot.penumbra,
        radius: L.spot.shadow.radius,
        hemi: L.hemi.intensity,
        hemiSky: L.hemi.color.clone(),
        hemiGround: L.hemi.groundColor.clone(),
        rim: L.rim.intensity,
        bounce: L.bounce.intensity,
        house: L.house.intensity,
        lampVisible: o.lamp.visible,
        vis: hidden.map((h) => h.visible),
      };
      scene.background = BG;
      scene.environment = envTex;
      fog.near = 60;
      fog.far = 90;
      L.spot.intensity = 52;
      L.spot.penumbra = 0.9;
      L.spot.shadow.radius = 7;
      L.hemi.intensity = 0.42;
      L.hemi.color.set(0xfff2e2);
      L.hemi.groundColor.set(0x6a5038);
      L.rim.intensity = 0.5;
      L.bounce.intensity = 1.2;
      L.house.intensity = 0.06;
      daylight.intensity = 0.6;
      pendant.intensity = 1.6;
      o.lamp.visible = true;
      swaps.forEach((s) => {
        s.m.material = s.mat;
        s.m.geometry = s.geo;
      });
      hidden.forEach((h) => (h.visible = false));
      attached.forEach((a) => (a.visible = true));
      world.visible = true;
      /* the cutaway: a wall only stands while the camera is on the room's side of it */
      camera.getWorldPosition(camPos);
      walls.forEach((w) => {
        w.g.visible = camPos.clone().sub(w.p).dot(w.n) > 0;
      });
    },
    leave() {
      if (!saved) return;
      const fog = scene.fog as THREE.Fog;
      scene.background = saved.bg;
      scene.environment = null;
      fog.near = saved.fogNear;
      fog.far = saved.fogFar;
      L.spot.intensity = saved.spot;
      L.spot.penumbra = saved.penumbra;
      L.spot.shadow.radius = saved.radius;
      L.hemi.intensity = saved.hemi;
      L.hemi.color.copy(saved.hemiSky);
      L.hemi.groundColor.copy(saved.hemiGround);
      L.rim.intensity = saved.rim;
      L.bounce.intensity = saved.bounce;
      L.house.intensity = saved.house;
      daylight.intensity = 0;
      pendant.intensity = 0;
      o.lamp.visible = saved.lampVisible;
      swaps.forEach((s) => {
        s.m.material = s.stageMat;
        s.m.geometry = s.stageGeo;
      });
      const vis = saved.vis;
      hidden.forEach((h, i) => (h.visible = vis[i]));
      attached.forEach((a) => (a.visible = false));
      world.visible = false;
      saved = null;
    },
  };
};
