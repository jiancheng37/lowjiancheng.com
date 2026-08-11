import React, { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { PROFILE, PROFILE_FIGURES } from '../content';
import SectionCue from './SectionCue';

const TYPE_MS = 42;
const DELETE_MS = 26;
const HOLD_MS = 1400;

/* Where each plate sits, by how far it is behind the top of the stack. */
const STACK_SLOTS = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: 12, y: 14, rotate: 2.5, scale: 0.965 },
  { x: 24, y: 28, rotate: 5, scale: 0.93 },
];

/* The hero. Portrait plate on the left; name and typewriter roles on the
   right. See portfolio.css. */
const Hero: React.FC = () => {
  const [roleIndex, setRoleIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing');
  const [topIndex, setTopIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const roles = PROFILE.roles;
  const canShuffle = PROFILE_FIGURES.length > 1;
  const active = PROFILE_FIGURES[topIndex];

  /* Pull the top plate off; the one beneath rises to take its place. */
  const shuffle = useCallback(() => {
    if (!canShuffle) return;
    setTopIndex((i) => (i + 1) % PROFILE_FIGURES.length);
  }, [canShuffle]);
  const full = roles[roleIndex] ?? '';
  /* Longest line sizes the typewriter box so shorter roles never collapse it. */
  const roleSizer = roles.reduce((a, b) => (a.length >= b.length ? a : b), '');

  /* Typewriter: spell the role, pause, backspace, then advance. */
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setTyped(full);
      return undefined;
    }

    let timeout: number;

    if (phase === 'typing') {
      if (typed.length < full.length) {
        timeout = window.setTimeout(() => {
          setTyped(full.slice(0, typed.length + 1));
        }, TYPE_MS);
      } else {
        timeout = window.setTimeout(() => setPhase('deleting'), HOLD_MS);
      }
    } else if (typed.length > 0) {
      timeout = window.setTimeout(() => {
        setTyped(typed.slice(0, -1));
      }, DELETE_MS);
    } else {
      timeout = window.setTimeout(() => {
        setRoleIndex((i) => (i + 1) % roles.length);
        setPhase('typing');
      }, 280);
    }

    return () => window.clearTimeout(timeout);
  }, [typed, phase, full, roles.length]);

  return (
    <div className="hero" id="c-me">
      <div className="hero-inner">
        <motion.figure
          className="hero-figure"
          initial={reduceMotion ? false : { opacity: 0, x: -36, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.85, delay: 0.12, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <div className="plate-offset-wrap">
            {/* gold hairline, offset down-right of the plate */}
            <div className="plate-offset-frame" aria-hidden="true" />
            <div
              className={`hero-stack${canShuffle ? ' is-shufflable' : ''}`}
              role={canShuffle ? 'button' : undefined}
              tabIndex={canShuffle ? 0 : undefined}
              aria-label={canShuffle ? 'Show the next photo' : undefined}
              onClick={shuffle}
              onKeyDown={(event) => {
                if (!canShuffle) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  shuffle();
                }
              }}
            >
              {PROFILE_FIGURES.map((figure, index) => {
                const depth =
                  (index - topIndex + PROFILE_FIGURES.length) % PROFILE_FIGURES.length;
                const slot = STACK_SLOTS[Math.min(depth, STACK_SLOTS.length - 1)];
                const buried = depth >= STACK_SLOTS.length;
                return (
                  <motion.div
                    key={figure.src}
                    className={`plate hero-plate hero-stack-card${depth === 0 ? ' is-top' : ''}`}
                    style={{ zIndex: PROFILE_FIGURES.length - depth }}
                    animate={{ ...slot, opacity: buried ? 0 : 1 }}
                    whileHover={depth === 0 && !reduceMotion ? { scale: 1.035 } : undefined}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 260, damping: 26 }
                    }
                  >
                    <img className="plate-img" src={figure.src} alt={figure.alt} />
                  </motion.div>
                );
              })}
            </div>
          </div>
          <figcaption className="hero-figcaption">
            <span className="folio">
              Fig. {topIndex + 1}
              {canShuffle ? ` / ${PROFILE_FIGURES.length}` : ''}
            </span>
            <span className="caption-italic">{active.caption}</span>
            {canShuffle && (
              <span className="hero-stack-hint" aria-hidden="true">
                {/* dotted arrow that loops once on its way up to the plate */}
                <svg
                  className="hero-stack-arrow"
                  viewBox="0 0 118 62"
                  fill="none"
                  focusable="false"
                >
                  <path
                    className="hero-stack-arrow-line"
                    d="M110 54C92 60 74 58 63 49c-10-8-4-21 8-19 10 2 10 15-4 19-15 4-33-7-46-27"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeDasharray="4 5"
                  />
                  <path
                    d="M11 22 18.6 26.8M11 22 12.3 30.9"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="hero-stack-hint-label">click me!</span>
              </span>
            )}
          </figcaption>
        </motion.figure>

        <motion.div
          className="hero-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.8, delay: 0.32, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <p className="hero-greeting">Hey, I&rsquo;m</p>

          <h1 className="hero-name">{PROFILE.name}</h1>

          <div className="hero-rule" aria-hidden="true" />

          <p className="role-type" aria-live="polite">
            <span className="role-type-sizer" aria-hidden="true">
              {roleSizer}
            </span>
            <span className="role-type-live">
              <span className="role-type-text">{typed}</span>
              <span className="role-caret" aria-hidden="true" />
            </span>
          </p>

          <div className="hero-actions">
            <a className="btn btn-primary" href="#c-contact">
              Get in Touch
            </a>
            <a className="btn btn-secondary" href="#c-projects">
              View Projects <ArrowDown size={15} />
            </a>
          </div>
        </motion.div>
      </div>

      <SectionCue href="#c-about" />
    </div>
  );
};

export default Hero;
