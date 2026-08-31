import { users } from '@rctf/db'
import { GetAdminActivityRouteV2 } from '@rctf/types'
import { and, eq, inArray } from 'drizzle-orm'
import { getLatestViewPerUser } from '../../../../services/challenge-activity'
import { getActiveInstances } from '../../../../providers/instances/instancer'
import adminGroup from '../group'

adminGroup.route(GetAdminActivityRouteV2, async ({ res, ctx }) => {
  const [views, instances] = await Promise.all([
    getLatestViewPerUser(ctx.var.db),
    getActiveInstances(),
  ])

  const instancesByUser = new Map<string, typeof instances>()
  for (const instance of instances) {
    const list = instancesByUser.get(instance.teamId) ?? []
    list.push(instance)
    instancesByUser.set(instance.teamId, list)
  }

  const byUser = new Map<
    string,
    {
      userId: string
      userName: string
      challengeId: string | null
      challengeName: string | null
      firstViewedAt: string | null
      lastViewedAt: string | null
      solved: boolean
    }
  >()
  for (const view of views) {
    byUser.set(view.userId, view)
  }

  // A player may have a running instance but no recorded view (rare); pull in
  // their name so they still appear.
  const missingIds = [...instancesByUser.keys()].filter(id => !byUser.has(id))
  if (missingIds.length > 0) {
    const rows = await ctx.var.db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(inArray(users.id, missingIds), eq(users.banned, false)))
    for (const row of rows) {
      byUser.set(row.id, {
        userId: row.id,
        userName: row.name,
        challengeId: null,
        challengeName: null,
        firstViewedAt: null,
        lastViewedAt: null,
        solved: false,
      })
    }
  }

  const players = [...byUser.values()]
    .map(player => ({
      ...player,
      activeInstances: (instancesByUser.get(player.userId) ?? []).map(
        instance => ({
          challengeIntegrationId: instance.challengeIntegrationId,
          instanceId: instance.instanceId,
          status: instance.status,
          startedAt: instance.startedAt,
          expiresAt: instance.expiresAt,
        })
      ),
    }))
    // Most recently active first; players with only an instance sort last.
    .sort((a, b) => (b.lastViewedAt ?? '').localeCompare(a.lastViewedAt ?? ''))

  return res.goodAdminActivityV2({
    serverTime: new Date().toISOString(),
    players,
  })
})
