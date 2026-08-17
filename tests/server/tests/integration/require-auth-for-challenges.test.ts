import { config } from '@rctf/config'
import { BadToken, GoodChallenges, GoodChallengeSolves } from '@rctf/types'
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
let oldRequireAuth: boolean

const asPlayer = async () => {
  const player = await generateRealTestUser()
  return { Authorization: `Bearer ${await generateAuthToken(player.user.id)}` }
}

beforeAll(async () => {
  app = await getApp()
  oldRequireAuth = config.requireAuthForChallenges
})

afterAll(() => {
  config.requireAuthForChallenges = oldRequireAuth
})

describe('requireAuthForChallenges', () => {
  test('challenges are public when the option is off', async () => {
    config.requireAuthForChallenges = false

    const res = await request(app, '/api/v1/challs', { method: 'GET' })

    await expectResponse(res, GoodChallenges)
  })

  test('the challenge list is refused without a session', async () => {
    config.requireAuthForChallenges = true

    const res = await request(app, '/api/v1/challs', { method: 'GET' })

    await expectResponse(res, BadToken)
  })

  test('the v2 challenge list is refused without a session', async () => {
    config.requireAuthForChallenges = true

    const res = await request(app, '/api/v2/challs', { method: 'GET' })

    await expectResponse(res, BadToken)
  })

  test('a solver list is refused without a session', async () => {
    config.requireAuthForChallenges = true

    const { challenge, cleanup } = await generateChallenge()
    const res = await request(
      app,
      `/api/v1/challs/${challenge.id}/solves?limit=10&offset=0`,
      { method: 'GET' }
    )

    await expectResponse(res, BadToken)
    await cleanup()
  })

  test('the leaderboard challenge index is refused without a session', async () => {
    // It carries every challenge name and category, so it is challenge data
    // regardless of living under the leaderboard routes.
    config.requireAuthForChallenges = true

    const res = await request(app, '/api/v2/leaderboard/challs', {
      method: 'GET',
    })

    await expectResponse(res, BadToken)
  })

  test('challenge scores are refused without a session', async () => {
    config.requireAuthForChallenges = true

    const { challenge, cleanup } = await generateChallenge()
    const res = await request(
      app,
      `/api/v2/challs/${challenge.id}/scores?limit=10&offset=0`,
      { method: 'GET' }
    )

    await expectResponse(res, BadToken)
    await cleanup()
  })

  test('a registered player still sees challenges', async () => {
    config.requireAuthForChallenges = true

    const res = await request(app, '/api/v1/challs', {
      method: 'GET',
      headers: await asPlayer(),
    })

    await expectResponse(res, GoodChallenges)
  })

  test('a registered player still sees solver lists', async () => {
    config.requireAuthForChallenges = true

    const { challenge, cleanup } = await generateChallenge()
    const res = await request(
      app,
      `/api/v1/challs/${challenge.id}/solves?limit=10&offset=0`,
      { method: 'GET', headers: await asPlayer() }
    )

    await expectResponse(res, GoodChallengeSolves)
    await cleanup()
  })

  test('attachments carry a download token for the player', async () => {
    config.requireAuthForChallenges = true

    const res = await request(app, '/api/v1/challs', {
      method: 'GET',
      headers: await asPlayer(),
    })

    const body = await expectResponse(res, GoodChallenges)
    for (const challenge of body.data) {
      for (const file of challenge.files) {
        expect(file.url).toContain('t=')
      }
    }
  })

  test('an unauthenticated download is refused', async () => {
    config.requireAuthForChallenges = true

    const res = await request(app, '/uploads/whatever/file.txt', {
      method: 'GET',
    })

    expect(res.status).toBe(401)
    expect((await res.json()).kind).toBe('badToken')
  })

  test('downloads are unrestricted when the option is off', async () => {
    config.requireAuthForChallenges = false

    const res = await request(app, '/uploads/whatever/file.txt', {
      method: 'GET',
    })

    expect(res.status).not.toBe(401)
  })
})
