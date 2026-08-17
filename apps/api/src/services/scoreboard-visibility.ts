import { config } from '@rctf/config'
import { Permissions } from '@rctf/types'
import type { ApiContext } from '../lib/app-env'
import { getCompetitionTiming } from './settings'

type MaybeUser = { perms: number } | undefined

const canReadScores = (user: MaybeUser): boolean =>
  ((user?.perms ?? 0) & Permissions.leaderboardRead) ===
  Permissions.leaderboardRead

/**
 * Whether standings and solver identities must be withheld from this user.
 *
 * Solve counts stay visible so participants can still judge difficulty; what
 * is hidden is who solved what, and where anyone places, until the CTF ends.
 * Organisers keep full visibility so they can run the event.
 */
export const scoreboardHidden = async (
  ctx: ApiContext,
  user: MaybeUser
): Promise<boolean> => {
  if (!config.hideScoreboardUntilEnd || canReadScores(user)) {
    return false
  }

  const { endTime } = await getCompetitionTiming(ctx.var.db, ctx.var.redis)
  return Date.now() < endTime
}
