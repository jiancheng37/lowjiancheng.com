import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { JOBS, ORG_NOTES } from '../content';
import OrgNoteCard from './OrgNoteCard';
import SectionCue from './SectionCue';

type TimecardBulletsProps = {
  bullets: string[];
  reduceMotion: boolean;
};

const TimecardBullets: React.FC<TimecardBulletsProps> = ({
  bullets,
  reduceMotion,
}) => {
  const pullTarget = useMotionValue(0);
  const pull = useSpring(pullTarget, {
    stiffness: 320,
    damping: 25,
    mass: 0.65,
  });
  const resetFrame = useRef(0);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLUListElement>) => {
      const list = event.currentTarget;
      if (reduceMotion || list.scrollHeight <= list.clientHeight + 1) return;

      const atTop = list.scrollTop <= 1;
      const atBottom =
        list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
      const pullingPastEdge =
        (atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0);

      if (!pullingPastEdge) {
        pullTarget.set(0);
        return;
      }

      pullTarget.set(
        Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY) * 0.16, 16),
      );
      if (resetFrame.current) cancelAnimationFrame(resetFrame.current);
      resetFrame.current = requestAnimationFrame(() => {
        resetFrame.current = requestAnimationFrame(() => {
          pullTarget.set(0);
          resetFrame.current = 0;
        });
      });
    },
    [pullTarget, reduceMotion],
  );

  useEffect(
    () => () => {
      if (resetFrame.current) cancelAnimationFrame(resetFrame.current);
    },
    [],
  );

  return (
    <motion.ul
      className="job-bullets timecard-bullets"
      onWheel={handleWheel}
      onScroll={(event) => {
        const list = event.currentTarget;
        const atEnd =
          list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
        list.classList.toggle('is-at-end', atEnd);
      }}
      style={reduceMotion ? undefined : { y: pull }}
    >
      {bullets.map((bullet) => (
        <li key={bullet}>{bullet}</li>
      ))}
    </motion.ul>
  );
};

/* "Clocked In", read literally: each internship is a punch-card time slip, and
   all of them are laid out together so the whole record reads at a glance. The
   company name and its mark open the same reference note as the chapter logos. */
const Work: React.FC = () => {
  const [openOrg, setOpenOrg] = useState<string>();
  const [activeCard, setActiveCard] = useState(0);
  const timecardsRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpenOrg(undefined), []);
  const note = openOrg ? ORG_NOTES[openOrg] : undefined;
  const noteLogo = JOBS.find((job) => job.org === openOrg)?.logo;
  const reduceMotion = useReducedMotion();
  const [singleColumn, setSingleColumn] = useState(() =>
    window.matchMedia('(max-width: 1279px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1279px)');
    const updateLayout = () => setSingleColumn(media.matches);
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  const scrollToCard = (index: number) => {
    const rail = timecardsRef.current;
    const card = rail?.querySelectorAll<HTMLElement>('.timecard')[index];
    if (!rail || !card) return;
    rail.scrollTo({
      left: card.offsetLeft - rail.offsetLeft,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const tilts = [-1.25, 0.9, -0.65] as const;

  const container = reduceMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: {},
        show: {
          transition: { staggerChildren: 0.28, delayChildren: 0.1 },
        },
      };
  const itemFor = (i: number) =>
    reduceMotion
      ? {
          hidden: { opacity: 0, transition: { duration: 0 } },
          show: { opacity: 1, rotate: tilts[i % tilts.length] },
        }
      : {
          /* snap back off-stage when leaving so only the enter reads */
          hidden: {
            opacity: 0,
            x: -48,
            rotate: tilts[i % tilts.length],
            transition: { duration: 0 },
          },
          show: {
            opacity: 1,
            x: 0,
            rotate: tilts[i % tilts.length],
            transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] },
          },
        };

  return (
    <div className="section section--work" id="c-work">
      <div className="work-head">
        <span className="tag tag-outline kicker">where i've been</span>
        <h2 className="section-title">Clocked In</h2>
        <p className="section-subtitle">
          A record of time well spent.
        </p>
      </div>

      <motion.div
        className="timecards"
        ref={timecardsRef}
        onScroll={(event) => {
          const rail = event.currentTarget;
          const cards = Array.from(
            rail.querySelectorAll<HTMLElement>('.timecard'),
          );
          if (!cards.length) return;
          const railLeft = rail.getBoundingClientRect().left;
          const nearest = cards.reduce(
            (best, card, index) =>
              Math.abs(card.getBoundingClientRect().left - railLeft) < best.distance
                ? {
                    index,
                    distance: Math.abs(card.getBoundingClientRect().left - railLeft),
                  }
                : best,
            { index: 0, distance: Number.POSITIVE_INFINITY },
          );
          setActiveCard(nearest.index);
        }}
        variants={singleColumn ? undefined : container}
        initial={singleColumn ? undefined : 'hidden'}
        whileInView={singleColumn ? undefined : 'show'}
        viewport={singleColumn ? undefined : { once: false, amount: 0.35 }}
      >
        {JOBS.map((job, i) => {
          const [punchIn, punchOut] = job.dates
            .split('–')
            .map((part) => part.trim());
          const org = job.org ? ORG_NOTES[job.org] : undefined;
          const cardNo = String(i + 1).padStart(2, '0');
          const name = (
            <>
              {job.company}
              {job.logo && <img className="job-logo" src={job.logo} alt="" />}
            </>
          );

          return (
            <motion.article
              key={job.company}
              className={`timecard timecard--${i + 1}`}
              variants={itemFor(i)}
              initial={singleColumn ? 'hidden' : undefined}
              whileInView={singleColumn ? 'show' : undefined}
              viewport={singleColumn ? { once: false, amount: 0.35 } : undefined}
            >
              <div className="timecard-perf" aria-hidden="true" />
              <div className="timecard-slip-head">
                <span className="timecard-slip-label">Time Card</span>
                <span className="timecard-no">No. {cardNo}</span>
              </div>

              <h3 className="timecard-company">
                {org ? (
                  <button
                    type="button"
                    className="job-company-btn"
                    onClick={() => job.org && setOpenOrg(job.org)}
                    aria-label={`What is ${org.name}?`}
                  >
                    {name}
                  </button>
                ) : (
                  name
                )}
              </h3>
              <div className="timecard-role">{job.role}</div>

              <div className="timecard-clock">
                <div className="timecard-punch-slot">
                  <span className="timecard-punch-key">In</span>
                  <span className="timecard-punch-val">{punchIn}</span>
                </div>
                <span className="timecard-punch-arrow" aria-hidden="true">
                  →
                </span>
                <div className="timecard-punch-slot">
                  <span className="timecard-punch-key">Out</span>
                  <span className="timecard-punch-val">
                    {punchOut ?? 'Present'}
                  </span>
                </div>
              </div>

              <div className="tag-row">
                {job.tags.map((tag) => (
                  <span className="tag tag-neutral" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <TimecardBullets
                bullets={job.bullets}
                reduceMotion={Boolean(reduceMotion)}
              />

              <span className="timecard-stamp" aria-hidden="true">
                Punched
              </span>
            </motion.article>
          );
        })}
      </motion.div>

      <div className="timecard-rail-cue" aria-label={`Card ${activeCard + 1} of ${JOBS.length}`}>
        <div className="timecard-rail-label">
          <button
            type="button"
            aria-label="Previous time card"
            disabled={activeCard === 0}
            onClick={() => scrollToCard(activeCard - 1)}
          >
            ←
          </button>
          <span>Scroll cards</span>
          <button
            type="button"
            aria-label="Next time card"
            disabled={activeCard === JOBS.length - 1}
            onClick={() => scrollToCard(activeCard + 1)}
          >
            →
          </button>
        </div>
        <div className="timecard-rail-dots" aria-label="Choose a time card">
          {JOBS.map((job, index) => (
            <button
              key={job.company}
              type="button"
              className={index === activeCard ? 'is-active' : ''}
              aria-label={`Show card ${index + 1}: ${job.company}`}
              aria-current={index === activeCard ? 'true' : undefined}
              onClick={() => scrollToCard(index)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {note && <OrgNoteCard note={note} logo={noteLogo} onClose={close} />}
      </AnimatePresence>

      <SectionCue href="#c-projects" />
    </div>
  );
};

export default Work;
