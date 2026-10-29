import { useEffect, useRef } from 'react';

export function useSidebarBlocks(mainRef, sidebarRef, enabled, currentTab) {
  const refreshViewportRef = useRef(null);

  // When switching tabs while an animation or gesture is in flight, refresh geometry
  // without resetting the animation clock or recreating observers.
  useEffect(() => {
    if (!enabled) return;
    refreshViewportRef.current?.();
  }, [currentTab, enabled]);

  useEffect(() => {
    const main = mainRef.current;
    const sidebar = sidebarRef.current;
    if (!enabled || !main || !sidebar || !CSS.supports('zoom', '0.9') ||
        !document.documentElement.classList.contains('anping-webview')) return;

    const parent = main.parentElement;
    const properties = ['zoom', 'width', 'height', 'flex', 'transform', 'transform-origin', 'will-change'];
    const saved = new Map(properties.map(key =>
      [key, [main.style.getPropertyValue(key), main.style.getPropertyPriority(key)]]));
    const restore = keys => {
      for (const key of keys) {
        const [value, priority] = saved.get(key);
        if (value) main.style.setProperty(key, value, priority);
        else main.style.removeProperty(key);
      }
    };
    const movingProperties = properties.filter(key => key !== 'zoom');
    let sidebarWidth = sidebar.getBoundingClientRect().width;
    let parentWidth = parent.clientWidth;
    let parentHeight = parent.clientHeight;
    let moving = false;
    let baseZoom = 1;
    let fixedViewportHeight = null;
    let interrupted = false;
    let appliedHeight = null;
    let automaticTarget = null;
    let contentAnimation;

    const update = () => {
      if (parentWidth < 768 || parentWidth <= sidebarWidth) return;
      const width = parentWidth - 80;
      const scale = (parentWidth - sidebarWidth) / width;
      const wantsMotion = document.body.matches('.is-dragging-sidebar, .is-sidebar-animating') && !interrupted;
      if (wantsMotion && !moving) {
        baseZoom = Number(main.style.zoom) || 1;
        const maxHeight = parentHeight / ((parentWidth - 256) / width);
        // The parent clips the larger scroller; keep live sizing near the bottom to avoid scroll clamping.
        fixedViewportHeight = main.scrollHeight > maxHeight && main.scrollTop + maxHeight < main.scrollHeight - 1
          ? maxHeight : null;
        moving = true;
        main.style.flex = 'none';
        main.style.width = `${width}px`;
        main.style.transformOrigin = 'top left';
        main.style.willChange = 'transform';
      }
      if (wantsMotion) {
        // The scroller retains logical coordinates, including its virtual rows and scrollTop.
        const height = fixedViewportHeight ?? parentHeight / scale;
        if (appliedHeight !== height) {
          main.style.height = `${height}px`;
          appliedHeight = height;
        }
        const automatic = document.body.classList.contains('is-sidebar-animating') &&
          !document.body.classList.contains('is-dragging-sidebar');
        if (automatic) {
          const target = parseFloat(sidebar.style.width);
          if (automaticTarget !== target) {
            automaticTarget = target;
            contentAnimation?.cancel();
            main.style.transform = `scale(${(parentWidth - target) / width / baseZoom})`;
            const transition = sidebar.getAnimations().find(animation => animation.transitionProperty === 'width');
            if (transition) {
              const frames = transition.effect.getKeyframes().map(frame => ({
                offset: frame.offset,
                easing: frame.easing,
                transform: `scale(${(parentWidth - parseFloat(frame.width)) / width / baseZoom})`
              }));
              const animation = main.animate(frames, { ...transition.effect.getTiming(), fill: 'both' });
              animation.id = 'sidebar-content-motion';
              contentAnimation = animation;
              // Share the sidebar's actual clock, including delayed starts and reversal timing.
              const synchronize = () => {
                if (contentAnimation === animation && transition.startTime !== null) {
                  animation.startTime = transition.startTime;
                }
              };
              if (transition.startTime !== null) synchronize();
              else transition.ready.then(synchronize).catch(() => {});
            }
          }
        } else {
          contentAnimation?.cancel();
          contentAnimation = null;
          automaticTarget = null;
          main.style.transform = `scale(${scale / baseZoom})`;
        }
      } else {
        const top = main.scrollTop;
        contentAnimation?.cancel();
        contentAnimation = null;
        automaticTarget = null;
        // CSS zoom has the same final geometry, so releasing does not reflow to a different layout.
        main.style.zoom = String(scale);
        if (moving) restore(movingProperties);
        moving = false;
        fixedViewportHeight = null;
        appliedHeight = null;
        main.scrollTop = top;
      }
    };

    refreshViewportRef.current = () => {
      if (!moving) return;
      const width = parentWidth - 80;
      const maxHeight = parentHeight / ((parentWidth - 256) / width);
      fixedViewportHeight = main.scrollHeight > maxHeight && main.scrollTop + maxHeight < main.scrollHeight - 1
        ? maxHeight : null;
      appliedHeight = null;
      const scale = (parentWidth - sidebarWidth) / width;
      const height = fixedViewportHeight ?? parentHeight / scale;
      if (appliedHeight !== height) {
        main.style.height = `${height}px`;
        appliedHeight = height;
      }
    };

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === sidebar) sidebarWidth = entry.borderBoxSize?.[0]?.inlineSize ?? sidebar.getBoundingClientRect().width;
      }
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (width !== parentWidth || height !== parentHeight) {
        parentWidth = width;
        parentHeight = height;
        interrupted = true;
      }
      update();
    });
    const motionObserver = new MutationObserver(() => {
      if (!document.body.matches('.is-dragging-sidebar, .is-sidebar-animating')) {
        interrupted = false;
        sidebarWidth = sidebar.getBoundingClientRect().width;
      }
      update();
    });
    const interrupt = () => {
      interrupted = document.body.matches('.is-dragging-sidebar, .is-sidebar-animating');
      update();
    };
    document.body.classList.add('has-sidebar-blocks');
    observer.observe(sidebar, { box: 'border-box' });
    observer.observe(parent);
    motionObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const events = ['smartcard-read', 'open-card-inspector', 'keydown'];
    events.forEach(event => window.addEventListener(event, interrupt, true));
    update();
    return () => {
      refreshViewportRef.current = null;
      observer.disconnect();
      motionObserver.disconnect();
      contentAnimation?.cancel();
      events.forEach(event => window.removeEventListener(event, interrupt, true));
      restore(properties);
      document.body.classList.remove('has-sidebar-blocks');
    };
  }, [mainRef, sidebarRef, enabled]);
}
