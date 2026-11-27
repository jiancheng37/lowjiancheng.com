import * as THREE from 'three';

/* ──────────────────────────────────────────────────────────────────────────
   A grand piano under one stage light, rendered at low resolution and then
   ordered-dithered down to two colours. Units are metres.
   ────────────────────────────────────────────────────────────────────────── */

export type PartId = 'about' | 'name' | 'work' | 'thoughts' | 'off' | 'socials';
export const PART_IDS: PartId[] = ['about', 'name', 'work', 'thoughts', 'off', 'socials'];

export type ScreenPoint = { x: number; y: number; visible: boolean };
/* the open notebook's two pages on screen: corners top-left, top-right, bottom-right, bottom-left as x,y pairs */
export type BookQuads = { left: number[]; right: number[] };
/* a page mid-turn: both of its faces on screen (front = lying on the right, back = lying on the left), which one
   is showing, and how many page turns of the current flip have already landed */
export type LeafQuads = { front: number[]; back: number[]; showBack: boolean };
export type FrameInfo = {
  centre: ScreenPoint;
  moved: number;
  behind: Record<PartId, boolean>;
  camera: ScreenPoint;
  notebook: ScreenPoint;
  book: BookQuads | null;
  leaf: LeafQuads | null;
  flicks: number;
};
export type Pick = { part: PartId | null; midi: number | null; camera: boolean; book: boolean };

/* a transcribed performance: notes as [onset s, offset s, midi, velocity], sustain pedal as [down s, up s],
   and the beat, as the times the metronome should land on */
export type SongTrack = { notes: [number, number, number, number][]; pedal: [number, number][]; beats?: number[] };

export type PianoScene = {
  resize: (w: number, h: number, narrow: boolean) => void;
  pick: (clientX: number, clientY: number) => Pick;
  setHover: (part: PartId | null) => void;
  orbitBy: (dAzimuth: number, dPolar: number) => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;
  pressKey: (midi: number) => void;
  /* hand the piano a transcription and a clock (seconds into the recording); null stops it */
  setSong: (song: { track: SongTrack; time: () => number } | null) => void;
  /* the darkroom: glide into the bench camera's lens, come back out to the bench, and stop drawing while covered */
  /* the first visit: a dark stage with the name glowing on the closed lid; the light warms up, the camera comes
     down and the lid swings open. Skip jumps straight to the end */
  playIntro: (onDone: () => void) => void;
  skipIntro: () => void;
  /* a role on the work page is being pointed at: its string shivers (null lets it ring out) */
  setRole: (index: number | null) => void;
  flyIntoLens: (onDone: () => void) => void;
  leaveLens: () => void;
  setHidden: (hidden: boolean) => void;
  /* the notebook on the bench: lean in and open it, turn its pages, close it again */
  openBook: (onOpen: () => void) => void;
  closeBook: (onClosed?: () => void) => void;
  turnPage: (dir: 1 | -1, flicks: number, onDone?: () => void) => void;
  resetBook: () => void;
  flyTo: (part: PartId | null, onDone?: () => void) => void;
  dispose: () => void;
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* the notebook's measurements: cover w×d, pages pw×pd, cover and half-block thickness c and t */
const BOOK = { w: 0.2, d: 0.27, pw: 0.19, pd: 0.26, c: 0.004, t: 0.008 };
const SPINE = -BOOK.w / 2;
const PAGE_Y = BOOK.c + BOOK.t;

/* where each label points, and where the camera goes for each close-up */
export const ANCHORS: Record<PartId, THREE.Vector3> = {
  about: V(0.3, 0.72, 0.14),
  work: V(0.05, 0.86, -0.95),
  thoughts: V(-0.12, 1.22, -0.24),
  off: V(0.2, 0.58, 0.8),
  socials: V(-0.58, 1.17, -0.12),
  name: V(0.2, 1.62, -1.2),
};

const CLOSE: Record<PartId, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  about: { pos: V(0.62, 1.12, 0.92), target: V(-0.02, 0.71, 0.06) },
  work: { pos: V(2.35, 2.05, -0.35), target: V(-0.05, 1.0, -0.95) },
  thoughts: { pos: V(0.32, 1.28, 0.62), target: V(0.0, 1.09, -0.21) },
  off: { pos: V(0.95, 1.12, 1.6), target: V(0.04, 0.52, 0.64) },
  socials: { pos: V(-0.18, 1.22, 0.42), target: V(-0.58, 1.06, -0.12) },
  name: { pos: V(2.5, 1.75, 0.6), target: V(-0.05, 1.45, -0.95) },
};

const HOME = {
  wide: { pos: V(2.25, 2.85, 2.8), target: V(-0.1, 0.9, -0.42), fov: 33 },
  narrow: { pos: V(2.1, 3.6, 3.75), target: V(-0.1, 0.82, -0.4), fov: 40 },
};

/* ── piano outline, seen from above: u across, v from the keyboard to the tail ── */
const CURVE: [number, number][] = [
  [-0.728, 1.733], [-0.596, 1.8], [-0.441, 1.779], [-0.265, 1.651], [-0.11, 1.43], [0.066, 1.162],
  [0.243, 0.982], [0.463, 0.833], [0.662, 0.674], [0.75, 0.468],
];

const outline = (frontV = 0) => {
  const s = new THREE.Shape();
  s.moveTo(-0.75, frontV);
  s.lineTo(-0.75, 1.599);
  s.splineThru(CURVE.map(([u, v]) => new THREE.Vector2(u, v)));
  s.lineTo(0.75, frontV);
  s.lineTo(-0.75, frontV);
  return s;
};

const OUTER_PTS = (() => {
  const pts = outline().getPoints(10);
  if (pts[0].equals(pts[pts.length - 1])) pts.pop();
  return pts;
})();

const inset = (d: number) => {
  const pts = OUTER_PTS;
  const cw = THREE.ShapeUtils.isClockWise(pts);
  const n = pts.length;
  return pts.map((p, i) => {
    const t = new THREE.Vector2().subVectors(pts[(i + 1) % n], pts[(i - 1 + n) % n]).normalize();
    const nrm = cw ? new THREE.Vector2(t.y, -t.x) : new THREE.Vector2(-t.y, t.x);
    return p.clone().addScaledVector(nrm, d);
  });
};

/* the bentside as v(u), for string lengths */
const BENT = OUTER_PTS.filter((p) => p.y > 0.45 && p.x > -0.745).sort((a, b) => a.x - b.x);
const vEdge = (u: number) => {
  for (let i = 0; i < BENT.length - 1; i += 1) {
    const a = BENT[i];
    const b = BENT[i + 1];
    if (u >= a.x && u <= b.x) return a.y + ((b.y - a.y) * (u - a.x)) / (b.x - a.x || 1);
  }
  return u < BENT[0].x ? BENT[0].y : BENT[BENT.length - 1].y;
};

const extrude = (shape: THREE.Shape, depth: number) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); // (u, v, w) → (x = u, y = w, z = -v)
  return g;
};

/* ── keys: a full 88, A0 → C8 ── */
const WHITE_W = 0.0235;
const NAMES = 'ABCDEFG';
const STEP: Record<string, number> = { A: 2, B: 1, C: 2, D: 2, E: 1, F: 2, G: 2 };
type KeyInfo = { midi: number; x: number; black: boolean };
const KEYS: KeyInfo[] = (() => {
  const keys: KeyInfo[] = [];
  let midi = 21;
  const x0 = -WHITE_W * 26;
  for (let i = 0; i < 52; i += 1) {
    const name = NAMES[i % 7];
    keys.push({ midi, x: x0 + (i + 0.5) * WHITE_W, black: false });
    if (STEP[name] === 2 && i < 51) keys.push({ midi: midi + 1, x: x0 + (i + 1) * WHITE_W, black: true });
    midi += STEP[name];
  }
  return keys;
})();
const WHITE_KEYS = KEYS.filter((k) => !k.black);
const BLACK_KEYS = KEYS.filter((k) => k.black);

/* a page of music: the paper and its title, as a texture. The score itself is drawn as geometry on top (see the
   music desk), because painted lines this fine blur away to nothing in the dither */
const sheetTexture = (title: string) => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 352;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f3f0e7';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#111';
  g.font = 'italic 22px Georgia, serif';
  g.fillText(title, 18, 30);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

/* the score on a page (0.2 × 0.27, centred on its origin), as geometry. Staff lines, bar lines and stems are lines,
   which always come out exactly one dither dot wide, so the staves read as rows of music from across the room
   and as clean engraving up close. Note heads are small dark ovals on the lines and spaces */
const INK_LINE = new THREE.LineBasicMaterial({ color: 0x1a191c });
/* engraving is black up close; from across the room fine staves should read as grey, the way small print does,
   so the lines lighten as they get smaller on screen (see the frame loop) */
const INK_NEAR = new THREE.Color(0x1a191c);
const INK_FAR = new THREE.Color(0x86817a);
const INK_FILL = new THREE.MeshBasicMaterial({ color: 0x1a191c });
const HEAD_GEO = new THREE.CircleGeometry(0.0017, 8);
const scoreFor = (seed0: number) => {
  let seed = seed0;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const Z = 0.0012;
  const LINE = 0.0028; // between staff lines: real proportions, a staff about a fortieth of the page
  const x0 = -0.086;
  const x1 = 0.086;
  const pts: number[] = [];
  const heads: [number, number][] = [];
  for (let st = 0; st < 8; st += 1) {
    const top = 0.135 - 0.05 - st * 0.0265;
    for (let l = 0; l < 5; l += 1) pts.push(x0, top - l * LINE, Z, x1, top - l * LINE, Z);
    for (let b = 0; b <= 3; b += 1) {
      const bx = x0 + (b * (x1 - x0)) / 3;
      pts.push(bx, top, Z, bx, top - 4 * LINE, Z);
    }
    for (let n = 0; n < 12; n += 1) {
      const hx = x0 + 0.01 + n * 0.0138 + rnd() * 0.002;
      const step = Math.floor(rnd() * 11) - 1; // which line or space, a little above and below the staff too
      const hy = top + LINE - step * (LINE / 2);
      heads.push([hx, hy]);
      const up = hy < top - 2 * LINE; // low notes carry their stems up, high ones down
      const sx = up ? hx + 0.0021 : hx - 0.0021;
      pts.push(sx, hy, Z, sx, hy + (up ? 0.0098 : -0.0098), Z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const group = new THREE.Group();
  group.add(new THREE.LineSegments(geo, INK_LINE));
  const dots = new THREE.InstancedMesh(HEAD_GEO, INK_FILL, heads.length);
  const m = new THREE.Matrix4();
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.38);
  const stretch = new THREE.Vector3(1.35, 1, 1);
  heads.forEach(([hx, hy], i) => dots.setMatrixAt(i, m.compose(new THREE.Vector3(hx, hy, Z + 0.0002), tilt, stretch)));
  group.add(dots);
  return group;
};

/* ── the two-colour pass ── */
const DITHER_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const DITHER_FRAG = `
uniform sampler2D tScene;
uniform vec3 dark;
uniform vec3 light;
uniform float exposure;
uniform vec2 focus;
uniform float focusRadius;
uniform float focusStrength;
uniform float aspect;
uniform float quiet;
uniform float quietAxis;
varying vec2 vUv;
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  l = pow(max(l, 0.0), 1.0 / 2.2);
  // let the frame fall away to black at its edges
  vec2 q = (vUv - 0.5) * 2.0;
  float vignette = 1.0 - smoothstep(0.62, 1.3, length(q * vec2(1.0, 0.92)));
  // keep full detail around whatever matters right now, quieter elsewhere
  vec2 d = (vUv - focus) * vec2(aspect, 1.0);
  float inFocus = 1.0 - smoothstep(focusRadius, focusRadius * 2.4, length(d));
  // and keep the reading side calm while a panel is open
  float panelSide = quietAxis < 0.5 ? smoothstep(0.47, 0.57, vUv.x) : smoothstep(0.56, 0.48, vUv.y);
  l *= vignette * mix(1.0 - focusStrength, 1.0, inFocus) * (1.0 - quiet * panelSide);
  l = smoothstep(0.13, 0.9, l) * exposure;
  float t = bayer8(gl_FragCoord.xy) + 0.5 / 64.0;
  gl_FragColor = vec4(l > t ? light : dark, 1.0);
}
`;

export const createPianoScene = (
  canvas: HTMLCanvasElement,
  onFrame: (points: Record<PartId, ScreenPoint>, info: FrameInfo) => void,
): PianoScene => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 4.5, 9);

  const camera = new THREE.PerspectiveCamera(31, 1, 0.05, 40);

  const target = new THREE.WebGLRenderTarget(4, 4, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });

  const ditherMat = new THREE.ShaderMaterial({
    vertexShader: DITHER_VERT,
    fragmentShader: DITHER_FRAG,
    uniforms: {
      tScene: { value: target.texture },
      dark: { value: new THREE.Vector3(0.106, 0.102, 0.114) },
      light: { value: new THREE.Vector3(0.925, 0.91, 0.871) },
      exposure: { value: 1.0 },
      focus: { value: new THREE.Vector2(0.5, 0.5) },
      focusRadius: { value: 0.46 },
      focusStrength: { value: 0.3 },
      aspect: { value: 1 },
      quiet: { value: 0 },
      quietAxis: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const post = new THREE.Scene();
  post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ── lights ── */
  const spot = new THREE.SpotLight(0xfff4e6, 170, 0, 0.44, 0.32, 2);
  spot.position.set(1.3, 4.7, 2.1);
  spot.target.position.set(0, 0.5, -0.45);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.02;
  scene.add(spot, spot.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.1);
  scene.add(hemi);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(-2.6, 2.4, -3.4);
  scene.add(rim);
  const bounce = new THREE.PointLight(0xffffff, 5, 2.8, 2);
  bounce.position.set(0.35, 1.05, -0.95);
  scene.add(bounce);

  /* ── materials (each part gets its own copies, so hover can light just that part) ── */
  const lacquer = new THREE.MeshPhongMaterial({ color: 0x19191b, specular: 0x9a9a9a, shininess: 90 });
  const ivory = new THREE.MeshPhongMaterial({ color: 0xf1eee6, specular: 0x222222, shininess: 25 });
  const ebony = new THREE.MeshPhongMaterial({ color: 0x0c0c0d, specular: 0x777777, shininess: 80 });
  const plateMat = new THREE.MeshPhongMaterial({ color: 0x4a3f2c, specular: 0x554422, shininess: 25 });
  const boardMat = new THREE.MeshLambertMaterial({ color: 0x3a3023 });
  const brass = new THREE.MeshPhongMaterial({ color: 0xcbb37b, specular: 0xffffff, shininess: 70 });
  const walnut = new THREE.MeshPhongMaterial({ color: 0x5a4330, specular: 0x333333, shininess: 30 });
  const paper = new THREE.MeshLambertMaterial({ color: 0xf2efe6 });
  const silver = new THREE.MeshPhongMaterial({ color: 0xc8c8c8, specular: 0xffffff, shininess: 60 });
  const lightLine = new THREE.LineBasicMaterial({ color: 0xd9d5cc });
  const darkLine = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
  [lacquer, ivory, ebony, plateMat, boardMat, brass, walnut, paper, silver].forEach((m) => {
    m.polygonOffset = true;
    m.polygonOffsetFactor = 1;
    m.polygonOffsetUnits = 1;
  });

  const owned = new Map<string, THREE.Material>();
  const partMeshes: Record<PartId, THREE.Mesh[]> = { about: [], name: [], work: [], thoughts: [], off: [], socials: [] };
  const pickables: THREE.Object3D[] = [];

  const mesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    opts: { part?: PartId; edges?: 'light' | 'dark'; threshold?: number; shadow?: boolean } = {},
  ) => {
    let material = mat;
    if (opts.part) {
      const key = `${mat.uuid}:${opts.part}`;
      if (!owned.has(key)) owned.set(key, mat.clone());
      material = owned.get(key)!;
    }
    const m = new THREE.Mesh(geo, material);
    m.castShadow = opts.shadow !== false;
    m.receiveShadow = true;
    if (opts.edges) {
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, opts.threshold ?? 30), opts.edges === 'light' ? lightLine : darkLine));
    }
    if (opts.part) {
      m.userData.part = opts.part;
      partMeshes[opts.part].push(m);
      pickables.push(m);
    }
    return m;
  };

  const piano = new THREE.Group();
  scene.add(piano);

  /* case: a hollow shell, with a floor */
  const shell = outline();
  shell.holes.push(new THREE.Path(inset(0.035)));
  const caseMesh = mesh(extrude(shell, 0.3), lacquer, { edges: 'light', threshold: 40 });
  caseMesh.position.y = 0.645;
  piano.add(caseMesh);
  const caseFloor = mesh(extrude(outline(), 0.02), lacquer);
  caseFloor.position.y = 0.625;
  piano.add(caseFloor);

  /* soundboard, cast-iron plate (with its holes), then the strings — the "work" part */
  const board = mesh(extrude(new THREE.Shape(inset(0.035)), 0.01), boardMat, { part: 'work' });
  board.position.y = 0.76;
  piano.add(board);
  const plateShape = new THREE.Shape(inset(0.075));
  ([
    [-0.5, 1.22, 0.09],
    [-0.22, 0.78, 0.11],
    [0.14, 0.62, 0.1],
    [0.44, 0.5, 0.075],
    [-0.56, 0.62, 0.07],
    [-0.32, 1.45, 0.06],
  ] as [number, number, number][]).forEach(([u, v, r]) => {
    const hole = new THREE.Path();
    hole.absarc(u, v, r, 0, Math.PI * 2, true);
    plateShape.holes.push(hole);
  });
  const plate = mesh(extrude(plateShape, 0.025), plateMat, { part: 'work', edges: 'dark', threshold: 50 });
  plate.position.y = 0.79;
  piano.add(plate);

  const stringPts: number[] = [];
  for (let i = 0; i < 34; i += 1) {
    const u = -0.4 + (i / 33) * 1.04;
    const ue = u - 0.03;
    stringPts.push(u, 0.842, -0.34, ue, 0.838, -(vEdge(ue) - 0.1));
  }
  for (let i = 0; i < 12; i += 1) {
    const u = -0.68 + i * 0.019;
    const ue = u + 0.26 + i * 0.024;
    stringPts.push(u, 0.858, -0.36, ue, 0.855, -(vEdge(ue) - 0.12));
  }
  const stringGeo = new THREE.BufferGeometry();
  stringGeo.setAttribute('position', new THREE.Float32BufferAttribute(stringPts, 3));
  const stringMat = new THREE.LineBasicMaterial({ color: 0xeeeae0 });
  const strings = new THREE.LineSegments(stringGeo, stringMat);
  piano.add(strings);

  /* five of those strings belong to the five roles on the work page, newest first: a touch heavier, and the two
     still to come drawn dashed, not yet strung. Each is a run of short bars, so it can shiver when its role is pointed at */
  const ROLE_STRINGS = [
    { i: 29, dashed: true },
    { i: 23, dashed: true },
    { i: 17, dashed: false },
    { i: 11, dashed: false },
    { i: 5, dashed: false },
  ];
  const BEADS = 48;
  const roleBars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    ROLE_STRINGS.length * BEADS,
  );
  roleBars.castShadow = false;
  roleBars.receiveShadow = false;
  const roles = ROLE_STRINGS.map(({ i, dashed }) => {
    const u = -0.4 + (i / 33) * 1.04;
    const ue = u - 0.03;
    const a = V(u, 0.846, -0.34);
    const b = V(ue, 0.842, -(vEdge(ue) - 0.1));
    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.normalize();
    return { a, dir, len, dashed, q: new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir), energy: 0, glow: 1 };
  });
  const roleMtx = new THREE.Matrix4();
  const rolePos = new THREE.Vector3();
  const roleScale = new THREE.Vector3();
  const placeRole = (n: number, t: number) => {
    const r = roles[n];
    const seg = (r.len / BEADS) * (r.dashed ? 0.5 : 1.04);
    for (let k = 0; k < BEADS; k += 1) {
      const sAt = (k + 0.5) / BEADS;
      /* the fundamental plus a little of the second harmonic, so it reads as a plucked string rather than a wave */
      const lift =
        r.energy * 0.04 * (Math.sin(Math.PI * sAt) * Math.sin(t * 44) + 0.35 * Math.sin(2 * Math.PI * sAt) * Math.sin(t * 88 + 0.6));
      rolePos.copy(r.a).addScaledVector(r.dir, sAt * r.len);
      rolePos.y += lift;
      roleMtx.compose(rolePos, r.q, roleScale.set(0.011 + 0.013 * r.energy, 0.005 + 0.004 * r.energy, seg));
      roleBars.setMatrixAt(n * BEADS + k, roleMtx);
    }
  };
  const roleTint = new THREE.Color();
  const tintRole = (n: number) => {
    roleTint.lerpColors(ROLE_DIM, ROLE_LIT, roles[n].glow);
    for (let k = 0; k < BEADS; k += 1) roleBars.setColorAt(n * BEADS + k, roleTint);
  };
  const ROLE_LIT = new THREE.Color(0xffffff);
  const ROLE_DIM = new THREE.Color(0x67635d);
  roles.forEach((_, n) => {
    placeRole(n, 0);
    tintRole(n);
  });
  piano.add(roleBars);
  let roleHot: number | null = null;
  /* while a role is pointed at, the light drops on the soundboard and plate so its one lit string stands clear */
  const benchDim = [board, plate].map((m) => {
    const mat = m.material as THREE.MeshPhongMaterial; // the plate shines; the soundboard (Lambert) doesn't
    return { mat, base: mat.color.clone(), spec: mat.specular ? mat.specular.clone() : null };
  });
  let boardDim = 0;
  const STRING_LIT = new THREE.Color(0xeeeae0);
  const STRING_DIM = new THREE.Color(0x67635d);

  const damperGeo = new THREE.BoxGeometry(0.016, 0.03, 0.04);
  const dampers = new THREE.InstancedMesh(damperGeo, ebony, 44);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < 44; i += 1) {
    mtx.makeTranslation(-0.38 + i * 0.0232, 0.875, -0.37);
    dampers.setMatrixAt(i, mtx);
  }
  dampers.castShadow = true;
  piano.add(dampers);

  /* music shelf and desk, with two pages of an étude — "projects" */
  const shelf = mesh(new THREE.BoxGeometry(1.43, 0.02, 0.3), lacquer, { edges: 'light' });
  shelf.position.set(0, 0.935, -0.15);
  piano.add(shelf);
  const desk = new THREE.Group();
  desk.position.set(0, 0.945, -0.21);
  desk.rotation.x = -0.24;
  const deskBoard = mesh(new THREE.BoxGeometry(0.86, 0.3, 0.016), lacquer, { part: 'thoughts', edges: 'light' });
  deskBoard.position.y = 0.15;
  desk.add(deskBoard);
  const ledge = mesh(new THREE.BoxGeometry(0.86, 0.02, 0.05), lacquer, { part: 'thoughts', edges: 'light' });
  ledge.position.set(0, 0.01, 0.02);
  desk.add(ledge);
  const pageTop = V(-0.105, 0.16 + 0.135, 0.01);
  const pageFoot = V(-0.105, 0.16 - 0.135, 0.01);
  let pageEndsReady = false;
  [-0.105, 0.105].forEach((x, i) => {
    const page = mesh(
      new THREE.PlaneGeometry(0.2, 0.27),
      new THREE.MeshLambertMaterial({ map: sheetTexture(i ? 'op. 2' : 'étude no. 1') }),
      { part: 'thoughts', shadow: false },
    );
    page.position.set(x, 0.16, 0.01);
    page.add(scoreFor(11 + i * 7));
    desk.add(page);
  });

  piano.add(desk);

  /* keyboard — "me" */
  const keybed = mesh(new THREE.BoxGeometry(1.42, 0.06, 0.19), lacquer, { part: 'about', edges: 'light' });
  keybed.position.set(0, 0.665, 0.085);
  piano.add(keybed);
  [-1, 1].forEach((side) => {
    const cheek = mesh(new THREE.BoxGeometry(0.095, 0.1, 0.19), lacquer, { part: 'about', edges: 'light' });
    cheek.position.set(side * 0.66, 0.72, 0.085);
    piano.add(cheek);
  });
  const whiteGeo = new THREE.BoxGeometry(0.022, 0.022, 0.148);
  const blackGeo = new THREE.BoxGeometry(0.0125, 0.02, 0.092);
  const whiteKeys = new THREE.InstancedMesh(whiteGeo, ivory.clone(), WHITE_KEYS.length);
  const blackKeys = new THREE.InstancedMesh(blackGeo, ebony.clone(), BLACK_KEYS.length);
  const keyBase = (black: boolean, x: number) => (black ? V(x, 0.722, 0.046) : V(x, 0.704, 0.076));
  WHITE_KEYS.forEach((k, i) => whiteKeys.setMatrixAt(i, mtx.makeTranslation(keyBase(false, k.x))));
  BLACK_KEYS.forEach((k, i) => blackKeys.setMatrixAt(i, mtx.makeTranslation(keyBase(true, k.x))));

  /* each white key carries its own colour, so a sounding one can flip from ivory to dark (black keys only dip) */
  const IVORY = new THREE.Color(0xf1eee6);
  const FLIPPED_WHITE = new THREE.Color(0x131215);
  (whiteKeys.material as THREE.MeshPhongMaterial).color.set(0xffffff);
  WHITE_KEYS.forEach((_, i) => whiteKeys.setColorAt(i, IVORY));

  /* the seams between white keys: real gaps are far thinner than a dither dot, so they're drawn as lines,
     which always come out exactly one dot wide however far away the camera is */
  const seamPts: number[] = [];
  for (let i = 1; i < WHITE_KEYS.length; i += 1) {
    const x = -WHITE_W * 26 + i * WHITE_W;
    seamPts.push(x, 0.7156, 0.149, x, 0.7156, 0.004);
  }
  const seamGeo = new THREE.BufferGeometry();
  seamGeo.setAttribute('position', new THREE.Float32BufferAttribute(seamPts, 3));
  const seams = new THREE.LineSegments(seamGeo, darkLine);
  piano.add(seams);
  [whiteKeys, blackKeys].forEach((k) => {
    k.castShadow = true;
    k.receiveShadow = true;
    k.userData.part = 'about';
    partMeshes.about.push(k);
    pickables.push(k);
    piano.add(k);
  });

  /* legs and pedal lyre */
  const legGeo = new THREE.CylinderGeometry(0.05, 0.032, 0.625, 14);
  ([
    [-0.64, -0.1],
    [0.64, -0.1],
    [-0.42, -1.58],
  ] as [number, number][]).forEach(([x, z]) => {
    const leg = mesh(legGeo, lacquer, { edges: 'light', threshold: 60 });
    leg.position.set(x, 0.3125, z);
    piano.add(leg);
  });
  [-0.055, 0.055].forEach((x) => {
    const post = mesh(new THREE.BoxGeometry(0.025, 0.54, 0.025), lacquer);
    post.position.set(x, 0.36, -0.36);
    piano.add(post);
  });
  const lyreBase = mesh(new THREE.BoxGeometry(0.26, 0.07, 0.11), lacquer, { edges: 'light' });
  lyreBase.position.set(0, 0.065, -0.34);
  piano.add(lyreBase);
  [-0.07, 0, 0.07].forEach((x) => {
    const pedal = mesh(new THREE.BoxGeometry(0.03, 0.012, 0.11), brass);
    pedal.position.set(x, 0.075, -0.24);
    piano.add(pedal);
  });

  /* the lid, propped open on the stick — "say hi" */
  const lid = new THREE.Group();
  lid.position.set(-0.75, 0.945, 0);
  const lidGeo = extrude(outline(0.42), 0.022);
  lidGeo.translate(0.75, 0, 0);
  const lidMat = new THREE.MeshPhongMaterial({ color: 0x3c3c40, specular: 0xbbbbbb, shininess: 60 });
  const lidPanel = mesh(lidGeo, lidMat, { part: 'name', edges: 'light', threshold: 40 });
  lidPanel.castShadow = false;
  lid.add(lidPanel);
  /* the owner's name, lettered on the lid like a maker's mark (underside and top) */
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 1024;
  nameCanvas.height = 208;
  const nameTex = new THREE.CanvasTexture(nameCanvas);
  nameTex.colorSpace = THREE.SRGBColorSpace;
  nameTex.anisotropy = 4;
  const drawName = () => {
    const g = nameCanvas.getContext('2d')!;
    g.clearRect(0, 0, nameCanvas.width, nameCanvas.height);
    let size = 176;
    g.font = `500 ${size}px Geist, 'Helvetica Neue', Arial, sans-serif`;
    const w = g.measureText('jian cheng').width;
    if (w > 940) {
      size = Math.floor((size * 940) / w);
      g.font = `500 ${size}px Geist, 'Helvetica Neue', Arial, sans-serif`;
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 22;
    g.strokeStyle = '#000';
    g.strokeText('jian cheng', 512, 112);
    g.fillStyle = '#fff';
    g.fillText('jian cheng', 512, 112);
    nameTex.needsUpdate = true;
  };
  drawName();
  document.fonts?.load("500 176px Geist").then(drawName).catch(() => undefined);
  const nameMat = new THREE.MeshBasicMaterial({
    map: nameTex,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const NAME_SPOT = { x: 0.52, z: -0.9 };
  ([
    [-0.003, Math.PI / 2, Math.PI / 2],
    [0.025, -Math.PI / 2, -Math.PI / 2],
  ] as [number, number, number][]).forEach(([y, flip, turn]) => {
    const g = new THREE.PlaneGeometry(0.96, 0.195);
    g.rotateX(flip);
    g.rotateY(turn);
    const decal = new THREE.Mesh(g, nameMat);
    decal.position.set(NAME_SPOT.x, y, NAME_SPOT.z);
    decal.userData.part = 'name';
    lid.add(decal);
  });
  const LID_OPEN = 0.84;
  lid.rotation.z = LID_OPEN;
  piano.add(lid);
  lid.updateMatrixWorld(true);
  ANCHORS.name.copy(lid.localToWorld(V(1.05, 0.03, -1.2)));
  const propBottom = V(-0.1, 0.945, -1.42);
  const propLen = lid.localToWorld(V(0.58, 0, -1.42)).distanceTo(propBottom);
  const prop = mesh(new THREE.CylinderGeometry(0.011, 0.011, propLen, 8), lacquer, { part: 'name' });
  prop.castShadow = false;
  piano.add(prop);
  /* set the lid to an angle and keep the prop stick reaching from the case up to its socket under the lid */
  const setLid = (angle: number) => {
    lid.rotation.z = angle;
    lid.updateMatrixWorld(true);
    const top = lid.localToWorld(V(0.58, 0, -1.42));
    prop.position.copy(top).add(propBottom).multiplyScalar(0.5);
    prop.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(propBottom).normalize());
    prop.scale.set(1, Math.max(0.01, top.distanceTo(propBottom) / propLen), 1);
  };
  setLid(LID_OPEN);

  /* the metronome, ticking at 96 — "what's next" */
  const metronome = new THREE.Group();
  metronome.position.set(-0.58, 0.945, -0.13);
  const metBody = mesh(new THREE.CylinderGeometry(0.022, 0.07, 0.23, 4), walnut, { part: 'socials', edges: 'dark', threshold: 20 });
  metBody.rotation.y = Math.PI / 4;
  metBody.position.y = 0.115;
  metronome.add(metBody);
  const rodTilt = new THREE.Group();
  rodTilt.position.set(0, 0.03, 0.053);
  rodTilt.rotation.x = -0.18;
  const swing = new THREE.Group();
  rodTilt.add(swing);
  const rod = mesh(new THREE.BoxGeometry(0.005, 0.19, 0.004), brass, { part: 'socials' });
  rod.position.y = 0.095;
  const weight = mesh(new THREE.BoxGeometry(0.026, 0.02, 0.012), brass, { part: 'socials' });
  weight.position.y = 0.13;
  swing.add(rod, weight);
  metronome.add(rodTilt);
  piano.add(metronome);

  /* the bench, a camera, a stack of music — "off the keys" */
  const bench = new THREE.Group();
  bench.position.set(0, 0, 0.66);
  const seat = mesh(new THREE.BoxGeometry(0.78, 0.07, 0.36), lacquer, { part: 'off', edges: 'light' });
  seat.position.y = 0.5;
  bench.add(seat);
  ([
    [-0.34, -0.14],
    [0.34, -0.14],
    [-0.34, 0.14],
    [0.34, 0.14],
  ] as [number, number][]).forEach(([x, z]) => {
    const leg = mesh(new THREE.BoxGeometry(0.045, 0.465, 0.045), lacquer, { part: 'off', edges: 'light' });
    leg.position.set(x, 0.233, z);
    bench.add(leg);
  });
  const cam = new THREE.Group();
  cam.position.set(0.2, 0.573, -0.04);
  cam.rotation.y = 0.45;
  const camBody = mesh(new THREE.BoxGeometry(0.13, 0.072, 0.05), ebony, { part: 'off', edges: 'light' });
  const camTop = mesh(new THREE.BoxGeometry(0.13, 0.014, 0.05), silver, { part: 'off' });
  camTop.position.y = 0.043;
  const lens = mesh(new THREE.CylinderGeometry(0.025, 0.027, 0.045, 18), silver, { part: 'off', edges: 'dark', threshold: 40 });
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.045;
  /* a little light on top that blinks while you're looking at the bench: the camera still works */
  const tally = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.012), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tally.position.set(0.045, 0.053, 0.012);
  tally.visible = false;
  cam.add(camBody, camTop, lens, tally);
  [camBody, camTop, lens, tally].forEach((m) => (m.userData.camera = true));
  tally.userData.part = 'off';
  pickables.push(tally);
  bench.add(cam);
  /* a notebook: a dark cover hinged at the spine over a block of pages, and one loose leaf for turning */
  const coverMat = new THREE.MeshLambertMaterial({ color: 0x2b2a2e });
  const book = new THREE.Group();
  book.position.set(-0.1, 0.535, 0.01);
  book.rotation.y = -0.1;
  const backCover = mesh(new THREE.BoxGeometry(BOOK.w, BOOK.c, BOOK.d), coverMat, { part: 'off', edges: 'light' });
  backCover.position.set(0, BOOK.c / 2, 0);
  const rightBlock = mesh(new THREE.BoxGeometry(BOOK.pw, BOOK.t, BOOK.pd), paper, { part: 'off', edges: 'dark' });
  rightBlock.position.set(SPINE + 0.002 + BOOK.pw / 2, BOOK.c + BOOK.t / 2, 0);
  const flap = new THREE.Group(); // the front cover and the left half of the pages, swinging on the spine
  flap.position.set(SPINE, PAGE_Y, 0);
  const leftBlock = mesh(new THREE.BoxGeometry(BOOK.pw, BOOK.t, BOOK.pd), paper, { part: 'off', edges: 'dark' });
  leftBlock.position.set(0.002 + BOOK.pw / 2, BOOK.t / 2, 0);
  const frontCover = mesh(new THREE.BoxGeometry(BOOK.w, BOOK.c, BOOK.d), coverMat, { part: 'off', edges: 'light' });
  frontCover.position.set(BOOK.w / 2, BOOK.t + BOOK.c / 2, 0);
  flap.add(leftBlock, frontCover);
  const leaf = new THREE.Group();
  leaf.position.set(SPINE, PAGE_Y + 0.0008, 0);
  leaf.visible = false;
  const leafGeo = new THREE.PlaneGeometry(BOOK.pw, BOOK.pd, 12, 1);
  leafGeo.rotateX(-Math.PI / 2);
  leafGeo.translate(0.002 + BOOK.pw / 2, 0, 0);
  const leafRest = Float32Array.from(leafGeo.attributes.position.array as Float32Array);
  leaf.add(new THREE.Mesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0xf2efe6, side: THREE.DoubleSide })));
  book.add(backCover, rightBlock, flap, leaf);
  [backCover, rightBlock, leftBlock, frontCover].forEach((m) => (m.userData.book = true));
  bench.add(book);
  piano.add(bench);

  /* floor, rug, loose pages */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x2a2724 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.05, 72), new THREE.MeshLambertMaterial({ color: 0x46423d }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.002;
  rug.receiveShadow = true;
  scene.add(rug);
  [
    [1.9, 1.96],
    [1.62, 1.66],
  ].forEach(([a, b]) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(a, b, 96), new THREE.MeshLambertMaterial({ color: 0x625c55 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.003;
    ring.receiveShadow = true;
    scene.add(ring);
  });
  ([
    [0.95, 1.05, 0.5, 31],
    [-0.75, 1.2, -0.35, 47],
  ] as [number, number, number, number][]).forEach(([x, z, r, seed]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), new THREE.MeshLambertMaterial({ map: sheetTexture('nocturne') }));
    p.add(scoreFor(seed));
    p.rotation.set(-Math.PI / 2, 0, r);
    p.position.set(x, 0.004, z);
    p.receiveShadow = true;
    scene.add(p);
  });

  /* dust in the light */
  const MOTES = 110;
  const moteBase = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i += 1) {
    moteBase[i * 3] = -1 + Math.random() * 2.6;
    moteBase[i * 3 + 1] = 0.3 + Math.random() * 2.6;
    moteBase[i * 3 + 2] = -1.6 + Math.random() * 2.8;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(moteBase.slice(), 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xbbbbbb, size: 1, sizeAttenuation: false }));
  scene.add(motes);

  /* ── state ── */
  let W = 1;
  let H = 1;
  let narrow = false;
  let px = 3;
  let hovered: PartId | null = null;
  /* free orbit around the piano: azimuth (around), polar (up/down), distance (zoom) */
  type Orbit = { az: number; pol: number; dist: number };
  const POLAR_MIN = 0.2;
  const POLAR_MAX = 1.42;
  const DIST_MIN = 1.9;
  const distMax = () => (narrow ? 9 : 7.5);
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const orbitTarget = () => (narrow ? HOME.narrow.target : HOME.wide.target);
  const orbitPos = (o: Orbit) => new THREE.Vector3().setFromSphericalCoords(o.dist, o.pol, o.az).add(orbitTarget());
  let orbitDefault: Orbit = { az: 0, pol: 1, dist: 4 };
  let orbit: Orbit = { ...orbitDefault };
  let orbitGoal: Orbit = { ...orbitDefault };
  let orbitReady = false;
  const resetOrbit = () => {
    const h = narrow ? HOME.narrow : HOME.wide;
    const sph = new THREE.Spherical().setFromVector3(h.pos.clone().sub(h.target));
    orbitDefault = { az: sph.theta, pol: sph.phi, dist: sph.radius };
    orbit = { ...orbitDefault };
    orbitGoal = { ...orbitDefault };
    orbitReady = true;
  };
  const pressed = new Map<number, number>(); // midi → 0..1, a brief tap from the pointer
  const keyDepth = new Map<number, number>(); // midi → how far down the key is, 0..1
  const WHITE_AT = new Map(WHITE_KEYS.map((k, i) => [k.midi, i]));
  const BLACK_AT = new Map(BLACK_KEYS.map((k, i) => [k.midi, i]));
  let song: { track: SongTrack; time: () => number } | null = null;
  const songHeld = new Map<number, number>(); // midi → onset of the note holding it down
  const lastOnset = new Map<number, number>();
  let songPedal = false;
  const damperLift = new Float32Array(44);
  const keyTint = new THREE.Color();
  const seamEnds = [V(-WHITE_W * 26, 0.7156, 0.149), V(WHITE_W * 26, 0.7156, 0.149)];
  const seamA = new THREE.Vector3();
  const seamB = new THREE.Vector3();
  let seamsReady = false;
  let metroSong = 0; // 0 = the idle tick, 1 = following the song's beat
  let songAngle = 0;
  const keyRot = new THREE.Matrix4();
  const keyShift = new THREE.Matrix4();

  /* keys pivot at the back, so a pressed key tips: the front drops and the top catches the light differently */
  const keyPose = (black: boolean, x: number, d: number) => {
    const len = black ? 0.092 : 0.148;
    const base = keyBase(black, x);
    mtx.makeTranslation(base.x, base.y - d * 0.002, base.z - len / 2);
    mtx.multiply(keyRot.makeRotationX(d * 0.075));
    return mtx.multiply(keyShift.makeTranslation(0, 0, len / 2));
  };

  const readSong = () => {
    songHeld.clear();
    songPedal = false;
    if (!song) return;
    const t = song.time() + 0.02;
    const { notes, pedal } = song.track;
    for (let i = 0; i < notes.length; i += 1) {
      const [on, off, midi] = notes[i];
      if (on > t) break;
      if (t < Math.max(off, on + 0.09) && on > (songHeld.get(midi) ?? -1)) songHeld.set(midi, on);
    }
    for (let i = 0; i < pedal.length; i += 1) {
      if (pedal[i][0] > t) break;
      if (t < pedal[i][1]) {
        songPedal = true;
        break;
      }
    }
  };
  const PIANO_CENTRE = V(-0.05, 0.95, -0.55);
  const focusNow = { x: 0.5, y: 0.5, r: 0.46, s: 0.3 };
  const behind = { about: false, name: false, work: false, thoughts: false, off: false, socials: false } as Record<PartId, boolean>;
  const sight = new THREE.Raycaster();
  let frameNo = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  type View = { pos: THREE.Vector3; target: THREE.Vector3; off: number };
  const homeView = (): View => ({ pos: orbitPos(orbitGoal), target: orbitTarget().clone(), off: 0 });
  /* the name: stand off the bass side, square to the lid's outer face and a touch above it, so the lettering on
     top reads straight and level; far enough back that the whole name fits beside the text. (Any step sideways,
     along the way the name reads, would tip it on screen.) */
  const nameCentre = () => {
    piano.updateMatrixWorld(true);
    return lid.localToWorld(V(NAME_SPOT.x, 0.025, NAME_SPOT.z));
  };
  const nameView = (): View => {
    const centre = nameCentre();
    const turn = lid.getWorldQuaternion(new THREE.Quaternion());
    const face = V(0, 1, 0).applyQuaternion(turn).normalize(); // out of the lid's top
    const d = narrow ? 3.3 : 2.2;
    const pos = centre.clone().addScaledVector(face, d * 0.95).add(V(0, d * 0.18, 0));
    return { pos, target: centre, off: 1 };
  };
  /* the intro: lights out, looking down from the bass side on the closed lid, so the lettering (which glows on
     its own) is the first thing there. The light flickers up like a stage lamp, then the camera glides round to
     the usual view while the lid swings up onto its prop */
  const LIGHTS: [THREE.Light, number][] = [
    [spot, 170],
    [rim, 1.4],
    [bounce, 5],
    [hemi, 0.1],
  ];
  const setLights = (level: number) => LIGHTS.forEach(([l, full]) => (l.intensity = full * level));
  const FLICKER: [number, number][] = [
    [0, 0],
    [380, 0.3],
    [460, 0.04],
    [600, 0.55],
    [690, 0.2],
    [880, 1],
  ];
  let intro: { t0: number; flown: boolean; done: () => void } | null = null;
  const introView = (): View => {
    setLid(0);
    const centre = lid.localToWorld(V(NAME_SPOT.x, 0.025, NAME_SPOT.z));
    const k = narrow ? 1.7 : 1;
    return { pos: centre.clone().add(V(-1.0 * k, 2.45 * k, 0)), target: centre, off: 0 };
  };
  const endIntro = () => {
    if (!intro) return;
    const { done } = intro;
    intro = null;
    setLights(1);
    setLid(LID_OPEN);
    done();
  };

  const closeView = (p: PartId): View =>
    p === 'name' ? nameView() : { pos: CLOSE[p].pos.clone(), target: CLOSE[p].target.clone(), off: 1 };
  let resting: PartId | null = null;
  const cur: View = homeView();
  let hidden = false;
  /* a straight glide along the lens axis, curving in from wherever the camera was */
  let dolly: {
    p0: THREE.Vector3;
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    aimFrom: THREE.Vector3;
    aim: THREE.Vector3;
    off0: number;
    t0: number;
    dur: number;
    done: () => void;
  } | null = null;
  const camSpot = V(0, 0.06, 0);
  let camSpotReady = false;

  /* notebook state: whether the camera is leaning over it, the cover's swing, and page turns in flight */
  let bookMode = false;
  let coverAnim: { from: number; to: number; t0: number; dur: number; done?: () => void } | null = null;
  const leafQueue: { from: number; to: number; dur: number; gap: number; done?: () => void }[] = [];
  let leafAnim: { from: number; to: number; t0: number; dur: number; done?: () => void } | null = null;
  let flicksDone = 0;
  let leafCurl = 0;
  const leafCorner = (x: number, y: number, z: number) => leaf.localToWorld(V(x, y, z));
  const bookSpot = V(0, 0.04, 0);
  const pageLocal = (side: 'left' | 'right') => {
    const x0 = side === 'right' ? SPINE + 0.002 : SPINE - 0.002 - BOOK.pw;
    const y = PAGE_Y + 0.0006;
    const z = BOOK.pd / 2;
    return [V(x0, y, -z), V(x0 + BOOK.pw, y, -z), V(x0 + BOOK.pw, y, z), V(x0, y, z)];
  };
  const pageWorld = { left: pageLocal('left'), right: pageLocal('right') };
  let bookReady = false;
  const toScreen = (v: THREE.Vector3) => {
    const p = v.clone().project(camera);
    return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
  };

  /* lean over the open spread (or just the right-hand page on a phone), sized so it fits beside the text */
  const bookView = (): View => {
    book.updateMatrixWorld(true);
    const centre = book.localToWorld(narrow ? V(SPINE + 0.002 + BOOK.pw / 2, PAGE_Y, 0) : V(SPINE, PAGE_Y, 0));
    const fwd = book.localToWorld(V(0, 0, 1)).sub(book.localToWorld(V(0, 0, 0))).normalize();
    const t = 2 * Math.tan(THREE.MathUtils.degToRad((narrow ? HOME.narrow.fov : HOME.wide.fov) / 2));
    const aspect = W / Math.max(1, H);
    const d = narrow
      ? Math.max(0.31 / (0.48 * t), 0.23 / (0.9 * t * aspect))
      : Math.max(0.42 / (0.5 * t * aspect), 0.33 / (0.9 * t));
    const tilt = 0.3;
    const pos = centre.clone().addScaledVector(V(0, 1, 0), d * Math.cos(tilt)).addScaledVector(fwd, d * Math.sin(tilt));
    return { pos, target: centre, off: 1 };
  };
  let tween: {
    from: View;
    to: View;
    a: THREE.Spherical;
    b: THREE.Spherical;
    t0: number;
    dur: number;
    done?: () => void;
  } | null = null;

  const applyCamera = () => {
    camera.position.copy(cur.pos);
    camera.lookAt(cur.target);
    camera.fov = narrow ? HOME.narrow.fov : HOME.wide.fov;
    if (cur.off > 0.0001) {
      if (narrow) camera.setViewOffset(W, H, 0, cur.off * 0.26 * H, W, H);
      else camera.setViewOffset(W, H, cur.off * 0.23 * W, 0, W, H);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  };

  const project = (v: THREE.Vector3): ScreenPoint => {
    const p = v.clone().project(camera);
    return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H, visible: p.z < 1 };
  };

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const clock = new THREE.Clock();
  let elapsed = 0;
  let raf = 0;

  const frame = () => {
    const dt = Math.min(0.05, clock.getDelta());
    elapsed += dt;

    /* the metronome ticks at 96 on its own; while the song plays it swings to the song's beat instead,
       reaching the end of each swing exactly on a beat */
    const beats = song?.track.beats;
    metroSong += ((beats ? 1 : 0) - metroSong) * Math.min(1, dt * 3);
    let angle = Math.sin(elapsed * Math.PI * (96 / 60)) * 0.42;
    if (beats && beats.length > 1 && song) {
      const t = song.time();
      let k = 0;
      while (k < beats.length - 2 && beats[k + 1] <= t) k += 1;
      const span = beats[k + 1] - beats[k];
      const phase = k + (t - beats[k]) / span; // may run below 0 or past the end: the last spacing carries on
      songAngle = Math.cos(Math.PI * phase) * 0.42;
    }
    angle += (songAngle - angle) * metroSong; // eases in when the song starts and back out when it stops
    swing.rotation.z = angle;

    const pos = moteGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < MOTES; i += 1) {
      pos.setXYZ(
        i,
        moteBase[i * 3] + Math.sin(elapsed * 0.15 + i) * 0.12,
        moteBase[i * 3 + 1] + Math.sin(elapsed * 0.11 + i * 1.7) * 0.18,
        moteBase[i * 3 + 2] + Math.cos(elapsed * 0.13 + i * 0.7) * 0.12,
      );
    }
    pos.needsUpdate = true;

    /* keys: the song holds them down; a pointer tap dips them briefly */
    readSong();
    if (songHeld.size || pressed.size || keyDepth.size) {
      let moved = false;
      for (let i = 0; i < KEYS.length; i += 1) {
        const { midi, black, x } = KEYS[i];
        const tap = pressed.get(midi) ?? 0;
        if (tap) {
          const next = tap - dt * 5;
          if (next <= 0) pressed.delete(midi);
          else pressed.set(midi, next);
        }
        const onset = songHeld.get(midi);
        let d = keyDepth.get(midi) ?? 0;
        if (onset !== undefined && onset !== lastOnset.get(midi)) {
          lastOnset.set(midi, onset);
          d = Math.min(d, 0.25); // struck again: let it come up and go down anew
        }
        const target = Math.max(onset !== undefined ? 1 : 0, tap);
        if (target === d && !keyDepth.has(midi)) continue;
        let next = d + (target - d) * Math.min(1, dt * (target > d ? 45 : 16));
        if (Math.abs(target - next) < 0.003) next = target;
        if (next === (keyDepth.get(midi) ?? 0)) continue;
        if (next === 0) keyDepth.delete(midi);
        else keyDepth.set(midi, next);
        const at = black ? BLACK_AT.get(midi) : WHITE_AT.get(midi);
        if (at === undefined) continue;
        if (black) blackKeys.setMatrixAt(at, keyPose(true, x, next));
        else {
          whiteKeys.setMatrixAt(at, keyPose(false, x, next));
          whiteKeys.setColorAt(at, keyTint.lerpColors(IVORY, FLIPPED_WHITE, next));
        }
        moved = true;
      }
      if (moved) {
        whiteKeys.instanceMatrix.needsUpdate = true;
        blackKeys.instanceMatrix.needsUpdate = true;
        if (whiteKeys.instanceColor) whiteKeys.instanceColor.needsUpdate = true;
      }
    }

    /* dampers lift off the strings with the sustain pedal, or above a held note */
    let dampersMoved = false;
    for (let i = 0; i < 44; i += 1) {
      let want = songPedal ? 1 : 0;
      if (!want && songHeld.size) {
        const lo = 21 + Math.floor((i * 68) / 44);
        const hi = 21 + Math.floor(((i + 1) * 68) / 44);
        for (let m = lo; m < hi && !want; m += 1) if (songHeld.has(m)) want = 1;
      }
      const cur = damperLift[i];
      if (cur === want) continue;
      let next = cur + (want - cur) * Math.min(1, dt * (want > cur ? 30 : 12));
      if (Math.abs(want - next) < 0.01) next = want;
      damperLift[i] = next;
      dampers.setMatrixAt(i, mtx.makeTranslation(-0.38 + i * 0.0232, 0.875 + next * 0.016, -0.37));
      dampersMoved = true;
    }
    if (dampersMoved) dampers.instanceMatrix.needsUpdate = true;

    /* the role strings: the one pointed at shivers and the rest of the bed steps back; let go, and it rings out */
    let rolesMoved = false;
    let rolesTinted = false;
    roles.forEach((r, n) => {
      /* only the string being pointed at stays lit; the other roles step back with the rest of the bed */
      const glowWant = roleHot === null || roleHot === n ? 1 : 0;
      if (r.glow !== glowWant) {
        r.glow += (glowWant - r.glow) * Math.min(1, dt * 8);
        if (Math.abs(glowWant - r.glow) < 0.01) r.glow = glowWant;
        tintRole(n);
        rolesTinted = true;
      }
      const want = roleHot === n ? 1 : 0;
      if (want === 0 && r.energy === 0) return;
      r.energy += (want - r.energy) * Math.min(1, dt * (want > r.energy ? 14 : 2.4));
      if (want === 0 && r.energy < 0.004) r.energy = 0;
      placeRole(n, elapsed);
      rolesMoved = true;
    });
    if (rolesMoved) roleBars.instanceMatrix.needsUpdate = true;
    if (rolesTinted && roleBars.instanceColor) roleBars.instanceColor.needsUpdate = true;
    stringMat.color.lerp(roleHot === null ? STRING_LIT : STRING_DIM, Math.min(1, dt * 8));
    const dimWant = roleHot === null ? 0 : 1;
    if (boardDim !== dimWant) {
      boardDim += (dimWant - boardDim) * Math.min(1, dt * 8);
      if (Math.abs(dimWant - boardDim) < 0.01) boardDim = dimWant;
      benchDim.forEach(({ mat, base, spec }) => {
        mat.color.copy(base).multiplyScalar(1 - 0.68 * boardDim);
        if (spec) mat.specular.copy(spec).multiplyScalar(1 - 0.85 * boardDim);
      });
    }

    tally.visible = resting === 'off' && !bookMode && !dolly && !hidden && Math.floor(elapsed * 1.6) % 2 === 0;

    /* the notebook: the cover swinging on its spine, then any page turns queued up behind it */
    const now = performance.now();
    if (intro) {
      const t = now - intro.t0;
      let level = 0;
      FLICKER.forEach(([at, v]) => {
        if (t >= at) level = v;
      });
      setLights(level);
      setLid(LID_OPEN * ease(Math.min(1, Math.max(0, (t - 900) / 1300))));
      if (!intro.flown && t >= 650) {
        intro.flown = true;
        orbit = { ...orbitGoal };
        flyView(homeView(), undefined, 1700);
      }
      if (t >= 2400 && !tween) endIntro();
    }

    if (coverAnim && now >= coverAnim.t0) {
      const p = Math.min(1, (now - coverAnim.t0) / coverAnim.dur);
      flap.rotation.z = coverAnim.from + (coverAnim.to - coverAnim.from) * ease(p);
      if (p >= 1) {
        const { done } = coverAnim;
        coverAnim = null;
        done?.();
      }
    }
    if (!leafAnim && leafQueue.length) {
      const next = leafQueue.shift()!;
      leafAnim = { from: next.from, to: next.to, t0: now + next.gap, dur: next.dur, done: next.done };
    }
    if (leafAnim && now >= leafAnim.t0) {
      const p = Math.min(1, (now - leafAnim.t0) / leafAnim.dur);
      const e = ease(p);
      leaf.rotation.z = leafAnim.from + (leafAnim.to - leafAnim.from) * e;
      leafCurl = Math.sin(Math.PI * e) * 0.045;
      /* the free edge lifts and trails a little as the page goes over */
      const pos = leafGeo.attributes.position as THREE.BufferAttribute;
      const curl = Math.sin(Math.PI * e) * 0.045;
      for (let i = 0; i < pos.count; i += 1) {
        const u = leafRest[i * 3] / (BOOK.pw + 0.002);
        pos.setY(i, curl * u * u);
      }
      pos.needsUpdate = true;
      if (p >= 1) {
        const { done } = leafAnim;
        leafAnim = null;
        flicksDone += 1;
        done?.();
      }
    }
    if (dolly) {
      const p = Math.min(1, (performance.now() - dolly.t0) / dolly.dur);
      const e = ease(p);
      const u = 1 - e;
      cur.pos.set(0, 0, 0).addScaledVector(dolly.p0, u * u).addScaledVector(dolly.p1, 2 * u * e).addScaledVector(dolly.p2, e * e);
      const aimT = Math.min(1, e * 1.6);
      cur.target.lerpVectors(dolly.aimFrom, dolly.aim, aimT);
      cur.off = dolly.off0 * (1 - aimT);
      if (p >= 1) {
        const { done } = dolly;
        dolly = null;
        done();
      }
    }
    if (tween) {
      const p = Math.min(1, (performance.now() - tween.t0) / tween.dur);
      const e = ease(p);
      /* swing around the target rather than cutting straight through the piano */
      cur.target.lerpVectors(tween.from.target, tween.to.target, e);
      const { a, b } = tween;
      cur.pos
        .setFromSphericalCoords(
          a.radius + (b.radius - a.radius) * e,
          a.phi + (b.phi - a.phi) * e,
          a.theta + wrap(b.theta - a.theta) * e,
        )
        .add(cur.target);
      cur.off = tween.from.off + (tween.to.off - tween.from.off) * e;
      if (p >= 1) {
        const done = tween.done;
        tween = null;
        done?.();
      }
    }
    if (!tween && resting === null && !intro) {
      const k = reduceMotion ? 1 : 0.18;
      orbit.az += (orbitGoal.az - orbit.az) * k;
      orbit.pol += (orbitGoal.pol - orbit.pol) * k;
      orbit.dist += (orbitGoal.dist - orbit.dist) * k;
      cur.pos.copy(orbitPos(orbit));
      cur.target.copy(orbitTarget());
    }
    applyCamera();
    const camDist = camera.position.distanceTo(orbitTarget());
    const fog = scene.fog as THREE.Fog;
    fog.near = camDist + 0.8;
    fog.far = camDist + 5.5;

    const goal = resting
      ? { pt: resting === 'name' ? nameCentre() : ANCHORS[resting], r: 0.34, s: 0.62 }
      : hovered
        ? { pt: ANCHORS[hovered], r: 0.22, s: 0.42 }
        : { pt: PIANO_CENTRE, r: 0.46, s: 0.3 };
    const fp = goal.pt.clone().project(camera);
    const k = reduceMotion ? 1 : 0.09;
    focusNow.x += ((fp.x + 1) / 2 - focusNow.x) * k;
    focusNow.y += ((fp.y + 1) / 2 - focusNow.y) * k;
    focusNow.r += (goal.r - focusNow.r) * k;
    focusNow.s += (goal.s - focusNow.s) * k;
    const u = ditherMat.uniforms;
    (u.focus.value as THREE.Vector2).set(focusNow.x, focusNow.y);
    u.focusRadius.value = focusNow.r;
    u.focusStrength.value = focusNow.s;
    u.aspect.value = W / H;
    u.quiet.value = cur.off;
    u.quietAxis.value = narrow ? 1 : 0;

    renderer.setRenderTarget(target);
    /* a one-dot seam only helps once a white key is a few dots wide; any narrower and it just stripes the keyboard */
    if (!seamsReady) {
      piano.updateMatrixWorld(true);
      seamEnds.forEach((v) => piano.localToWorld(v));
      seamsReady = true;
    }
    seamA.copy(seamEnds[0]).project(camera);
    seamB.copy(seamEnds[1]).project(camera);
    const keyDots = Math.hypot(((seamA.x - seamB.x) / 2) * target.width, ((seamA.y - seamB.y) / 2) * target.height) / WHITE_KEYS.length;
    seams.visible = keyDots >= 2.7;

    /* how many dots apart the staff lines are right now, and so how dark the score should be */
    if (!pageEndsReady) {
      desk.updateMatrixWorld(true);
      desk.localToWorld(pageTop);
      desk.localToWorld(pageFoot);
      pageEndsReady = true;
    }
    seamA.copy(pageTop).project(camera);
    seamB.copy(pageFoot).project(camera);
    const pageDots = Math.hypot(((seamA.x - seamB.x) / 2) * target.width, ((seamA.y - seamB.y) / 2) * target.height);
    const lineDots = (pageDots * 0.0028) / 0.27;
    INK_LINE.color.lerpColors(INK_FAR, INK_NEAR, Math.min(1, Math.max(0, (lineDots - 0.45) / 1.1)));

    if (!hidden) {
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(post, postCam);
    }

    const points = {} as Record<PartId, ScreenPoint>;
    PART_IDS.forEach((id) => {
      points[id] = project(ANCHORS[id]);
    });
    /* every few frames, check which annotated parts the piano itself is hiding */
    frameNo += 1;
    if (frameNo % 4 === 0 && resting === null) {
      PART_IDS.forEach((id) => {
        const to = ANCHORS[id].clone().sub(camera.position);
        const dist = to.length();
        sight.set(camera.position, to.normalize());
        sight.far = dist;
        const hit = sight.intersectObject(piano, true).find((h) => (h.object as THREE.Mesh).isMesh);
        behind[id] = !!hit && hit.distance < dist - 0.06 && hit.object.userData.part !== id;
      });
    }
    const moved = clamp(
      (Math.abs(wrap(orbit.az - orbitDefault.az)) + Math.abs(orbit.pol - orbitDefault.pol)) / 0.6 +
        Math.abs(Math.log(orbit.dist / orbitDefault.dist)) * 1.5,
      0,
      1,
    );
    if (!camSpotReady) {
      piano.updateMatrixWorld(true);
      cam.localToWorld(camSpot);
      camSpotReady = true;
    }
    if (!bookReady) {
      piano.updateMatrixWorld(true);
      book.localToWorld(bookSpot);
      [...pageWorld.left, ...pageWorld.right].forEach((v) => book.localToWorld(v));
      bookReady = true;
    }
    const open = bookMode && flap.rotation.z > Math.PI - 0.001;
    const quads = open ? { left: pageWorld.left.flatMap(toScreen), right: pageWorld.right.flatMap(toScreen) } : null;
    let leafQuads: LeafQuads | null = null;
    if (open && leafAnim && now >= leafAnim.t0) {
      leaf.updateMatrixWorld(true);
      const x0 = 0.002;
      const x1 = 0.002 + BOOK.pw;
      const z = BOOK.pd / 2;
      const c = leafCurl;
      const sp0 = leafCorner(x0, 0, -z);
      const sp1 = leafCorner(x0, 0, z);
      const far0 = leafCorner(x1, c, -z);
      const far1 = leafCorner(x1, c, z);
      leafQuads = {
        front: [sp0, far0, far1, sp1].flatMap(toScreen),
        back: [far0, sp0, sp1, far1].flatMap(toScreen),
        showBack: leaf.rotation.z > Math.PI / 2,
      };
    }
    onFrame(points, {
      centre: project(PIANO_CENTRE),
      moved,
      behind,
      camera: project(camSpot),
      notebook: project(bookSpot),
      book: quads,
      leaf: leafQuads,
      flicks: flicksDone,
    });
    raf = requestAnimationFrame(frame);
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  /* swing the camera to a view around its target rather than cutting straight through the piano */
  const flyView = (to: View, onDone?: () => void, durFixed?: number) => {
    const from: View = { pos: camera.position.clone(), target: cur.target.clone(), off: cur.off };
    cur.pos.copy(from.pos);
    if (reduceMotion) {
      cur.pos.copy(to.pos);
      cur.target.copy(to.target);
      cur.off = to.off;
      tween = null;
      onDone?.();
      return;
    }
    const travel = from.pos.distanceTo(to.pos) + from.target.distanceTo(to.target) * 0.5;
    const dur = durFixed ?? Math.min(1100, Math.max(700, 620 + travel * 150));
    const a = new THREE.Spherical().setFromVector3(from.pos.clone().sub(from.target));
    const b = new THREE.Spherical().setFromVector3(to.pos.clone().sub(to.target));
    tween = { from, to, a, b, t0: performance.now(), dur, done: onDone };
  };

  const handle: PianoScene = {
    resize(w, h, isNarrow) {
      W = w;
      H = h;
      const flipped = narrow !== isNarrow || !orbitReady;
      narrow = isNarrow;
      px = isNarrow ? 2 : 3;
      if (flipped) resetOrbit();
      const lw = Math.max(1, Math.round(w / px));
      const lh = Math.max(1, Math.round(h / px));
      renderer.setSize(lw, lh, false);
      target.setSize(lw, lh);
      camera.aspect = w / h;
      if (!tween && !intro) {
        const v = bookMode ? bookView() : resting ? closeView(resting) : homeView();
        cur.pos.copy(v.pos);
        cur.target.copy(v.target);
        cur.off = v.off;
      }
      applyCamera();
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      if (!hit) return { part: null, midi: null, camera: false, book: false };
      const part = (hit.object.userData.part as PartId) ?? null;
      let midi: number | null = null;
      if (hit.object === whiteKeys && hit.instanceId !== undefined) midi = WHITE_KEYS[hit.instanceId].midi;
      if (hit.object === blackKeys && hit.instanceId !== undefined) midi = BLACK_KEYS[hit.instanceId].midi;
      return { part, midi, camera: hit.object.userData.camera === true, book: hit.object.userData.book === true };
    },
    setHover(part) {
      if (part === hovered) return;
      const glow = (id: PartId | null, v: number) => {
        if (!id) return;
        partMeshes[id].forEach((m) => {
          const mat = m.material as THREE.MeshPhongMaterial;
          if (mat.emissive) mat.emissive.setScalar(v);
        });
      };
      glow(hovered, 0);
      glow(part, part === 'about' ? 0.04 : 0.16);
      hovered = part;
    },
    orbitBy(dAz, dPol) {
      if (resting || tween) return;
      orbitGoal.az += dAz;
      orbitGoal.pol = clamp(orbitGoal.pol + dPol, POLAR_MIN, POLAR_MAX);
    },
    zoomBy(factor) {
      if (resting || tween) return;
      orbitGoal.dist = clamp(orbitGoal.dist * factor, DIST_MIN, distMax());
    },
    resetView() {
      orbit.az = orbitDefault.az + wrap(orbit.az - orbitDefault.az);
      orbitGoal = { ...orbitDefault };
    },
    pressKey(midi) {
      pressed.set(midi, 1);
    },
    setSong(next) {
      song = next;
      lastOnset.clear();
    },
    setRole(index) {
      roleHot = index;
    },
    playIntro(onDone) {
      if (reduceMotion) {
        onDone();
        return;
      }
      const start = introView();
      tween = null;
      cur.pos.copy(start.pos);
      cur.target.copy(start.target);
      cur.off = 0;
      setLights(0);
      intro = { t0: performance.now(), flown: false, done: onDone };
    },
    skipIntro() {
      if (!intro) return;
      tween = null;
      orbit = { ...orbitGoal };
      const home = homeView();
      cur.pos.copy(home.pos);
      cur.target.copy(home.target);
      cur.off = 0;
      endIntro();
    },
    flyIntoLens(onDone) {
      piano.updateMatrixWorld(true);
      const front = cam.localToWorld(V(0, 0, 0.0675)); // the face of the lens
      const axis = cam.localToWorld(V(0, 0, 1)).sub(cam.localToWorld(V(0, 0, 0))).normalize();
      tween = null;
      dolly = {
        p0: cur.pos.clone(),
        p1: front.clone().addScaledVector(axis, 0.55),
        p2: front.clone().addScaledVector(axis, 0.06),
        aimFrom: cur.target.clone(),
        aim: front.clone().addScaledVector(axis, -0.3),
        off0: cur.off,
        t0: performance.now(),
        dur: reduceMotion ? 1 : 1150,
        done: onDone,
      };
    },
    leaveLens() {
      dolly = null;
      tween = null;
      resting = 'off';
      const v = closeView('off');
      cur.pos.copy(v.pos);
      cur.target.copy(v.target);
      cur.off = v.off;
    },
    setHidden(next) {
      hidden = next;
    },
    flyTo(part, onDone) {
      if (!part) orbit = { ...orbitGoal };
      resting = part;
      flyView(part ? closeView(part) : homeView(), onDone);
    },
    openBook(onOpen) {
      bookMode = true;
      let pending = 2;
      const one = () => {
        pending -= 1;
        if (pending === 0) onOpen();
      };
      if (reduceMotion) {
        flap.rotation.z = Math.PI;
        flyView(bookView(), one);
        one();
        return;
      }
      flyView(bookView(), one);
      coverAnim = { from: flap.rotation.z, to: Math.PI, t0: performance.now() + 260, dur: 820, done: one };
    },
    closeBook(onClosed) {
      leafQueue.length = 0;
      leafAnim = null;
      leaf.visible = false;
      const back = () => {
        bookMode = false;
        onClosed?.();
      };
      if (reduceMotion) {
        flap.rotation.z = 0;
        flyView(closeView('off'), back);
        return;
      }
      coverAnim = { from: flap.rotation.z, to: 0, t0: performance.now(), dur: 620 };
      window.setTimeout(() => flyView(closeView('off'), back), 220);
    },
    turnPage(dir, flicks, onDone) {
      flicksDone = 0;
      const n = Math.max(1, Math.min(3, flicks));
      for (let i = 0; i < n; i += 1) {
        const last = i === n - 1;
        leafQueue.push({
          from: dir > 0 ? 0 : Math.PI,
          to: dir > 0 ? Math.PI : 0,
          dur: reduceMotion ? 1 : last ? 520 : 240,
          gap: 30,
          done: last ? onDone : undefined,
        });
      }
    },
    resetBook() {
      bookMode = false;
      coverAnim = null;
      leafQueue.length = 0;
      leafAnim = null;
      leaf.visible = false;
      flap.rotation.z = 0;
    },
    dispose() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      target.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
    },
  };

  raf = requestAnimationFrame(frame);
  return handle;
};
