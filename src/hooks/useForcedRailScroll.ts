import { RefObject, useEffect } from 'react';
import { isSectionTransitioning, scrollToSection } from '../utils/sectionTransition';

/** A wheel notch in lines, in pixels (deltaMode: line). */
const LINE_PX = 18;
/**
 * Pins a full-viewport snap panel and routes every wheel gesture into its inner
 * rail, so scrolling anywhere over the panel — heading, page margins, or the
 * rail itself — advances the rail's contents.
 *
 * Reaching the end of the rail stops that wheel event there. The very next
 * wheel movement at the edge changes sections, even within one continuous
 * trackpad gesture.
 *
 * @param sectionRef   the snap panel
 * @param railRef      the overflowing element inside it that actually scrolls
 * @param paused       suspend hijacking (e.g. while a modal is open)
 * @param reduceMotion hand off with an instant jump instead of a smooth scroll
 */
export function useForcedRailScroll(
  sectionRef: RefObject<HTMLElement | null>,
  railRef: RefObject<HTMLElement | null>,
  paused: boolean,
  reduceMotion: boolean | null,
): void {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    let wasOnScreen = false;

    const sectionVisible = () => {
      const bounds = section.getBoundingClientRect();
      const onScreen =
        Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0);
      return onScreen >= Math.min(bounds.height, window.innerHeight) * 0.6;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const onScreen = entry.intersectionRatio >= 0.6;
        if (onScreen && !wasOnScreen) {
          /* Always enter at the beginning, and do not let the gesture which
             brought the panel onscreen also advance the story rail. */
          if (railRef.current) railRef.current.scrollTop = 0;
        }
        if (!entry.isIntersecting && railRef.current) {
          /* fully off screen: rewind so the next visit opens on the first row,
             late enough that the rewind itself is never seen */
          railRef.current.scrollTop = 0;
        }
        wasOnScreen = onScreen;
      },
      { threshold: [0, 0.6] },
    );
    observer.observe(section);

    const leave = (direction: 1 | -1) => {
      const neighbour =
        direction > 0 ? section.nextElementSibling : section.previousElementSibling;
      if (!(neighbour instanceof HTMLElement)) return;
      scrollToSection(neighbour, Boolean(reduceMotion));
    };

    const onWheel = (event: WheelEvent) => {
      if (matchMedia('(max-width: 1023px)').matches) return;
      const rail = railRef.current;
      if (!rail || paused) return;
      if (!sectionVisible()) return;

      const step =
        event.deltaMode === 1
          ? event.deltaY * LINE_PX
          : event.deltaMode === 2
            ? event.deltaY * rail.clientHeight
            : event.deltaY;
      if (step === 0) return;

      const direction: 1 | -1 = step > 0 ? 1 : -1;

      if (isSectionTransitioning()) {
        event.preventDefault();
        return;
      }

      const room =
        direction > 0
          ? rail.scrollHeight - rail.clientHeight - rail.scrollTop
          : rail.scrollTop;
      const atEdge = room <= 1;

      if (!atEdge) {
        event.preventDefault();
        rail.scrollTop += direction * Math.min(Math.abs(step), room);
        return;
      }

      event.preventDefault();
      leave(direction);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', onWheel);
    };
  }, [sectionRef, railRef, paused, reduceMotion]);
}
