import {
  BadChallenge,
  GoodAdminActivityV2,
  GoodChallengeView,
  Permissions,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
const createdUserCleanups: Array<() => Promise<void>> = []
const createdChallengeCleanups: Array<() => Promise<void>> = []

const view = (authToken: string, challengeId: string) =>
  request(app, `/api/v2/challs/${challengeId}/view`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  })

const activity = (authToken: string) =>
  request(app, '/api/v2/admin/activity', {
    method: 'GET',
    headers: { Authorization: `Bearer ${authToken}` },
  })

beforeAll(async () => {
  app = await getApp()
})

afterAll(async () => {
  for (const cleanup of createdUserCleanups) {
    await cleanup()
  }
  for (const cleanup of createdChallengeCleanups) {
    await cleanup()
  }
})

describe('challenge activity', () => {
  test('a recorded view surfaces on the admin activity endpoint', async () => {
    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)
    const playerToken = await generateAuthToken(user.id)

    const { challenge, cleanup: challengeCleanup } = await generateChallenge()
    createdChallengeCleanups.push(challengeCleanup)

    await expectResponse(
      await view(playerToken, challenge.id),
      GoodChallengeView
    )

    const { user: admin, cleanup: adminCleanup } = await generateRealTestUser(
      Permissions.challsRead
    )
    createdUserCleanups.push(adminCleanup)
    const adminToken = await generateAuthToken(admin.id)

    const body = await expectResponse(
      await activity(adminToken),
      GoodAdminActivityV2
    )
    const row = body.data.players.find((p: any) => p.userId === user.id)
    expect(row).toBeDefined()
    expect(row.challengeId).toBe(challenge.id)
    expect(row.firstViewedAt).not.toBeNull()
    expect(row.lastViewedAt).not.toBeNull()
    expect(row.solved).toBe(false)
    expect(row.activeInstances).toEqual([])
    expect(typeof body.data.serverTime).toBe('string')
  })

  test('the latest opened challenge wins, first-view time is preserved', async () => {
    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)
    const playerToken = await generateAuthToken(user.id)

    const { challenge: first, cleanup: firstCleanup } =
      await generateChallenge()
    createdChallengeCleanups.push(firstCleanup)
    const { challenge: second, cleanup: secondCleanup } =
      await generateChallenge()
    createdChallengeCleanups.push(secondCleanup)

    await expectResponse(await view(playerToken, first.id), GoodChallengeView)
    await expectResponse(await view(playerToken, second.id), GoodChallengeView)

    const { user: admin, cleanup: adminCleanup } = await generateRealTestUser(
      Permissions.challsRead
    )
    createdUserCleanups.push(adminCleanup)
    const adminToken = await generateAuthToken(admin.id)

    const body = await expectResponse(
      await activity(adminToken),
      GoodAdminActivityV2
    )
    const row = body.data.players.find((p: any) => p.userId === user.id)
    expect(row.challengeId).toBe(second.id)
  })

  test('viewing a non-existent challenge is rejected', async () => {
    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)
    const playerToken = await generateAuthToken(user.id)

    await expectResponse(
      await view(playerToken, 'does-not-exist'),
      BadChallenge
    )
  })

  test('non-admins cannot read the activity endpoint', async () => {
    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)
    const playerToken = await generateAuthToken(user.id)

    const res = await activity(playerToken)
    expect(res.status).toBe(403)
  })
})
