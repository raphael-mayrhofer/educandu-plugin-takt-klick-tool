export const METERS = [
  '2/4',
  '3/4',
  '4/4',
  '5/4',
  '6/8',
  '7/8',
  '9/8',
  '12/8',
  '2/2'
];
export const VALUES = [16, 12, 8, 6, 4, 3, 2, 1];
export const COLORS = [
  '#ffffff',
  '#f39a24',
  '#f5dc08',
  '#9850bb',
  '#e83214',
  '#159b9c',
  '#238ee5',
  '#07852d'
];
export const DEFAULT = {
  meter: '4/4',
  bars: 1,
  tempo: 100,
  mix: 50,
  notes: false,
  dotted: false,
  beamed: false,
  loop: false,
  countIn: false,
  blocks: []
};
export function meterOf(meter) {
  const [n, d] = meter.split('/').map(Number);
  let groupSize = d === 2 ? 8 : 4;
  if (d === 8 && [6, 9, 12].includes(n)) {
    groupSize = 6;
  }
  return { n, d, slots: (n * 16) / d, beat: 16 / d, groupSize };
}
export function fits(start, n, state) {
  const { slots } = meterOf(state.meter);
  return (
    Number.isInteger(start)
    && VALUES.includes(n)
    && start >= 0
    && start + n <= slots * state.bars
    && Math.floor(start / slots) === Math.floor((start + n - 1) / slots)
  );
}
export function placeBlock(state, start, n, id = null, replace = false) {
  if (!fits(start, n, state)) {
    return null;
  }
  const overlaps = b =>
    b.id !== id && start < b.start + b.n && start + n > b.start;
  if (!replace && state.blocks.some(overlaps)) {
    return null;
  }
  const blocks = state.blocks.filter(b => b.id !== id && !overlaps(b));
  blocks.push({
    id: id ?? Math.max(0, ...state.blocks.map(b => b.id)) + 1,
    start,
    n
  });
  return { ...state, blocks: blocks.sort((a, b) => a.start - b.start) };
}
export function changeSettings(state, patch) {
  const next = { ...state, ...patch };
  const oldSlots = meterOf(state.meter).slots;
  const newSlots = meterOf(next.meter).slots;
  next.blocks = state.blocks
    .map(b => ({
      ...b,
      start: Math.floor(b.start / oldSlots) * newSlots + (b.start % oldSlots)
    }))
    .filter(
      b =>
        (b.start % newSlots) + b.n <= newSlots
        && fits(b.start, b.n, next)
        && (state.meter === next.meter
          || (state.blocks.find(old => old.id === b.id).start % oldSlots)
            + b.n
            <= newSlots)
    );
  return next;
}
export function validBlocks(state) {
  if (!Array.isArray(state.blocks)) {
    return false;
  }
  const ids = new Set();
  return state.blocks.every((b, index) => {
    if (
      !Number.isInteger(b.id)
      || b.id < 1
      || ids.has(b.id)
      || !fits(b.start, b.n, state)
    ) {
      return false;
    }
    ids.add(b.id);
    return !state.blocks
      .slice(0, index)
      .some(a => b.start < a.start + a.n && b.start + b.n > a.start);
  });
}
export function restsFor(blocks, slots, groupSize) {
  const occupied = Array(slots).fill(false);
  blocks.forEach(b => {
    for (let i = b.start; i < b.start + b.n; i += 1) {
      occupied[i] = true;
    }
  });
  const rests = [];
  for (let start = 0; start < slots; ) {
    if (occupied[start]) {
      start += 1;
    } else {
      let end = start;
      while (end < slots && !occupied[end]) {
        end += 1;
      }
      while (start < end) {
        const position = start;
        const remaining = end - position;
        const boundary = groupSize - (start % groupSize);
        const length = VALUES.find(
          value =>
            value <= remaining
            && ((position === 0 && value === slots)
              || (value <= boundary
                && (value === 1
                  || position % ({ 3: 2, 6: groupSize }[value] || value) === 0))
              || (value > groupSize
                && value % groupSize === 0
                && position % groupSize === 0
                && [16, 12, 8].includes(value)))
        );
        rests.push({ start, n: length });
        start += length;
      }
    }
  }
  return rests;
}
export function beamGroups(blocks, groupSize) {
  const groups = [];
  for (const b of [...blocks]
    .filter(note => note.n <= 3)
    .sort((a, c) => a.start - c.start)) {
    const group = groups[groups.length - 1];
    const last = group?.[group.length - 1];
    if (
      last
      && last.start + last.n === b.start
      && Math.floor(last.start / groupSize) === Math.floor(b.start / groupSize)
    ) {
      group.push(b);
    } else {
      groups.push([b]);
    }
  }
  return groups.filter(g => g.length > 1);
}
export function countInTiming(start, unit, m, enabled) {
  return {
    base: start + (enabled ? m.slots * unit : 0),
    beats: enabled
      ? Array.from({ length: m.n }, (_, i) => start + i * m.beat * unit)
      : []
  };
}
