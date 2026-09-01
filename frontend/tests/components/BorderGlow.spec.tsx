import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BorderGlow from '@/components/BorderGlow';

describe('BorderGlow', () => {
  it('renders the official three-layer structure without legacy extension state', () => {
    const { container } = render(
      <BorderGlow aria-label="边缘光效">
        <span>内容</span>
      </BorderGlow>,
    );

    const card = screen.getByLabelText('边缘光效');
    expect(card).toHaveClass('border-glow-card');
    expect(card).not.toHaveAttribute('data-glow-active');
    expect(card).not.toHaveAttribute('data-liquid-glass');
    expect(card).not.toHaveAttribute('data-reduced-motion');
    expect(card.children).toHaveLength(2);
    expect(card.children[0]).toHaveClass('edge-light');
    expect(card.children[1]).toHaveClass('border-glow-inner');
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('updates edge proximity and cursor angle from pointer position', () => {
    const onPointerMove = vi.fn();
    render(
      <BorderGlow aria-label="边缘光效" onPointerMove={onPointerMove}>
        内容
      </BorderGlow>,
    );

    const card = screen.getByLabelText('边缘光效');
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      top: 20,
      right: 110,
      bottom: 70,
      left: 10,
      width: 100,
      height: 50,
      toJSON: () => ({}),
    });

    const pointerMove = createEvent.pointerMove(card);
    Object.defineProperties(pointerMove, {
      clientX: { value: 110 },
      clientY: { value: 45 },
    });
    fireEvent(card, pointerMove);

    expect(onPointerMove).toHaveBeenCalledOnce();
    expect(card.style.getPropertyValue('--edge-proximity')).toBe('100.000');
    expect(card.style.getPropertyValue('--cursor-angle')).toBe('90.000deg');
  });

  it('maps all supported visual props to the official CSS variables', () => {
    render(
      <BorderGlow
        aria-label="浅色光效"
        backgroundColor="#ffffff"
        borderRadius={18}
        edgeSensitivity={35}
        glowRadius={32}
        coneSpread={20}
        fillOpacity={0.25}
        colors={['#ffb51b', '#12c8f4', '#1464ff']}
      >
        内容
      </BorderGlow>,
    );

    const card = screen.getByLabelText('浅色光效');
    expect(card).toHaveClass('border-glow-card--light');
    expect(card.style.getPropertyValue('--border-radius')).toBe('18px');
    expect(card.style.getPropertyValue('--edge-sensitivity')).toBe('35');
    expect(card.style.getPropertyValue('--glow-padding')).toBe('32px');
    expect(card.style.getPropertyValue('--cone-spread')).toBe('20');
    expect(card.style.getPropertyValue('--fill-opacity')).toBe('0.25');
    expect(card.style.getPropertyValue('--gradient-five')).toContain('#12c8f4');
  });
});
