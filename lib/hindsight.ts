const HINDSIGHT_API_BASE = (process.env.HINDSIGHT_API_URL || 'https://api.hindsight.vectorize.io').replace(/\/$/, '')
export const HINDSIGHT_BANK_ID = 'social-media-agent'

type JsonRecord = Record<string, unknown>

export class IntegrationError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message)
    this.name = 'IntegrationError'
  }
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const record = payload as JsonRecord
    const message = record.error ?? record.message ?? record.detail
    if (typeof message === 'string' && message.length < 400) return message
  }
  return fallback
}

async function request(path: string, body: JsonRecord) {
  const apiKey = process.env.HINDSIGHT_API_KEY
  if (!apiKey) throw new IntegrationError('HINDSIGHT_API_KEY is not configured on the server.', 503)

  let response: Response
  try {
    response = await fetch(`${HINDSIGHT_API_BASE}/v1/default/banks/${HINDSIGHT_BANK_ID}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new IntegrationError('Hindsight request timed out after 15 seconds.', 504)
    }
    throw new IntegrationError('Could not reach Hindsight Cloud.', 502)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const status = response.status === 401 || response.status === 403 ? 503 : response.status === 404 ? 422 : 502
    const fallback = response.status === 401 || response.status === 403
      ? 'Hindsight rejected the API credential. Confirm the rotated HINDSIGHT_API_KEY secret.'
      : response.status === 404
        ? `Hindsight could not find bank "${HINDSIGHT_BANK_ID}". Check the bank ID and create the bank in Hindsight Cloud.`
        : `Hindsight request failed (HTTP ${response.status}).`
    throw new IntegrationError(errorMessage(payload, fallback), status)
  }
  return payload
}

export function retainInHindsight(items: string[]) {
  return request('/memories', { items: items.map((content) => ({ content })) })
}

export function recallFromHindsight(query: string) {
  return request('/memories/recall', { query, top_k: 10 })
}

export function reflectWithHindsight(query: string) {
  return request('/reflect', { query, budget: 'mid' })
}

function collectText(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (Array.isArray(value)) return value.flatMap(collectText)
  if (!value || typeof value !== 'object') return []
  const record = value as JsonRecord
  for (const key of ['results', 'memories', 'items', 'facts', 'relevant_facts', 'data']) {
    if (Array.isArray(record[key])) return collectText(record[key])
  }
  for (const key of ['text', 'content', 'fact', 'memory', 'statement']) {
    if (typeof record[key] === 'string' && record[key]) return [record[key] as string]
  }
  return []
}

export function extractMemories(payload: unknown) {
  return [...new Set(collectText(payload))].slice(0, 30)
}

export function extractReflection(payload: unknown): string {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as JsonRecord
  for (const key of ['text', 'answer', 'response', 'reflection', 'result']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (value && typeof value === 'object') {
      const nested: string = extractReflection(value)
      if (nested) return nested
    }
  }
  return ''
}

export function serializeEvidence(payload: unknown) {
  return JSON.stringify(payload).slice(0, 16_000)
}

export function hindsightConfigured() {
  return Boolean(process.env.HINDSIGHT_API_KEY)
}

export function getHindsightError(error: unknown) {
  return error instanceof IntegrationError ? error : new IntegrationError('Hindsight request failed.', 502)
}

export function toRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

export function toString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function toNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function summarizeRetainResponse(payload: unknown) {
  const response = toRecord(payload)
  const count = toNumber(response.retained_count ?? response.item_count ?? response.count, 0)
  return count || undefined
}

export function getIntegrationStatus(error: unknown) {
  return error instanceof IntegrationError ? error.status : 502
}

export function toSafeOperationError(error: unknown) {
  const message = error instanceof Error ? error.message : 'The external service returned an error.'
  return message.slice(0, 400)
}
