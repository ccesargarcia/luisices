import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeEmailFrameSize } from '../../src/app/utils/emailFrameSizing';

function fixture() {
  let contentHeight = 800;
  let resize!: () => void;
  let nextId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  const disconnect = vi.fn();
  const body = {
    getBoundingClientRect: vi.fn(() => ({ height: contentHeight })),
    get scrollHeight() { return contentHeight; },
  };
  const writeHeight = vi.fn();
  let height = '200px';
  const frame = {
    contentDocument: { body },
    style: {
      get height() { return height; },
      set height(value: string) { height = value; writeHeight(value); },
    },
  } as unknown as HTMLIFrameElement;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callbacks.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  const flush = () => {
    const current = [...callbacks.values()];
    callbacks.clear();
    current.forEach((callback) => callback(0));
  };
  return { frame, body, writeHeight, disconnect, callbacks, flush,
    resize: () => resize(), setHeight: (value: number) => { contentHeight = value; } };
}

afterEach(() => vi.unstubAllGlobals());

describe('email frame sizing', () => {
  it('coalesces repeated resize notifications into one layout read and write', () => {
    const f = fixture();
    const cleanup = observeEmailFrameSize(f.frame);
    for (let i = 0; i < 20; i++) f.resize();
    expect(f.body.getBoundingClientRect).not.toHaveBeenCalled();
    expect(f.callbacks.size).toBe(1);
    f.flush();
    expect(f.body.getBoundingClientRect).toHaveBeenCalledTimes(1);
    expect(f.writeHeight).toHaveBeenCalledExactlyOnceWith('800px');
    cleanup();
  });

  it('does not write unchanged heights after an observer notification', () => {
    const f = fixture();
    const cleanup = observeEmailFrameSize(f.frame);
    f.flush();
    f.resize();
    f.flush();
    expect(f.writeHeight).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('adapts to image loading and narrower content without recreating the frame', () => {
    const f = fixture();
    const cleanup = observeEmailFrameSize(f.frame);
    f.flush();
    f.setHeight(1200);
    f.resize();
    f.flush();
    expect(f.frame.style.height).toBe('1200px');
    f.setHeight(400.4);
    f.resize();
    f.flush();
    expect(f.frame.style.height).toBe('401px');
    cleanup();
  });

  it('cancels pending layout work when the viewer closes or changes document', () => {
    const f = fixture();
    const cleanup = observeEmailFrameSize(f.frame);
    cleanup();
    f.resize();
    f.flush();
    expect(f.disconnect).toHaveBeenCalledOnce();
    expect(f.body.getBoundingClientRect).not.toHaveBeenCalled();
    expect(f.callbacks.size).toBe(0);
  });

  it('handles a frame whose document is no longer available', () => {
    expect(() => observeEmailFrameSize({ contentDocument: null } as HTMLIFrameElement)()).not.toThrow();
  });
});
