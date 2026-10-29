import { useCallback, useLayoutEffect, useRef } from 'react';

export default function usePageScrollRestoration(mainRef, page, scope, enabled) {
  const positions = useRef({});
  const activeScope = useRef(scope);
  const restoring = useRef(false);
  const cancelRestore = useRef(() => {});

  const capture = useCallback(() => {
    const main = mainRef.current;
    if (!main || restoring.current) return;
    const bounds = main.getBoundingClientRect();
    const filter = main.querySelector('.sticky-filter-inner')?.getBoundingClientRect();
    const edge = Math.max(bounds.top, filter?.bottom || bounds.top);
    const row = [...main.querySelectorAll('[data-scroll-key]')].find(node => {
      const rect = node.getBoundingClientRect();
      return rect.top >= edge && rect.top < bounds.bottom;
    });
    positions.current[page] = { top: main.scrollTop,
      anchor: row ? { key: row.dataset.scrollKey, y: row.getBoundingClientRect().top - bounds.top } : null };
  }, [mainRef, page]);

  const reset = useCallback(() => {
    cancelRestore.current();
    positions.current[page] = { top: 0, anchor: null };
    const main = mainRef.current;
    if (main) {
      main.scrollTo({ top: 0, behavior: 'instant' });
      main.dispatchEvent(new Event('scroll'));
    }
  }, [mainRef, page]);

  useLayoutEffect(() => {
    if (activeScope.current !== scope) {
      positions.current = {};
      activeScope.current = scope;
    }
    const main = mainRef.current;
    if (!enabled || !main) return;
    const target = positions.current[page] || { top: 0, anchor: null };
    let frame;
    let attempts = 0;
    let stable = 0;
    let previousTop = -1;
    restoring.current = true;
    const stop = () => {
      cancelAnimationFrame(frame);
      restoring.current = false;
      main.removeEventListener('pointerdown', stop, true);
      main.removeEventListener('touchstart', stop, true);
      main.removeEventListener('wheel', stop, true);
      window.removeEventListener('keydown', stop, true);
    };
    cancelRestore.current = stop;
    const saveOffset = () => {
      if (restoring.current) return;
      positions.current[page] = { top: main.scrollTop, anchor: null };
    };
    main.addEventListener('scroll', saveOffset, { passive: true });
    main.addEventListener('pointerdown', stop, { capture: true, passive: true });
    main.addEventListener('touchstart', stop, { capture: true, passive: true });
    main.addEventListener('wheel', stop, { capture: true, passive: true });
    window.addEventListener('keydown', stop, true);
    window.addEventListener('popstate', capture, true);
    // Explicit instant scrolling also retires a fling left over from the page being exited.
    main.scrollTo({ top: target.top, behavior: 'instant' });
    main.dispatchEvent(new Event('scroll'));
    const settle = () => {
      const bounds = main.getBoundingClientRect();
      const row = target.anchor && [...main.querySelectorAll('[data-scroll-key]')]
        .find(node => node.dataset.scrollKey === target.anchor.key);
      const error = row ? (row.getBoundingClientRect().top - bounds.top - target.anchor.y) / (bounds.width / main.clientWidth)
        : main.scrollTop - target.top;
      if (Math.abs(error) > 0.5) {
        main.scrollTo({ top: row ? main.scrollTop + error : target.top, behavior: 'instant' });
        stable = 0;
      } else if (Math.abs(main.scrollTop - previousTop) < 0.5 && (!target.anchor || row)) stable++;
      previousTop = main.scrollTop;
      if (++attempts < 12 && stable < 2) frame = requestAnimationFrame(settle);
      else stop();
    };
    frame = requestAnimationFrame(settle);
    return () => {
      stop();
      main.removeEventListener('scroll', saveOffset);
      window.removeEventListener('popstate', capture, true);
    };
  }, [mainRef, page, scope, enabled, capture]);

  return { capture, reset };
}
