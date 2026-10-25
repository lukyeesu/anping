import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback } from 'react';

/**
 * useVirtualRows - Reusable virtualization hook for tables and card lists
 * bound to #main-scroll-container
 *
 * @param {Object} options
 * @param {number} options.count - Total item count
 * @param {number} [options.estimateSize=72] - Estimated height in px (e.g. 72 for table rows, 140 for cards)
 * @param {number} [options.overscan=5] - Number of extra rows to render above and below viewport
 * @param {function} [options.getItemKey] - Stable key extractor for items
 * @param {function} [options.getScrollElement] - Optional custom scroll element getter
 */
export function useVirtualRows({
  count,
  estimateSize = 72,
  overscan = 5,
  getItemKey,
  getScrollElement
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
    estimateSize: () => estimateSize,
    overscan,
    ...(getItemKey ? { getItemKey } : {})
  });
}

export default useVirtualRows;
