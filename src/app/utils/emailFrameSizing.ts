/** Resize only when content changes, without rendering the React tree again. */
export function observeEmailFrameSize(frame: HTMLIFrameElement): () => void {
  const body = frame.contentDocument?.body;
  if (!body) return () => {};

  let pendingFrame: number | null = null;
  let disposed = false;
  let previousHeight = Number.parseFloat(frame.style.height) || 200;

  const scheduleResize = () => {
    if (disposed || pendingFrame !== null) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      if (disposed) return;
      // Keep layout reads together, then write only a changed integer height.
      const nextHeight = Math.max(200, Math.ceil(body.getBoundingClientRect().height), body.scrollHeight);
      if (nextHeight === previousHeight) return;
      previousHeight = nextHeight;
      frame.style.height = `${nextHeight}px`;
    });
  };

  const observer = new ResizeObserver(scheduleResize);
  observer.observe(body);
  scheduleResize();

  return () => {
    disposed = true;
    observer.disconnect();
    if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
  };
}
