import { response } from '../internal'

export const BadRegistrationCode = response('badRegistrationCode', {
  status: 403,
  message: 'The registration code is incorrect.',
})
