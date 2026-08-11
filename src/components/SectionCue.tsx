import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { scrollToSection } from '../utils/sectionTransition';

const LABELS: Record<string, string> = {
  '#c-about': 'The Name, Briefly',
  '#c-chapters': 'The Story So Far',
  '#c-work': 'Clocked In',
  '#c-projects': 'Side Quests',
  '#c-curiosities': 'Other Obsessions',
  '#c-contact': 'Get in Touch',
};

type SectionCueProps = {
  href: string;
};

/* Fold cue at the bottom of a snap panel — names the next band, then jumps. */
const SectionCue: React.FC<SectionCueProps> = ({ href }) => {
  const label = LABELS[href] ?? 'Next';
  const reduceMotion = useReducedMotion();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    event.preventDefault();
    scrollToSection(target, Boolean(reduceMotion));
  };

  return (
    <motion.a
      className="section-cue"
      href={href}
      aria-label={`Next: ${label}`}
      onClick={handleClick}
      style={{ x: '-50%' }}
      animate={
        reduceMotion
          ? undefined
          : { y: [0, 5, 0] }
      }
      transition={
        reduceMotion
          ? undefined
          : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }
      }
    >
      <span className="section-cue-kicker">Next</span>
      <span className="section-cue-label">{label}</span>
      <ChevronDown
        className="section-cue-icon"
        size={14}
        strokeWidth={1.75}
        aria-hidden
      />
    </motion.a>
  );
};

export default SectionCue;
