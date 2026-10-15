import { meterOf, restsFor, beamGroups } from './rhythm-model.js';
export function notationSvg(
  localBlocks,
  meter,
  beamed,
  cell = 24,
  showMeter = true
) {
  const { slots, n, d, groupSize } = meterOf(meter);
  const lead = showMeter ? 38 : 0;
  const w = lead + slots * cell;
  const groups = beamed ? beamGroups(localBlocks, groupSize) : [];
  const joined = new Set(
    groups
      .filter(g => g.length > 1)
      .flat()
      .map(b => b.id)
  );
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 20 ${w} 70" role="img" aria-hidden="true"><g stroke="#8794a5" stroke-width="1" fill="none"><path d="M${lead} 67H${w} M${lead} 45V85 M${w - 2} 45V85"/></g>${lead ? `<g fill="#24354a" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="22"><text x="17" y="62">${n}</text><text x="17" y="83">${d}</text></g>` : ''}`;
  for (const b of localBlocks) {
    const x = lead + (b.start + 0.5) * cell;
    s
      += '<g fill="#24354a" stroke="#24354a" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">';
    if (b.n === 16) {
      s += `<ellipse cx="${x}" cy="67" rx="7.2" ry="4.5" stroke="none"/><ellipse cx="${x}" cy="67" rx="3.2" ry="3.8" transform="rotate(-24 ${x} 67)" fill="white" stroke="none"/>`;
    } else {
      s += `<ellipse cx="${x}" cy="67" rx="5.8" ry="3.7" transform="rotate(-22 ${x} 67)" ${b.n === 8 || b.n === 12 ? 'fill="white"' : 'stroke="none"'}/><path d="M${x + 5.1} 66V33" fill="none"/>`;
      if (b.n <= 3 && !joined.has(b.id)) {
        s += `<path d="M${x + 5.1} 33C${x + 5.1} 40 ${x + 18} 42 ${x + 12} 53C${x + 15} 44 ${x + 7} 43 ${x + 5.1} 40Z" stroke="none"/>`;
      }
      if (b.n === 1 && !joined.has(b.id)) {
        s += `<path d="M${x + 5.1} 42C${x + 5.1} 49 ${x + 18} 51 ${x + 12} 62C${x + 15} 53 ${x + 7} 52 ${x + 5.1} 49Z" stroke="none"/>`;
      }
    }
    if (b.n === 12 || b.n === 6 || b.n === 3) {
      s += `<circle cx="${x + 12}" cy="62" r="1.7" stroke="none"/>`;
    }
    s += '</g>';
  }
  const rests = restsFor(localBlocks, slots, groupSize);
  for (const rest of rests) {
    const x = lead + (rest.start + 0.5) * cell;
    const dotted = [12, 6, 3].includes(rest.n);
    const base = dotted ? (rest.n * 2) / 3 : rest.n;
    s += `<g fill="#24354a" stroke="#24354a" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><title>${rest.n}/16</title>`;
    if (base >= 8) {
      s += `<path d="M${x - 9} 67h18" fill="none"/><rect x="${x - 6}" y="${base === 16 ? 67 : 62}" width="12" height="5" stroke="none"/>`;
    } else if (base === 4) {
      s += `<path d="M${x - 3} 47l7 8-6 8 6 8q-11-4-6 8q-10-8 0-12l-6-7 6-8Z" stroke="none"/>`;
    } else {
      s += `<path d="M${x + 5} 54l-7 25" fill="none"/><circle cx="${x - 3}" cy="56" r="2.8" stroke="none"/><path d="M${x - 3} 58q5 3 8-4" fill="none"/>`;
      if (base === 1) {
        s += `<circle cx="${x - 5}" cy="65" r="2.8" stroke="none"/><path d="M${x - 5} 67q5 3 7-4" fill="none"/>`;
      }
    }
    if (dotted) {
      s += `<circle cx="${x + 12}" cy="62" r="1.7" stroke="none"/>`;
    }
    s += '</g>';
  }
  for (const group of groups.filter(g => g.length > 1)) {
    const stem = b => lead + (b.start + 0.5) * cell + 5.1;
    s += `<path d="M${stem(group[0])} 34H${stem(group[group.length - 1])}" stroke="#24354a" stroke-width="3.2" fill="none"/>`;
    for (let i = 0; i < group.length; i += 1) {
      const b = group[i];
      if (b.n === 1) {
        const prev = group[i - 1];
        const next = group[i + 1];
        if (next?.n === 1) {
          s += `<path d="M${stem(b)} 41H${stem(next)}" stroke="#24354a" stroke-width="3"/>`;
        } else if (prev?.n !== 1) {
          const direction = next ? 1 : -1;
          const neighbor = next || prev;
          const hook = Math.min(10, Math.abs(stem(neighbor) - stem(b)) * 0.42);
          s += `<path d="M${stem(b)} 41h${direction * hook}" stroke="#24354a" stroke-width="3"/>`;
        }
      }
    }
  }
  return `${s}</svg>`;
}
export function noteIcon(n) {
  const dotted = [12, 6, 3].includes(n);
  const base = dotted ? (n * 2) / 3 : n;
  let shape
    = base === 16
      ? '<ellipse cx="10" cy="28" rx="7" ry="4.4"/><ellipse cx="10" cy="28" rx="3" ry="3.7" fill="white" transform="rotate(-22 10 28)"/>'
      : `<ellipse cx="9" cy="28" rx="5.4" ry="3.5" transform="rotate(-22 9 28)" ${base === 8 ? 'fill="white" stroke="currentColor" stroke-width="1.2"' : ''}/><path d="M14 27V5" stroke="currentColor" stroke-width="1.2" fill="none"/>`;
  if (base <= 2) {
    shape += '<path d="M14 5C14 11 26 13 20 23C23 15 16 14 14 12Z"/>';
  }
  if (base === 1) {
    shape += '<path d="M14 12C14 18 26 20 20 30C23 22 16 21 14 19Z"/>';
  }
  if (dotted) {
    shape += '<circle cx="23" cy="26" r="1.6"/>';
  }
  return `<svg  viewBox="0 0 30 36" fill="currentColor" aria-hidden="true" focusable="false">${shape}</svg>`;
}
