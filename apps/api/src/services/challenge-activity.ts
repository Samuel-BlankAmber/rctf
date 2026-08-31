import type { DatabaseClient } from '@rctf/db'
import { challenges, challengeViews, solves, users } from '@rctf/db'
import { desc, eq, sql } from 'drizzle-orm'

// Record that a user opened a challenge's description. First open sets both
// timestamps; later opens only bump lastViewedAt.
export const recordChallengeView = async (
  db: DatabaseClient,
  userId: string,
  challengeId: string
): Promise<void> => {
  await db
    .insert(challengeViews)
    .values({ userId, challengeId })
    .onConflictDoUpdate({
      target: [challengeViews.userId, challengeViews.challengeId],
      set: { lastViewedAt: sql`now()` },
    })
}

export interface PlayerViewActivity {
  userId: string
  userName: string
  challengeId: string
  challengeName: string | null
  firstViewedAt: string
  lastViewedAt: string
  solved: boolean
}

// The most recently opened challenge for every (non-banned) user, with when
// they first opened it and whether they have since solved it.
export const getLatestViewPerUser = async (
  db: DatabaseClient
): Promise<PlayerViewActivity[]> => {
  const solved = sql<boolean>`EXISTS (
    SELECT 1 FROM ${solves}
    WHERE ${solves.userid} = ${challengeViews.userId}
      AND ${solves.challengeid} = ${challengeViews.challengeId}
      AND ${solves.source} = 'flag'
  )`

  return db
    .selectDistinctOn([challengeViews.userId], {
      userId: challengeViews.userId,
      userName: users.name,
      challengeId: challengeViews.challengeId,
      challengeName: sql<string | null>`${challenges.data} ->> 'name'`,
      firstViewedAt: challengeViews.firstViewedAt,
      lastViewedAt: challengeViews.lastViewedAt,
      solved,
    })
    .from(challengeViews)
    .innerJoin(users, eq(users.id, challengeViews.userId))
    .leftJoin(challenges, eq(challenges.id, challengeViews.challengeId))
    .where(eq(users.banned, false))
    .orderBy(challengeViews.userId, desc(challengeViews.lastViewedAt))
}
