import { GetUserSelfRouteV2 } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import { getFullUser } from '../../../../services/full-user'
import { allowedDivisions } from '../../../../util/acl'
import usersGroup from '../group'
import { scoreboardHidden } from '../../../../services/scoreboard-visibility'

usersGroup.route(GetUserSelfRouteV2, async ({ ctx, user, res }) => {
  const [fullUser, teamToken] = await Promise.all([
    getFullUser(ctx.var.db, user),
    createToken(TokenKind.Team, user.id),
  ])
  const allowedDivs = allowedDivisions({
    email: user.email,
    defaultOnly: false,
  }) as string[]

  // Their own score and solves are theirs to see; their rank is the scoreboard.
  const hidden = await scoreboardHidden(ctx, user)

  return res.goodUserSelfDataV2({
    ...fullUser,
    ...(hidden ? { globalPlace: null, divisionPlace: null } : {}),
    teamToken: teamToken,
    allowedDivisions: allowedDivs,
    perms: user.perms,
    banned: fullUser.banned ?? false,
    avatarUrl: fullUser.avatarUrl ?? null,
    countryCode: fullUser.countryCode ?? null,
    statusText: fullUser.statusText ?? null,
  })
})
