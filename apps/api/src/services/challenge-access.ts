import { config } from '@rctf/config'
import { createToken, parseToken, TokenKind } from '../lib/tokens'

export const DOWNLOAD_TOKEN_PARAM = 't'

export const challengesRequireAuth = (): boolean =>
  config.requireAuthForChallenges

/**
 * Attach a download token to an attachment URL.
 *
 * Attachments are fetched by plain browser navigation, which carries no
 * Authorization header, so the proof of a session has to travel in the URL.
 * Tokens are minted only while serving an authenticated challenge list, so an
 * unregistered visitor has no way to obtain one.
 */
export const signDownloadUrl = async (
  url: string,
  userId: string
): Promise<string> => {
  if (!challengesRequireAuth() || !url.startsWith('/uploads/')) {
    return url
  }

  const token = await createToken(TokenKind.Download, userId)
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${DOWNLOAD_TOKEN_PARAM}=${encodeURIComponent(token)}`
}

export const downloadTokenValid = async (
  token: string | undefined
): Promise<boolean> => {
  if (!token) {
    return false
  }
  return (await parseToken(TokenKind.Download, token)) !== null
}
