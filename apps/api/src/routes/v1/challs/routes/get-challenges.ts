import { GetChallengesRoute } from '@rctf/types'
import { getChallenges } from '../../../../services/challenges'
import challsGroup from '../group'
import {
  challengesRequireAuth,
  signDownloadUrl,
} from '../../../../services/challenge-access'

challsGroup.route(GetChallengesRoute, async ({ res, ctx, user }) => {
  if (challengesRequireAuth() && !user) {
    return res.badToken()
  }

  const challenges = await getChallenges(ctx.var.db)

  return res.goodChallenges(
    await Promise.all(
      challenges.map(async item => {
        return {
          id: item.id,
          ...item.data,
          files: await Promise.all(
            item.data.files.map(async file => ({
              ...file,
              url: user ? await signDownloadUrl(file.url, user.id) : file.url,
            }))
          ),
          points: item.score ?? undefined,
          solves: item.solveCount ?? undefined,
          sortWeight: item.data.sortWeight ?? null,
        }
      })
    )
  )
})
