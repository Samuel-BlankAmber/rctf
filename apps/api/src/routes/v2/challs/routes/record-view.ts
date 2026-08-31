import { RecordChallengeViewRouteV2 } from '@rctf/types'
import { recordChallengeView } from '../../../../services/challenge-activity'
import { getChallenge } from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(
  RecordChallengeViewRouteV2,
  async ({ res, ctx, params, user }) => {
    // Only record views of challenges the player can actually see; getChallenge
    // enforces hidden/releaseTime and its foreign key guards against bogus ids.
    const challenge = await getChallenge(ctx.var.db, params.id)
    if (!challenge) {
      return res.badChallenge()
    }

    await recordChallengeView(ctx.var.db, user.id, params.id)
    return res.goodChallengeView()
  }
)
