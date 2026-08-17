import { GetUserRoute } from '@rctf/types'
import { challengesRequireAuth } from '../../../../services/challenge-access'
import { getFullUserFromId } from '../../../../services/full-user'
import { scoreboardHidden } from '../../../../services/scoreboard-visibility'
import usersGroup from '../group'

usersGroup.route(GetUserRoute, async ({ ctx, res, user, params: { id } }) => {
  const fullUser = await getFullUserFromId(ctx.var.db, id)
  if (!fullUser) {
    return res.badUnknownUser()
  }

  const hidden = await scoreboardHidden(ctx, user)
  // A solve names the challenge it belongs to, so a profile lists the
  // challenge set unless it is withheld along with the challenges themselves.
  const hideSolves = hidden || (challengesRequireAuth() && !user)

  return res.goodUserData({
    ...fullUser,
    ...(hidden ? { score: 0, globalPlace: null, divisionPlace: null } : {}),
    ...(hideSolves ? { solves: [] } : {}),
  })
})
