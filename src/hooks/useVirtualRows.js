import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback } from 'react';

/**
 * useVirtualRows - Reusable virtualization hook for tables and card lists
 * bound to #main-scroll-container
 *
 * @param {Object} options
 * @param {number} options.count - Total item count
 * @param {number|function} [options.estimateSize=72] - Estimated height in px or a size estimator
 * @param {number} [options.overscan=5] - Number of extra rows to render above and below viewport
 * @param {function} [options.getItemKey] - Stable key extractor for items
 * @param {function} [options.getScrollElement] - Optional custom scroll element getter
 */
export function useVirtualRows({
  count,
  estimateSize = 72,
  overscan = 5,
  getItemKey,
  getScrollElement,
  enabled = true,
  measureElement,
  scrollMargin = 0,
  gap = 0,
  paddingStart = 0,
  paddingEnd = 0,
  initialMeasurementsCache = [],
  initialOffset = 0
}) {
  const defaultGetScrollElement = useCallback(() => {
    if (typeof getScrollElement === 'function') {
      const el = getScrollElement();
      if (el) return el;
    }
    return (
      document.getElementById('main-scroll-container') ||
      (typeof window !== 'undefined' ? window : null)
    );
  }, [getScrollElement]);

  return useVirtualizer({
    count,
    getScrollElement: defaultGetScrollElement,
    estimateSize: typeof estimateSize === 'function' ? estimateSize : () => estimateSize,
    overscan,
    enabled,
    scrollMargin,
    gap,
    paddingStart,
    paddingEnd,
    initialMeasurementsCache,
    initialOffset,
    useAnimationFrameWithResizeObserver: true,
    ...(measureElement ? { measureElement } : {}),
    ...(getItemKey ? { getItemKey } : {})
  });
}

export default useVirtualRows;
