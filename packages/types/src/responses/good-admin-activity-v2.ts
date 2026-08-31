import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

const ActiveInstanceSchema = z.object({
  challengeIntegrationId: example(z.string(), 'private-notes').check(
    z.describe('The challenge integration id the instance belongs to.')
  ),
  instanceId: example(z.string(), 'a1b2c3d4').check(z.describe('Instance id.')),
  status: example(z.string(), 'running').check(
    z.describe('Instance status: running, starting, errored or stopped.')
  ),
  startedAt: z
    .nullable(example(z.int(), 1710000000000))
    .check(z.describe('When the instance started, Unix ms, or null.')),
  expiresAt: z
    .nullable(example(z.int(), 1710000900000))
    .check(z.describe('When the instance expires, Unix ms, or null.')),
})

const PlayerActivitySchema = z.object({
  userId: example(z.string(), 'team-xyz').check(z.describe('Player id.')),
  userName: example(z.string(), 'otter-sec').check(
    z.describe('Player display name.')
  ),
  challengeId: z
    .nullable(example(z.string(), 'baby-lll'))
    .check(z.describe('Most recently opened challenge id, or null.')),
  challengeName: z
    .nullable(example(z.string(), 'Baby LLL'))
    .check(z.describe('Most recently opened challenge name, or null.')),
  firstViewedAt: z
    .nullable(example(z.string(), '2026-09-19T10:05:00.000Z'))
    .check(z.describe('When they first opened that challenge (ISO), or null.')),
  lastViewedAt: z
    .nullable(example(z.string(), '2026-09-19T10:42:00.000Z'))
    .check(z.describe('When they last opened that challenge (ISO), or null.')),
  solved: example(z.boolean(), false).check(
    z.describe('Whether they have solved that challenge.')
  ),
  activeInstances: z
    .array(ActiveInstanceSchema)
    .check(z.describe('Running instances this player currently owns.')),
})

export const GoodAdminActivityV2 = response('goodAdminActivityV2', {
  status: 200,
  message: 'The player activity was retrieved.',
  data: z.object({
    serverTime: example(z.string(), '2026-09-19T10:42:30.000Z').check(
      z.describe('Server time (ISO) so durations are measured against it.')
    ),
    players: z
      .array(PlayerActivitySchema)
      .check(z.describe('One row per player, most recently active first.')),
  }),
})
