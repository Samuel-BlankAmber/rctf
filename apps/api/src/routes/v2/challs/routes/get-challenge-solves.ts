import { config } from '@rctf/config'
import { GetChallengeSolvesRouteV2 } from '@rctf/types'
import { getChallengeSolvesWithPosition } from '../../../../services/challenges'
import challsGroup from '../group'
import { scoreboardHidden } from '../../../../services/scoreboard-visibility'

challsGroup.route(
  GetChallengeSolvesRouteV2,
  async ({ res, ctx, params, query, user }) => {
    if (await scoreboardHidden(ctx, user)) {
      return res.goodChallengeSolvesV2({ solves: [], mySolvePosition: null })
    }

    // NOTE: Handling manually because the values are loaded from config
    if (
      query.limit > config.leaderboard.maxLimit ||
      query.offset > config.leaderboard.maxOffset
    ) {
      return res.badBody({
        reason: 'Invalid limit or offset',
      })
    }

    const { challengeExists, solves, solvePosition } =
      await getChallengeSolvesWithPosition(
        ctx.var.db,
        params.id,
        user?.id ?? null,
        query.limit,
        query.offset
      )

    if (!challengeExists) {
      return res.badChallenge()
    }

    return res.goodChallengeSolvesV2({
      solves: solves.map(solve => ({
        ...solve,
        createdAt: new Date(solve.createdAt).getTime(),
      })),
      mySolvePosition: solvePosition,
    })
  }
)
