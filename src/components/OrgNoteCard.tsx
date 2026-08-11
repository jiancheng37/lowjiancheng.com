import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import type { OrgNote } from '../content';

interface OrgNoteCardProps {
  note: OrgNote;
  logo?: string;
  onClose: () => void;
}

/* A reference note on the place behind the logo — presented as a slip of paper
   laid over the timeline. Escape or a click outside puts it away. */
const OrgNoteCard: React.FC<OrgNoteCardProps> = ({ note, logo, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    /* the page itself is the scroller; hold it still behind the note */
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <motion.div
      className="org-note-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="org-note"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-note-name"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        <button
          type="button"
          className="org-note-close"
          onClick={onClose}
          aria-label="Close note"
        >
          <X size={16} strokeWidth={1.6} />
        </button>

        <div className="org-note-head">
          {logo && <img className="org-note-logo" src={logo} alt="" />}
          <div className="org-note-heading">
            <h3 className="org-note-name" id="org-note-name">
              {note.name}
            </h3>
            <p className="org-note-meta">{note.kind}</p>
          </div>
        </div>

        <dl className="org-note-facts">
          <dt>Founded</dt>
          <dd>{note.founded}</dd>
        </dl>

        <p className="org-note-blurb">{note.blurb}</p>

        {note.href && (
          <a
            className="org-note-link"
            href={note.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {note.href.replace(/^https?:\/\//, '')}
            <ArrowUpRight size={14} strokeWidth={1.7} />
          </a>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OrgNoteCard;
