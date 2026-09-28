import { readFile } from 'node:fs/promises'
import path from 'node:path'

type Row = { platform: string; topic: string; type: string; hour: number; likes: number; comments: number; shares: number; saves: number; reach: number }
type Metrics = { sampleSize: number; likes: number; comments: number; shares: number; saves: number; reach: number; engagementRate: number }
export type EngagementPrediction = { trainingRows: number; filters: string[]; matchedExamples: number; outcome: Metrics; note: string }
export type EngagementTrainingSummary = { trainingRows: number; synthetic: true; topPlatforms: Array<{ name: string; sampleSize: number; engagementRate: number }>; topTopics: Array<{ name: string; sampleSize: number; engagementRate: number }>; topFormats: Array<{ name: string; sampleSize: number; engagementRate: number }> }

let rowsPromise: Promise<Row[]> | undefined

function parseCsvLine(line: string) {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i += 1 } else quoted = !quoted
    } else if (char === ',' && !quoted) { cells.push(cell); cell = '' } else cell += char
  }
  cells.push(cell)
  return cells
}

async function loadRows(): Promise<Row[]> {
  const file = path.join(process.cwd(), 'public', 'social-media-engagement-training-5000.csv')
  const [header, ...lines] = (await readFile(file, 'utf8')).trim().split(/\r?\n/)
  const columns = parseCsvLine(header).map((value) => value.trim())
  const index = (name: string) => columns.indexOf(name)
  const required = ['platform', 'topic', 'type', 'time', 'likes', 'comments', 'shares', 'saves', 'reach']
  if (required.some((name) => index(name) < 0) || lines.length !== 5000) throw new Error('The 5,000-row training dataset is unavailable or has an unexpected schema.')
  return lines.map((line) => {
    const cells = parseCsvLine(line)
    const number = (key: string) => { const value = Number(cells[index(key)]); return Number.isFinite(value) ? Math.max(0, value) : 0 }
    return { platform: cells[index('platform')], topic: cells[index('topic')], type: cells[index('type')], hour: Number(cells[index('time')]?.split(':')[0]) || 0, likes: number('likes'), comments: number('comments'), shares: number('shares'), saves: number('saves'), reach: number('reach') }
  })
}

async function getRows() {
  rowsPromise ??= loadRows().catch((error) => { rowsPromise = undefined; throw error })
  return rowsPromise
}

function summarize(rows: Row[]): Metrics {
  const count = rows.length || 1
  const average = (key: 'likes' | 'comments' | 'shares' | 'saves' | 'reach') => rows.reduce((sum, row) => sum + row[key], 0) / count
  const likes = average('likes'); const comments = average('comments'); const shares = average('shares'); const saves = average('saves'); const reach = average('reach')
  return { sampleSize: rows.length, likes: Math.round(likes), comments: Math.round(comments), shares: Math.round(shares), saves: Math.round(saves), reach: Math.round(reach), engagementRate: reach ? Number(((likes + comments + shares + saves) / reach * 100).toFixed(2)) : 0 }
}

function rank(rows: Row[], field: 'platform' | 'topic' | 'type') {
  const groups = new Map<string, Row[]>()
  for (const row of rows) groups.set(row[field], [...(groups.get(row[field]) ?? []), row])
  return [...groups].map(([name, samples]) => ({ name, sampleSize: samples.length, engagementRate: summarize(samples).engagementRate })).sort((a, b) => b.engagementRate - a.engagementRate)
}

export async function trainEngagementModel(): Promise<EngagementTrainingSummary> {
  const rows = await getRows()
  return { trainingRows: rows.length, synthetic: true, topPlatforms: rank(rows, 'platform').slice(0, 4), topTopics: rank(rows, 'topic').slice(0, 6), topFormats: rank(rows, 'type').slice(0, 5) }
}

function daypart(hour: number) { return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night' }

export async function predictEngagement(question: string): Promise<EngagementPrediction> {
  const rows = await getRows()
  const lower = question.toLowerCase()
  const findMention = (items: string[]) => [...new Set(items)].sort((a, b) => b.length - a.length).find((item) => lower.includes(item.toLowerCase()))
  const platform = findMention(rows.map((row) => row.platform))
  const topic = findMention(rows.map((row) => row.topic))
  const type = findMention(rows.map((row) => row.type))
  const time = question.match(/\b(?:at\s+)?(\d{1,2})(?::\d{2})?\s*(am|pm)\b|\b(?:at\s+)(\d{1,2})(?::\d{2})?\b/i)
  let hour = time ? Number(time[1] || time[3]) : undefined
  if (hour !== undefined && time?.[2]?.toLowerCase() === 'pm' && hour < 12) hour += 12
  if (hour !== undefined && time?.[2]?.toLowerCase() === 'am' && hour === 12) hour = 0
  if (hour !== undefined && hour > 23) hour = undefined
  const matches = rows.filter((row) => (!platform || row.platform === platform) && (!topic || row.topic === topic) && (!type || row.type === type) && (hour === undefined || daypart(row.hour) === daypart(hour)))
  const filters = [platform && `Platform: ${platform}`, topic && `Topic: ${topic}`, type && `Format: ${type}`, hour !== undefined && `Time: ${daypart(hour)}`].filter((item): item is string => Boolean(item))
  return { trainingRows: rows.length, filters, matchedExamples: matches.length, outcome: summarize(matches.length ? matches : rows), note: matches.length ? 'Averages come from matching synthetic examples, not live account results.' : 'No rows matched; this uses the overall synthetic dataset average.' }
}

export function summarizeTrainingForMemory(summary: EngagementTrainingSummary) {
  return `Social-media predictor trained on ${summary.trainingRows} synthetic CSV-derived examples. These are not live account metrics. Descriptive engagement-rate averages: ${JSON.stringify({ platforms: summary.topPlatforms, topics: summary.topTopics, formats: summary.topFormats })}. Estimates are illustrative, not guarantees.`
}

export function getTrainingSummaryText(summary: EngagementTrainingSummary) {
  return `${summary.trainingRows.toLocaleString()} synthetic records summarized across platforms, topics, and formats.`
}

export function formatMetric(value: number) { return Math.round(value).toLocaleString() }
export function formatRate(value: number) { return `${value.toFixed(2)}%` }
export function trainingDatasetUrl() { return '/social-media-engagement-training-5000.csv' }
export function trainingDatasetDescription() { return 'CSV-derived synthetic examples; no model-provider weights were fine-tuned.' }
export function predictionMethod() { return 'Filtered cohort averages across platform, topic, format, and time of day.' }
export function predictionDisclaimer() { return 'Synthetic cohort averages only. Validate against real account data before making business decisions.' }
export function isTrainingReady() { return Boolean(rowsPromise) }
export function predictionConfidence(prediction: EngagementPrediction) { return prediction.matchedExamples >= 100 ? 'Larger sample' : prediction.matchedExamples >= 25 ? 'Moderate sample' : prediction.matchedExamples ? 'Small sample' : 'Overall average' }
