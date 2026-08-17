import type { ScoreContext, ScoreContextField, ScoreProvider } from './base'

interface LinearOptions {
  solvesToMinimum?: number
}

/**
 * Straight-line decay from maxPoints to minPoints over a fixed number of solves.
 *
 * Unlike the logarithmic providers, where a challenge keeps drifting down for as
 * long as people solve it, this reaches the floor at a known solve count and
 * stays there. That makes a challenge's worth predictable while it is being
 * written: the first solver gets maxPoints, the nth gets minPoints, and the
 * steps between are equal.
 */
export default class LinearProvider implements ScoreProvider {
  readonly revision = '1'
  readonly requiredFields: readonly ScoreContextField[] = [
    'minPoints',
    'maxPoints',
    'solves',
  ]

  private readonly solvesToMinimum: number

  constructor(options: LinearOptions = {}) {
    this.solvesToMinimum = Math.max(2, Math.trunc(options.solvesToMinimum ?? 5))
  }

  calculate(ctx: ScoreContext): number {
    const { minPoints, maxPoints, solves } = ctx
    // The first solve is worth full points, so the decay spans the solves after it.
    const elapsed = Math.max(solves - 1, 0)
    const ratio = Math.min(elapsed / (this.solvesToMinimum - 1), 1)
    const score = maxPoints - (maxPoints - minPoints) * ratio
    return Math.round(Math.max(Math.min(score, maxPoints), minPoints))
  }
}
