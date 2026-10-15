import { meterOf, countInTiming } from './rhythm-model.js';
export function createAudioEngine() {
  let cancelStart = null;
  let clapBuffer = null;
  let ctx = null;
  let disposed = false;
  let frame = null;
  let mediaUnlock = null;
  let mediaUnlockURL = null;
  let metroGain = null;
  let rhythmGain = null;
  let timeout = null;
  function hit(at) {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = clapBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1450;
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0.0001, at);
    for (const offset of [0, 0.012, 0.024]) {
      gain.gain.setValueAtTime(0.0001, at + offset);
      gain.gain.linearRampToValueAtTime(0.85, at + offset + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.025, at + offset + 0.01);
    }
    gain.gain.setValueAtTime(0.5, at + 0.036);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(rhythmGain);
    source.start(at);
    source.stop(at + 0.18);
  }
  function beep(at, accent, destination = metroGain) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1500 : 1000;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(accent ? 0.22 : 0.14, at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.055);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(at);
    osc.stop(at + 0.065);
  }
  function startMediaSession() {
    // An unmuted HTML audio stream selects media playback on older iOS too.
    const ios
      = /iPad|iPhone|iPod/.test(navigator.userAgent || '')
      || (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1);
    if (!ios) {
      return Promise.resolve();
    }
    const rate = 8000;
    const bytes = new ArrayBuffer(44 + rate * 2);
    const view = new DataView(bytes);
    const text = (offset, value) => {
      for (let i = 0; i < value.length; i += 1) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };
    text(0, 'RIFF');
    view.setUint32(4, bytes.byteLength - 8, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, rate * 2, true);
    mediaUnlockURL = URL.createObjectURL(
      new Blob([bytes], { type: 'audio/wav' })
    );
    mediaUnlock = document.createElement('audio');
    mediaUnlock.src = mediaUnlockURL;
    mediaUnlock.loop = true;
    mediaUnlock.preload = 'auto';
    mediaUnlock.setAttribute('playsinline', '');
    mediaUnlock.hidden = true;
    return Promise.resolve(mediaUnlock.play());
  }
  function beginAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) {
      throw Error('unsupported');
    }
    try {
      if (navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch (_) {
      /* AudioSession is optional. */
    }
    ctx = new Audio();
    const current = ctx;
    // Start a silent sample in the original button gesture, before awaiting resume.
    const unlock = current.createBufferSource();
    unlock.buffer = current.createBuffer(1, 1, current.sampleRate);
    unlock.connect(current.destination);
    unlock.onended = () => unlock.disconnect();
    unlock.start(0);
    const media = startMediaSession();
    const resume = Promise.all([current.resume(), media]);
    return new Promise((resolve, reject) => {
      cancelStart = () => reject(Error('cancelled'));
      timeout = setTimeout(() => reject(Error('blocked')), 4000);
      Promise.resolve(resume).then(
        () => {
          clearTimeout(timeout);
          if (current.state !== 'running') {
            reject(Error('interrupted'));
          } else {
            resolve(current);
          }
        },
        error => {
          clearTimeout(timeout);
          reject(error);
        }
      );
    });
  }

  function stop() {
    disposed = true;
    cancelStart?.();
    cancelStart = null;
    clearTimeout(timeout);
    cancelAnimationFrame(frame);
    if (mediaUnlock) {
      mediaUnlock.pause();
      mediaUnlock.removeAttribute('src');
      mediaUnlock.load();
      mediaUnlock = null;
    }
    if (mediaUnlockURL) {
      URL.revokeObjectURL(mediaUnlockURL);
      mediaUnlockURL = null;
    }
    if (ctx) {
      ctx.onstatechange = null;
      ctx.close().catch(() => {});
      ctx = null;
    }
  }
  function mix(value) {
    if (ctx && metroGain && rhythmGain) {
      metroGain.gain.setTargetAtTime(1 - value / 100, ctx.currentTime, 0.015);
      rhythmGain.gain.setTargetAtTime(value / 100, ctx.currentTime, 0.015);
    }
  }
  async function start(state, onTick, onEnd, onError) {
    try {
      await beginAudio();
      if (disposed) {
        return;
      }
      ctx.onstatechange = () => {
        if (ctx && ctx.state !== 'running') {
          stop();
          onError('interrupted');
        }
      };
      metroGain = ctx.createGain();
      metroGain.connect(ctx.destination);
      rhythmGain = ctx.createGain();
      rhythmGain.connect(ctx.destination);
      mix(state.mix);
      clapBuffer = ctx.createBuffer(
        1,
        Math.ceil(ctx.sampleRate * 0.2),
        ctx.sampleRate
      );
      const noise = clapBuffer.getChannelData(0);
      for (let i = 0; i < noise.length; i += 1) {
        noise[i] = Math.random() * 2 - 1;
      }
      const m = meterOf(state.meter);
      const unit = 60 / state.tempo / 4;
      const duration = m.slots * state.bars * unit;
      const intro = countInTiming(
        ctx.currentTime + 0.07,
        unit,
        m,
        state.countIn
      );
      const base = intro.base;
      intro.beats.forEach((at, i) => beep(at, i === 0, ctx.destination));
      let cycle = 0;
      const schedule = c => {
        const at = base + c * duration;
        state.blocks.forEach(b => hit(at + b.start * unit));
        for (let i = 0; i < m.n * state.bars; i += 1) {
          beep(at + i * m.beat * unit, i % m.n === 0);
        }
      };
      schedule(0);
      const tick = () => {
        if (disposed) {
          return;
        }
        const elapsed = ctx.currentTime - base;
        if (state.loop && elapsed + 0.12 >= (cycle + 1) * duration) {
          schedule(cycle += 1);
        }
        if (!state.loop && elapsed >= duration) {
          stop();
          onEnd();
          return;
        }
        const count
          = elapsed < 0 && state.countIn
            ? Math.max(
              1,
              Math.min(
                m.n,
                Math.floor(
                  (ctx.currentTime - intro.beats[0]) / (m.beat * unit)
                ) + 1
              )
            )
            : null;
        onTick({
          count,
          position: elapsed >= 0 ? (elapsed % duration) / unit : null
        });
        frame = requestAnimationFrame(tick);
      };
      tick();
    } catch (error) {
      if (disposed) {
        return;
      }
      stop();
      onError(
        ['unsupported', 'blocked', 'interrupted'].includes(error.message)
          ? error.message
          : 'blocked'
      );
    }
  }
  return { start, stop, mix };
}
