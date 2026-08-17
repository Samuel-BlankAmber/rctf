import { config } from '@rctf/config'
import { GetLeaderboardRoute } from '@rctf/types'
import { getLeaderboardWithTotal } from '../../../../services/leaderboard-queries'
import leaderboardGroup from '../group'
import { scoreboardHidden } from '../../../../services/scoreboard-visibility'

leaderboardGroup.route(
  GetLeaderboardRoute,
  async ({ ctx, res, user, query: { limit, offset, division } }) => {
    if (await scoreboardHidden(ctx, user)) {
      return res.goodLeaderboard({ total: 0, leaderboard: [] })
    }

    if (
      limit > config.leaderboard.maxLimit ||
      offset > config.leaderboard.maxOffset
    ) {
      return res.badBody({
        reason: 'Invalid limit or offset',
      })
    }

    if (division && !Object.hasOwn(config.divisions, division)) {
      return res.badBody({
        reason: 'Invalid division',
      })
    }

    const { total, leaderboard } = await getLeaderboardWithTotal(
      ctx.var.db,
      limit,
      offset,
      division
    )
    return res.goodLeaderboard({ total, leaderboard })
  }
)
