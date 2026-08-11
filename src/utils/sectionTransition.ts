export const SECTION_TRANSITION_MS = 1200;

let frame = 0;
let previousBehavior = '';
let previousSnapType = '';

export const isSectionTransitioning = () => frame !== 0;

export const scrollToSection = (
  target: HTMLElement,
  reduceMotion: boolean,
): boolean => {
  if (isSectionTransitioning()) return false;

  if (reduceMotion) {
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    return true;
  }

  const root = document.documentElement;
  const scrollPadding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  const from = window.scrollY;
  const to = target.getBoundingClientRect().top + from - scrollPadding;
  const startedAt = performance.now();

  previousBehavior = root.style.scrollBehavior;
  previousSnapType = root.style.scrollSnapType;
  root.style.scrollBehavior = 'auto';
  root.style.scrollSnapType = 'none';
  root.dataset.sectionTransitioning = 'true';

  const animate = (now: number) => {
    const progress = Math.min((now - startedAt) / SECTION_TRANSITION_MS, 1);
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    window.scrollTo(0, from + (to - from) * eased);

    if (progress < 1) {
      frame = requestAnimationFrame(animate);
    } else {
      frame = 0;
      root.style.scrollBehavior = previousBehavior;
      root.style.scrollSnapType = previousSnapType;
      delete root.dataset.sectionTransitioning;
    }
  };

  frame = requestAnimationFrame(animate);
  return true;
};

export const cancelSectionTransition = () => {
  if (!frame) return;
  cancelAnimationFrame(frame);
  frame = 0;
  const root = document.documentElement;
  root.style.scrollBehavior = previousBehavior;
  root.style.scrollSnapType = previousSnapType;
  delete root.dataset.sectionTransitioning;
};
