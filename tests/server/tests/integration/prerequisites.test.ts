import { config } from '@rctf/config'
import {
  challenges,
  createDatabase,
  solves,
  submissions,
  type ChallengeData,
} from '@rctf/db'
import {
  BadBody,
  BadChallenge,
  GoodChallenges,
  GoodFlag,
  Permissions,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
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

// Use mocked createDatabase - it returns pglite instance
const getDb = () => createDatabase(config.database.sql).db

// Create a challenge that unlocks only once every id in `requires` is solved.
const generateChallengeRequiring = async (requires: string[]) => {
  const db = getDb()
  const id = crypto.randomUUID()
  const flag = crypto.randomUUID()

  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flags: [{ provider: 'flags/static', config: { flag } }],
    tiebreakEligible: true,
    points: { min: 100, max: 500 },
    requires,
  }

  await db.insert(challenges).values({ id, data })

  return {
    challenge: { id, flag },
    cleanup: async () => {
      await db.delete(submissions).where(eq(submissions.challengeId, id))
      await db.delete(solves).where(eq(solves.challengeid, id))
      await db.delete(challenges).where(eq(challenges.id, id))
    },
  }
}

const listChallenges = async (authToken: string) => {
  const res = await request(app, '/api/v1/challs', {
    method: 'GET',
    headers: { Authorization: `Bearer ${authToken}` },
  })
  return await expectResponse(res, GoodChallenges)
}

const submit = (authToken: string, challengeId: string, flag: string) =>
  request(app, `/api/v1/challs/${challengeId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ flag }),
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

describe('challenge prerequisites', () => {
  test('locked challenge is hidden until its prerequisite is solved', async () => {
    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)
    const authToken = await generateAuthToken(user.id)

    const { challenge: prereq, cleanup: prereqCleanup } =
      await generateChallenge()
    createdChallengeCleanups.push(prereqCleanup)

    const { challenge: locked, cleanup: lockedCleanup } =
      await generateChallengeRequiring([prereq.id])
    createdChallengeCleanups.push(lockedCleanup)

    // Before solving the prerequisite: the prereq shows, the locked one does not.
    let body = await listChallenges(authToken)
    expect(body.data.find((c: any) => c.id === prereq.id)).toBeDefined()
    expect(body.data.find((c: any) => c.id === locked.id)).toBeUndefined()

    // Solve the prerequisite.
    await expectResponse(
      await submit(authToken, prereq.id, prereq.flag),
      GoodFlag
    )

    // Now the locked challenge unlocks.
    body = await listChallenges(authToken)
    expect(body.data.find((c: any) => c.id === locked.id)).toBeDefined()
  })

  test('flag submission for a locked challenge is rejected', async () => {
    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)
    const authToken = await generateAuthToken(user.id)

    const { challenge: prereq, cleanup: prereqCleanup } =
      await generateChallenge()
    createdChallengeCleanups.push(prereqCleanup)

    const { challenge: locked, cleanup: lockedCleanup } =
      await generateChallengeRequiring([prereq.id])
    createdChallengeCleanups.push(lockedCleanup)

    // Correct flag, but the prerequisite is unsolved: behaves as if absent.
    await expectResponse(
      await submit(authToken, locked.id, locked.flag),
      BadChallenge
    )

    // Solving the prerequisite opens submission.
    await expectResponse(
      await submit(authToken, prereq.id, prereq.flag),
      GoodFlag
    )
    await expectResponse(
      await submit(authToken, locked.id, locked.flag),
      GoodFlag
    )
  })

  test('all prerequisites must be solved when several are listed', async () => {
    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)
    const authToken = await generateAuthToken(user.id)

    const { challenge: a, cleanup: aCleanup } = await generateChallenge()
    createdChallengeCleanups.push(aCleanup)
    const { challenge: b, cleanup: bCleanup } = await generateChallenge()
    createdChallengeCleanups.push(bCleanup)

    const { challenge: locked, cleanup: lockedCleanup } =
      await generateChallengeRequiring([a.id, b.id])
    createdChallengeCleanups.push(lockedCleanup)

    // Solve only one of the two prerequisites: still locked.
    await expectResponse(await submit(authToken, a.id, a.flag), GoodFlag)
    let body = await listChallenges(authToken)
    expect(body.data.find((c: any) => c.id === locked.id)).toBeUndefined()

    // Solve the second: unlocked.
    await expectResponse(await submit(authToken, b.id, b.flag), GoodFlag)
    body = await listChallenges(authToken)
    expect(body.data.find((c: any) => c.id === locked.id)).toBeDefined()
  })

  describe('admin route', () => {
    test('can set, read and clear requires', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user, cleanup } = await generateRealTestUser(adminPerms)
      createdUserCleanups.push(cleanup)
      const authToken = await generateAuthToken(user.id)

      const { challenge: prereq, cleanup: prereqCleanup } =
        await generateChallenge()
      createdChallengeCleanups.push(prereqCleanup)
      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const put = (requires: string[] | null) =>
        request(app, `/api/v2/admin/challs/${challenge.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ data: { requires } }),
        })

      let res = await put([prereq.id])
      expect(res.status).toBe(200)
      let body = await res.json()
      expect(body.data.requires).toEqual([prereq.id])

      res = await put(null)
      expect(res.status).toBe(200)
      body = await res.json()
      expect(body.data.requires).toBeNull()
    })

    test('rejects a challenge requiring itself', async () => {
      const adminPerms = Permissions.challsRead | Permissions.challsWrite
      const { user, cleanup } = await generateRealTestUser(adminPerms)
      createdUserCleanups.push(cleanup)
      const authToken = await generateAuthToken(user.id)

      const { challenge, cleanup: challengeCleanup } = await generateChallenge()
      createdChallengeCleanups.push(challengeCleanup)

      const res = await request(app, `/api/v2/admin/challs/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ data: { requires: [challenge.id] } }),
      })

      await expectResponse(res, BadBody)
    })
  })
})
