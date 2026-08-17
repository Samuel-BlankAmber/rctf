import { ChallengeScoringKind, GetChallengesRouteV2 } from '@rctf/types'
import { adminBotEnabled } from '../../../../providers/instances/admin-bot'
import { instancerEnabled } from '../../../../providers/instances/instancer'
import { getChallenges } from '../../../../services/challenges'
import {
  resolveInstancerActions,
  resolveInstancerCapabilities,
} from '../../../../services/instancer'
import challsGroup from '../group'
import {
  challengesRequireAuth,
  signDownloadUrl,
} from '../../../../services/challenge-access'

challsGroup.route(GetChallengesRouteV2, async ({ res, ctx, user }) => {
  if (challengesRequireAuth() && !user) {
    return res.badToken()
  }

  const challenges = await getChallenges(ctx.var.db, user?.id)

  return res.goodChallengesV2(
    await Promise.all(
      challenges.map(async item => {
        const instancerConfig = item.data.instancerConfig
        const capabilities = instancerConfig
          ? resolveInstancerCapabilities(instancerConfig)
          : null

        return {
          id: item.id,
          ...item.data,
          files: await Promise.all(
            item.data.files.map(async file => ({
              name: file.name,
              url: user ? await signDownloadUrl(file.url, user.id) : file.url,
              size: file.size ?? null,
            }))
          ),
          points: item.score ?? 0,
          solves: item.solveCount ?? 0,
          sortWeight: item.data.sortWeight ?? null,
          tags: item.data.tags ?? null,
          instancerLifetime: instancerEnabled
            ? (instancerConfig?.timeoutMilliseconds ?? null)
            : null,
          instancerExtendable:
            instancerConfig?.extendable !== false &&
            (capabilities?.canExtend ?? true),
          instancerStoppable: capabilities?.canStop ?? true,
          instancerActions: instancerConfig
            ? resolveInstancerActions(instancerConfig)
            : [],
          adminBotInputs: adminBotEnabled
            ? (item.data.adminBotConfig?.inputs ?? null)
            : null,
          hasFlag: (item.data.flags?.length ?? 0) > 0,
          scoringKind: item.data.scoring?.kind ?? ChallengeScoringKind.DECAY,
          yourScore: item.myScore,
          yourPointDelta: item.myPointDelta,
        }
      })
    )
  )
})
