import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Select, Slider } from 'antd';
import { useTranslation } from 'react-i18next';
import { sectionDisplayProps } from '@educandu/educandu/ui/default-prop-types.js';
import { stateSchema } from './takt-klick-tool-info.js';
import {
  DEFAULT,
  VALUES,
  COLORS,
  METERS,
  meterOf,
  placeBlock,
  changeSettings
} from './rhythm-model.js';
import { notationSvg, noteIcon } from './notation.js';
import { createAudioEngine } from './audio-engine.js';

const prefix = 'EP_RaphaelMayrhofer_TaktKlickTool_';
const cn = name => `${prefix}${name}`;
function validated(value, fallback) {
  return stateSchema.validate(value, { convert: false }).error
    ? fallback
    : value;
}
export default function TaktKlickToolDisplay({
  content,
  input,
  canModifyInput,
  onInputChanged
}) {
  const { t } = useTranslation(
    'raphael-mayrhofer/educandu-plugin-takt-klick-tool'
  );
  const initial = validated(content, DEFAULT);
  const invalidInput
    = input?.data
    && (input.data.version !== 1
      || stateSchema.validate(input.data.state, { convert: false }).error);
  const saved = input?.data?.version === 1 ? input.data.state : null;
  const [state, setState] = useState(() => validated(saved, initial));
  const [selected, setSelected] = useState(4);
  const [transport, setTransport] = useState({ position: null, count: null });
  const [playing, setPlaying] = useState(false);
  const [popup, setPopup] = useState(null);
  const [dragView, setDragView] = useState(null);
  const [width, setWidth] = useState(600);
  const root = useRef(null);
  const audio = useRef(null);
  const drag = useRef(null);
  const timer = useRef(null);
  const suppressClick = useRef(false);
  const latest = useRef(state);
  const emitted = useRef(null);
  latest.current = state;
  const stop = useCallback(() => {
    audio.current?.stop();
    audio.current = null;
    setPlaying(false);
    setTransport({ position: null, count: null });
  }, []);
  useEffect(() => {
    if (
      (saved && saved === emitted.current)
      || content === emitted.current
      || JSON.stringify(saved || content) === JSON.stringify(latest.current)
    ) {
      return;
    }
    stop();
    setState(validated(saved, validated(content, DEFAULT)));
  }, [content, saved, stop]);
  useEffect(() => {
    const resize = () => setWidth(root.current?.clientWidth || 600);
    const observer
      = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (observer) {
      observer.observe(root.current);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();
    const hide = () => {
      if (document.hidden) {
        stop();
      }
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', stop);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', stop);
      audio.current?.stop();
      clearTimeout(timer.current);
    };
  }, [stop]);
  function commit(next) {
    stop();
    setState(next);
    latest.current = next;
    if (canModifyInput) {
      emitted.current = next;
      onInputChanged({ version: 1, state: next });
    }
  }
  function warn(key, point) {
    clearTimeout(timer.current);
    setPopup({ text: t(key), x: point?.x, y: point?.y });
    timer.current = setTimeout(() => setPopup(null), 5500);
  }
  function place(start, n, id, replace, point) {
    if (!canModifyInput) {
      return;
    }
    const next = placeBlock(latest.current, start, n, id, replace);
    if (!next) {
      warn('noFit', point);
      return;
    }
    setPopup(null);
    commit(next);
  }
  function remove(id) {
    if (canModifyInput) {
      commit({
        ...latest.current,
        blocks: latest.current.blocks.filter(b => b.id !== id)
      });
    }
  }
  function update(patch) {
    if ((patch.dotted === false && [12, 6, 3].includes(selected)) || (patch.meter && selected > meterOf(patch.meter).slots)) { setSelected(4); }
    commit(changeSettings(state, patch));
  }
  function target(event) {
    for (const el of root.current.querySelectorAll('[data-start]')) {
      const rect = el.getBoundingClientRect();
      if (
        event.clientX >= rect.left
        && event.clientX < rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom
      ) {
        return (
          Number(el.dataset.start)
          + Math.floor((event.clientX - rect.left) / 24)
        );
      }
    }
    return -1;
  }
  function pointerDown(event, n, id = null) {
    if (
      !canModifyInput
      || event.button !== 0
      || event.isPrimary === false
      || drag.current
    ) {
      return;
    }
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      n,
      id,
      active: false
    };
  }
  function pointerMove(event) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) {
      return;
    }
    if (Math.hypot(event.clientX - d.x, event.clientY - d.y) > 7) {
      d.active = true;
    }
    if (d.active) {
      event.preventDefault();
      setDragView({
        ...d,
        x: event.clientX,
        y: event.clientY,
        target: target(event)
      });
    }
  }
  function pointerEnd(event, cancelled = false) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) {
      return;
    }
    drag.current = null;
    setDragView(null);
    if (!d.active) {
      return;
    }
    suppressClick.current = true;
    if (cancelled) {
      return;
    }
    const start = target(event);
    if (start >= 0) {
      place(start, d.n, d.id, true, { x: event.clientX, y: event.clientY });
    } else {
      const palette = root.current
        .querySelector('[data-palette]')
        .getBoundingClientRect();
      if (d.id && event.clientY >= palette.top) {
        remove(d.id);
      } else {
        warn('dropHint', { x: event.clientX, y: event.clientY });
      }
    }
  }
  function brick(n, compact = false) {
    return (
      <span
        className={cn(compact ? 'BrickCompact' : 'Brick')}
        style={{ '--brick-color': COLORS[VALUES.indexOf(n)], 'width': n * 24 }}
        >
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={cn('Stud')} />
        ))}
      </span>
    );
  }
  const play = async () => {
    if (playing) {
      stop();
      return;
    }
    setPopup(null);
    setPlaying(true);
    const engine = createAudioEngine();
    audio.current = engine;
    await engine.start(state, setTransport, stop, key => {
      stop();
      warn(key);
    });
  };
  const m = meterOf(state.meter);
  // Fixed-size cells wrap at beat-group boundaries when a full measure does not fit.
  const rowSlots = Math.max(
    1,
    Math.min(
      m.slots,
      Math.floor(Math.max(24, width - 48) / (24 * m.groupSize)) * m.groupSize
        || Math.floor(Math.max(24, width - 48) / 24)
    )
  );
  const segments = Array.from({ length: state.bars }, (_, bar) =>
    Array.from({ length: Math.ceil(m.slots / rowSlots) }, (__, row) => ({
      bar,
      local: row * rowSlots,
      length: Math.min(rowSlots, m.slots - row * rowSlots)
    }))
  ).flat();
  const toggles = ['notes', 'dotted', 'beamed', 'loop', 'countIn'];
  return (
    <div
      ref={root}
      className={cn('Root')}
      onPointerMove={event => pointerMove(event)}
      onPointerUp={event => pointerEnd(event)}
      onPointerCancel={event => pointerEnd(event, true)}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          setPopup(null);
          drag.current = null;
          setDragView(null);
        }
      }}
      >
      <h2>{t('name')}</h2>
      {invalidInput ? <p role="alert">{t('invalidInput')}</p> : null}
      <div className={cn('Controls')}>
        <label>
          {t('meter')}
          <Select
            aria-label={t('meter')}
            disabled={!canModifyInput}
            value={state.meter}
            options={METERS.map(value => ({ value, label: value }))}
            onChange={meter => update({ meter })}
            />
        </label>
        <label>
          {t('bars')}
          <Select
            aria-label={t('bars')}
            disabled={!canModifyInput}
            value={state.bars}
            options={[1, 2, 4, 8].map(value => ({ value, label: value }))}
            onChange={bars => update({ bars })}
            />
        </label>
        <label className={cn('Slider')}>
          {t('tempo')}: {state.tempo}
          <Slider
            ariaLabelForHandle={t('tempo')}
            min={40}
            max={200}
            value={state.tempo}
            onChange={tempo => update({ tempo })}
            />
        </label>
        {toggles.map(key => (
          <Button
            key={key}
            aria-pressed={state[key]}
            onClick={() =>
              update({
                [key]: !state[key],
                ...key === 'beamed' ? { notes: true } : {}
              })}
            >
            {t(key)}: {t(state[key] ? 'on' : 'off')}
          </Button>
        ))}
        <Button type="primary" onClick={() => play()}>
          {t(playing ? 'stop' : 'play')}
        </Button>
        <label className={cn('Slider')}>
          {t('mix')}
          <Slider
            ariaLabelForHandle={t('mix')}
            min={0}
            max={100}
            value={state.mix}
            onChange={mix => {
              const next = { ...state, mix };
              setState(next);
              audio.current?.mix(mix);
              if (canModifyInput) {
                emitted.current = next;
                onInputChanged({ version: 1, state: next });
              }
            }}
            />
        </label>
        <Button
          disabled={!canModifyInput}
          onClick={() => commit({ ...state, blocks: [] })}
          >
          {t('reset')}
        </Button>
      </div>
      <p>{t('hint')}</p>
      <div className={cn('Measures')}>
        {segments.map(({ bar, local, length }) => {
          const start = bar * m.slots + local;
          const localBlocks = state.blocks
            .filter(b => Math.floor(b.start / m.slots) === bar)
            .map(b => ({ ...b, start: b.start % m.slots }));
          const pos = transport.position;
          return (
            <section
              key={`${bar}-${local}`}
              className={cn('Measure')}
              style={{ width: length * 24 + 38 }}
              aria-label={t('barLabel', { number: bar + 1 })}
              >
              <div>
                {t('barLabel', { number: bar + 1 })}
                {local > 0 ? ` · ${t('continued')}` : ''}
              </div>
              <div className={cn('Counts')}>
                {Array.from({ length }, (_, i) => (
                  <span key={i}>
                    {(local + i) % m.beat === 0
                      ? (local + i) / m.beat + 1
                      : '·'}
                  </span>
                ))}
              </div>
              <div className={cn('Track')} data-start={start}>
                {Array.from({ length }, (_, i) => (
                  <button
                    type="button"
                    key={i}
                    disabled={!canModifyInput}
                    aria-label={t('slot', {
                      bar: bar + 1,
                      slot: local + i + 1
                    })}
                    className={cn(
                      dragView?.target === start + i ? 'SlotTarget' : 'Slot'
                    )}
                    onClick={() => place(start + i, selected, null, false)}
                    >
                    ○
                  </button>
                ))}
                {state.blocks
                  .filter(
                    b => b.start < start + length && b.start + b.n > start
                  )
                  .map(b => (
                    <button
                      type="button"
                      key={b.id}
                      className={cn('Placed')}
                      style={{
                        left: (Math.max(start, b.start) - start) * 24,
                        width:
                          (Math.min(start + length, b.start + b.n)
                            - Math.max(start, b.start))
                          * 24
                      }}
                      aria-label={t('stone', {
                        value: t(`value${b.n}`),
                        bar: bar + 1
                      })}
                      onPointerDown={e => pointerDown(e, b.n, b.id)}
                      onDoubleClick={() => remove(b.id)}
                      onKeyDown={e => {
                        if (['Delete', 'Backspace'].includes(e.key)) {
                          e.preventDefault();
                          remove(b.id);
                        }
                        if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                          place(
                            b.start + (e.key === 'ArrowLeft' ? -1 : 1),
                            b.n,
                            b.id,
                            false
                          );
                        }
                      }}
                      >
                      <span
                        style={{
                          display: 'block',
                          marginLeft: -Math.max(0, start - b.start) * 24
                        }}
                        >
                        {brick(b.n)}
                      </span>
                    </button>
                  ))}
                {pos !== null && pos >= start && pos < start + length && (
                  <span
                    className={cn('Cursor')}
                    style={{
                      left: (pos - start) * 24,
                      height: state.notes ? 118 : 48
                    }}
                    />
                )}
              </div>
              {state.notes
                ? (
                  <div
                    className={cn('Notation')}
                    role="img"
                    aria-label={t('notation', { meter: state.meter })}
                    >
                    <div
                      style={{
                        width: m.slots * 24 + 38,
                        marginLeft: -local * 24
                      }}
                      dangerouslySetInnerHTML={{
                        __html: notationSvg(
                          localBlocks,
                          state.meter,
                          state.beamed
                        )
                      }}
                      />
                  </div>
                )
                : null}
            </section>
          );
        })}
      </div>
      <h3>{t('palette')}</h3>
      <div data-palette className={cn('Palette')}>
        {VALUES.filter(n => state.dotted || ![12, 6, 3].includes(n)).map(
          n => (
            <button
              type="button"
              key={n}
              disabled={!canModifyInput || n > m.slots}
              aria-pressed={selected === n}
              className={cn('Choice')}
              onPointerDown={e => pointerDown(e, n)}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setSelected(n);
              }}
              >
              {brick(n, n * 24 > width - 32)}
              <span>
                {state.notes
                  ? (
                    <span
                      className={cn('Icon')}
                      dangerouslySetInnerHTML={{ __html: noteIcon(n) }}
                      />
                  )
                  : null}
                {t(`value${n}`)} · {n}
              </span>
            </button>
          )
        )}
      </div>
      <p role="status">
        {transport.count
          ? t('countStatus', { count: transport.count, total: m.n })
          : t('filled', {
            used: state.blocks.reduce((sum, b) => sum + b.n, 0),
            total: m.slots * state.bars
          })}
      </p>
      {transport.count !== null && (
        <div className={cn('CountPopup')} aria-hidden="true">
          <div>{t('countIn')}</div>
          <strong>{transport.count}</strong>
          <span>{t('of', { total: m.n })}</span>
        </div>
      )}
      {popup
        ? (
          <div
            role="alert"
            className={cn('Popup')}
            style={
              typeof popup.x === 'undefined'
                ? {}
                : {
                  left: Math.max(
                    12,
                    Math.min(window.innerWidth - 270, popup.x - 125)
                  ),
                  top: Math.max(
                    12,
                    Math.min(window.innerHeight - 120, popup.y - 100)
                  ),
                  transform: 'none'
                }
            }
            >
            {popup.text}
            <Button onClick={() => setPopup(null)} aria-label={t('close')}>
              ×
            </Button>
          </div>
        )
        : null}
      {dragView
        ? (
          <div
            className={cn('Ghost')}
            style={{ left: dragView.x - 12, top: dragView.y - 20 }}
            >
            {brick(dragView.n)}
          </div>
        )
        : null}
    </div>
  );
}
TaktKlickToolDisplay.propTypes = { ...sectionDisplayProps };
