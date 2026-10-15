// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudioEngine } from './audio-engine.js';
import { DEFAULT } from './rhythm-model.js';

let contexts;
let mode;
class AudioMock {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = {};
    this.events = [];
    this.close = vi.fn(() => {
      this.state = 'closed';
      return Promise.resolve();
    });
    contexts.push(this);
  }
  createBuffer(channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    return {
      connect() {},
      disconnect() {},
      start: at => this.events.push(['clap', at]),
      stop() {}
    };
  }
  createGain() {
    return {
      connect() {},
      gain: {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
        setTargetAtTime() {}
      }
    };
  }
  createBiquadFilter() {
    return { connect() {}, frequency: {}, Q: {} };
  }
  createOscillator() {
    return {
      connect() {},
      frequency: {},
      start: at => this.events.push(['beep', at]),
      stop() {}
    };
  }
  resume() {
    if (mode === 'reject') {
      return Promise.reject(Error('blocked'));
    }
    if (mode === 'hang') {
      return new Promise(() => {});
    }
    this.state = 'running';
    return Promise.resolve();
  }
}
beforeEach(() => {
  contexts = [];
  mode = 'ok';
  window.AudioContext = AudioMock;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('audio lifecycle', () => {
  it('schedules count-in before clap and closes resources', async () => {
    const engine = createAudioEngine();
    await engine.start(
      { ...DEFAULT, countIn: true, blocks: [{ id: 1, start: 0, n: 4 }] },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    const c = contexts[0];
    c.events
      .filter(e => e[0] === 'beep')
      .forEach((event, index) =>
        expect(event[1]).toBeCloseTo(0.07 + index * 0.6)
      );
    expect(c.events.filter(e => e[0] === 'clap').at(-1)[1]).toBeCloseTo(2.47);
    engine.stop();
    expect(c.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reports rejected starts and closes audio', async () => {
    mode = 'reject';
    const error = vi.fn();
    await createAudioEngine().start(DEFAULT, vi.fn(), vi.fn(), error);
    expect(error).toHaveBeenCalledWith('blocked');
    expect(contexts[0].close).toHaveBeenCalledOnce();
  });
  it('times out a blocked start', async () => {
    mode = 'hang';
    const error = vi.fn();
    const promise = createAudioEngine().start(DEFAULT, vi.fn(), vi.fn(), error);
    await vi.advanceTimersByTimeAsync(4001);
    await promise;
    expect(error).toHaveBeenCalledWith('blocked');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels pending start without a late error', async () => {
    mode = 'hang';
    const engine = createAudioEngine();
    const error = vi.fn();
    const promise = engine.start(DEFAULT, vi.fn(), vi.fn(), error);
    engine.stop();
    await promise;
    expect(error).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('starts and removes the iPhone media stream', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:local-test'), revokeObjectURL: revoke });
    const engine = createAudioEngine();
    await engine.start(DEFAULT, vi.fn(), vi.fn(), vi.fn());
    expect(play).toHaveBeenCalledOnce();
    engine.stop(); expect(pause).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith('blob:local-test');
  });
  it('keeps separate instances independent', async () => {
    const first = createAudioEngine();
    const second = createAudioEngine();
    await first.start(DEFAULT, vi.fn(), vi.fn(), vi.fn());
    await second.start(DEFAULT, vi.fn(), vi.fn(), vi.fn());
    first.stop();
    expect(contexts[1].close).not.toHaveBeenCalled();
    second.stop();
  });
});
