import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

type TrainingRow = {
  date: string
  time: string
  platform: string
  topic: string
  type: string
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
}

type Aggregate = {
  samples: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  engagementRate: number
}

export type SocialTrainingSummary = {
  dataset: string
  records: number
  sourceExamples: number
  overall: Aggregate
  byPlatform: Array<{ name: string } & Aggregate>
  byTopic: Array<{ name: string } & Aggregate>
  byFormat: Array<{ name: string } & Aggregate>
  byPostingWindow: Array<{ name: string } & Aggregate>
  note: string
}

let summaryPromise: Promise<SocialTrainingSummary> | undefined

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        cell += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(cell)
      cell = ''
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''))
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''))
    rows.push(row)
  }

  const [headerRow = [], ...dataRows] = rows
  const headers = headerRow.map((header) => header.trim().toLowerCase())
  return dataRows
    .filter((values) => values.some((value) => value.trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function postingWindow(time: string) {
  const hour = Number(time.split(':')[0])
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 'Unknown time'
  if (hour >= 5 && hour < 12) return 'Morning (05:00–11:59)'
  if (hour >= 12 && hour < 17) return 'Afternoon (12:00–16:59)'
  if (hour >= 17 && hour < 22) return 'Evening (17:00–21:59)'
  return 'Night (22:00–04:59)'
}

function createAggregate(rows: TrainingRow[]): Aggregate {
  const totals = rows.reduce((sum, row) => ({
    likes: sum.likes + row.likes,
    comments: sum.comments + row.comments,
    shares: sum.shares + row.shares,
    saves: sum.saves + row.saves,
    reach: sum.reach + row.reach,
  }), { likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 })
  const samples = rows.length
  const average = (value: number) => Math.round(value / samples)
  const averageReach = average(totals.reach)
  const weightedEngagement = totals.likes + 2 * totals.comments + 3 * totals.shares + 2 * totals.saves

  return {
    samples,
    likes: average(totals.likes),
    comments: average(totals.comments),
    shares: average(totals.shares),
    saves: average(totals.saves),
    reach: averageReach,
    engagementRate: averageReach ? Number((weightedEngagement / totals.reach * 100).toFixed(2)) : 0,
  }
}

function aggregateBy(rows: TrainingRow[], getKey: (row: TrainingRow) => string) {
  const groups = new Map<string, TrainingRow[]>()
  for (const row of rows) {
    const key = getKey(row) || 'Unspecified'
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.entries()]
    .map(([name, group]) => ({ name, ...createAggregate(group) }))
    .sort((left, right) => right.engagementRate - left.engagementRate)
}

async function loadSummary(): Promise<SocialTrainingSummary> {
  const csv = await readFile(join(process.cwd(), 'public', 'social-media-engagement-training-5000.csv'), 'utf8')
  const source = parseCsv(csv)
  if (!source.length) throw new Error('The generated social engagement training dataset is empty.')

  const rows: TrainingRow[] = source.map((value) => ({
    date: String(value.date ?? ''),
    time: String(value.time ?? ''),
    platform: String(value.platform || 'Unspecified'),
    topic: String(value.topic || 'Unspecified'),
    type: String(value.type || 'Unspecified'),
    likes: numberValue(value.likes),
    comments: numberValue(value.comments),
    shares: numberValue(value.shares),
    saves: numberValue(value.saves),
    reach: numberValue(value.reach),
  }))
  const sourceExamples = new Set(source.map((row) => String(row.source_example ?? ''))).size

  return {
    dataset: 'social_media_engagement_dataset_as_sample.csv',
    records: rows.length,
    sourceExamples,
    overall: createAggregate(rows),
    byPlatform: aggregateBy(rows, (row) => row.platform),
    byTopic: aggregateBy(rows, (row) => row.topic).slice(0, 12),
    byFormat: aggregateBy(rows, (row) => row.type).slice(0, 10),
    byPostingWindow: aggregateBy(rows, (row) => postingWindow(row.time)),
    note: 'Metrics are empirical averages and weighted engagement rates calculated from the supplied dataset and its reproducible synthetic examples. They are historical baselines, not guaranteed outcomes or trained model weights.',
  }
}

export function getSocialTrainingSummary() {
  summaryPromise ??= loadSummary().catch((error: unknown) => {
    summaryPromise = undefined
    throw error
  })
  return summaryPromise
}

export function createTrainingMemory(summary: SocialTrainingSummary) {
  return `SOCIAL ENGAGEMENT TRAINING DATA — ${summary.records} records derived from ${summary.sourceExamples} source examples in ${summary.dataset}. These are measured historical averages from supplied and reproducibly generated synthetic examples, not fine-tuned model weights. Overall average metrics: ${JSON.stringify(summary.overall)}. Average metrics by platform: ${JSON.stringify(summary.byPlatform)}. Average metrics by topic: ${JSON.stringify(summary.byTopic)}. Average metrics by content format: ${JSON.stringify(summary.byFormat)}. Average metrics by posting time window: ${JSON.stringify(summary.byPostingWindow)}. ${summary.note}`
}

export function formatTrainingEvidence(summary: SocialTrainingSummary) {
  return `TRAINING DATASET EVIDENCE (${summary.records} examples; ${summary.sourceExamples} source examples): ${JSON.stringify({ overall: summary.overall, byPlatform: summary.byPlatform, byTopic: summary.byTopic, byFormat: summary.byFormat, byPostingWindow: summary.byPostingWindow })}`
}

export function getPredictionSystemInstruction(summary: SocialTrainingSummary) {
  return `You are in prediction mode. Estimate social engagement using only the supplied 5,000-row dataset summary, any matching current-session post history, and relevant recalled Hindsight memories. Provide an estimated likes, comments, shares, saves, reach, and weighted engagement rate when the user gives enough post/platform/topic/format/time details. Use the closest empirical group averages as the baseline; name the comparison group and sample count. Adjust from baseline only when evidence supports it. Give a practical uncertainty range (about ±20% for close matches, wider for weak matches) and a low/medium/high confidence label based on match quality and sample size. Clearly distinguish model estimates from observed results; never present predictions as guarantees or claim model-weight fine-tuning. Ask one concise follow-up if essential inputs are missing. Dataset baseline: ${JSON.stringify({ overall: summary.overall, byPlatform: summary.byPlatform, byTopic: summary.byTopic, byFormat: summary.byFormat, byPostingWindow: summary.byPostingWindow })}`
}

export function getTrainingSummaryForPrompt(summary: SocialTrainingSummary) {
  return `${summary.note}\n\n${formatTrainingEvidence(summary)}`
}
