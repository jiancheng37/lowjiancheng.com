import { useEffect } from 'react';
import {
  cancelSectionTransition,
  isSectionTransitioning,
  scrollToSection,
} from '../utils/sectionTransition';

const canScroll = (element: HTMLElement, direction: 1 | -1) => {
  const style = getComputedStyle(element);
  if (!/(auto|scroll)/.test(style.overflowY)) return false;
  if (element.scrollHeight <= element.clientHeight + 1) return false;
  return direction > 0
    ? element.scrollTop < element.scrollHeight - element.clientHeight - 1
    : element.scrollTop > 1;
};

const hasScrollableOverflow = (element: HTMLElement) => {
  const style = getComputedStyle(element);
  return (
    /(auto|scroll)/.test(style.overflowY) &&
    element.scrollHeight > element.clientHeight + 1
  );
};

/* A continuous trackpad/wheel gesture must not leak from reading copy into a
   section transition. After the gesture stops, a fresh gesture may hand off. */
const EDGE_HANDOFF_PAUSE_MS = 80;

/** Makes a single wheel movement move between full-page panels consistently. */
export function useSectionWheelNavigation(): void {
  useEffect(() => {
    const lastNestedWheelAt = new WeakMap<HTMLElement, number>();

    const onWheel = (event: WheelEvent) => {
      /* Organisation notes are modal. Never let a wheel gesture over one
         reach the full-page section navigator behind it, even when the note
         itself has no scrollable overflow (or has reached an edge). */
      const eventTarget = event.target instanceof HTMLElement ? event.target : null;
      if (eventTarget?.closest('.org-note-backdrop')) {
        event.preventDefault();
        return;
      }

      if (matchMedia('(max-width: 1023px)').matches) return;
      if (isSectionTransitioning()) {
        event.preventDefault();
        return;
      }
      if (event.defaultPrevented || event.deltaY === 0) return;

      const panels = Array.from(
        document.querySelectorAll<HTMLElement>('.hero, .section, .contact'),
      );
      const navOffset =
        parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const currentIndex = panels.reduce((best, panel, index) => {
        const distance = Math.abs(panel.getBoundingClientRect().top - navOffset);
        const bestDistance = Math.abs(
          panels[best].getBoundingClientRect().top - navOffset,
        );
        return distance < bestDistance ? index : best;
      }, 0);
      const current = panels[currentIndex];

      /* The story panel owns its rail wheel behavior. */
      if (current.id === 'c-chapters') return;

      const direction: 1 | -1 = event.deltaY > 0 ? 1 : -1;
      let target = eventTarget;

      const handleReadingArea = (area: HTMLElement) => {
        if (!hasScrollableOverflow(area)) return false;

        const now = performance.now();
        if (canScroll(area, direction)) {
          lastNestedWheelAt.set(area, now);
          return true;
        }

        const lastWheel = lastNestedWheelAt.get(area);
        if (lastWheel == null || now - lastWheel < EDGE_HANDOFF_PAUSE_MS) {
          event.preventDefault();
          lastNestedWheelAt.set(area, now);
          return true;
        }

        return false;
      };

      /* Reading areas contain the gesture that reached their edge. A new
         gesture after a short pause deliberately hands off to section snap. */
      const readingArea = target?.closest<HTMLElement>('.curiosity-copy-scroll');
      if (readingArea && current.contains(readingArea)) {
        if (handleReadingArea(readingArea)) return;
      }

      const cardCopy = target?.closest<HTMLElement>('.timecard-bullets');
      if (cardCopy && current.contains(cardCopy)) {
        if (handleReadingArea(cardCopy)) return;
      }

      while (target && target !== current.parentElement) {
        if (canScroll(target, direction)) return;
        if (target === current) break;
        target = target.parentElement;
      }

      const next = panels[currentIndex + direction];
      /* Contain gestures at the top of the page so the hero never pulls away
         from the viewport with the browser's overscroll/rubber-band effect. */
      if (!next) {
        if (currentIndex === 0 && direction < 0) event.preventDefault();
        return;
      }
      event.preventDefault();

      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      scrollToSection(next, reduceMotion);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelSectionTransition();
      window.removeEventListener('wheel', onWheel);
    };
  }, []);
}
