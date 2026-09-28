import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { pool } from '@/backend/lib/db'

export type Provider = 'groq' | 'hindsight'
type ProviderKeyMap = Record<Provider, string[]>

function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('API key encryption is not configured.')
  return createHash('sha256').update(secret).digest()
}

function encryptKeys(keys: string[]) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(keys), 'utf8'), cipher.final()])
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`
}

function decryptKeys(value: string) {
  try {
    const [version, ivValue, tagValue, encryptedValue] = value.split('.')
    if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) return []
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
    const parsed: unknown = JSON.parse(decrypted)
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((key): key is string => typeof key === 'string' && key.length > 0 && key.length <= 512))].slice(0, 10)
      : []
  } catch {
    return []
  }
}

export async function getProviderKeysForUser(userId: string): Promise<ProviderKeyMap> {
  const result = await pool.query<{ provider: string; encryptedKeys: string }>(
    'SELECT provider, "encryptedKeys" FROM public.provider_api_keys WHERE "userId" = $1',
    [userId],
  )
  const keys: ProviderKeyMap = { groq: [], hindsight: [] }
  for (const row of result.rows) {
    if (row.provider === 'groq' || row.provider === 'hindsight') keys[row.provider] = decryptKeys(row.encryptedKeys)
  }
  return keys
}

export async function getProviderKeyCounts(userId: string) {
  const keys = await getProviderKeysForUser(userId)
  return { groq: keys.groq.length, hindsight: keys.hindsight.length }
}

export async function saveProviderKeys(userId: string, provider: Provider, keys: string[]) {
  await pool.query(
    `INSERT INTO public.provider_api_keys ("userId", provider, "encryptedKeys", "updatedAt")
     VALUES ($1, $2, $3, now())
     ON CONFLICT ("userId", provider) DO UPDATE
     SET "encryptedKeys" = EXCLUDED."encryptedKeys", "updatedAt" = now()`,
    [userId, provider, encryptKeys(keys)],
  )
}

export async function deleteProviderKeys(userId: string, provider: Provider) {
  await pool.query('DELETE FROM public.provider_api_keys WHERE "userId" = $1 AND provider = $2', [userId, provider])
}
