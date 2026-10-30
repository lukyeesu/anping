import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { measureElement as measureVirtualElement } from '@tanstack/react-virtual';
import useVirtualRows from '../hooks/useVirtualRows';
import { getPatientId } from '../global/helpers';

const PatientRow = memo(function PatientRow({ patient, index, itemKey, renderRow, measureElement }) {
  return renderRow(patient, { index, key: itemKey }, measureElement);
});

// Scroll updates stay inside the list instead of rendering the patient forms again.
export default function PatientVirtualList({ patients, renderRow, mode, viewStateRef, cacheKey, colSpan = 11 }) {
  const table = mode === 'table';
  // Take a mount-only snapshot; later writes are committed in layout cleanup below.
  // eslint-disable-next-line react-hooks/refs
  const [saved] = useState(() => {
    const cached = viewStateRef?.current?.virtualList;
    const width = document.getElementById('main-scroll-container')?.clientWidth;
    return cached?.key === cacheKey && cached.mode === mode && cached.width === width ? cached : null;
  });
  const measuredSize = useRef(saved?.estimate ?? null);
  const listRoot = useRef(null);
  const [scrollMargin, setScrollMargin] = useState(saved?.scrollMargin ?? 0);
  const estimateSize = useCallback(() => measuredSize.current ?? (table ? 80 : 256), [table]);
  const measureElement = useCallback((element, entry, instance) => {
    if (element) listRoot.current = element.parentElement;
    const size = measureVirtualElement(element, entry, instance);
    // Use a real row's logical size for unseen items, including the tablet's font scale.
    if (entry && size > 0 && measuredSize.current === null) measuredSize.current = size;
    return size;
  }, []);
  const getItemKey = useCallback(index => getPatientId(patients[index]) || index, [patients]);
  const virtualizer = useVirtualRows({
    count: patients.length,
    estimateSize,
    measureElement,
    scrollMargin,
    overscan: table ? 5 : 4,
    gap: 0,
    initialMeasurementsCache: saved?.measurements,
    initialOffset: saved?.offset ?? 0,
    getItemKey
  });
  const latest = useRef(null);
  useLayoutEffect(() => {
    latest.current = { virtualizer, scrollMargin };
  }, [virtualizer, scrollMargin]);
  useLayoutEffect(() => () => {
    const main = document.getElementById('main-scroll-container');
    if (!viewStateRef || !main) return;
    viewStateRef.current = { ...viewStateRef.current, virtualList: {
      key: cacheKey, mode, width: main.clientWidth, offset: main.scrollTop,
      estimate: measuredSize.current, scrollMargin: latest.current.scrollMargin,
      measurements: latest.current.virtualizer.takeSnapshot()
    } };
  }, [viewStateRef, cacheKey, mode]);
  const items = virtualizer.getVirtualItems();
  const total = virtualizer.getTotalSize();
  const top = items.length ? Math.max(0, items[0].start - scrollMargin) : 0;
  const bottom = items.length ? Math.max(0, total - (items.at(-1).end - scrollMargin)) : 0;

  useLayoutEffect(() => {
    const main = document.getElementById('main-scroll-container');
    if (!main || !listRoot.current) return;
    let prevMainWidth = -1;
    let prevRootWidth = -1;
    const measureMargin = () => {
      const cw = main.clientWidth;
      const rootEl = listRoot.current;
      if (cw <= 0 || !rootEl) return;
      const rw = rootEl.clientWidth;
      const mainChanged = prevMainWidth !== -1 && Math.abs(cw - prevMainWidth) > 1;
      const rootChanged = prevRootWidth !== -1 && rw > 0 && Math.abs(rw - prevRootWidth) > 1;
      if (prevMainWidth !== -1 && !mainChanged && !rootChanged) return;
      prevMainWidth = cw;
      if (rw > 0) prevRootWidth = rw;
      const rect = main.getBoundingClientRect();
      const scale = (rect.width / cw) || 1;
      const margin = (rootEl.getBoundingClientRect().top - rect.top) / scale + main.scrollTop;
      setScrollMargin(previous => Math.abs(previous - margin) > 0.5 ? margin : previous);
      if (mainChanged || rootChanged) {
        measuredSize.current = null;
        latest.current?.virtualizer.measure();
      }
    };
    measureMargin();
    const observer = new ResizeObserver(measureMargin);
    observer.observe(main);
    observer.observe(listRoot.current);
    return () => observer.disconnect();
  }, [patients.length]);
  const spacer = height => table ? (
    <tr aria-hidden="true"><td colSpan={colSpan} style={{ height, padding: 0, border: 0 }} /></tr>
  ) : <div aria-hidden="true" style={{ height, margin: 0 }} />;

  if (!items.length) return table ? (
    <tr><td colSpan={colSpan} className="text-center py-12 text-slate-400 kanit-text">ไม่พบข้อมูลผู้ป่วย</td></tr>
  ) : <div className="text-center py-10 text-slate-400 kanit-text bg-slate-50 rounded-2xl border border-slate-100 border-dashed">ไม่พบข้อมูลผู้ป่วย</div>;

  return <>
    {top > 0 && spacer(top)}
    {items.map(item => <PatientRow key={item.key} patient={patients[item.index]} index={item.index}
      itemKey={item.key} renderRow={renderRow} measureElement={virtualizer.measureElement} />)}
    {bottom > 0 && spacer(bottom)}
  </>;
}
