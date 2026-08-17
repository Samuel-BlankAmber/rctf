import { config } from '@rctf/config'
import { BadRegistrationCode, GoodRegisterV2 } from '@rctf/types'
import { afterAll, afterEach, beforeAll, describe, test } from 'bun:test'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import { deleteUserByEmail, expectResponse, generateTestUser } from '../../util'

let app: Hono<any>
let oldCodes: string[]
let oldEmail: typeof config.email
const created: string[] = []

const register = (body: Record<string, unknown>) =>
  request(app, '/api/v2/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

beforeAll(async () => {
  app = await getApp()
  oldCodes = config.registrationCodes
  oldEmail = config.email
  // Without an email provider registration completes immediately, which keeps
  // these tests about the code rather than the verification flow.
  config.email = undefined
})

afterEach(async () => {
  while (created.length > 0) {
    await deleteUserByEmail(created.pop()!)
  }
})

afterAll(() => {
  config.registrationCodes = oldCodes
  config.email = oldEmail
})

describe('registrationCodes', () => {
  test('registration is unrestricted when no codes are configured', async () => {
    config.registrationCodes = []

    const user = generateTestUser()
    const res = await register({ name: user.name, email: user.email })

    await expectResponse(res, GoodRegisterV2)
    created.push(user.email)
  })

  test('a correct code registers', async () => {
    config.registrationCodes = ['let-me-in']

    const user = generateTestUser()
    const res = await register({
      name: user.name,
      email: user.email,
      registrationCode: 'let-me-in',
    })

    await expectResponse(res, GoodRegisterV2)
    created.push(user.email)
  })

  test('any configured code is accepted', async () => {
    config.registrationCodes = ['first-cohort', 'second-cohort']

    const user = generateTestUser()
    const res = await register({
      name: user.name,
      email: user.email,
      registrationCode: 'second-cohort',
    })

    await expectResponse(res, GoodRegisterV2)
    created.push(user.email)
  })

  test('a wrong code is refused', async () => {
    config.registrationCodes = ['let-me-in']

    const user = generateTestUser()
    const res = await register({
      name: user.name,
      email: user.email,
      registrationCode: 'guess',
    })

    await expectResponse(res, BadRegistrationCode)
  })

  test('a missing code is refused', async () => {
    config.registrationCodes = ['let-me-in']

    const user = generateTestUser()
    const res = await register({ name: user.name, email: user.email })

    await expectResponse(res, BadRegistrationCode)
  })

  test('a code that is a prefix of the real one is refused', async () => {
    config.registrationCodes = ['let-me-in']

    const user = generateTestUser()
    const res = await register({
      name: user.name,
      email: user.email,
      registrationCode: 'let-me',
    })

    await expectResponse(res, BadRegistrationCode)
  })
})
