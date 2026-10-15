// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from '@testing-library/react';
import { DEFAULT } from './rhythm-model.js';
import TaktKlickToolDisplay from './takt-klick-tool-display.js';
import TaktKlickToolEditor from './takt-klick-tool-editor.js';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) =>
      `${key}${values ? ` ${Object.values(values).join(' ')}` : ''}`
  })
}));
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
});
afterEach(cleanup);
const props = {
  content: DEFAULT,
  input: { data: null },
  context: { isPreview: true },
  canModifyInput: true,
  onInputChanged: vi.fn()
};
describe('React interactions', () => {
  it('keeps two instances independent and restores saved input', () => {
    const change = vi.fn();
    const view = render(
      <React.Fragment>
        <TaktKlickToolDisplay {...props} onInputChanged={change} />
        <TaktKlickToolDisplay {...props} />
      </React.Fragment>
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'slot 1 1', exact: true })[0]
    );
    expect(change).toHaveBeenCalledTimes(1);
    const data = change.mock.calls[0][0];
    expect(data.state.blocks).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /stone/ })).toHaveLength(1);
    view.unmount();
    render(
      <TaktKlickToolDisplay
        {...props}
        input={{ data: JSON.parse(JSON.stringify(data)) }}
        />
    );
    expect(screen.getAllByRole('button', { name: /stone/ })).toHaveLength(1);
  });
  it('moves with keyboard, removes and resets', () => {
    const change = vi.fn();
    render(<TaktKlickToolDisplay {...props} onInputChanged={change} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'slot 1 1', exact: true })
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /stone/ }), {
      key: 'ArrowRight'
    });
    expect(change.mock.calls.at(-1)[0].state.blocks[0].start).toBe(1);
    fireEvent.keyDown(screen.getByRole('button', { name: /stone/ }), {
      key: 'Delete'
    });
    expect(change.mock.calls.at(-1)[0].state.blocks).toEqual([]);
    fireEvent.click(
      screen.getByRole('button', { name: 'slot 1 1', exact: true })
    );
    fireEvent.click(screen.getByRole('button', { name: 'reset', exact: true }));
    expect(change.mock.calls.at(-1)[0].state.blocks).toEqual([]);
  });
  it('shows errors and notation without changing data on invalid placement', () => {
    render(<TaktKlickToolDisplay {...props} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'slot 1 16', exact: true })
    );
    expect(screen.getByRole('alert').textContent).toContain('noFit');
    fireEvent.click(
      screen.getByRole('button', { name: 'notes: off', exact: true })
    );
    expect(screen.getByRole('img', { name: /notation/ })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('does not modify read-only learner input', () => {
    const change = vi.fn();
    render(
      <TaktKlickToolDisplay
        {...props}
        canModifyInput={false}
        onInputChanged={change}
        />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'slot 1 1', exact: true })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'notes: off', exact: true })
    );
    expect(change).not.toHaveBeenCalled();
  });
  it('replaces bricks by dragging, deletes at the palette and cancels safely', () => {
    const change = vi.fn();
    const view = render(<TaktKlickToolDisplay {...props} onInputChanged={change} />);
    fireEvent.click(screen.getByRole('button', { name: 'slot 1 1', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'slot 1 5', exact: true }));
    const track = view.container.querySelector('[data-start]');
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 384, top: 0, bottom: 48 });
    vi.spyOn(view.container.querySelector('[data-palette]'), 'getBoundingClientRect').mockReturnValue({ top: 200 });
    const stone = screen.getAllByRole('button', { name: /stone/ })[0];
    stone.setPointerCapture = vi.fn();
    const pointer = (type, element, x, y) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
      Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
      fireEvent(element, event);
    };
    pointer('pointerdown', stone, 10, 10); pointer('pointermove', stone, 100, 10); pointer('pointerup', stone, 100, 10);
    expect(change.mock.calls.at(-1)[0].state.blocks).toEqual([{ id: 1, start: 4, n: 4 }]);
    const moved = screen.getByRole('button', { name: /stone/ }); moved.setPointerCapture = vi.fn();
    pointer('pointerdown', moved, 100, 10); pointer('pointermove', moved, 100, 220); pointer('pointercancel', moved, 100, 220);
    expect(screen.getByRole('button', { name: /stone/ })).toBeTruthy();
    pointer('pointerdown', moved, 100, 10); pointer('pointermove', moved, 100, 220); pointer('pointerup', moved, 100, 220);
    expect(change.mock.calls.at(-1)[0].state.blocks).toEqual([]);
  });
  it('handles invalid saved input visibly', () => {
    render(<TaktKlickToolDisplay {...props} input={{ data: { version: 1 } }} />);
    expect(screen.getByRole('alert').textContent).toBe('invalidInput');
  });
  it('edits content through the Educandu editor callback', () => {
    const change = vi.fn();
    render(
      <TaktKlickToolEditor
        content={DEFAULT}
        context={{ isPreview: true }}
        onContentChanged={change}
        />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'countIn: off', exact: true })
    );
    expect(change.mock.calls.at(-1)[0].countIn).toBe(true);
  });
});
