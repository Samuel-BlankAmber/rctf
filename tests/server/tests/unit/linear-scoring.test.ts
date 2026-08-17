import { LinearProvider } from '@rctf/scoring'
import type { ScoreContext } from '@rctf/scoring/base'
import { describe, expect, test } from 'bun:test'

const ctx = (
  solves: number,
  overrides: Partial<ScoreContext> = {}
): ScoreContext => ({
  minPoints: 100,
  maxPoints: 500,
  solves,
  maxSolves: 0,
  eventStartTime: 0,
  eventEndTime: 1_000_000_000,
  firstSolveTime: null,
  ...overrides,
})

describe('linear scoring', () => {
  test('walks from the maximum to the minimum in equal steps', () => {
    const provider = new LinearProvider()

    expect([0, 1, 2, 3, 4, 5].map(n => provider.calculate(ctx(n)))).toEqual([
      500, 500, 400, 300, 200, 100,
    ])
  })

  test('stays at the minimum once the floor is reached', () => {
    const provider = new LinearProvider()

    for (const solves of [5, 6, 20, 1000]) {
      expect(provider.calculate(ctx(solves))).toBe(100)
    }
  })

  test('the solve count that reaches the floor is configurable', () => {
    const provider = new LinearProvider({ solvesToMinimum: 3 })

    expect([1, 2, 3, 4].map(n => provider.calculate(ctx(n)))).toEqual([
      500, 300, 100, 100,
    ])
  })

  test('never drops below the minimum or exceeds the maximum', () => {
    const provider = new LinearProvider()

    for (const solves of [0, 1, 3, 7]) {
      const score = provider.calculate(ctx(solves))
      expect(score).toBeLessThanOrEqual(500)
      expect(score).toBeGreaterThanOrEqual(100)
    }
  })

  test('a challenge with equal bounds never moves', () => {
    const provider = new LinearProvider()

    for (const solves of [0, 1, 5, 50]) {
      expect(
        provider.calculate(ctx(solves, { minPoints: 500, maxPoints: 500 }))
      ).toBe(500)
    }
  })

  test('a nonsensical solvesToMinimum still yields a usable curve', () => {
    const provider = new LinearProvider({ solvesToMinimum: 0 })

    expect(provider.calculate(ctx(1))).toBe(500)
    expect(provider.calculate(ctx(2))).toBe(100)
  })
})
