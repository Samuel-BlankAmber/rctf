import { config } from '@rctf/config'
import { GetLeaderboardWithGraphRoute } from '@rctf/types'
import { getGraphForEntries } from '../../../../cache/leaderboard'
import { getLeaderboardWithFilters } from '../../../../services/leaderboard-queries'
import { rateLimitSearch } from '../../../../services/rate-limit'
import leaderboardGroup from '../group'
import { scoreboardHidden } from '../../../../services/scoreboard-visibility'

leaderboardGroup.route(
  GetLeaderboardWithGraphRoute,
  async ({
    ctx,
    res,
    user,
    query: { limit, offset, division, search, challenge },
  }) => {
    if (await scoreboardHidden(ctx, user)) {
      return res.goodLeaderboardWithGraph({
        graph: [],
        total: 0,
        leaderboard: [],
      })
    }

    // NOTE: Handling manually because the value is loaded from config
    if (
      limit > config.leaderboard.graphWithListLimit ||
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

    if (search) {
      const timeLeft = await rateLimitSearch(ctx.var.redis, ctx.var.ip)
      if (timeLeft) {
        return res.badRateLimit({ timeLeft })
      }
    }

    const { total, leaderboard } = await getLeaderboardWithFilters(ctx.var.db, {
      limit,
      offset,
      division,
      search,
      challenge,
    })
    const graph = await getGraphForEntries(
      ctx.var.db,
      ctx.var.redis,
      leaderboard
    )

    return res.goodLeaderboardWithGraph({ graph, total, leaderboard })
  }
)
