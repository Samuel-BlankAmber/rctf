import { config } from '@rctf/config'
import { timingSafeEqual } from 'node:crypto'

export const registrationCodeRequired = (): boolean =>
  config.registrationCodes.length > 0

const matches = (candidate: Buffer, expected: string): boolean => {
  const expectedBuffer = Buffer.from(expected)
  return (
    candidate.length === expectedBuffer.length &&
    timingSafeEqual(candidate, expectedBuffer)
  )
}

/**
 * Whether the supplied code lets someone register.
 *
 * Any configured code is accepted, so codes can be issued per cohort and
 * revoked individually. Comparison is constant time so a wrong code cannot be
 * narrowed down by measuring the response.
 */
export const registrationCodeAccepted = (code: string | undefined): boolean => {
  if (!registrationCodeRequired()) {
    return true
  }
  if (!code) {
    return false
  }

  const candidate = Buffer.from(code)
  return config.registrationCodes.some(expected => matches(candidate, expected))
}
