import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { challenges } from './challenges'
import { users } from './users'

// One row per (user, challenge) the user has opened. firstViewedAt is when they
// first read the description; lastViewedAt is refreshed on every open. Used only
// for admin activity monitoring, never for scoring.
export const challengeViews = pgTable(
  'challenge_views',
  {
    userId: text('user_id').notNull(),
    challengeId: text('challenge_id').notNull(),
    firstViewedAt: timestamp('first_viewed_at', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    lastViewedAt: timestamp('last_viewed_at', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
  },
  table => [
    primaryKey({
      name: 'challenge_views_pkey',
      columns: [table.userId, table.challengeId],
    }),
    index('challenge_views_last_viewed_at_index').on(table.lastViewedAt),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'challenge_views_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.challengeId],
      foreignColumns: [challenges.id],
      name: 'challenge_views_challenge_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
