import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterJson } from 'hanzi-writer';
import { ChevronDown } from 'lucide-react';
import GlyphWriter from './GlyphWriter';
import PronounceButton from './PronounceButton';
import SectionCue from './SectionCue';
import { DICTIONARY_ENTRIES } from '../content';
import jianStrokes from '../data/glyph-jian.json';
import chengStrokes from '../data/glyph-cheng.json';

const GLYPH_STROKES: Record<string, CharacterJson> = {
  建: jianStrokes as CharacterJson,
  成: chengStrokes as CharacterJson,
};

/* The two characters of the name set as dictionary headwords, in a two-column
   spread with a heavy top rule like a dictionary column head. */

const NOTES: React.ReactNode[] = [
  'Originally a hand holding a brush upright — which is a fancy way of saying “start making the thing.”',
  <>
    成 is also a measure word for tenths. So the character for{' '}
    <em>success</em> also counts things one tenth at a time. Feels oddly apt.
  </>,
];

const GRID = 22;
const GRID_OFFSET_Y = -4;

const About: React.FC = () => {
  const pairRef = useRef<HTMLDivElement>(null);
  const [activeEntry, setActiveEntry] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [mobileDictionary, setMobileDictionary] = useState(() =>
    window.matchMedia('(max-width: 767px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateMode = () => setMobileDictionary(media.matches);
    media.addEventListener('change', updateMode);
    return () => media.removeEventListener('change', updateMode);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = pairRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    /* Snap the lantern to a cell so the paper feels ruled, not smeared. */
    const cellX = Math.floor(x / GRID) * GRID + GRID / 2;
    const cellY =
      Math.floor((y - GRID_OFFSET_Y) / GRID) * GRID +
      GRID_OFFSET_Y +
      GRID / 2;

    el.style.setProperty('--grid-x', `${cellX}px`);
    el.style.setProperty('--grid-y', `${cellY}px`);
    el.classList.add('is-tracking');
  }, []);

  const onPointerLeave = useCallback(() => {
    pairRef.current?.classList.remove('is-tracking');
  }, []);

  return (
    <div className="section section--about" id="c-about">
      <div className="chapters-head">
        <span className="tag tag-outline kicker">about me</span>
        <h2 className="section-title">The Name, Briefly</h2>
        <p className="section-subtitle">
          My parents named me 建成 — build, then succeed. That’s quite a lot of
          responsibility for one newborn, isn’t it?
        </p>
      </div>

      <div className="entry-tabs" role="tablist" aria-label="Choose a name character">
        {DICTIONARY_ENTRIES.map((entry, index) => (
          <button
            key={entry.glyph}
            type="button"
            className={`entry-tab${activeEntry === index ? ' is-active' : ''}`}
            role="tab"
            aria-selected={activeEntry === index}
            aria-controls={`name-entry-${index}`}
            onClick={() => {
              setActiveEntry(index);
              setExpandedNotes({});
            }}
          >
            <span lang="zh-Hans">{entry.glyph}</span>
            <span>{index === 0 ? 'Build' : 'Succeed'}</span>
          </button>
        ))}
      </div>

      <div
        ref={pairRef}
        className="entry-pair"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        {DICTIONARY_ENTRIES.map((entry, i) => (
          <div
            key={entry.glyph}
            id={`name-entry-${i}`}
            className={`entry ${i === 0 ? 'entry--left' : 'entry--right'}${
              activeEntry === i ? ' is-mobile-active' : ''
            }`}
            role="tabpanel"
          >
            <GlyphWriter
              char={entry.glyph}
              data={GLYPH_STROKES[entry.glyph]}
              paused={mobileDictionary && activeEntry !== i}
            />
            <div>
              <div className="headword">
                <span className="headword-pinyin">{entry.pinyin}</span>
                <PronounceButton char={entry.glyph} pinyin={entry.pinyin} />
                <span className="headword-ipa">{entry.ipa}</span>
                <span className="headword-spacer" />
                <span className="headword-pos">{entry.partOfSpeech}</span>
              </div>
              <ol className="senses">
                {entry.senses.map((sense) => (
                  <li key={sense.text}>
                    {sense.text}
                    {sense.gloss && <span className="gloss"> {sense.gloss}</span>}
                  </li>
                ))}
              </ol>
              <div className={`note${expandedNotes[i] ? ' is-expanded' : ''}`}>
                <span className="note-label note-label--static">{entry.noteLabel}</span>
                <button
                  type="button"
                  className="note-toggle"
                  aria-expanded={Boolean(expandedNotes[i])}
                  aria-controls={`name-note-${i}`}
                  onClick={() =>
                    setExpandedNotes((notes) => ({ ...notes, [i]: !notes[i] }))
                  }
                >
                  <span>{entry.noteLabel}</span>
                  <ChevronDown aria-hidden="true" />
                </button>
                <div className="note-copy" id={`name-note-${i}`}>
                  {NOTES[i]}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="about-closing">
        <p className="about-para">
          I’ve made my peace with it by focusing on the first character and letting
          the second take care of itself. Build well, for long enough, and success
          tends to follow.
        </p>
      </div>

      <SectionCue href="#c-chapters" />
    </div>
  );
};

export default About;
