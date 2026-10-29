import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { measureElement as measureVirtualElement } from '@tanstack/react-virtual';
import useVirtualRows from '../hooks/useVirtualRows';

const FinanceRow = memo(function FinanceRow({ transaction, index, itemKey, renderRow, measureElement }) {
  return renderRow(transaction, { index, key: itemKey }, measureElement);
});

// Keep scroll-driven renders in the list, away from Finance forms and summary cards.
export default function FinanceVirtualList({ transactions, renderRow, mode, emptyState }) {
  const table = mode === 'table';
  const gap = table ? 0 : 12;
  const measuredSize = useRef(null);
  const listRoot = useRef(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const estimateSize = useCallback(() => measuredSize.current ?? (table ? 64 : 180), [table]);
  const measureElement = useCallback((element, entry, instance) => {
    if (element) listRoot.current = element.parentElement;
    const size = measureVirtualElement(element, entry, instance);
    if (entry && size > 0 && measuredSize.current === null) measuredSize.current = size;
    return size;
  }, []);
  const getItemKey = useCallback(index => transactions[index]?.id || index, [transactions]);
  const virtualizer = useVirtualRows({
    count: transactions.length, estimateSize, measureElement, scrollMargin, gap,
    overscan: table ? 5 : 4, getItemKey
  });
  const items = virtualizer.getVirtualItems();
  const total = virtualizer.getTotalSize();
  const top = items.length ? Math.max(0, items[0].start - scrollMargin) : 0;
  const bottom = items.length ? Math.max(0, total - (items.at(-1).end - scrollMargin)) : 0;

  useLayoutEffect(() => {
    const main = document.getElementById('main-scroll-container');
    if (!main || !listRoot.current?.isConnected) return;
    let width = -1;
    const measureMargin = () => {
      if (main.clientWidth === width) return;
      width = main.clientWidth;
      const rect = main.getBoundingClientRect();
      const scale = rect.width / main.clientWidth;
      const margin = (listRoot.current.getBoundingClientRect().top - rect.top) / scale + main.scrollTop;
      setScrollMargin(previous => Math.abs(previous - margin) > 0.5 ? margin : previous);
    };
    measureMargin();
    const observer = new ResizeObserver(measureMargin);
    observer.observe(main);
    return () => observer.disconnect();
  }, [transactions.length, renderRow]);

  const spacer = height => table ? (
    <tr aria-hidden="true"><td colSpan={8} style={{ height, padding: 0, border: 0 }} /></tr>
  ) : <div aria-hidden="true" style={{ height, margin: 0 }} />;
  if (!items.length) return emptyState;
  return <>
    {top > 0 && spacer(top)}
    {items.map(item => <FinanceRow key={item.key} transaction={transactions[item.index]} index={item.index}
      itemKey={item.key} renderRow={renderRow} measureElement={virtualizer.measureElement} />)}
    {bottom > 0 && spacer(table ? bottom : Math.max(0, bottom - gap))}
  </>;
}
