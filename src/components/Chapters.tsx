import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { CHAPTERS, ORG_NOTES } from '../content';
import OrgNoteCard from './OrgNoteCard';
import SectionCue from './SectionCue';
import { useForcedRailScroll } from '../hooks/useForcedRailScroll';

/** Where the reading window sits down the panel. */
const BAND = 0.24;

type Point = { x: number; y: number };

type TravelerPose = {
  x: number;
  y: number;
  /** Degrees from the rocket's native right-facing orientation. */
  angle: number;
  progress: number;
};

/* Catmull-Rom → cubic bezier through stop points (the dotted snake). */
function smoothPath(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/* Side-view rocket — exhaust flickers while scrolling; parent scaleX flips it
   to face along the trail. */
const TrailRocket: React.FC = () => (
  <svg
    className="chapters-rocket-svg"
    viewBox="0 0 40 28"
    width="30"
    height="22"
    fill="currentColor"
    aria-hidden
  >
    <path d="M14 7.2C20.8 2.8 29.2 3.4 36 13.8c-6.8 10.4-15.2 11-22 6.6l-5.2 2.8 1.5-6.3H5.8v-6.2h4.5L8.8 4.4 14 7.2Z" />
    <circle cx="24.8" cy="13.8" r="3.6" fill="var(--color-bg)" />
    <path
      className="chapters-rocket-flame chapters-rocket-flame--outer"
      d="M5.8 10.1C2.8 10.8 1 12 0 13.8c1 1.8 2.8 3 5.8 3.7v-7.4Z"
    />
    <path
      className="chapters-rocket-flame chapters-rocket-flame--inner"
      d="M5.8 12.2c-1.4.3-2.3.8-2.9 1.6.6.8 1.5 1.3 2.9 1.6v-3.2Z"
      fill="var(--color-bg)"
    />
  </svg>
);

/* Curving dotted trail down the middle; chapters alternate left / right.
   Walker faces along the curve and only “walks” while you scroll. */
const Chapters: React.FC = () => {
  const [openOrg, setOpenOrg] = useState<string>();
  const close = useCallback(() => setOpenOrg(undefined), []);
  const note = openOrg ? ORG_NOTES[openOrg] : undefined;
  const noteLogo = CHAPTERS.find((chapter) => chapter.org === openOrg)?.logo;

  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const noteOpen = Boolean(note);
  const reduceMotion = useReducedMotion();
  const lastScrollRef = useRef(0);
  const travelDirectionRef = useRef<1 | -1>(1);
  const walkTimerRef = useRef(0);
  const bandRef = useRef(0);

  const [focus, setFocus] = useState(0);
  const [litRow, setLitRow] = useState<number>();
  const [pathD, setPathD] = useState('');
  const [stops, setStops] = useState<Point[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [pose, setPose] = useState<TravelerPose | null>(null);
  const [walking, setWalking] = useState(false);
  const [naturalFlow, setNaturalFlow] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 1023px)').matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const updateLayoutMode = () => setNaturalFlow(media.matches);
    media.addEventListener('change', updateLayoutMode);
    return () => media.removeEventListener('change', updateLayoutMode);
  }, []);

  useEffect(() => {
    const rail = scrollRef.current;
    const journey = journeyRef.current;
    const list = listRef.current;
    if (!rail || !journey || !list) return undefined;

    let frame = 0;
    let fitFrame = 0;

    const measure = () => {
      frame = 0;
      const rows = Array.from(list.children) as HTMLElement[];
      if (!rows.length) return;

      const journeyBox = journey.getBoundingClientRect();
      const railBox = rail.getBoundingClientRect();
      /* Size the path from the in-flow list, never journey.scrollHeight —
         an absolute SVG fed by scrollHeight can grow the scrollport forever. */
      const w = journey.clientWidth;
      const h = Math.max(list.offsetHeight, journey.clientHeight);
      const cx = w / 2;
      const straightTrail = naturalFlow;
      const sway = straightTrail ? 0 : Math.min(56, w * 0.06);
      const railX = straightTrail ? 14 : null;

      const nextStops: Point[] = rows.map((row, index) => {
        const rowBox = row.getBoundingClientRect();
        const heading = row.querySelector<HTMLElement>('.chapter-title');
        const headingBox = heading?.getBoundingClientRect();
        const y = headingBox
          ? headingBox.top + headingBox.height / 2 - journeyBox.top
          : rowBox.top + rowBox.height / 2 - journeyBox.top;
        /* Curve into the empty half so the path never cuts through copy. */
        const x =
          railX ?? cx + (index % 2 === 0 ? sway : -sway);
        return { x, y };
      });

      const d = smoothPath(nextStops);
      setStops(nextStops);
      setPathD(d);
      setSvgSize({ w, h });

      const path = pathRef.current;
      if (path && d) {
        path.setAttribute('d', d);
        const len = path.getTotalLength();
        if (len > 0) {
          const firstY = nextStops[0].y;
          const lastY = nextStops[nextStops.length - 1].y;
          const readingLine = naturalFlow
            ? window.innerHeight * 0.55
            : railBox.top + bandRef.current;
          const bandY = readingLine - journeyBox.top;
          const t =
            lastY <= firstY
              ? 0
              : Math.min(1, Math.max(0, (bandY - firstY) / (lastY - firstY)));
          const dist = t * len;
          const pt = path.getPointAtLength(dist);
          const direction = travelDirectionRef.current;
          let sampleDist = Math.min(len, Math.max(0, dist + direction * 3));
          let sample: Point = path.getPointAtLength(sampleDist);
          if (sampleDist === dist) {
            sampleDist = Math.min(len, Math.max(0, dist - direction * 3));
            const fallback = path.getPointAtLength(sampleDist);
            sample = {
              x: pt.x + (pt.x - fallback.x),
              y: pt.y + (pt.y - fallback.y),
            };
          }
          setPose({
            x: pt.x,
            y: pt.y,
            angle: (Math.atan2(sample.y - pt.y, sample.x - pt.x) * 180) / Math.PI,
            progress: t,
          });
        }
      }

      if (
        !naturalFlow &&
        rail.scrollTop >= rail.scrollHeight - rail.clientHeight - 4
      ) {
        setFocus(rows.length - 1);
        return;
      }

      let nearest = 0;
      let shortest = Infinity;
      const readingLine = naturalFlow
        ? window.innerHeight * 0.55
        : railBox.top + bandRef.current;
      rows.forEach((row, index) => {
        const box = row.getBoundingClientRect();
        const distance = Math.abs(box.top + box.height / 2 - readingLine);
        if (distance < shortest) {
          shortest = distance;
          nearest = index;
        }
      });
      setFocus(nearest);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const onScroll = () => {
      const top = naturalFlow ? window.scrollY : rail.scrollTop;
      const delta = top - lastScrollRef.current;
      if (Math.abs(delta) > 0.5) {
        travelDirectionRef.current = delta > 0 ? 1 : -1;
      }
      if (!reduceMotion && Math.abs(delta) > 0.5) {
        setWalking(true);
        window.clearTimeout(walkTimerRef.current);
        walkTimerRef.current = window.setTimeout(() => setWalking(false), 140);
      }
      lastScrollRef.current = top;
      schedule();
    };

    const fit = () => {
      fitFrame = 0;
      const rows = list.children;
      const first = rows[0] as HTMLElement | undefined;
      const last = rows[rows.length - 1] as HTMLElement | undefined;
      if (!first || !last) return;

      if (naturalFlow) {
        bandRef.current = first.offsetHeight / 2 + 8;
        list.style.paddingTop = '8px';
        list.style.paddingBottom = '16px';
        schedule();
        return;
      }

      const band = Math.max(
        rail.clientHeight * BAND,
        first.offsetHeight / 2 + 8,
      );
      bandRef.current = band;
      list.style.paddingTop = `${band - first.offsetHeight / 2}px`;
      list.style.paddingBottom = `${Math.max(
        48,
        rail.clientHeight - band - last.offsetHeight / 2,
      )}px`;
      schedule();
    };

    const scheduleFit = () => {
      if (!fitFrame) fitFrame = requestAnimationFrame(fit);
    };

    fit();
    const resize = new ResizeObserver(scheduleFit);
    if (naturalFlow) {
      window.addEventListener('resize', scheduleFit, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
    } else {
      resize.observe(rail);
      resize.observe(journey);
      rail.addEventListener('scroll', onScroll, { passive: true });
    }

    return () => {
      resize.disconnect();
      window.removeEventListener('resize', scheduleFit);
      window.removeEventListener('scroll', onScroll);
      rail.removeEventListener('scroll', onScroll);
      window.clearTimeout(walkTimerRef.current);
      if (frame) cancelAnimationFrame(frame);
      if (fitFrame) cancelAnimationFrame(fitFrame);
    };
  }, [naturalFlow, reduceMotion]);

  useEffect(() => {
    if (noteOpen) return undefined;

    let frame = 0;
    let pointerY: number | undefined;

    const evaluate = () => {
      frame = 0;
      const rail = scrollRef.current;
      const list = listRef.current;
      if (!rail || !list || pointerY === undefined) return;

      const railBox = rail.getBoundingClientRect();
      if (pointerY < railBox.top || pointerY > railBox.bottom) {
        setLitRow(undefined);
        return;
      }

      const rows = Array.from(list.children);
      const hit = rows.findIndex((row) => {
        const box = row.getBoundingClientRect();
        return pointerY! >= box.top && pointerY! < box.bottom;
      });
      setLitRow(hit < 0 ? undefined : hit);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(evaluate);
    };
    const onMove = (event: PointerEvent) => {
      pointerY = event.clientY;
      schedule();
    };
    const onLeave = () => {
      pointerY = undefined;
      setLitRow(undefined);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    scrollRef.current?.addEventListener('scroll', schedule, { passive: true });
    const rail = scrollRef.current;

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', schedule);
      document.removeEventListener('pointerleave', onLeave);
      rail?.removeEventListener('scroll', schedule);
    };
  }, [noteOpen]);

  useForcedRailScroll(sectionRef, scrollRef, noteOpen, reduceMotion);

  return (
    <div className="section section--chapters" id="c-chapters" ref={sectionRef}>
      <div className="chapters-head">
        <span className="tag tag-outline kicker">previously</span>
        <h2 className="section-title">The Story So Far</h2>
        <p className="section-subtitle">
          Schools, internships, detours, and other plot points — a timeline of where I’ve been and what I picked up along the way.
        </p>
      </div>

      <div className="chapters-scroll" ref={scrollRef}>
        <div className="chapters-journey" ref={journeyRef}>
          <svg
            className="chapters-path-svg"
            width={svgSize.w || '100%'}
            height={svgSize.h || '100%'}
            viewBox={`0 0 ${Math.max(svgSize.w, 1)} ${Math.max(svgSize.h, 1)}`}
            aria-hidden="true"
          >
            <defs>
              <mask
                id="chapters-path-mask"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={Math.max(svgSize.w, 1)}
                height={Math.max(svgSize.h, 1)}
              >
                <rect
                  width={Math.max(svgSize.w, 1)}
                  height={Math.max(svgSize.h, 1)}
                  fill="black"
                />
                <path
                  d={pathD || undefined}
                  fill="none"
                  stroke="white"
                  strokeWidth="10"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={`${pose?.progress ?? 0} 1`}
                />
              </mask>
            </defs>
            <path
              ref={pathRef}
              className="chapters-path-dots"
              d={pathD || undefined}
              fill="none"
            />
            <path
              className="chapters-path-progress"
              d={pathD || undefined}
              fill="none"
              mask="url(#chapters-path-mask)"
            />
            {stops.map((stop, index) => (
              <circle
                key={`stop-${index}`}
                className={`chapters-path-stop${
                  index === focus || index === litRow ? ' is-active' : ''
                }${index < focus ? ' is-read' : ''}`}
                cx={stop.x}
                cy={stop.y}
                r={index === focus || index === litRow ? 5.5 : 4}
              />
            ))}
          </svg>

          {pose && (
            <div
              className={`chapters-traveler${walking ? ' is-walking' : ''}${
                reduceMotion ? ' is-instant' : ''
              }`}
              aria-hidden="true"
              style={{
                left: pose.x,
                top: pose.y,
                transform: `translate(-50%, -50%) rotate(${pose.angle}deg)`,
              }}
            >
              <TrailRocket />
            </div>
          )}

          <ol className="chapters-timeline" ref={listRef}>
            {CHAPTERS.map((chapter, index) => {
              const side = index % 2 === 0 ? 'left' : 'right';
              const mark = chapter.logo ? (
                <img className="chapter-logo" src={chapter.logo} alt="" />
              ) : (
                <span className="chapter-mark-text">{chapter.mark}</span>
              );
              const org = chapter.org ? ORG_NOTES[chapter.org] : undefined;
              const classes = [
                'chapter',
                `chapter--${side}`,
                index === focus ? 'is-focus' : '',
                index < focus ? 'is-read' : '',
                litRow === index ? 'is-lit' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const open = org
                ? () => setOpenOrg(chapter.org)
                : undefined;

              return (
                <li
                  className={`${classes}${org ? ' is-openable' : ''}`}
                  key={`${chapter.year}-${chapter.title}`}
                  {...(org
                    ? {
                        role: 'button' as const,
                        tabIndex: 0,
                        'aria-label': `What is ${org.name}?`,
                        onClick: open,
                        onKeyDown: (event: React.KeyboardEvent) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            open?.();
                          }
                        },
                      }
                    : {})}
                >
                  <div className="chapter-body">
                    <div className="chapter-copy">
                      <div className="chapter-year">{chapter.year}</div>
                      <h3 className="chapter-title">{chapter.title}</h3>
                      {chapter.place && (
                        <div className="chapter-place">{chapter.place}</div>
                      )}
                      <p className="chapter-text">{chapter.body}</p>
                    </div>

                    {(chapter.logo || chapter.mark) && (
                      <div className="chapter-mark" aria-hidden="true">
                        {mark}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <AnimatePresence>
        {note && <OrgNoteCard note={note} logo={noteLogo} onClose={close} />}
      </AnimatePresence>

      <SectionCue href="#c-work" />
    </div>
  );
};

export default Chapters;
