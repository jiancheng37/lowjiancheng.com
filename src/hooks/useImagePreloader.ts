import { useEffect } from 'react';

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

/** Warm the browser cache for images revealed by later interactions. */
export function useImagePreloader(sources: readonly string[]) {
  useEffect(() => {
    const connection = (navigator as NavigatorWithConnection).connection;
    if (connection?.saveData) return undefined;

    const images: HTMLImageElement[] = [];
    const preload = () => {
      sources.forEach((source) => {
        const image = new Image();
        image.decoding = 'async';
        image.src = source;
        images.push(image);
      });
    };

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(preload, { timeout: 1500 });
      return () => {
        idleWindow.cancelIdleCallback?.(handle);
      };
    }

    const handle = window.setTimeout(preload, 0);
    return () => window.clearTimeout(handle);
  }, [sources]);
}
