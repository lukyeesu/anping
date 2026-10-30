import { useLayoutEffect } from 'react';

// Keep document flow fixed; threshold crossings start matching linear animations.
function setupStickyHeader(main, header, filter) {
  const background = header.querySelector('.sticky-header-bg');
  const title = header.querySelector('.sticky-header-title');
  const headerInner = header.querySelector('.sticky-header-inner');
  const buttons = [...header.querySelectorAll('.sticky-header-btn, .dash-date-badge')];
  const filterInner = filter?.querySelector('.sticky-filter-inner');
  const previousProgress = header.style.getPropertyValue('--header-p');
  header.style.setProperty('--header-p', '0');
  header.classList.remove('is-scrolled');
  filter?.classList.remove('is-scrolled');
  header.classList.add('scroll-sticky-header');
  filter?.classList.add('scroll-sticky-filter');
  main.dataset.compositorSticky = 'true';
  let headerHeight = 0;
  let compactHeight = 64;
  let dockThreshold = Infinity;
  let lastLayout = '';
  const setCollapsed = collapsed => {
    if (header.classList.contains('is-header-collapsed') === collapsed) return;
    header.classList.toggle('is-header-collapsed', collapsed);
  };
  const setDocked = docked => {
    if (!filter || (filter.classList.contains('is-filter-docked') === docked &&
        header.classList.contains('has-docked-filter') === docked)) return;
    header.classList.toggle('has-docked-filter', docked);
    filter.classList.toggle('is-filter-docked', docked);
    if (docked) {
      // Changing duration does not stop a transition that already started before contact.
      header.getAnimations({ subtree: true }).forEach(animation => {
        if (animation.transitionProperty) animation.finish();
      });
    }
  };
  const update = () => {
    const scroll = main.scrollTop;
    const covered = scroll > 0;
    if (header.classList.contains('has-header-background') !== covered) {
      header.classList.toggle('has-header-background', covered);
    }
    // 50px to collapse, 35px to expand: tiny reversals must not restart motion.
    setCollapsed(scroll > (header.classList.contains('is-header-collapsed') ? 35 : 50));
    setDocked(scroll >= (filter?.classList.contains('is-filter-docked') ? dockThreshold - 2 : dockThreshold));
  };
  const layoutTop = element => {
    let top = 0;
    for (let node = element; node && node !== header; node = node.offsetParent) top += node.offsetTop;
    return top;
  };
  const precedingElements = () => {
    const nodes = [];
    for (let node = filter?.previousElementSibling; node; node = node.previousElementSibling) nodes.push(node);
    return nodes;
  };
  const measure = () => {
    const layout = [main.clientWidth, headerInner?.offsetHeight, filterInner?.offsetHeight,
      ...precedingElements().map(node => node.offsetHeight)].join(':');
    if (layout === lastLayout) return;
    lastLayout = layout;
    header.style.removeProperty('--sticky-header-height');
    headerHeight = parseFloat(getComputedStyle(background).height);
    compactHeight = parseFloat(getComputedStyle(main).getPropertyValue('--scrolled-header-h')) || 64;
    const titleHeight = parseFloat(getComputedStyle(title).height);
    const titleY = (compactHeight - titleHeight * 22 / 30) / 2 - layoutTop(title);
    header.style.setProperty('--sticky-header-height', `${headerHeight}px`);
    header.style.setProperty('--sticky-header-clip-bottom', `${headerHeight - compactHeight}px`);
    header.style.setProperty('--header-surface-scale', compactHeight / headerHeight);
    header.style.setProperty('--header-title-transform', `translateY(${titleY}px) scale(${22 / 30})`);
    for (const button of buttons) {
      const buttonHeight = parseFloat(getComputedStyle(button).height);
      const compact = button.classList.contains('dash-date-badge') ? 32 : 44;
      const y = (compactHeight - compact) / 2 - layoutTop(button);
      button.style.setProperty('--header-action-transform', `translateY(${y}px) scale(${compact / buttonHeight})`);
    }
    if (filterInner) {
      const style = getComputedStyle(filterInner);
      const filterHeight = parseFloat(style.height);
      const inset = parseFloat(style.paddingLeft);
      filter.style.setProperty('--filter-docked-height', `${filterHeight - 4}px`);
      filter.style.setProperty('--filter-rest-transform', `translateY(${(filter.clientHeight - filterHeight) / 2}px) scaleX(${1 - inset * 2 / filter.clientWidth})`);
      // Overlap the surfaces by one logical pixel to cover fractional compositing seams.
      filter.style.setProperty('--filter-docked-transform', `translateY(-1px) scale(1,${(filterHeight - 4) / filterHeight})`);
      const bounds = main.getBoundingClientRect();
      const scale = bounds.width / main.clientWidth;
      const position = filter.style.position;
      // Measure its natural flow position once, even when initialization happens mid-scroll.
      filter.style.position = 'static';
      const flowTop = filter.getBoundingClientRect().top;
      filter.style.position = position;
      dockThreshold = Math.max(1, main.scrollTop + (flowTop - bounds.top) / scale - compactHeight);
    }
    update();
  };
  measure();
  // Scrolling only compares cached numbers. Geometry is read on layout changes, never per scroll.
  main.addEventListener('scroll', update, { passive: true });
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(main);
  if (headerInner) resizeObserver.observe(headerInner);
  if (filterInner) resizeObserver.observe(filterInner);
  if (filter) resizeObserver.observe(filter.parentElement);
  precedingElements().forEach(node => resizeObserver.observe(node));

  return () => {
    resizeObserver.disconnect();
    main.removeEventListener('scroll', update);
    delete main.dataset.compositorSticky;
    header.classList.remove('scroll-sticky-header', 'is-header-collapsed', 'has-header-background', 'has-docked-filter');
    filter?.classList.remove('scroll-sticky-filter', 'is-filter-docked');
    for (const property of ['--filter-rest-transform', '--filter-docked-transform', '--filter-docked-height']) filter?.style.removeProperty(property);
    for (const property of ['--sticky-header-height', '--sticky-header-clip-bottom', '--header-surface-scale', '--header-title-transform']) header.style.removeProperty(property);
    buttons.forEach(button => button.style.removeProperty('--header-action-transform'));
    if (previousProgress) header.style.setProperty('--header-p', previousProgress);
    else header.style.removeProperty('--header-p');
    main.style.setProperty('--header-p', Math.min(1, main.scrollTop / 50).toFixed(3));
  };
}

export function useStickyHeader(mainRef, page, enabled) {
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!enabled || !main || typeof ResizeObserver !== 'function') return;
    const media = matchMedia('(min-width: 768px) and (min-height: 481px)');
    let dispose;
    let header;
    let filter;
    const update = () => {
      dispose?.();
      header = main.querySelector('.sticky-header-bg')?.parentElement;
      filter = main.querySelector('.sticky-filter-inner')?.closest('.sticky-filter-appt');
      dispose = media.matches && header ? setupStickyHeader(main, header, filter) : undefined;
    };
    update();
    const observer = new MutationObserver(() => {
      if (header?.isConnected && filter?.isConnected) return;
      const nextHeader = main.querySelector('.sticky-header-bg')?.parentElement;
      const nextFilter = main.querySelector('.sticky-filter-inner')?.closest('.sticky-filter-appt');
      if (nextHeader !== header || nextFilter !== filter) update();
    });
    observer.observe(main, { childList: true, subtree: true });
    media.addEventListener('change', update);
    return () => { observer.disconnect(); media.removeEventListener('change', update); dispose?.(); };
  }, [mainRef, page, enabled]);
}
