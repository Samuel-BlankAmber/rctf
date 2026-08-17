import { GetUserRouteV2 } from '@rctf/types'
import { getFullUserFromId } from '../../../../services/full-user'
import usersGroup from '../group'
import { scoreboardHidden } from '../../../../services/scoreboard-visibility'

usersGroup.route(GetUserRouteV2, async ({ ctx, res, user, params: { id } }) => {
  const fullUser = await getFullUserFromId(ctx.var.db, id)
  if (!fullUser) {
    return res.badUnknownUser()
  }
  const hidden = await scoreboardHidden(ctx, user)
  return res.goodUserDataV2({
    ...fullUser,
    ...(hidden
      ? { score: 0, globalPlace: null, divisionPlace: null, solves: [] }
      : {}),
    avatarUrl: fullUser.avatarUrl ?? null,
    countryCode: fullUser.countryCode ?? null,
    statusText: fullUser.statusText ?? null,
  })
})
