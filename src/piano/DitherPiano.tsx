import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GlyphKey } from './nameDots';
import { createPianoScene, FrameInfo, PartId, PART_IDS, PianoScene, ScreenPoint, SongTrack } from './scene';
import { developPhoto, STILL } from './dither';
import { GALLERY, Photo } from './gallery';
import { BookContext, dissolve, layoutNotebook, NotebookPageView, quadTransform, setDotMask } from './Notebook';
import { OFF_KEYS } from './offKeys';
import { counterDigits, useVisitor } from './visitor';
import { THOUGHTS } from './thoughts';

/* ──────────────────────────────────────────────────────────────────────────
   1-bit piano. Every part of the instrument is a page; the camera flies in,
   then the words for that part dither in beside it.
   ────────────────────────────────────────────────────────────────────────── */

type Section = { id: PartId; label: string; fig: string; part: string };

const SECTIONS: Section[] = [
  { id: 'about', label: 'about me', fig: 'a', part: 'the keys' },
  { id: 'name', label: 'the name', fig: 'f', part: 'the lid' },
  { id: 'work', label: 'work', fig: 'b', part: 'the strings' },
  { id: 'thoughts', label: 'thoughts', fig: 'c', part: 'the music desk' },
  { id: 'off', label: 'off the keys', fig: 'd', part: 'the bench' },
  { id: 'socials', label: 'socials', fig: 'e', part: 'the metronome' },
];
/* the setlist. blue comes first and is what the button starts on; the rest open up once blue has been played.
   Each needs public/song/<id>.mp3 and its transcription public/song/<id>.json */
type Song = { id: string; title: string; by: string };
const SONGS: Song[] = [
  { id: 'blue', title: 'blue', by: 'yung kai' },
  { id: 'so-easy', title: 'so easy (to fall in love)', by: 'olivia dean' },
  { id: 'here-with-me', title: 'here with me', by: 'd4vd' },
  { id: 'honeybee', title: 'honeybee', by: 'olivia rodrigo' },
  { id: 'die-with-a-smile', title: 'die with a smile', by: 'lady gaga & bruno mars' },
];
const songUrl = (id: string, ext: 'mp3' | 'json') => `${process.env.PUBLIC_URL}/song/${id}.${ext}`;
const songById = (id: string) => SONGS.find((s) => s.id === id) ?? SONGS[0];
const SETLIST_KEY = 'jc-setlist';
const SETLIST_DELAY = 4000; // how long blue plays before the rest of the setlist turns up

const PlayIcon: React.FC<{ paused?: boolean }> = ({ paused }) => (
  <svg className="play-icon" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    {paused ? (
      <>
        <rect x="1" y="1" width="3" height="8" />
        <rect x="6" y="1" width="3" height="8" />
      </>
    ) : (
      <path d="M2 1 L9 5 L2 9 Z" />
    )}
  </svg>
);

const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<PartId, Section>;

/* label placement around each anchor, in screen px (wide / narrow) */
const OFFSETS: Record<PartId, [number, number, number, number]> = {
  about: [120, 56, 70, 60],
  name: [120, -56, 40, -50],
  work: [170, -70, -30, -70],
  thoughts: [-150, -76, -10, -110],
  off: [110, 46, 50, 54],
  socials: [-126, -8, -30, -34],
};

/* a role, with the company's logo as a 1-bit stencil painted in the site's off-white */
/* each role is one of the piano's strings; pointing at a role makes its string shiver */
const StringsContext = React.createContext<(index: number | null) => void>(() => undefined);
/* the name page's dictionary rows write their character onto the lid */
const GlyphContext = React.createContext<(key: GlyphKey | null) => void>(() => undefined);

/* a dictionary row: pointing at it (or focusing it) writes the character on the lid; on touch, a tap pins it
   there until tapped again */
const GlyphRow: React.FC<{ k: GlyphKey; children: React.ReactNode }> = ({ k, children }) => {
  const write = useContext(GlyphContext);
  const [pinned, setPinned] = useState(false);
  useEffect(() => () => write(null), [write]);
  return (
    <li
      className={`glyph-row${pinned ? ' is-pinned' : ''}`}
      tabIndex={0}
      onPointerEnter={(e) => e.pointerType === 'mouse' && write(k)}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' && !pinned) write(null);
      }}
      onFocus={() => write(k)}
      onBlur={() => {
        setPinned(false);
        write(null);
      }}
      onClick={(e) => {
        if ((e.nativeEvent as PointerEvent).pointerType === 'mouse') return;
        const next = !pinned;
        setPinned(next);
        write(next ? k : null);
      }}
    >
      {children}
    </li>
  );
};

const Job: React.FC<{ index: number; logo: string; year: string; name: string; role: string; note?: string }> = ({
  index,
  logo,
  year,
  name,
  role,
  note,
}) => {
  const pluck = useContext(StringsContext);
  return (
  <li className="job" onPointerEnter={() => pluck(index)} onPointerLeave={() => pluck(null)}>
    <span
      className="logo"
      style={{ '--logo': `url(${process.env.PUBLIC_URL}/logos/${logo})` } as React.CSSProperties}
      aria-hidden="true"
    />
    <span className="row-v">
      <span className="job-top">
        <b>{name}</b>
        <span className="row-k">{year}</span>
      </span>
      <i>{role}</i>
      {note && <span className="row-note">{note}</span>}
    </span>
  </li>
  );
};

/* speaks 建成 with the device's Mandarin voice; hidden when there isn't one */
const SayIt: React.FC = () => {
  const [voice, setVoice] = useState<SpeechSynthesisVoice>();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const sync = () =>
      setVoice(window.speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('zh')));
    sync();
    window.speechSynthesis.addEventListener('voiceschanged', sync);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', sync);
      window.speechSynthesis.cancel();
    };
  }, []);
  if (!voice) return null;
  const speak = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance('建成');
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.8;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };
  return (
    <button type="button" className={`say-it${speaking ? ' is-speaking' : ''}`} onClick={speak}>
      ▶ hear it
    </button>
  );
};

/* a list of entries that each open in place: a small key on the left, a title,
   and a body that wipes in underneath */
type Fold = {
  id: string;
  k: string;
  title: string;
  body: string;
};

const Folds: React.FC<{ items: Fold[] }> = ({ items }) => {
  const [open, setOpen] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  /* if the opened entry runs past the bottom of the reading column, bring its top into view */
  useEffect(() => {
    if (open === null) return;
    const li = itemRefs.current[open];
    const box = li?.closest('.reading') as HTMLElement | null;
    if (!li || !box) return;
    const r = li.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (r.bottom <= b.bottom) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollTo({ top: box.scrollTop + r.top - b.top - 12, behavior: still ? 'auto' : 'smooth' });
  }, [open]);

  return (
    <ul className="folds">
      {items.map((t, i) => {
        const isOpen = open === i;
        const draft = t.title.startsWith('[');
        return (
          <li key={t.id} ref={(el) => (itemRefs.current[i] = el)} className={isOpen ? 'is-open' : ''}>
            <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
              <span className="row-k">{t.k}</span>
              <b className={draft ? 'ph' : undefined}>{t.title}</b>
              <span className="fold-mark" aria-hidden="true">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div className="fold-body">
                {t.body.split(/\n\n+/).map((para) => (
                  <p key={para.slice(0, 40)} className={para.startsWith('[') ? 'ph-block' : undefined}>
                    {para}
                  </p>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

const Thoughts: React.FC = () => (
  <>
    <p>notes to myself, written in public. short and unpolished.</p>
    <Folds items={THOUGHTS.map((t) => ({ id: `${t.date}-${t.title}`, k: t.date, title: t.title, body: t.body }))} />
  </>
);

/* off the keys: the list is the contents page of the notebook on the bench. Pick one and the book opens to it */
const OffTheKeys: React.FC = () => {
  const { goTo, current, pageOf } = useContext(BookContext);
  return (
    <ul className="folds toc">
      {OFF_KEYS.map((p, i) => {
        const page = pageOf(i);
        return (
          <li key={p.label} className={current === i ? 'is-open' : ''}>
            <button type="button" onClick={() => goTo(i)} aria-current={current === i ? 'page' : undefined}>
              <span className="row-k">{p.label}</span>
              <b>{p.title}</b>
              <span className="fold-mark" aria-hidden="true">
                {page ? `p. ${page}` : '→'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

/* about me: the greeting names which visitor you are, counted up like a mechanical counter each time the page
   opens. Until the number arrives (or if it never does) it's just "hi" */
const VisitorHi: React.FC = () => {
  const n = useVisitor();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (n === null) return undefined;
    if (STILL) {
      setShown(n);
      return undefined;
    }
    const t0 = performance.now() + 500;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 900));
      setShown(Math.round(n * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  if (n === null) return <>hey</>;
  return (
    <>
      hey visitor no. <span className="visitor-n">{counterDigits(shown)}</span>
    </>
  );
};

const PAGES: Record<PartId, { title: string; body: React.ReactNode }> = {
  about: {
    title: 'about me.',
    body: (
      <>
        <p>
          <VisitorHi />, i'm jian cheng — a final-year cs student at nus and an aspiring software engineer based in singapore.
        </p>
        <p>i write code same the way i like to play the piano: mostly improvising, heavily caffeinated, and praying i hit the right keys.</p>
        <p>also, in no particular order: a horrible pickleball player, an f1 fanatic, and a (semi) retired police officer.</p>
        <p>currently, i'm trying to figure how to do more with less using ai. (hence, this website!)</p>
      </>
    ),
  },
  name: {
    title: 'the name.',
    body: (
      <>
        <p>my parents named me 建成 — build, then succeed. that's quite a lot of responsibility for one newborn.</p>
        <ul className="glyphs">
          <GlyphRow k="jian">
            <span className="glyph" lang="zh-Hans">
              建
            </span>
            <span className="glyph-def">
              <b>jiàn</b>
              <i>verb</i>
              <span>to build; to construct. to establish; to found — a city, an institution, a habit.</span>
            </span>
          </GlyphRow>
          <GlyphRow k="cheng">
            <span className="glyph" lang="zh-Hans">
              成
            </span>
            <span className="glyph-def">
              <b>chéng</b>
              <i>verb · adj.</i>
              <span>to accomplish; to bring off. to succeed — to become the thing intended.</span>
            </span>
          </GlyphRow>
        </ul>
        <p className="say">
          <span>
            jiàn chéng · <i>/t͡ɕi̯ɛn˥˩ ʈ͡ʂʰɤŋ˧˥/</i>
          </span>
          <SayIt />
        </p>
        <p className="aside">
          i've been focusing on the first character, and trusting that the second will take care of itself.
        </p>
      </>
    ),
  },
  work: {
    title: 'work.',
    body: (
      <ul className="rows">
        <Job index={0} logo="stripe.svg" year="2027" name="stripe" role="software engineer · incoming" />
        <Job index={1} logo="autodesk.svg" year="2027" name="autodesk" role="software engineer intern · incoming" />
        <Job index={2} logo="cpf.png" year="2026" name="cpf board" role="ai developer intern" />
        <Job index={3} logo="privyr.png" year="2025" name="privyr" role="software engineer intern" />
        <Job index={4} logo="fintech-lab.png" year="2024" name="nus fintech lab" role="software engineer intern" />
      </ul>
    ),
  },
  thoughts: {
    title: 'thoughts.',
    body: <Thoughts />,
  },
  off: {
    title: 'off the keys.',
    body: <OffTheKeys />,
  },
  socials: {
    title: 'socials.',
    body: (
      <>
        <p>always up for a duet.</p>
        <ul className="read-links">
          <li>
            <a href="mailto:lowjiancheng3773@gmail.com">→ email</a>
          </li>
          <li>
            <a href="https://linkedin.com/in/lowjc" target="_blank" rel="noopener noreferrer">
              → linkedin
            </a>
          </li>
          <li>
            <a href="https://github.com/jiancheng37" target="_blank" rel="noopener noreferrer">
              → github
            </a>
          </li>
        </ul>
        <p className="aside read-email">lowjiancheng3773@gmail.com</p>
      </>
    ),
  },
};

/* a heading whose letters switch on in a scattered order, like a dither filling in */
const DitherTitle: React.FC<{ text: string; id: string }> = ({ text, id }) => {
  const chars = Array.from(text);
  const order = chars
    .map((_, i) => ({ i, k: Math.sin((i + 1) * 12.9898 + text.length * 78.233) * 43758.5453 }))
    .map((o) => ({ ...o, k: o.k - Math.floor(o.k) }))
    .sort((a, b) => a.k - b.k)
    .reduce<Record<number, number>>((acc, o, rank) => ({ ...acc, [o.i]: rank }), {});
  const step = Math.min(28, 320 / Math.max(1, chars.length));
  return (
    <h2 id={id} className="read-title" aria-label={text}>
      {chars.map((c, i) => (
        <span key={i} aria-hidden="true" style={{ '--d': `${Math.round(order[i] * step)}ms` } as React.CSSProperties}>
          {c}
        </span>
      ))}
    </h2>
  );
};

/* ── the darkroom, behind the bench camera's lens ── */
const TILTS = [-1.6, 0.9, -0.6, 1.3, -1.1];

/* the aperture: a hexagonal hole whose edges run on past each corner, like overlapping blades */
const HEX = Array.from({ length: 6 }, (_, i) => [50 + Math.cos((i * Math.PI) / 3), 50 + Math.sin((i * Math.PI) / 3)]);
const HEX_POINTS = HEX.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
const BLADE_EDGES = HEX.map(([x, y], i) => {
  const [nx, ny] = HEX[(i + 1) % 6];
  return [x, y, x + (nx - x) * 3, y + (ny - y) * 3];
});

/* a print on the line, drawn in the site's own dots. When the room opens it develops out of the dark,
   brightest parts first; hover (or tap) and the photograph itself comes through, and stays */
const Print: React.FC<{
  photo: Photo;
  index: number;
  slot: number;
  develop: boolean;
  seen: boolean;
  dot: number;
  revealed: boolean;
  onReveal: (file: string) => void;
}> = ({ photo, index, slot, develop, seen, dot, revealed, onReveal }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const src = `${process.env.PUBLIC_URL}/gallery/${photo.file}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    return canvas ? developPhoto(canvas, src, { dot, develop, delay: slot * 260 }) : undefined;
  }, [src, develop, dot, slot]);

  return (
    <li
      className={`print${revealed ? ' is-full' : ''}${seen ? ' is-seen' : ''}`}
      data-n={index}
      style={{ '--tilt': `${TILTS[index % TILTS.length]}deg`, '--n': slot, '--g': index } as React.CSSProperties}
    >
      <span className="peg" aria-hidden="true" />
      <button
        type="button"
        className="print-frame"
        onPointerEnter={() => onReveal(photo.file)}
        onClick={() => onReveal(photo.file)}
        aria-pressed={revealed}
        aria-label={photo.alt}
      >
        <canvas ref={canvasRef} className="print-dots" />
        <img className="print-full" src={src} alt="" />
      </button>
      <span className="print-cap">
        fig. g.{index + 1} — {photo.caption}
      </span>
    </li>
  );
};

const LOOKED_KEY = 'jc-darkroom-looked';
const LIGHTROOM_KEY = 'jc-lightroom';

/* one long line of prints; the wheel (or a sideways swipe) glides along it, and each print develops as it comes into view */
const Darkroom: React.FC<{ developing: boolean; dot: number; narrow: boolean; onLeave: () => void }> = ({
  developing,
  dot,
  narrow,
  onLeave,
}) => {
  const roomRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const lampRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());

  /* which photos have been looked at (kept, so they stay revealed), and whether the lights have come on */
  const [revealed, setRevealed] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(window.localStorage.getItem(LOOKED_KEY) || '[]'));
    } catch {
      return new Set<string>();
    }
  });
  const [lights, setLights] = useState<'dark' | 'switching' | 'half' | 'light'>(() => {
    try {
      return window.localStorage.getItem(LIGHTROOM_KEY) ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const reveal = useCallback(
    (file: string) =>
      setRevealed((had) => {
        if (had.has(file)) return had;
        const next = new Set(had).add(file);
        try {
          window.localStorage.setItem(LOOKED_KEY, JSON.stringify(Array.from(next)));
        } catch {
          /* private mode: they stay revealed for this visit */
        }
        return next;
      }),
    [],
  );

  /* the easter egg: every print looked at, and someone turns the lights on. A light floods in behind the line through
     the dots; halfway, the words and frames turn over to dark on light; then the whole room is lit, the photographs
     come up in their own colours one after another, and the darkroom is a lightroom */
  const switchedOn = useRef(lights !== 'dark');
  useEffect(() => {
    if (switchedOn.current || !developing || !GALLERY.every((p) => revealed.has(p.file))) return;
    switchedOn.current = true;
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, STILL ? 0 : ms));
    (async () => {
      await wait(700); // a beat to take in the last one
      const lamp = lampRef.current;
      if (lamp) setDotMask(lamp, 0);
      setLights('switching');
      try {
        window.localStorage.setItem(LIGHTROOM_KEY, '1');
      } catch {
        /* it just won't be remembered */
      }
      const flood = lamp ? dissolve([lamp], true, STILL ? 1 : 820) : Promise.resolve();
      await wait(410);
      setLights('half');
      await flood;
      setLights('light');
    })();
  }, [revealed, developing]);

  /* turn vertical wheel movement into travel along the line (a non-passive listener, so the page itself stays put) */
  useEffect(() => {
    const room = roomRef.current;
    const line = lineRef.current;
    if (!room || !line || narrow) return undefined;
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!d) return;
      e.preventDefault();
      line.scrollLeft += e.deltaMode === 1 ? d * 32 : d;
    };
    const onKey = (e: KeyboardEvent) => {
      const step = line.clientWidth / 3;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') line.scrollBy({ left: step, behavior: 'smooth' });
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') line.scrollBy({ left: -step, behavior: 'smooth' });
    };
    room.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      room.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [narrow]);

  /* a print develops the first time enough of it is on screen */
  useEffect(() => {
    if (!developing) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const fresh = entries.filter((en) => en.isIntersecting).map((en) => Number((en.target as HTMLElement).dataset.n));
        if (fresh.length) setSeen((s) => (fresh.every((n) => s.has(n)) ? s : new Set([...Array.from(s), ...fresh])));
      },
      { threshold: 0.35 },
    );
    roomRef.current?.querySelectorAll('.print').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [developing]);

  const lit = lights === 'half' || lights === 'light';

  return (
    <section
      ref={roomRef}
      className={`darkroom${developing ? ' is-shown' : ''}${lights === 'switching' || lights === 'half' ? ' is-switching' : ''}${
        lights === 'half' ? ' is-half' : ''
      }${lights === 'light' ? ' is-light' : ''}`}
      aria-labelledby="darkroom-title"
      onClick={(e) => {
        if (!(e.target as Element).closest('.print, .darkroom-close')) onLeave();
      }}
    >
      <div className="lamp" ref={lampRef} aria-hidden="true" />
      <button type="button" className="darkroom-close" onClick={onLeave} aria-label="Back to the bench">
        ×
      </button>
      <header>
        <p className="read-fig">fig. g — the camera</p>
        <DitherTitle
          key={lit ? 'light' : 'dark'}
          text={lit ? 'lightroom.' : 'darkroom.'}
          id="darkroom-title"
        />
      </header>
      <div className="prints-window" ref={lineRef}>
        <ul className="prints">
          {GALLERY.map((p, i) => (
            <Print
              key={p.file}
              photo={p}
              index={i}
              slot={i < 3 ? i : 0}
              develop={developing && seen.has(i)}
              seen={seen.has(i)}
              dot={dot}
              revealed={revealed.has(p.file)}
              onReveal={reveal}
            />
          ))}
        </ul>
      </div>
    </section>
  );
};

type Phase = 'home' | 'flying' | 'open' | 'closing';
type Room = 'closed' | 'entering' | 'open' | 'leaving' | 'returning';
type BookState = 'closed' | 'opening' | 'open' | 'turning' | 'closing';
type Box = { x: number; y: number; w: number; h: number };

/* the intro plays once per browser, on arrival at the overview (not on a link straight into a section), and never
   for people who've asked for less motion. Add ?intro to the address to see it again */
const wantsIntro = () => {
  if (STILL) return false;
  if (new URLSearchParams(window.location.search).has('intro')) return true;
  try {
    return !window.localStorage.getItem('jc-intro');
  } catch {
    return true;
  }
};

const fromHash = (): PartId | null => {
  const h = window.location.hash.replace('#', '') as PartId;
  return PART_IDS.includes(h) ? h : null;
};

const DitherPiano: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PianoScene | null>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lineRefs = useRef<Record<string, SVGLineElement | null>>({});
  const dotRefs = useRef<Record<string, SVGRectElement | null>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const points = useRef<Record<PartId, ScreenPoint> | null>(null);
  const lastMidi = useRef<number | null>(null);

  const [narrow, setNarrow] = useState(() => window.innerWidth / window.innerHeight < 0.85);
  const [phase, setPhase] = useState<Phase>('home');
  const [active, setActive] = useState<PartId | null>(null);
  const [hover, setHover] = useState<PartId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false); // once pressed, the note pointing at the button goes away
  /* concert mode: while a song plays, the camera settles on the keys and everything else gets out of the way */
  const [concert, setConcert] = useState(false);
  const [concertHint, setConcertHint] = useState(false);
  /* the first-visit intro: playing, then a moment where the labels switch on, then gone */
  const [intro, setIntro] = useState<'off' | 'playing' | 'lit'>('off');
  const visitor = useVisitor();
  const [room, setRoom] = useState<Room>('closed');
  const [developing, setDeveloping] = useState(false);
  const [camHover, setCamHover] = useState(false);
  const roomRef = useRef(room);
  roomRef.current = room;
  const activeRef = useRef(active);
  activeRef.current = active;
  const pushedRoom = useRef(false);
  const camTagRef = useRef<HTMLButtonElement>(null);
  const camLineRef = useRef<SVGLineElement>(null);
  const camDotRef = useRef<SVGRectElement>(null);
  const [bookState, setBookState] = useState<BookState>('closed');
  const [view, setView] = useState(0);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const [bookHover, setBookHover] = useState(false);
  const bookStateRef = useRef(bookState);
  bookStateRef.current = bookState;
  const viewRef = useRef(view);
  viewRef.current = view;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const [pendingEntry, setPendingEntry] = useState<number | null>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const leafPageRef = useRef<HTMLDivElement>(null);
  /* a page turn in progress: where it started and will end, how many of its flicks have landed, which face
     of the sheet in the air is showing; and whether the pages are still dissolving in after opening */
  const [turn, setTurn] = useState<{ from: number; to: number; dir: 1 | -1; n: number } | null>(null);
  const [landed, setLanded] = useState(0);
  const [leafSide, setLeafSide] = useState<'front' | 'back' | null>(null);
  const [revealing, setRevealing] = useState(false);
  const landedRef = useRef(0);
  const leafSideRef = useRef<'front' | 'back' | null>(null);
  const bookTagRef = useRef<HTMLButtonElement>(null);
  const bookLineRef = useRef<SVGLineElement>(null);
  const bookDotRef = useRef<SVGRectElement>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const audios = useRef(new Map<string, HTMLAudioElement>());
  const tracks = useRef(new Map<string, SongTrack>());
  const [songId, setSongId] = useState(SONGS[0].id);
  const songIdRef = useRef(songId);
  const playToken = useRef(0); // bumped on every play/pause/switch, so a slow start can't land on the wrong song
  /* the setlist: unlocked a few seconds into the first play of blue (remembered per browser); "fresh" while the
     note pointing at it is still up, until it's first opened */
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return !!window.localStorage.getItem(SETLIST_KEY);
    } catch {
      return false;
    }
  });
  const [fresh, setFresh] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const listOpenRef = useRef(listOpen);
  listOpenRef.current = listOpen;
  const unlockTimer = useRef<number | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const narrowRef = useRef(narrow);
  narrowRef.current = narrow;

  /* scene lifecycle */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = createPianoScene(canvas, (pts: Record<PartId, ScreenPoint>, info: FrameInfo) => {
      points.current = pts;
      const n = narrowRef.current;
      const snap = (v: number) => Math.round(v / (n ? 2 : 3)) * (n ? 2 : 3);
      /* 1. place each label: hand-placed offsets for the default view; once the piano is
         turned or zoomed, push labels straight out from its centre so they stay clear */
      const placed = PART_IDS.map((id) => {
        const p = pts[id];
        const [wx, wy, nx, ny] = OFFSETS[id];
        const rx = p.x - info.centre.x;
        const ry = p.y - info.centre.y;
        const rl = Math.hypot(rx, ry) || 1;
        const reach = n ? 70 : 130;
        const t = info.moved;
        const dx = (n ? nx : wx) * (1 - t) + (rx / rl) * reach * t;
        const dy = (n ? ny : wy) * (1 - t) + (ry / rl) * reach * 0.6 * t;
        const label = labelRefs.current[id];
        const lw = label?.offsetWidth ?? 0;
        const lh = label?.offsetHeight ?? 0;
        const rawX = p.x + dx;
        const lx = dx < 0 ? Math.max(lw + 12, rawX) : Math.min(window.innerWidth - lw - 12, rawX);
        const ly = Math.min(window.innerHeight - 70, Math.max(30, p.y + dy));
        return { id, p, dx, lx, ly, lw, lh, left: dx < 0 ? lx - lw : lx };
      });
      /* 2. nudge apart any labels that overlap, top to bottom */
      const visible = placed.filter((l) => l.p.visible).sort((a, b) => a.ly - b.ly);
      for (let pass = 0; pass < 2; pass += 1) {
        for (let i = 0; i < visible.length; i += 1) {
          for (let j = i + 1; j < visible.length; j += 1) {
            const a = visible[i];
            const b = visible[j];
            const xOverlap = a.left < b.left + b.lw && b.left < a.left + a.lw;
            const gap = (a.lh + b.lh) / 2 + 6;
            if (xOverlap && b.ly - a.ly < gap) b.ly = a.ly + gap;
          }
        }
      }
      placed.forEach(({ id, p, dx, lx: rawLx, ly: rawLy }) => {
        const lx = snap(rawLx);
        const ly = snap(rawLy);
        const label = labelRefs.current[id];
        if (label) {
          label.style.transform = `translate(${lx}px, ${ly}px) translate(${dx < 0 ? '-100%' : '0'}, -50%)`;
          label.style.visibility = p.visible ? 'visible' : 'hidden';
          label.classList.toggle('is-behind', info.behind[id]);
        }
        const line = lineRefs.current[id];
        line?.parentElement?.classList.toggle('is-behind', info.behind[id]);
        if (line) {
          line.setAttribute('x1', String(snap(p.x)));
          line.setAttribute('y1', String(snap(p.y)));
          line.setAttribute('x2', String(lx));
          line.setAttribute('y2', String(ly));
        }
        const dot = dotRefs.current[id];
        if (dot) {
          dot.setAttribute('x', String(snap(p.x) - 3));
          dot.setAttribute('y', String(snap(p.y) - 3));
        }
      });
      /* 3. the camera's own label, which only shows on the bench close-up */
      const c = info.camera;
      const camTag = camTagRef.current;
      let camBox: Box | null = null;
      if (camTag) {
        const tw = camTag.offsetWidth;
        const th = camTag.offsetHeight;
        const tx = snap(Math.min(window.innerWidth - tw - 12, Math.max(12, c.x + (n ? -tw / 2 : -tw - 36))));
        const ty = snap(Math.max(16, c.y - th - (n ? 44 : 78)));
        camTag.style.transform = `translate(${tx}px, ${ty}px)`;
        camBox = { x: tx, y: ty, w: tw, h: th };
        const ex = n ? tx + tw / 2 : tx + tw - 14;
        camLineRef.current?.setAttribute('x1', String(snap(c.x)));
        camLineRef.current?.setAttribute('y1', String(snap(c.y)));
        camLineRef.current?.setAttribute('x2', String(snap(ex)));
        camLineRef.current?.setAttribute('y2', String(ty + th));
        camDotRef.current?.setAttribute('x', String(snap(c.x) - 3));
        camDotRef.current?.setAttribute('y', String(snap(c.y) - 3));
      }
      /* 4. the notebook's label, kept clear of the camera's */
      const b = info.notebook;
      const bookTag = bookTagRef.current;
      if (bookTag) {
        const tw = bookTag.offsetWidth;
        const th = bookTag.offsetHeight;
        const tx = snap(Math.min(window.innerWidth - tw - 12, Math.max(12, b.x + (n ? -tw / 2 : -tw - 30))));
        let ty = snap(Math.max(16, b.y - th - (n ? 40 : 66)));
        const cb = camBox as Box | null;
        if (cb && tx < cb.x + cb.w + 8 && cb.x < tx + tw + 8 && ty < cb.y + cb.h + 8 && cb.y < ty + th + 8) {
          ty = snap(Math.max(16, cb.y - th - 10));
        }
        bookTag.style.transform = `translate(${tx}px, ${ty}px)`;
        const ex = n ? tx + tw / 2 : tx + tw - 14;
        bookLineRef.current?.setAttribute('x1', String(snap(b.x)));
        bookLineRef.current?.setAttribute('y1', String(snap(b.y)));
        bookLineRef.current?.setAttribute('x2', String(snap(ex)));
        bookLineRef.current?.setAttribute('y2', String(ty + th));
        bookDotRef.current?.setAttribute('x', String(snap(b.x) - 3));
        bookDotRef.current?.setAttribute('y', String(snap(b.y) - 3));
      }
      /* 5. the open notebook: lay each page of text exactly over its page in the scene */
      if (info.book) {
        const r = info.book.right;
        const w = Math.round((Math.hypot(r[2] - r[0], r[3] - r[1]) + Math.hypot(r[4] - r[6], r[5] - r[7])) / 2);
        const h = Math.round((Math.hypot(r[6] - r[0], r[7] - r[1]) + Math.hypot(r[4] - r[2], r[5] - r[3])) / 2);
        const was = pageSizeRef.current;
        if (!was || Math.abs(was.w - w) > 3 || Math.abs(was.h - h) > 3) {
          pageSizeRef.current = { w, h };
          setPageSize({ w, h });
        }
        const size = pageSizeRef.current!;
        if (leftPageRef.current) leftPageRef.current.style.transform = quadTransform(size.w, size.h, info.book.left);
        if (rightPageRef.current) rightPageRef.current.style.transform = quadTransform(size.w, size.h, info.book.right);
        /* the sheet being turned: real page text riding the 3D page's corners, front face then back */
        const lf = info.leaf;
        const leafEl = leafPageRef.current;
        if (leafEl) {
          if (lf) leafEl.style.transform = quadTransform(size.w, size.h, lf.showBack ? lf.back : lf.front);
          leafEl.style.visibility = lf ? 'visible' : 'hidden';
        }
        const side = lf ? (lf.showBack ? 'back' : 'front') : null;
        if (side !== leafSideRef.current) {
          leafSideRef.current = side;
          setLeafSide(side);
        }
        if (info.flicks !== landedRef.current) {
          landedRef.current = info.flicks;
          setLanded(info.flicks);
        }
      }
    });
    sceneRef.current = scene;
    const onResize = () => {
      const isNarrow = window.innerWidth / window.innerHeight < 0.85;
      setNarrow(isNarrow);
      scene.resize(window.innerWidth, window.innerHeight, isNarrow);
    };
    onResize();
    window.addEventListener('resize', onResize);
    const startInRoom = window.location.hash === '#gallery';
    const initial = startInRoom ? 'off' : fromHash();
    if (initial) {
      setActive(initial);
      setPhase('flying');
      scene.flyTo(initial, () => {
        setPhase('open');
        if (startInRoom) {
          scene.setHidden(true);
          setRoom('open');
        }
      });
    } else if (wantsIntro()) {
      setIntro('playing');
      scene.playIntro(() => {
        try {
          window.localStorage.setItem('jc-intro', '1');
        } catch {
          /* fine: it plays again next time */
        }
        setIntro('lit');
        window.setTimeout(() => setIntro('off'), 1800);
      });
    }
    return () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
    };
  }, []);

  /* the one sound on the site: a recording from the setlist, with the piano playing along from its transcription.
     pause keeps the place; play carries on from it. at the end it rewinds for next time, and nothing plays on after */
  const pauseSong = useCallback(() => {
    playToken.current += 1;
    audios.current.get(songIdRef.current)?.pause();
    sceneRef.current?.setSong(null);
    setPlaying(false);
  }, []);

  const endSong = useCallback((id: string) => {
    const a = audios.current.get(id);
    if (a) a.currentTime = 0;
    if (id !== songIdRef.current) return;
    sceneRef.current?.setSong(null);
    setPlaying(false);
  }, []);

  const startSong = (song: Song) => {
    const token = ++playToken.current;
    let a = audios.current.get(song.id);
    if (!a) {
      a = new Audio(songUrl(song.id, 'mp3'));
      a.preload = 'auto';
      a.addEventListener('ended', () => endSong(song.id));
      audios.current.set(song.id, a);
    }
    const audio = a;
    setPlaying(true);
    setPlayed(true);
    if (!unlocked && unlockTimer.current === null) {
      unlockTimer.current = window.setTimeout(() => {
        setUnlocked(true);
        setFresh(true);
        try {
          window.localStorage.setItem(SETLIST_KEY, '1');
        } catch {
          /* fine: blue unlocks it again next time */
        }
      }, SETLIST_DELAY);
    }
    const cached = tracks.current.get(song.id);
    const track = cached
      ? Promise.resolve(cached)
      : fetch(songUrl(song.id, 'json'))
          .then((r) => r.json() as Promise<SongTrack>)
          .then((t) => {
            tracks.current.set(song.id, t);
            return t;
          });
    Promise.all([audio.play(), track])
      .then(([, t]) => {
        if (token !== playToken.current || audio.paused) return; // paused or switched before it got going
        sceneRef.current?.setSong({ track: t, time: () => audio.currentTime });
      })
      .catch(() => {
        if (token === playToken.current) pauseSong();
      });
  };

  const playSong = () => startSong(songById(songIdRef.current));

  /* picking from the setlist: the old song stops and rewinds, the button takes the new one's name and it starts */
  const chooseSong = (id: string) => {
    setListOpen(false);
    if (id !== songIdRef.current) {
      const prev = audios.current.get(songIdRef.current);
      if (prev) {
        prev.pause();
        prev.currentTime = 0;
      }
      sceneRef.current?.setSong(null);
      songIdRef.current = id;
      setSongId(id);
    }
    startSong(songById(id));
  };

  const toggleList = () => {
    setFresh(false);
    setListOpen((o) => !o);
  };

  const enterConcert = () => {
    setListOpen(false);
    hoverPart(null);
    setConcert(true);
    setConcertHint(true);
    sceneRef.current?.setConcert(true);
  };

  const leaveConcert = useCallback(() => {
    setConcert(false);
    sceneRef.current?.setConcert(false);
  }, []);

  /* how to get out is said once, briefly, then the screen is just the piano */
  useEffect(() => {
    if (!concertHint) return undefined;
    const t = window.setTimeout(() => setConcertHint(false), 3200);
    return () => window.clearTimeout(t);
  }, [concertHint]);

  /* any key leaves (the veil over the screen takes care of clicks, taps, drags and scrolls), and so does the music
     stopping, after a beat */
  useEffect(() => {
    if (!concert) return undefined;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      leaveConcert();
    };
    window.addEventListener('keydown', onKey);
    const t = playing ? 0 : window.setTimeout(leaveConcert, 1400);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [concert, playing, leaveConcert]);

  /* the setlist folds away on a click anywhere else */
  useEffect(() => {
    if (!listOpen) return undefined;
    const away = (e: PointerEvent) => {
      if (!deckRef.current?.contains(e.target as Node)) setListOpen(false);
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [listOpen]);

  useEffect(() => {
    const all = audios.current;
    return () => {
      all.forEach((a) => a.pause());
      if (unlockTimer.current !== null) window.clearTimeout(unlockTimer.current);
    };
  }, []);

  /* the darkroom: into the lens, the aperture shuts, opens on the prints, the shutter fires and they develop.
     Leaving runs it backwards, out onto the bench */
  const openRoom = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || roomRef.current !== 'closed') return;
    setCamHover(false);
    if (window.location.hash !== '#gallery') {
      window.history.pushState(null, '', '#gallery');
      pushedRoom.current = true;
    }
    setRoom('entering');
    scene.flyIntoLens(() => {
      scene.setHidden(true);
      setRoom('open');
    });
  }, []);

  const leaveRoom = useCallback(() => {
    if (roomRef.current !== 'open') return;
    pushedRoom.current = false;
    setRoom('leaving');
    window.setTimeout(
      () => {
        sceneRef.current?.leaveLens();
        sceneRef.current?.setHidden(false);
        setRoom('returning');
        window.setTimeout(() => setRoom('closed'), STILL ? 0 : 640);
      },
      STILL ? 0 : 460,
    );
  }, []);

  /* stepping out goes back through history when we came in through it, so the back button stays honest */
  const requestLeaveRoom = useCallback(() => {
    if (roomRef.current !== 'open') return;
    if (pushedRoom.current && window.location.hash === '#gallery') window.history.back();
    else {
      window.history.replaceState(null, '', '#off');
      leaveRoom();
    }
  }, [leaveRoom]);

  useEffect(() => {
    if (room === 'closed') setDeveloping(false);
    if (room !== 'open') return undefined;
    const id = window.setTimeout(() => setDeveloping(true), STILL ? 0 : 900);
    return () => window.clearTimeout(id);
  }, [room]);

  /* the notebook: open it at an entry, turn its pages, close it */
  const layout = useMemo(() => (pageSize ? layoutNotebook(pageSize, narrow) : null), [pageSize, narrow]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const perView = narrow ? 1 : 2;
  const perViewRef = useRef(perView);
  perViewRef.current = perView;
  const viewCount = layout ? Math.ceil(layout.pages.length / perView) : 0;

  const turnTo = useCallback((target: number) => {
    const scene = sceneRef.current;
    const lay = layoutRef.current;
    if (!scene || !lay || bookStateRef.current !== 'open') return;
    const last = Math.ceil(lay.pages.length / perViewRef.current) - 1;
    const to = Math.max(0, Math.min(last, target));
    const from = viewRef.current;
    if (to === from) return;
    const dir = to > from ? 1 : -1;
    landedRef.current = 0;
    setLanded(0);
    setTurn({ from, to, dir, n: Math.min(3, Math.abs(to - from)) });
    setBookState('turning');
    scene.turnPage(dir, Math.abs(to - from), () => {
      setView(to);
      setTurn(null);
      leafSideRef.current = null;
      setLeafSide(null);
      setBookState('open');
    });
  }, []);

  const goTo = useCallback(
    (entry: number) => {
      const scene = sceneRef.current;
      if (!scene) return;
      if (bookStateRef.current === 'closed') {
        setView(0);
        setPendingEntry(entry);
        setCamHover(false);
        setBookHover(false);
        setBookState('opening');
        scene.openBook(() => {
          setBookState('open');
          setRevealing(true);
        });
        return;
      }
      const lay = layoutRef.current;
      if (lay) turnTo(Math.floor(lay.starts[entry] / perViewRef.current));
    },
    [turnTo],
  );

  /* closing: the pages go back into the dots first, then the cover comes down */
  const closeBook = useCallback(() => {
    if (bookStateRef.current !== 'open') return;
    setBookState('closing');
    const els = [leftPageRef.current, rightPageRef.current].filter(Boolean) as HTMLElement[];
    dissolve(els, false, STILL ? 1 : 300).then(() => sceneRef.current?.closeBook(() => setBookState('closed')));
  }, []);

  /* opening: once the cover lands, the pages come up out of the dots, the same grain as the book beneath them */
  useLayoutEffect(() => {
    if (!revealing || !layout || !pageSize) return undefined;
    const els = [leftPageRef.current, rightPageRef.current].filter(Boolean) as HTMLElement[];
    els.forEach((el) => setDotMask(el, 0));
    let gone = false;
    dissolve(els, true, STILL ? 1 : 380).then(() => {
      if (!gone) setRevealing(false);
    });
    return () => {
      gone = true;
    };
  }, [revealing, layout, pageSize]);

  /* then, if an entry further in was asked for, flip through to it */
  useEffect(() => {
    if (bookState !== 'open' || revealing || !layout || pendingEntry === null) return;
    setPendingEntry(null);
    turnTo(Math.floor(layout.starts[pendingEntry] / perView));
  }, [bookState, revealing, layout, perView, pendingEntry, turnTo]);

  const currentEntry = layout && bookState !== 'closed' ? layout.pages[view * perView]?.entry ?? null : null;
  const bookCtx = useMemo(
    () => ({ goTo, current: currentEntry, pageOf: (i: number) => (layout ? layout.starts[i] + 1 : null) }),
    [goTo, currentEntry, layout],
  );

  useEffect(() => {
    if (intro !== 'playing') return undefined;
    const skip = () => sceneRef.current?.skipIntro();
    const events = ['pointerdown', 'wheel', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, skip, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, skip));
  }, [intro]);

  const pluckRole = useCallback((index: number | null) => sceneRef.current?.setRole(index), []);
  const writeGlyph = useCallback((key: GlyphKey | null) => sceneRef.current?.nameGlyph(key), []);

  const hoverPart = useCallback((id: PartId | null) => {
    setHover(id);
    sceneRef.current?.setHover(id);
  }, []);

  const open = useCallback(
    (id: PartId) => {
      hoverPart(null);
      setActive(id);
      setPhase('flying');
      if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
      sceneRef.current?.flyTo(id, () => setPhase('open'));
    },
    [hoverPart],
  );

  const close = useCallback(() => {
    if (!active) return;
    sceneRef.current?.setRole(null);
    if (bookStateRef.current !== 'closed') {
      sceneRef.current?.resetBook();
      setPendingEntry(null);
      setBookState('closed');
    }
    setPhase('closing');
    if (window.location.hash) window.history.pushState(null, '', window.location.pathname);
    sceneRef.current?.flyTo(null, () => {
      setPhase('home');
      setActive(null);
    });
  }, [active]);

  useEffect(() => {
    if (phase !== 'open') return;
    const blocks = bodyRef.current?.querySelectorAll<HTMLElement>(':scope > p, :scope > figure, :scope > ul > li') ?? [];
    blocks.forEach((el, i) => el.style.setProperty('--i', String(i)));
  }, [phase, active]);

  useEffect(() => {
    const onPop = () => {
      if (window.location.hash === '#gallery') {
        if (roomRef.current === 'closed' && activeRef.current === 'off') openRoom();
        return;
      }
      if (roomRef.current !== 'closed') {
        leaveRoom();
        return;
      }
      const id = fromHash();
      if (id) open(id);
      else close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && listOpenRef.current) {
        setListOpen(false);
        return;
      }
      if (e.key === 'Escape') {
        if (roomRef.current === 'open') requestLeaveRoom();
        else if (bookStateRef.current === 'open') closeBook();
        else if (roomRef.current === 'closed' && bookStateRef.current === 'closed') close();
      }
      if (bookStateRef.current === 'open' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        turnTo(viewRef.current + (e.key === 'ArrowRight' ? 1 : -1));
        e.preventDefault();
        return;
      }
      const scene = sceneRef.current;
      if (!scene || (e.target as HTMLElement)?.closest?.('input, textarea')) return;
      if (e.key === 'ArrowLeft') scene.orbitBy(0.18, 0);
      else if (e.key === 'ArrowRight') scene.orbitBy(-0.18, 0);
      else if (e.key === 'ArrowUp') scene.orbitBy(0, -0.1);
      else if (e.key === 'ArrowDown') scene.orbitBy(0, 0.1);
      else if (e.key === '+' || e.key === '=') scene.zoomBy(0.88);
      else if (e.key === '-' || e.key === '_') scene.zoomBy(1.14);
      else return;
      e.preventDefault();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close, openRoom, leaveRoom, requestLeaveRoom, closeBook, turnTo]);

  /* wheel and trackpad-pinch zoom; needs a non-passive listener so the browser doesn't zoom the page */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sceneRef.current?.zoomBy(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * (e.ctrlKey ? 0.01 : 0.0025)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (phase !== 'home') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0 && drag.current) {
      suppressClick.current = drag.current.moved;
      drag.current = null;
      setDragging(false);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const prev = pointers.current.get(e.pointerId);
    if (prev) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (phase !== 'home') {
      if (phase === 'open' && active === 'off' && room === 'closed' && bookState === 'closed') {
        const hit = scene.pick(e.clientX, e.clientY);
        if (hit.camera !== camHover) setCamHover(hit.camera);
        if (hit.book !== bookHover) setBookHover(hit.book);
      }
      return;
    }
    if (pinch.current !== null && pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0) scene.zoomBy(pinch.current / d);
      pinch.current = d;
      if (drag.current) drag.current.moved = true;
      return;
    }
    if (drag.current && prev) {
      const total = Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y);
      if (!drag.current.moved && total > 5) {
        drag.current.moved = true;
        setDragging(true);
        hoverPart(null);
      }
      if (drag.current.moved) {
        scene.orbitBy(-(e.clientX - prev.x) * 0.00208, -(e.clientY - prev.y) * 0.0016);
        return;
      }
    }
    const { part, midi } = scene.pick(e.clientX, e.clientY);
    if (part !== hover) hoverPart(part);
    if (midi !== null && midi !== lastMidi.current) {
      scene.pressKey(midi);
    }
    lastMidi.current = midi;
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (phase === 'open') {
      if (room !== 'closed') return;
      if (active === 'off' && bookState !== 'closed') {
        if (bookState === 'open' && !sceneRef.current?.pick(e.clientX, e.clientY).book) closeBook();
        return;
      }
      const hit = sceneRef.current?.pick(e.clientX, e.clientY);
      if (active === 'off' && hit?.camera) openRoom();
      else if (active === 'off' && hit?.book) goTo(0);
      else close();
      return;
    }
    if (phase !== 'home') return;
    const { part } = sceneRef.current!.pick(e.clientX, e.clientY);
    if (part) open(part);
  };

  const shown = phase === 'open';
  const benchOn = active === 'off' && phase === 'open' && room === 'closed' && bookState === 'closed';
  const camOn = benchOn;
  const pagesShown = (bookState === 'open' || bookState === 'turning' || bookState === 'closing') && !!layout;

  /* what each page shows. Mid-turn: the page underneath is already the destination, and the sheet in the air
     carries the page being left on its front and the page arriving on its back */
  type Face = { page: ReturnType<typeof pageAt>; number: number } | undefined;
  const pageAt = (i: number) => layout?.pages[i];
  const leftOf = (v: number): Face => (narrow ? undefined : { page: pageAt(v * 2), number: v * 2 + 1 });
  const rightOf = (v: number): Face => (narrow ? { page: pageAt(v), number: v + 1 } : { page: pageAt(v * 2 + 1), number: v * 2 + 2 });
  let leftFace = leftOf(view);
  let rightFace = rightOf(view);
  let leafFace: Face;
  if (turn) {
    const step = (k: number) => (k >= turn.n ? turn.to : turn.from + turn.dir * k);
    const a = step(landed);
    const b = step(landed + 1);
    leftFace = leftOf(a);
    rightFace = rightOf(a);
    if (leafSide && turn.dir > 0) {
      rightFace = rightOf(b);
      leafFace = leafSide === 'front' ? rightOf(a) : leftOf(b);
    } else if (leafSide) {
      leftFace = leftOf(b);
      leafFace = leafSide === 'back' ? leftOf(a) : rightOf(b);
    }
  }
  const section = active ? byId[active] : null;
  const song = songById(songId);

  return (
    <BookContext.Provider value={bookCtx}>
    <StringsContext.Provider value={pluckRole}>
    <GlyphContext.Provider value={writeGlyph}>
    <div
      className={`onebit phase-${phase}${narrow ? ' is-narrow' : ''}${hover ? ' has-hover' : ''}${
        intro === 'playing' ? ' is-intro' : intro === 'lit' ? ' is-lit' : ''
      }${concert ? ' is-concert' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className="screen"
        style={{ cursor: dragging ? 'grabbing' : hover || camHover || bookHover ? 'pointer' : phase === 'home' ? 'grab' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => {
          if (!drag.current) hoverPart(null);
          lastMidi.current = null;
        }}
        onClick={onCanvasClick}
        aria-label="A grand piano under a stage light. Drag to turn it, scroll to zoom. Each part of the piano opens a page."
        role="img"
      />

      <svg className="leaders" aria-hidden="true">
        {SECTIONS.map((s) => (
          <g key={s.id} className={hover === s.id ? 'is-hot' : ''}>
            <line ref={(el) => (lineRefs.current[s.id] = el)} />
            <rect ref={(el) => (dotRefs.current[s.id] = el)} width="6" height="6" />
          </g>
        ))}
      </svg>

      <div className="tags">
        {SECTIONS.map((s, k) => (
          <button
            key={s.id}
            ref={(el) => (labelRefs.current[s.id] = el)}
            type="button"
            className={`tag${hover === s.id ? ' is-hot' : ''}`}
            style={{ '--k': k } as React.CSSProperties}
            onClick={() => open(s.id)}
            onPointerEnter={() => hoverPart(s.id)}
            onPointerLeave={() => hoverPart(null)}
            onFocus={() => hoverPart(s.id)}
            onBlur={() => hoverPart(null)}
            tabIndex={phase === 'home' ? 0 : -1}
          >
            <span className="tag-fig">fig. {s.fig} — {s.part}</span>
            <span className="tag-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className={`cam-callout${camOn ? ' is-on' : ''}`} aria-hidden={!camOn}>
        <svg className="cam-leader" aria-hidden="true">
          <line ref={camLineRef} />
          <rect ref={camDotRef} width="6" height="6" />
        </svg>
        <button
          ref={camTagRef}
          type="button"
          className={`tag cam-tag${camHover ? ' is-hot' : ''}`}
          onClick={openRoom}
          onPointerEnter={() => setCamHover(true)}
          onPointerLeave={() => setCamHover(false)}
          tabIndex={camOn ? 0 : -1}
        >
          <span className="tag-fig">fig. g — the camera</span>
          <span className="tag-label">look inside</span>
        </button>
      </div>

      <div className={`cam-callout${benchOn ? ' is-on' : ''}`} aria-hidden={!benchOn}>
        <svg className="cam-leader" aria-hidden="true">
          <line ref={bookLineRef} />
          <rect ref={bookDotRef} width="6" height="6" />
        </svg>
        <button
          ref={bookTagRef}
          type="button"
          className={`tag cam-tag${bookHover ? ' is-hot' : ''}`}
          onClick={() => goTo(0)}
          onPointerEnter={() => setBookHover(true)}
          onPointerLeave={() => setBookHover(false)}
          tabIndex={benchOn ? 0 : -1}
        >
          <span className="tag-fig">fig. h — the notebook</span>
          <span className="tag-label">open it</span>
        </button>
      </div>

      {active === 'off' && bookState !== 'closed' && pageSize && layout && (
        <div className="notebook">
          {!narrow && (
            <NotebookPageView
              ref={leftPageRef}
              side="left"
              page={leftFace?.page}
              number={leftFace?.number ?? 0}
              size={pageSize}
              shown={pagesShown}
              back={view > 0}
              next={false}
              dot={3}
              onTurn={(d) => turnTo(view + d)}
            />
          )}
          <NotebookPageView
            ref={rightPageRef}
            side="right"
            page={rightFace?.page}
            number={rightFace?.number ?? 0}
            size={pageSize}
            shown={pagesShown}
            back={narrow && view > 0}
            next={view < viewCount - 1}
            dot={narrow ? 2 : 3}
            onTurn={(d) => turnTo(view + d)}
          />
          <NotebookPageView
            ref={leafPageRef}
            side="leaf"
            page={leafFace?.page}
            number={leafFace?.number ?? 0}
            size={pageSize}
            shown={pagesShown}
            back={false}
            next={false}
            dot={narrow ? 2 : 3}
            onTurn={() => undefined}
          />
        </div>
      )}

      {(room === 'open' || room === 'leaving') && <Darkroom developing={developing} dot={narrow ? 2 : 3} narrow={narrow} onLeave={requestLeaveRoom} />}

      {room !== 'closed' && (
        <div className={`iris is-${room}`} aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="iris-grain" patternUnits="userSpaceOnUse" width="0.75" height="0.75">
                <rect width="0.75" height="0.75" style={{ fill: 'var(--ink)' }} />
                <rect width="0.25" height="0.25" style={{ fill: 'var(--paper)' }} />
              </pattern>
              <mask id="iris-hole" maskUnits="userSpaceOnUse" x="-100" y="-100" width="300" height="300">
                <rect x="-100" y="-100" width="300" height="300" fill="#fff" />
                <polygon className="iris-move" points={HEX_POINTS} fill="#000" />
              </mask>
            </defs>
            <rect className="iris-blades" x="-100" y="-100" width="300" height="300" mask="url(#iris-hole)" />
            <g className="iris-move iris-edges">
              {BLADE_EDGES.map(([x1, y1, x2, y2]) => (
                <line key={`${x1.toFixed(2)}-${y1.toFixed(2)}`} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
            </g>
          </svg>
          <div className="flash" />
        </div>
      )}

      {intro !== 'off' && visitor !== null && (
        <p className="visitor-stamp" aria-hidden="true">
          visitor no. {counterDigits(visitor)}
        </p>
      )}

      <div className={`play-note${phase === 'home' && !played && intro === 'off' ? ' is-shown' : ''}`} aria-hidden="true">
        <span>curr fav</span>
        <svg width="44" height="40" viewBox="0 0 44 40">
          <path className="play-note-line" d="M1 8 C 22 6, 34 14, 34 33" />
          <path d="M29 28 L34 35 L39 28" />
        </svg>
      </div>

      {concert && (
        <div
          className="concert-veil"
          onPointerDown={leaveConcert}
          onWheel={leaveConcert}
          aria-label="Leave concert mode"
          role="button"
          tabIndex={-1}
        >
          <p className={`concert-hint${concertHint ? ' is-shown' : ''}`}>{narrow ? 'tap' : 'click'} anywhere to leave</p>
        </div>
      )}

      {/* bottom right: concert mode (while a song plays), then the setlist's tab, then the song button; the setlist stacks up from them */}
      <div className="deck" ref={deckRef}>
        {playing && phase === 'home' && room === 'closed' && (
          <button type="button" className="concert-on" onClick={enterConcert}>
            concert mode
          </button>
        )}

        {unlocked && (
          <span className="setlist-anchor">
            <button
              type="button"
              className={`setlist-toggle${fresh ? ' is-fresh' : ''}${listOpen ? ' is-open' : ''}`}
              onClick={toggleList}
              aria-expanded={listOpen}
              aria-controls="setlist"
              aria-label={listOpen ? 'Close the setlist' : 'Choose another song'}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d={listOpen ? 'M1 3 L9 3 L5 8 Z' : 'M1 7 L9 7 L5 2 Z'} />
              </svg>
            </button>
            <span
              className={`request-note${fresh && !listOpen && phase === 'home' && intro === 'off' ? ' is-shown' : ''}`}
              aria-hidden="true"
            >
              <span>taking requests</span>
              <svg width="44" height="40" viewBox="0 0 44 40">
                <path className="play-note-line" d="M1 8 C 22 6, 34 14, 34 33" />
                <path d="M29 28 L34 35 L39 28" />
              </svg>
            </span>
          </span>
        )}

        {unlocked && listOpen && (
          <ul className="setlist" id="setlist">
            {SONGS.filter((s) => s.id !== songId).map((s, k) => (
              <li key={s.id} style={{ '--k': k } as React.CSSProperties}>
                <button
                  type="button"
                  onClick={() => chooseSong(s.id)}
                  aria-label={`Play “${s.title}” by ${s.by} on the piano`}
                >
                  <PlayIcon />
                  <span className="song-label">
                    {s.title} · {s.by}
                  </span>
                  {s.id === SONGS[0].id && <span className="setlist-fav">curr fav</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className={`play${playing ? ' is-on' : ''}`}
          onClick={playing ? pauseSong : playSong}
          aria-label={playing ? `Pause “${song.title}”` : `Play “${song.title}” by ${song.by} on the piano`}
        >
          <PlayIcon paused={playing} />
          <span className="song-label">
            {song.title} · {song.by}
          </span>
        </button>
      </div>

      <article
        className={`reading${shown ? ' is-shown' : ''}`}
        aria-hidden={!shown}
        aria-labelledby="read-title"
      >
        {active && section && (
          <div className="read-inner" key={active}>
            <p className="read-fig">
              fig. {section.fig} — {section.part}
            </p>
            <DitherTitle text={PAGES[active].title} id="read-title" />
            <div className="read-body" ref={bodyRef}>
              {PAGES[active].body}
            </div>
          </div>
        )}
      </article>
    </div>
    </GlyphContext.Provider>
    </StringsContext.Provider>
    </BookContext.Provider>
  );
};

export default DitherPiano;
