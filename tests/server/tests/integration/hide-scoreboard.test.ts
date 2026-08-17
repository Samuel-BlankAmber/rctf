import { config } from '@rctf/config'
import {
  GoodChallenges,
  GoodChallengeSolves,
  GoodLeaderboard,
  GoodUserSelfData,
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
let oldHideScores: boolean
let oldEndTime: number

beforeAll(async () => {
  app = await getApp()
  oldHideScores = config.hideScoreboardUntilEnd
  oldEndTime = config.endTime
})

afterAll(() => {
  config.hideScoreboardUntilEnd = oldHideScores
  config.endTime = oldEndTime
})

describe('hideScoreboardUntilEnd', () => {
  test('withholds the leaderboard from players while the CTF runs', async () => {
    config.hideScoreboardUntilEnd = true
    config.endTime = Date.now() + 60_000

    const res = await request(
      app,
      '/api/v1/leaderboard/now?limit=10&offset=0',
      {
        method: 'GET',
      }
    )

    const body = await expectResponse(res, GoodLeaderboard)
    expect(body.data.leaderboard).toEqual([])
    expect(body.data.total).toBe(0)
  })

  test('keeps solve counts visible so difficulty is still legible', async () => {
    config.hideScoreboardUntilEnd = true
    config.endTime = Date.now() + 60_000

    const res = await request(app, '/api/v1/challs', { method: 'GET' })

    const body = await expectResponse(res, GoodChallenges)
    for (const challenge of body.data) {
      expect(challenge.solves).not.toBeNull()
    }
  })

  test('withholds who solved a challenge while the CTF runs', async () => {
    config.hideScoreboardUntilEnd = true
    config.endTime = Date.now() + 60_000

    const challenge = await generateChallenge()
    const res = await request(
      app,
      `/api/v1/challs/${challenge.id}/solves?limit=10&offset=0`,
      { method: 'GET' }
    )

    const body = await expectResponse(res, GoodChallengeSolves)
    expect(body.data.solves).toEqual([])
  })

  test('still shows the leaderboard to users who may read it', async () => {
    config.hideScoreboardUntilEnd = true
    config.endTime = Date.now() + 60_000

    const admin = await generateRealTestUser(Permissions.leaderboardRead)
    const res = await request(
      app,
      '/api/v1/leaderboard/now?limit=10&offset=0',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, GoodLeaderboard)
    expect(body.data.total).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(body.data.leaderboard)).toBe(true)
  })

  test('withholds a player their own rank while the CTF runs', async () => {
    config.hideScoreboardUntilEnd = true
    config.endTime = Date.now() + 60_000

    const player = await generateRealTestUser()
    const res = await request(app, '/api/v1/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${await generateAuthToken(player.user.id)}`,
      },
    })

    const body = await expectResponse(res, GoodUserSelfData)
    expect(body.data.globalPlace).toBeNull()
    expect(body.data.divisionPlace).toBeNull()
    expect(Array.isArray(body.data.solves)).toBe(true)
  })

  test('reveals the scoreboard once the CTF has ended', async () => {
    config.hideScoreboardUntilEnd = true
    config.endTime = Date.now() - 60_000

    const res = await request(
      app,
      '/api/v1/leaderboard/now?limit=10&offset=0',
      {
        method: 'GET',
      }
    )

    const body = await expectResponse(res, GoodLeaderboard)
    expect(Array.isArray(body.data.leaderboard)).toBe(true)
  })

  test('changes nothing when the option is off', async () => {
    config.hideScoreboardUntilEnd = false
    config.endTime = Date.now() + 60_000

    const res = await request(
      app,
      '/api/v1/leaderboard/now?limit=10&offset=0',
      {
        method: 'GET',
      }
    )

    const body = await expectResponse(res, GoodLeaderboard)
    expect(Array.isArray(body.data.leaderboard)).toBe(true)
  })
})
