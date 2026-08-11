import React, { useCallback, useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import type { CharacterJson } from 'hanzi-writer';

const START_DELAY_MS = 300;

interface GlyphWriterProps {
  char: string;
  data: CharacterJson;
  size?: number;
  paused?: boolean;
}

function fitSvg(host: HTMLElement, size: number) {
  const svg = host.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
}

/* Draws the character stroke by stroke instead of setting it as type. Rewrites
   on every scroll into view; clicking rewrites it too. A darker duplicate sits
   offset behind the ink for a slight extruded read. Falls back to the plain
   glyph when motion is reduced or the renderer fails. */
const GlyphWriter: React.FC<GlyphWriterProps> = ({
  char,
  data,
  size = 140,
  paused = false,
}) => {
  const frontRef = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLSpanElement>(null);
  const writersRef = useRef<{ front: HanziWriter; back: HanziWriter } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const replay = useCallback(() => {
    const pair = writersRef.current;
    if (!pair) return;
    /* Keep the offset slab in lockstep with the face. */
    pair.back.animateCharacter();
    pair.front.animateCharacter();
  }, []);

  useEffect(() => {
    const front = frontRef.current;
    const back = backRef.current;
    if (!front || !back || reduceMotion || paused) return undefined;

    const styles = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;

    const ink = token('--color-accent-700', '#7d5411');
    const extrude = token('--color-accent-900', '#3a270d');
    const loader = () => data;
    const drawOpts = {
      width: size,
      height: size,
      padding: 4,
      showCharacter: false,
      showOutline: false,
      strokeAnimationSpeed: 1.15,
      delayBetweenStrokes: 130,
      charDataLoader: loader,
    };

    let frontWriter: HanziWriter;
    let backWriter: HanziWriter;
    try {
      /* Darker duplicate + face share the same stroke timing. */
      backWriter = HanziWriter.create(back, char, {
        ...drawOpts,
        strokeColor: extrude,
      });
      frontWriter = HanziWriter.create(front, char, {
        ...drawOpts,
        strokeColor: ink,
      });
    } catch {
      setFailed(true);
      return undefined;
    }
    writersRef.current = { front: frontWriter, back: backWriter };
    fitSvg(back, size);
    fitSvg(front, size);

    const write = () => {
      backWriter.animateCharacter();
      frontWriter.animateCharacter();
    };
    const wipe = () => {
      backWriter.hideCharacter({ duration: 0 });
      frontWriter.hideCharacter({ duration: 0 });
    };

    let visible = false;
    let timer: number;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (visible) return;
            visible = true;
            /* a beat after the section settles, so the first stroke reads */
            timer = window.setTimeout(write, START_DELAY_MS);
          } else {
            visible = false;
            window.clearTimeout(timer);
            /* wipe back to blank so the next pass writes from nothing */
            wipe();
          }
        });
      },
      { threshold: 0.35 },
    );
    observer.observe(front);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      writersRef.current = null;
      front.innerHTML = '';
      back.innerHTML = '';
    };
  }, [char, data, size, reduceMotion, paused]);

  if (reduceMotion || failed) {
    return (
      <div className="entry-glyph" lang="zh-Hans">
        <span className="entry-glyph-extrude" aria-hidden="true">
          {char}
        </span>
        <span className="entry-glyph-face">{char}</span>
      </div>
    );
  }

  return (
    <div className="entry-glyph entry-glyph--drawn">
      <button
        type="button"
        className="glyph-writer"
        style={{ maxWidth: size }}
        onClick={replay}
        aria-label={`Write ${char} again`}
      >
        <span className="glyph-writer-back" ref={backRef} aria-hidden="true" />
        <span className="glyph-writer-host" ref={frontRef} aria-hidden="true" />
        <span className="sr-only" lang="zh-Hans">
          {char}
        </span>
      </button>
    </div>
  );
};

export default GlyphWriter;
