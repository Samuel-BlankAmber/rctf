import { GetUserRoute } from '@rctf/types'
import { getFullUserFromId } from '../../../../services/full-user'
import usersGroup from '../group'
import { scoreboardHidden } from '../../../../services/scoreboard-visibility'

usersGroup.route(GetUserRoute, async ({ ctx, res, user, params: { id } }) => {
  const fullUser = await getFullUserFromId(ctx.var.db, id)
  if (!fullUser) {
    return res.badUnknownUser()
  }
  if (await scoreboardHidden(ctx, user)) {
    return res.goodUserData({
      ...fullUser,
      score: 0,
      globalPlace: null,
      divisionPlace: null,
      solves: [],
    })
  }
  return res.goodUserData(fullUser)
})
