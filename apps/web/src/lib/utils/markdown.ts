import DOMPurify from 'dompurify'
import { Marked, type TokenizerAndRendererExtension } from 'marked'

export const ALERT_TYPES = [
  'note',
  'tip',
  'important',
  'warning',
  'caution',
  'connection',
] as const

export type AlertType = (typeof ALERT_TYPES)[number]

export const isAlertType = (value: string): value is AlertType =>
  (ALERT_TYPES as readonly string[]).includes(value)

interface AlertToken {
  type: 'alert'
  raw: string
  alertType: AlertType
  content: string
}

const nonce = crypto.randomUUID()
const HYDRATION_ATTRS = [
  'data-alert',
  'data-type',
  'data-content',
  'data-timer',
]

const escapeAttribute = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const alert: TokenizerAndRendererExtension = {
  name: 'alert',
  level: 'block',
  start: src => src.match(/^> \[!/m)?.index,
  tokenizer(src): AlertToken | undefined {
    const match = /^> \[!(\w+)\]\n((?:> .*(?:\n|$))+)/i.exec(src)
    if (!match?.[1] || !match[2]) return undefined
    const alertType = match[1].toLowerCase()
    if (!isAlertType(alertType)) return undefined
    return {
      type: 'alert',
      raw: match[0],
      alertType,
      content: match[2]
        .split('\n')
        .map(line => line.replace(/^> ?/, ''))
        .join('\n')
        .trim(),
    }
  },
  renderer(token) {
    const { alertType, content } = token
    return (
      `<div data-alert data-nonce="${nonce}" data-type="${alertType}"` +
      ` data-content="${escapeAttribute(content)}"></div>`
    )
  },
}

const TIMER_TAG = String.raw`<timer\s*/?>(?:</timer>)?`
const TIMER_BLOCK = new RegExp(String.raw`^${TIMER_TAG}[ \t]*(?:\n+|$)`, 'i')
const timerPlaceholder = `<div data-timer data-nonce="${nonce}"></div>`

const timer: TokenizerAndRendererExtension = {
  name: 'timer',
  level: 'block',
  start: src => src.match(/^<timer/im)?.index,
  tokenizer(src) {
    const match = TIMER_BLOCK.exec(src)
    return match ? { type: 'timer', raw: match[0] } : undefined
  },
  renderer: () => timerPlaceholder,
}

const FENCED_CODE =
  /(^|\n)(?:```|~~~)[^\n]*\n[\s\S]*?\n(?:```|~~~)[ \t]*(?=\n|$)/g
const BLOCK_HTML_BOUNDARY =
  /(<\/(?:div|p|blockquote|pre|table|dl|ol|ul|fieldset|details|dialog|figure|figcaption|footer|form|header|hr|main|nav|search|section|h[1-6])>|<(?:hr|br|img|input|source|track|wbr)\b[^>]*\/?>)\n(?!\n)/gi

const separateHtmlBlocks = (markdown: string): string => {
  const parts: string[] = []
  let last = 0
  for (const match of markdown.matchAll(FENCED_CODE)) {
    parts.push(
      markdown.slice(last, match.index).replace(BLOCK_HTML_BOUNDARY, '$1\n\n'),
      match[0]
    )
    last = match.index + match[0].length
  }
  parts.push(markdown.slice(last).replace(BLOCK_HTML_BOUNDARY, '$1\n\n'))
  return parts.join('')
}

// Allow YouTube video embeds in rendered markdown (e.g. challenge
// descriptions). DOMPurify drops <iframe> by default; we re-allow the tag but
// keep only iframes whose src is a YouTube embed URL, dropping any other. The
// deployment CSP's frame-src is already scoped to YouTube, so that is the only
// origin that can be framed even if the tag survives.
const YOUTUBE_EMBED_SRC =
  /^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]+(?:\?[\w=&%.-]*)?$/

const SANITIZE_OPTIONS = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'referrerpolicy'],
}

let purify: ReturnType<typeof DOMPurify> | undefined

const getPurify = () => {
  if (purify) return purify
  purify = DOMPurify(window)
  purify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'iframe') return
    const element = node as Element
    if (!YOUTUBE_EMBED_SRC.test(element.getAttribute('src') ?? '')) {
      element.parentNode?.removeChild(element)
    }
  })
  purify.addHook('afterSanitizeAttributes', node => {
    const emittedByExtension = node.getAttribute('data-nonce') === nonce
    node.removeAttribute('data-nonce')
    if (emittedByExtension) return
    for (const name of HYDRATION_ATTRS) node.removeAttribute(name)
  })
  return purify
}

const marked = new Marked({
  extensions: [alert, timer],
  hooks: {
    preprocess: separateHtmlBlocks,
    postprocess: html => getPurify().sanitize(html, SANITIZE_OPTIONS),
  },
})

export const parseMarkdown = (content: string): string =>
  marked.parse(content, { async: false })

export const parseAlertContent = parseMarkdown
