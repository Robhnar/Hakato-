import { describe, expect, it } from 'vitest'
import { SCORE_STOPS, scoreColor, scoreRampCss } from './scale'

describe('scoreColor', () => {
  it('skala rośnie jasnością i przycina zakres', () => {
    expect(scoreColor(0)).toBe('rgb(27, 42, 46)')
    expect(scoreColor(1)).toBe('rgb(214, 236, 198)')
    expect(scoreColor(-3)).toBe(scoreColor(0))
    expect(scoreColor(7)).toBe(scoreColor(1))
    expect(scoreColor(Number.NaN)).toBe(scoreColor(0))
  })

  it('pomiędzy stopniami jaśnieje monotonicznie', () => {
    const luminance = (rgb: string) => {
      const [r, g, b] = rgb.replace(/[^0-9,]/g, '').split(',').map(Number)
      return r + g + b
    }
    const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map(scoreColor)
    const values = samples.map(luminance)
    for (let i = 1; i < values.length; i += 1) expect(values[i]).toBeGreaterThan(values[i - 1])
  })
})

describe('scoreRampCss', () => {
  it('pasek legendy zawiera wszystkie stopnie w kolejności', () => {
    const css = scoreRampCss()
    expect(css.startsWith('linear-gradient(to right, ')).toBe(true)
    for (const stop of SCORE_STOPS) expect(css).toContain(stop)
  })
})
