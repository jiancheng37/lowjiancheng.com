import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flag,
  Gamepad2,
  Music2,
} from 'lucide-react';
import { CURIOSITIES } from '../content';
import SectionCue from './SectionCue';

const EASE = [0.16, 1, 0.3, 1] as const;

/* Same depth slots as the hero plate stack. */
const STACK_SLOTS = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: 12, y: 14, rotate: 2.5, scale: 0.965 },
  { x: 24, y: 28, rotate: 5, scale: 0.93 },
];

/* Short call signs for the dial face — full titles live in the panel. */
const DIAL_CALLS: Record<string, string> = {
  music: 'Music',
  gaming: 'Gaming',
  photography: 'Photo',
  formula1: 'F1',
  mma: 'MMA',
};

const MOBILE_ICONS: Record<string, React.ReactNode> = {
  music: <Music2 />,
  gaming: <Gamepad2 />,
  photography: <Camera />,
  formula1: <Flag />,
  mma: <Dumbbell />,
};

/* Sideways dial opens right: 0° = right, +clockwise (down). Stations top → bottom. */
const DIAL_START = -70;
const DIAL_END = 70;
const DIAL_COUNT = CURIOSITIES.length;
const VIEW_W = 280;
const VIEW_H = 400;
const PIVOT_X = 56;
const PIVOT_Y = 200;

function angleForIndex(index: number) {
  if (DIAL_COUNT <= 1) return 0;
  return DIAL_START + (index / (DIAL_COUNT - 1)) * (DIAL_END - DIAL_START);
}

function indexForAngle(angle: number) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < DIAL_COUNT; i += 1) {
    const dist = Math.abs(angleForIndex(i) - angle);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function clampDialAngle(deg: number) {
  return Math.min(DIAL_END, Math.max(DIAL_START, deg));
}

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: PIVOT_X + Math.cos(rad) * radius,
    y: PIVOT_Y + Math.sin(rad) * radius,
  };
}

function arcPath(radius: number) {
  const a = polar(DIAL_START, radius);
  const b = polar(DIAL_END, radius);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`;
}

/* Vertical radio dial on the left; click / drag / keys tune the panel. */
const ThingsIEnjoy: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [plateIndex, setPlateIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  /* While dragging, needle follows freely; null means parked on a station. */
  const [scrubAngle, setScrubAngle] = useState<number | null>(null);
  const [copyHasMore, setCopyHasMore] = useState(false);
  const [copyExpanded, setCopyExpanded] = useState(false);
  const [compactImages, setCompactImages] = useState(() =>
    window.matchMedia('(max-width: 1023px)').matches,
  );
  const reduceMotion = useReducedMotion();
  const dialFaceRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const copyScrollRef = useRef<HTMLDivElement>(null);
  const copyRubberBandTarget = useMotionValue(0);
  const copyRubberBand = useSpring(copyRubberBandTarget, {
    stiffness: 300,
    damping: 26,
    mass: 0.7,
  });
  const rubberBandResetFrame = useRef(0);
  /* Ref so move/up see drag immediately (state lags one frame). */
  const draggingRef = useRef(false);
  const active = CURIOSITIES[activeIndex] ?? CURIOSITIES[0];
  const plates =
    (compactImages ? active.responsiveImages : undefined) ?? active.images ?? [];
  const plateCaption =
    active.captions?.[plateIndex] ?? active.caption;
  const needleAngle = scrubAngle ?? angleForIndex(activeIndex);
  const highlightIndex =
    scrubAngle != null ? indexForAngle(scrubAngle) : activeIndex;

  const updateCopyFade = useCallback(() => {
    const el = copyScrollRef.current;
    if (!el) {
      setCopyHasMore(false);
      return;
    }
    const overflows = el.scrollHeight > el.clientHeight + 2;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    setCopyHasMore(overflows && !nearBottom);
  }, []);

  const stations = useMemo(
    () =>
      CURIOSITIES.map((item, index) => {
        const angle = angleForIndex(index);
        const tip = polar(angle, 150);
        const label = polar(angle, 178);
        return {
          ...item,
          call: DIAL_CALLS[item.id] ?? item.label,
          angle,
          tick: {
            x1: polar(angle, 130).x,
            y1: polar(angle, 130).y,
            x2: tip.x,
            y2: tip.y,
          },
          left: (label.x / VIEW_W) * 100,
          top: (label.y / VIEW_H) * 100,
        };
      }),
    [],
  );

  useEffect(() => {
    setPlateIndex(0);
    setCopyExpanded(false);
  }, [active.id, compactImages]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const updateImages = () => setCompactImages(media.matches);
    media.addEventListener('change', updateImages);
    return () => media.removeEventListener('change', updateImages);
  }, []);

  useEffect(() => {
    const nav = mobileNavRef.current;
    const button = nav?.querySelectorAll<HTMLElement>('button')[activeIndex];
    if (!nav || !button) return;
    nav.scrollTo({
      left: button.offsetLeft - (nav.clientWidth - button.clientWidth) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeIndex, reduceMotion]);

  useEffect(() => {
    const el = copyScrollRef.current;
    if (!el) return undefined;
    el.scrollTop = 0;
    updateCopyFade();
    const ro = new ResizeObserver(() => updateCopyFade());
    ro.observe(el);
    return () => ro.disconnect();
  }, [active.id, updateCopyFade]);

  const handleCopyWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const el = copyScrollRef.current;
      if (!el || reduceMotion) return;
      const atTop = el.scrollTop <= 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      const pullingPastTop = atTop && event.deltaY < 0;
      const pullingPastBottom = atBottom && event.deltaY > 0;

      if (!pullingPastTop && !pullingPastBottom) {
        copyRubberBandTarget.set(0);
        return;
      }

      const pull = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY) * 0.18, 20);
      copyRubberBandTarget.set(pull);
      if (rubberBandResetFrame.current) {
        cancelAnimationFrame(rubberBandResetFrame.current);
      }
      rubberBandResetFrame.current = requestAnimationFrame(() => {
        rubberBandResetFrame.current = requestAnimationFrame(() => {
          copyRubberBandTarget.set(0);
          rubberBandResetFrame.current = 0;
        });
      });
    },
    [copyRubberBandTarget, reduceMotion],
  );

  useEffect(
    () => () => {
      if (rubberBandResetFrame.current) {
        cancelAnimationFrame(rubberBandResetFrame.current);
      }
    },
    [],
  );

  const cyclePlate = useCallback(() => {
    if (plates.length < 2) return;
    setPlateIndex((i) => (i + 1) % plates.length);
  }, [plates.length]);

  const angleFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = dialFaceRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    /* Face is CSS-tilted; map screen → local via inverse rotation around center. */
    const tilt = (-3 * Math.PI) / 180;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dxs = clientX - cx;
    const dys = clientY - cy;
    const localX = dxs * Math.cos(-tilt) - dys * Math.sin(-tilt);
    const localY = dxs * Math.sin(-tilt) + dys * Math.cos(-tilt);
    /* Pivot in local coords relative to face center. */
    const pivotLocalX = (PIVOT_X / VIEW_W - 0.5) * rect.width;
    const pivotLocalY = (PIVOT_Y / VIEW_H - 0.5) * rect.height;
    const dx = localX - pivotLocalX;
    const dy = localY - pivotLocalY;
    /* 0° = right; + = clockwise (down). */
    return clampDialAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  }, []);

  const onDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    setScrubAngle(angleFromPointer(e.clientX, e.clientY));
  };

  const onDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setScrubAngle(angleFromPointer(e.clientX, e.clientY));
  };

  const onDialPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const next = indexForAngle(angleFromPointer(e.clientX, e.clientY));
    setActiveIndex(next);
    setScrubAngle(null);
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const selectStation = (index: number) => {
    setScrubAngle(null);
    setActiveIndex(index);
  };

  const onDialKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      selectStation(Math.min(DIAL_COUNT - 1, activeIndex + 1));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      selectStation(Math.max(0, activeIndex - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectStation(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectStation(DIAL_COUNT - 1);
    }
  };

  return (
    <div className="section section--curiosities" id="c-curiosities">
      <div className="curiosity-head">
        <span className="tag tag-outline kicker">off the clock</span>
        <h2 className="section-title">Other Obsessions</h2>
        <p className="section-subtitle">
          Interests, hobbies, and everything beyond the screen.
        </p>
      </div>

      <div className="curiosity-stage">
        <div className="curiosity-mobile-nav-wrap">
          <button
            type="button"
            className="curiosity-mobile-arrow"
            aria-label="Previous obsession"
            disabled={activeIndex === 0}
            onClick={() => selectStation(activeIndex - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <div
            ref={mobileNavRef}
            className="curiosity-mobile-nav"
            role="radiogroup"
            aria-label="Choose an obsession"
          >
            {stations.map((station, index) => (
              <button
                key={station.id}
                type="button"
                role="radio"
                aria-checked={index === activeIndex}
                aria-label={station.label}
                className={index === activeIndex ? 'is-active' : ''}
                onClick={() => selectStation(index)}
              >
                {MOBILE_ICONS[station.id]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="curiosity-mobile-arrow"
            aria-label="Next obsession"
            disabled={activeIndex === stations.length - 1}
            onClick={() => selectStation(activeIndex + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>

        <aside className="curiosity-tuner">
          <div className="curiosity-tuner-shell" aria-hidden="true">
            <span className="curiosity-tuner-wash" />
            <span className="curiosity-tuner-corner curiosity-tuner-corner--tl" />
            <span className="curiosity-tuner-corner curiosity-tuner-corner--tr" />
            <span className="curiosity-tuner-corner curiosity-tuner-corner--bl" />
            <span className="curiosity-tuner-corner curiosity-tuner-corner--br" />
          </div>
          <p className="curiosity-tuner-plate">
            <span className="curiosity-tuner-plate-kicker">Receiver</span>
            <span className="curiosity-tuner-plate-title">Band Select</span>
          </p>
          <div
            className={`curiosity-dial${dragging ? ' is-dragging' : ''}`}
            role="radiogroup"
            aria-label="Tune an interest"
            tabIndex={0}
            onKeyDown={onDialKeyDown}
            onPointerDown={onDialPointerDown}
            onPointerMove={onDialPointerMove}
            onPointerUp={onDialPointerUp}
            onPointerCancel={onDialPointerUp}
          >
            <div className="curiosity-dial-face" ref={dialFaceRef}>
              <svg
                className="curiosity-dial-svg"
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                fill="none"
                aria-hidden="true"
              >
                <path
                  className="curiosity-dial-arc curiosity-dial-arc--glass"
                  d={arcPath(158)}
                  strokeWidth="18"
                />
                <path
                  className="curiosity-dial-arc"
                  d={arcPath(152)}
                  strokeWidth="1.5"
                />
                <path
                  className="curiosity-dial-arc curiosity-dial-arc--inner"
                  d={arcPath(130)}
                  strokeWidth="1"
                />
                {stations.map((station, index) => (
                  <line
                    key={station.id}
                    className={`curiosity-dial-tick${index === highlightIndex ? ' is-active' : ''}`}
                    x1={station.tick.x1}
                    y1={station.tick.y1}
                    x2={station.tick.x2}
                    y2={station.tick.y2}
                    strokeWidth="1.5"
                  />
                ))}
                <g transform={`translate(${PIVOT_X} ${PIVOT_Y})`}>
                  <g
                    className={`curiosity-dial-needle${
                      reduceMotion || dragging ? ' is-instant' : ''
                    }`}
                    style={{ transform: `rotate(${needleAngle}deg)` }}
                  >
                    <line x1="0" y1="0" x2="128" y2="0" strokeWidth="1.75" />
                    <circle cx="0" cy="0" r="8" className="curiosity-dial-hub" />
                    <circle
                      cx="0"
                      cy="0"
                      r="2.75"
                      className="curiosity-dial-hub-dot"
                    />
                  </g>
                </g>
              </svg>

              <div className="curiosity-dial-stations">
                {stations.map((station, index) => {
                  const selected = index === activeIndex;
                  const nearest = index === highlightIndex;
                  return (
                    <button
                      key={station.id}
                      type="button"
                      role="radio"
                      id={`curiosity-tab-${station.id}`}
                      aria-checked={selected}
                      aria-controls={`curiosity-panel-${station.id}`}
                      className={`curiosity-dial-station${nearest ? ' is-active' : ''}`}
                      style={{ left: `${station.left}%`, top: `${station.top}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectStation(index);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <span className="curiosity-dial-call">{station.call}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div
          className="curiosity-panel"
          role="tabpanel"
          id={`curiosity-panel-${active.id}`}
          aria-labelledby={`curiosity-tab-${active.id}`}
          aria-live="polite"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              className="curiosity-panel-inner"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <div
                className={`curiosity-copy${copyHasMore ? ' has-more' : ''}${
                  copyExpanded ? ' is-expanded' : ''
                }`}
              >
                <div className="curiosity-copy-pin">
                  <p className="curiosity-now">
                    <span className="curiosity-now-kicker">Now playing</span>
                    <span className="curiosity-now-title">{active.label}</span>
                  </p>
                  <h3 className="curiosity-title">{active.title}</h3>
                </div>
                <div className="curiosity-copy-scroll-wrap">
                  <motion.div
                    className="curiosity-copy-scroll"
                    ref={copyScrollRef}
                    onScroll={updateCopyFade}
                    onWheel={handleCopyWheel}
                    style={{ y: copyRubberBand }}
                  >
                    {active.body.split(/\n\n+/).map((para) => (
                      <p className="curiosity-body" key={para.slice(0, 48)}>
                        {para}
                      </p>
                    ))}
                  </motion.div>
                  <div className="curiosity-copy-fade" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  className="curiosity-read-more"
                  aria-expanded={copyExpanded}
                  onClick={() => setCopyExpanded((expanded) => !expanded)}
                >
                  {copyExpanded ? 'Read less' : 'Read more'}
                </button>
              </div>
              <figure className="curiosity-figure">
                {plates.length > 0 ? (
                  <>
                    <div className="plate-offset-wrap">
                      <div className="plate-offset-frame" aria-hidden="true" />
                      <div
                        className={`hero-stack curiosity-stack${
                          plates.length > 1 ? ' is-shufflable' : ''
                        }`}
                        role={plates.length > 1 ? 'button' : undefined}
                        tabIndex={plates.length > 1 ? 0 : undefined}
                        aria-label={
                          plates.length > 1
                            ? `Show next ${active.title} photo (${plateIndex + 1} of ${plates.length})`
                            : undefined
                        }
                        onClick={cyclePlate}
                        onKeyDown={(event) => {
                          if (plates.length < 2) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            cyclePlate();
                          }
                        }}
                      >
                        {plates.map((src, index) => {
                          const depth =
                            (index - plateIndex + plates.length) % plates.length;
                          const slot =
                            STACK_SLOTS[Math.min(depth, STACK_SLOTS.length - 1)];
                          const buried = depth >= STACK_SLOTS.length;
                          return (
                            <motion.div
                              key={src}
                              className={`plate curiosity-plate hero-stack-card${
                                depth === 0 ? ' is-top' : ''
                              }`}
                              style={{ zIndex: plates.length - depth }}
                              animate={{ ...slot, opacity: buried ? 0 : 1 }}
                              whileHover={
                                depth === 0 && !reduceMotion
                                  ? { scale: 1.035 }
                                  : undefined
                              }
                              transition={
                                reduceMotion
                                  ? { duration: 0 }
                                  : { type: 'spring', stiffness: 260, damping: 26 }
                              }
                            >
                              <img
                                className="plate-img"
                                src={src}
                                alt={
                                  plates.length > 1
                                    ? `${active.imageAlt ?? active.title} (${index + 1})`
                                    : active.imageAlt ?? active.title
                                }
                                draggable={false}
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                    <figcaption className="hero-figcaption">
                      <span className="folio">
                        Fig. {plateIndex + 1}
                        {plates.length > 1 ? ` / ${plates.length}` : ''}
                      </span>
                      {plateCaption && (
                        <span className="caption-italic">{plateCaption}</span>
                      )}
                      {plates.length > 1 && (
                        <span className="curiosity-plate-hint">click for next</span>
                      )}
                    </figcaption>
                  </>
                ) : (
                  <>
                    <div className="plate-offset-wrap" aria-hidden="true">
                      <div className="plate-offset-frame" />
                      <div className="plate curiosity-plate curiosity-plate--empty" />
                    </div>
                    <figcaption className="hero-figcaption">
                      <span className="folio">Fig. —</span>
                      {active.caption && (
                        <span className="caption-italic">{active.caption}</span>
                      )}
                    </figcaption>
                  </>
                )}
              </figure>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <SectionCue href="#c-contact" />
    </div>
  );
};

export default ThingsIEnjoy;
