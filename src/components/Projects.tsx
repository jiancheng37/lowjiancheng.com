import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Code2,
  FileText,
  Play,
} from 'lucide-react';
import { PROJECTS, ProjectLinkKind } from '../content';
import SectionCue from './SectionCue';

const LINK_ICONS: Record<ProjectLinkKind, React.ReactNode> = {
  live: <ArrowUpRight size={16} />,
  code: <Code2 size={16} />,
  slides: <FileText size={16} />,
  demo: <Play size={16} />,
};

const EASE = [0.16, 1, 0.3, 1] as const;

/* Depth slots for click-to-cycle quest plates (same idea as hero / curiosities). */
const STACK_SLOTS = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: 10, y: 12, rotate: 1.8, scale: 0.97 },
  { x: 20, y: 24, rotate: 3.6, scale: 0.94 },
];

/* One quest owns the panel — a tipped plate and its project details.
   Back / Next / track step through builds in a circle. Wheel scrolls the page. */
const Projects: React.FC = () => {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [plateIndex, setPlateIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const project = PROJECTS[active] ?? PROJECTS[0];
  const plates = project.images?.length ? project.images : [project.image];
  const canShuffle = plates.length > 1;
  const questNo = String(active + 1).padStart(2, '0');
  const total = String(PROJECTS.length).padStart(2, '0');

  useEffect(() => {
    setPlateIndex(0);
  }, [active]);

  const goTo = useCallback((next: number, direction: number) => {
    const len = PROJECTS.length;
    const wrapped = ((next % len) + len) % len;
    setDir(direction);
    setActive(wrapped);
  }, []);

  const nudge = useCallback((delta: number) => {
    setDir(delta);
    setActive((current) => {
      const len = PROJECTS.length;
      return (((current + delta) % len) + len) % len;
    });
  }, []);

  const cyclePlate = useCallback(() => {
    if (!canShuffle) return;
    setPlateIndex((i) => (i + 1) % plates.length);
  }, [canShuffle, plates.length]);

  const frame = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: {
          opacity: 1,
          transition: { staggerChildren: 0.06, delayChildren: 0.02 },
        },
        exit: { opacity: 0 },
      }
    : {
        enter: { opacity: 0 },
        center: {
          opacity: 1,
          transition: { staggerChildren: 0.08, delayChildren: 0.04 },
        },
        exit: { opacity: 0, transition: { duration: 0.22 } },
      };

  const plateMotion = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { opacity: 0, scale: 1.06, x: dir > 0 ? 40 : -40 },
        center: { opacity: 1, scale: 1, x: 0 },
        exit: { opacity: 0, scale: 0.98, x: dir > 0 ? -24 : 24 },
      };

  const copyMotion = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { opacity: 0, y: 18 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      };

  return (
    <div className="section section--projects" id="c-projects">
      <div className="projects-head">
        <span className="tag tag-outline kicker">things i've built</span>
        <h2 className="section-title">Side Quests</h2>
        <p className="section-subtitle">
          The name said “build” — so I did.
        </p>
      </div>

      <div className="quest-stage">
        <div className="quest-media-tabs" role="tablist" aria-label="Quests">
          {PROJECTS.map((item, index) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Quest ${index + 1}: ${item.title}`}
              className={index === active ? 'is-active' : ''}
              onClick={() => goTo(index, index > active ? 1 : -1)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{item.title}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={project.title}
            className="quest-frame"
            custom={dir}
            variants={frame}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.18 : 0.4, ease: EASE }}
          >
            <motion.div className="quest-media" variants={plateMotion}>
              <div className="quest-plate-wrap">
                <div className="plate-offset-wrap">
                  <div className="plate-offset-frame" aria-hidden="true" />
                  <div
                    className={`quest-stack${canShuffle ? ' is-shufflable' : ''}`}
                    role={canShuffle ? 'button' : undefined}
                    tabIndex={canShuffle ? 0 : undefined}
                    aria-label={
                      canShuffle
                        ? `Show next ${project.title} screenshot (${plateIndex + 1} of ${plates.length})`
                        : undefined
                    }
                    onClick={cyclePlate}
                    onKeyDown={(event) => {
                      if (!canShuffle) return;
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
                          className={`plate quest-plate hero-stack-card${
                            depth === 0 ? ' is-top' : ''
                          }`}
                          style={{ zIndex: plates.length - depth }}
                          animate={{ ...slot, opacity: buried ? 0 : 1 }}
                          whileHover={
                            depth === 0 && !reduceMotion
                              ? { scale: 1.02 }
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
                              canShuffle
                                ? `${project.imageAlt} (${index + 1})`
                                : project.imageAlt
                            }
                            draggable={false}
                          />
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="quest-media-nav" aria-label="Project navigation">
                    <button
                      type="button"
                      onClick={() => nudge(-1)}
                      aria-label="Previous quest"
                    >
                      <ArrowLeft size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => nudge(1)}
                      aria-label="Next quest"
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>

                </div>
                {canShuffle && (
                  <p className="quest-plate-hint" aria-hidden="true">
                    Fig. {plateIndex + 1} / {plates.length} · click for next
                  </p>
                )}
              </div>

            </motion.div>

            <motion.div className="quest-body" variants={copyMotion}>
              <div className="quest-meta">
                <span className="quest-label">Quest {questNo}</span>
                <span className="quest-count" aria-hidden="true">
                  of {total}
                </span>
              </div>

              <h3 className="quest-title">{project.title}</h3>
              <p className="quest-desc">{project.description}</p>

              <div className="tag-row quest-tags">
                {project.tags.map((tag) => (
                  <span className="tag tag-outline" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="quest-links">
                {project.links.map((link) => (
                  <a
                    key={link.href}
                    className="btn btn-secondary"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {LINK_ICONS[link.kind]}
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>

            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className="quest-nav">
          <button
            type="button"
            className="quest-nav-btn"
            onClick={() => nudge(-1)}
            aria-label="Previous quest"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="quest-track" role="tablist" aria-label="Quests">
            {PROJECTS.map((p, i) => (
              <button
                key={p.title}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Quest ${i + 1}: ${p.title}`}
                className={`quest-track-item${i === active ? ' is-active' : ''}`}
                onClick={() => goTo(i, i > active ? 1 : -1)}
              >
                <span className="quest-track-no">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="quest-track-name">{p.title}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="quest-nav-btn"
            onClick={() => nudge(1)}
            aria-label="Next quest"
          >
            <span>Next</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <SectionCue href="#c-curiosities" />
    </div>
  );
};

export default Projects;
