import { describe, expect, it } from 'vitest';
import TaktKlickToolInfo, { stateSchema } from './takt-klick-tool-info.js';
import {
  DEFAULT,
  METERS,
  meterOf,
  placeBlock,
  changeSettings,
  restsFor,
  beamGroups,
  countInTiming
} from './rhythm-model.js';
import { notationSvg } from './notation.js';

describe('content contract', () => {
  it('validates defaults and deeply clones blocks', () => {
    const info = new TaktKlickToolInfo();
    const content = info.getDefaultContent();
    expect(() => info.validateContent(content)).not.toThrow();
    const clone = info.cloneContent(content);
    clone.blocks.push({ id: 1, start: 0, n: 4 });
    expect(content.blocks).toEqual([]);
  });
  it.each([
    { tempo: '100' },
    { meter: '13/4' },
    { bars: 3 },
    { unwanted: true },
    { blocks: [{ id: 1, start: 15, n: 4 }] },
    {
      blocks: [
        { id: 1, start: 0, n: 4 },
        { id: 1, start: 4, n: 4 }
      ]
    },
    {
      blocks: [
        { id: 1, start: 0, n: 4 },
        { id: 2, start: 2, n: 4 }
      ]
    }
  ])('rejects invalid content %j', patch => {
    expect(
      stateSchema.validate({ ...DEFAULT, ...patch }, { convert: false }).error
    ).toBeTruthy();
  });
});
describe('rhythm editing', () => {
  it('replaces all overlapping bricks and keeps others', () => {
    let state = placeBlock(DEFAULT, 0, 4);
    state = placeBlock(state, 4, 4);
    state = placeBlock(state, 8, 4);
    expect(placeBlock(state, 2, 6)).toBeNull();
    expect(
      placeBlock(state, 2, 6, null, true).blocks.map(b => b.start)
    ).toEqual([2, 8]);
  });
  it('moves across bars, rejects crossing barline, preserves source on failure', () => {
    const state = placeBlock({ ...DEFAULT, bars: 2 }, 0, 4);
    expect(placeBlock(state, 16, 4, 1).blocks[0].start).toBe(16);
    expect(placeBlock(state, 15, 4, 1)).toBeNull();
    expect(state.blocks[0].start).toBe(0);
  });
  it('remaps measures and removes only overhanging notes', () => {
    const state = {
      ...DEFAULT,
      bars: 2,
      blocks: [
        { id: 1, start: 16, n: 4 },
        { id: 2, start: 28, n: 4 }
      ]
    };
    expect(changeSettings(state, { meter: '3/4' }).blocks).toEqual([
      { id: 1, start: 12, n: 4 }
    ]);
    expect(changeSettings(state, { bars: 1 }).blocks).toEqual([]);
  });
});
describe('musical timing and notation', () => {
  it.each(METERS)('fills rests and counts exactly one %s measure', meter => {
    const m = meterOf(meter);
    const rests = restsFor([{ start: 0, n: 1 }], m.slots, m.groupSize);
    expect(rests.reduce((n, r) => n + r.n, 1)).toBe(m.slots);
    for (const tempo of [40, 100, 200]) {
      const unit = 60 / tempo / 4;
      const intro = countInTiming(10, unit, m, true);
      expect(intro.beats).toHaveLength(m.n);
      expect(intro.base - intro.beats.at(-1)).toBeCloseTo(m.beat * unit);
      expect(countInTiming(10, unit, m, false)).toEqual({
        base: 10,
        beats: []
      });
    }
    expect(notationSvg([], meter, true)).not.toMatch(/NaN|undefined/);
  });
  it('beams compound meters in three eighths and cut time in half notes', () => {
    const notes = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      start: i * 2,
      n: 2
    }));
    expect(
      beamGroups(notes.slice(0, 6), meterOf('6/8').groupSize).map(
        g => g.length
      )
    ).toEqual([3, 3]);
    expect(
      beamGroups(notes, meterOf('2/2').groupSize).map(g => g.length)
    ).toEqual([4, 4]);
    expect(
      beamGroups(
        [
          { start: 0, n: 1 },
          { start: 2, n: 1 }
        ],
        4
      )
    ).toEqual([]);
  });
});
