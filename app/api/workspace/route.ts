import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { deleteProviderKeys, getProviderKeyCounts, saveProviderKeys, type Provider } from '@/lib/provider-api-keys'

export const runtime = 'nodejs'

const MAX_WORKSPACE_BYTES = 900_000
const persistedFields = new Set([
  'posts', 'comments', 'analysis', 'commentAnalysis', 'commentInsight',
  'draft', 'savedDrafts', 'recommendation', 'chat', 'connected', 'analysisHistory',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

async function savePatch(userId: string, patch: Record<string, unknown>) {
  await pool.query(
    `INSERT INTO public.workspace_data ("userId", data, "updatedAt")
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT ("userId") DO UPDATE
     SET data = public.workspace_data.data || EXCLUDED.data, "updatedAt" = now()`,
    [userId, JSON.stringify(patch)],
  )
}

async function readData(userId: string) {
  const result = await pool.query<{ data: unknown }>(
    'SELECT data FROM public.workspace_data WHERE "userId" = $1 LIMIT 1',
    [userId],
  )
  return isRecord(result.rows[0]?.data) ? result.rows[0].data : {}
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  const [data, providerKeyCounts] = await Promise.all([readData(userId), getProviderKeyCounts(userId)])
  return NextResponse.json({
    workspace: Object.fromEntries([...persistedFields].map((field) => [field, data[field] ?? null])),
    providerKeyCounts,
    providerKeySaved: { groq: providerKeyCounts.groq > 0, hindsight: providerKeyCounts.hindsight > 0 },
  })
}

export async function PATCH(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_WORKSPACE_BYTES) return NextResponse.json({ error: 'Workspace update is too large.' }, { status: 413 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }) }
  if (!isRecord(body) || !isRecord(body.patch)) return NextResponse.json({ error: 'Provide a workspace update.' }, { status: 400 })
  const patch = Object.fromEntries(Object.entries(body.patch).filter(([key]) => persistedFields.has(key)))
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No supported workspace fields were provided.' }, { status: 400 })
  if (Buffer.byteLength(JSON.stringify(patch), 'utf8') > MAX_WORKSPACE_BYTES) return NextResponse.json({ error: 'Workspace update is too large.' }, { status: 413 })
  await savePatch(userId, patch)
  return NextResponse.json({ saved: true })
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }) }
  if (!isRecord(body) || (body.provider !== 'groq' && body.provider !== 'hindsight')) {
    return NextResponse.json({ error: 'Choose a supported API provider.' }, { status: 400 })
  }
  const provider = body.provider as Provider
  if (!Array.isArray(body.keys) || body.keys.length === 0 || body.keys.length > 10 || body.keys.some((key) => typeof key !== 'string' || key.length > 512)) {
    return NextResponse.json({ error: 'Provide between 1 and 10 valid API keys.' }, { status: 400 })
  }
  const keys = [...new Set(body.keys.map((key) => (key as string).trim()).filter(Boolean))]
  if (!keys.length) return NextResponse.json({ error: 'Add at least one API key.' }, { status: 400 })
  await saveProviderKeys(userId, provider, keys)
  return NextResponse.json({ saved: true, count: keys.length })
}

export async function DELETE(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }) }
  if (!isRecord(body) || (body.provider !== 'groq' && body.provider !== 'hindsight')) {
    return NextResponse.json({ error: 'Choose a supported API provider.' }, { status: 400 })
  }
  const provider = body.provider as Provider
  await deleteProviderKeys(userId, provider)
  return NextResponse.json({ saved: true, count: 0 })
}
