'use client'

import { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, Bot, Brain, BriefcaseBusiness,
  Check, ChevronDown, ChevronUp, CircleHelp, FileSearch, FlaskConical, Gauge,
  LayoutDashboard, Lightbulb, MessageSquareText, Send, Settings, Share2,
  Sparkles, Upload, X,
} from 'lucide-react'

type PageId = 'dashboard' | 'post' | 'comments' | 'content' | 'knowledge' | 'recs' | 'social' | 'chat' | 'settings'
type Post = { id: string; date: string; platform: string; content: string; topic: string; type: string; likes: number; comments: number; shares: number; saves: number; hour: number; day: number }
type Message = { role: 'user' | 'agent'; text: string }
type AgentResult = { text?: string; memories?: string[]; reflected?: boolean; reflection?: string; retained?: boolean; retainedMemoryVerified?: boolean; trained?: boolean; hindsightWarning?: string; error?: string }
type AgentAction = 'chat' | 'prediction-chat' | 'train' | 'content' | 'recommendation' | 'analysis' | 'comment-analysis' | 'retain' | 'memory-list' | 'learning-demo-before' | 'learning-demo-after'
type ChatMode = 'normal' | 'prediction'
type ActivityEntry = { id: string; message: string; timestamp: string; operation: string; status: 'success' | 'error' | 'pending'; details?: string; memoryCount?: number }
type DemoResults = { before: string; after: string; recalled: string[]; verified: boolean; memoryMarker: string }
type Provider = 'groq' | 'hindsight'
type ProviderKeys = { groq?: string; hindsight?: string[] }
type ProviderKeyRing = Record<Provider, string[]>
type ProviderKeyCursor = Record<Provider, number>

let sessionProviderKeys: ProviderKeyRing = { groq: [], hindsight: [] }
let providerKeyCursor: ProviderKeyCursor = { groq: 0, hindsight: 0 }

function setSessionProviderKeys(provider: Provider, keys: string[]) {
  sessionProviderKeys = { ...sessionProviderKeys, [provider]: keys }
  providerKeyCursor = { ...providerKeyCursor, [provider]: 0 }
}

function clearSessionProviderKey(provider: Provider) {
  setSessionProviderKeys(provider, [])
}

function getSessionProviderKeyCount(provider: Provider) {
  return sessionProviderKeys[provider].length
}

function nextProviderKeys(providers: Provider[]): ProviderKeys {
  const selected: ProviderKeys = {}
  for (const provider of providers) {
    const keys = sessionProviderKeys[provider]
    if (!keys.length) continue
    const index = providerKeyCursor[provider] % keys.length
    if (provider === 'hindsight') {
      selected.hindsight = [...keys.slice(index), ...keys.slice(0, index)]
    } else {
      selected.groq = keys[index]
    }
    providerKeyCursor[provider] = (index + 1) % keys.length
  }
  return selected
}

async function requestAgent(action: AgentAction, payload: Record<string, unknown> = {}): Promise<AgentResult> {
  const providers: Provider[] = []
  if (!['prediction-chat', 'train', 'retain', 'memory-list'].includes(action)) providers.push('groq')
  if (!['prediction-chat', 'learning-demo-before'].includes(action)) providers.push('hindsight')
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload, providerKeys: nextProviderKeys(providers) }),
  })
  const result = await response.json().catch(() => ({})) as AgentResult
  if (!response.ok) throw new Error(result.error || 'The agent request failed. Try again.')
  return result
}

const navigation: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'post', label: 'Post Analyzer', icon: FileSearch },
  { id: 'comments', label: 'Comment Analyzer', icon: MessageSquareText },
  { id: 'content', label: 'Content Generator', icon: Sparkles },
  { id: 'knowledge', label: 'Audience Knowledge', icon: Brain },
  { id: 'recs', label: 'Recommendations', icon: Lightbulb },
  { id: 'social', label: 'Social Accounts', icon: Share2 },
  { id: 'chat', label: 'Agent Chat', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
]
const sampleTopics = ['AI Automation', 'AI Tools', 'Python', 'Career', 'Productivity']
const sampleTypes = ['Educational', 'Tutorial', 'Case study', 'Tips', 'Promotional']
const sampleComments = [
  'Which tool do you use for this?', 'Love this, more tutorials please!', 'This didn’t really help me understand the topic',
  'How do I get started with AI automation?', 'Great explanation, saved this one', 'Any interview prep content coming?',
  'I’m struggling to find time to learn this', 'More Python for beginners please',
  'Skeptical this actually works as promised', 'Which tool did you use for the email automation step?',
  'Love seeing practical examples like this!', 'Could you share a beginner-friendly guide?',
  'This workflow saved me hours this week', 'What is the best place to start with Python?',
  'Great post, I’m sharing this with my team', 'Can you make a follow-up tutorial?',
  'I tried this and it worked perfectly', 'Which automation platform do you recommend?',
  'The explanation was clear and helpful', 'More real-world case studies please',
  'How do you keep these workflows secure?', 'This is exactly what I needed today',
  'I’m not convinced this is beginner friendly', 'Could you compare these tools?',
  'Saved for later, thank you!', 'What does the setup look like in practice?',
  'Would love a template for this', 'Please share more Python tips',
]
function makeSamplePosts(): Post[] {
  const seeds = [
    ['AI Automation', 'Tutorial', 1460, 102, 188, 321, 18],
    ['AI Tools', 'Educational', 1190, 74, 121, 246, 13],
    ['Python', 'Tips', 980, 58, 102, 188, 9],
    ['Career', 'Case study', 820, 41, 82, 131, 17],
    ['Productivity', 'Educational', 760, 39, 73, 145, 11],
    ['AI Automation', 'Educational', 1720, 126, 233, 390, 19],
    ['AI Tools', 'Tutorial', 1320, 91, 149, 281, 18],
    ['Python', 'Tutorial', 1090, 70, 112, 214, 10],
    ['Career', 'Tips', 790, 42, 69, 127, 15],
    ['Productivity', 'Promotional', 530, 22, 31, 48, 20],
  ] as const
  const platforms = ['Instagram', 'LinkedIn', 'X/Twitter']
  return Array.from({ length: 36 }, (_, index) => {
    const row = seeds[index % seeds.length]
    const multiplier = 1 + Math.floor(index / seeds.length) * 0.035
    return {
      id: `demo-${index}`, date: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
      platform: platforms[index % platforms.length], content: `${row[0]} — a practical guide to getting started`, topic: row[0], type: row[1],
      likes: Math.round(row[2] * multiplier), comments: Math.round(row[3] * multiplier), shares: Math.round(row[4] * multiplier),
      saves: Math.round(row[5] * multiplier), hour: row[6], day: index % 7,
    }
  })
}

function engagement(post: Post) { return post.likes + post.comments * 2 + post.shares * 3 + post.saves * 2 }
function sentiment(text: string): 'positive' | 'neutral' | 'negative' | 'question' {
  const value = text.toLowerCase()
  if (value.includes('?')) return 'question'
  if (['love', 'great', 'helpful', 'saved', 'awesome', 'perfect', 'thank'].some((word) => value.includes(word))) return 'positive'
  if (["didn’t", "didn't", 'struggling', 'skeptical', 'hate', 'confusing', 'not convinced'].some((word) => value.includes(word))) return 'negative'
  return 'neutral'
}
function parseCsvLine(line: string) {
  return line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)?.filter(Boolean).map((cell) => cell.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')) ?? []
}

export default function SeaDashboard() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<string[]>([])
  const [memories, setMemories] = useState<string[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([{ id: 'workspace-ready', message: 'Workspace ready · import history or load demo data', timestamp: new Date().toISOString(), operation: 'WORKSPACE', status: 'success' }])
  const [demoResults, setDemoResults] = useState<DemoResults | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [csv, setCsv] = useState('')
  const [csvStatus, setCsvStatus] = useState('')
  const [chat, setChat] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatMode, setChatMode] = useState<ChatMode>('normal')
  const [connected, setConnected] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [commentAnalysis, setCommentAnalysis] = useState<string[] | null>(null)
  const [commentInsight, setCommentInsight] = useState('')
  const [draft, setDraft] = useState('')
  const [savedDrafts, setSavedDrafts] = useState<string[]>([])
  const [showSaved, setShowSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [pending, setPending] = useState<AgentAction | null>(null)
  const [recommendation, setRecommendation] = useState('')
  const [activeProviderKeys, setActiveProviderKeys] = useState<Record<Provider, boolean>>({ groq: false, hindsight: false })
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    data: hindsightMemoryData,
    error: hindsightMemoryError,
    isLoading: isLoadingHindsightMemories,
    mutate: refreshHindsightMemories,
  } = useSWR<AgentResult, Error>('hindsight-memory-bank', () => requestAgent('memory-list'), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const storedMemories = hindsightMemoryData?.memories ?? []
  const learnedMemories = useMemo(() => [...new Set([...storedMemories, ...memories])], [storedMemories, memories])

  const topics = useMemo(() => {
    const result = new Map<string, { count: number; total: number; likes: number }>()
    posts.forEach((post) => {
      const current = result.get(post.topic) ?? { count: 0, total: 0, likes: 0 }
      current.count += 1; current.total += engagement(post); current.likes += post.likes
      result.set(post.topic, current)
    })
    return [...result.entries()].map(([topic, value]) => ({ topic, count: value.count, total: Math.round(value.total / value.count), rate: +(value.likes / value.count / 100).toFixed(2) })).sort((a, b) => b.total - a.total)
  }, [posts])
  const types = useMemo(() => {
    const result = new Map<string, { count: number; total: number }>()
    posts.forEach((post) => { const current = result.get(post.type) ?? { count: 0, total: 0 }; current.count += 1; current.total += engagement(post); result.set(post.type, current) })
    return [...result.entries()].map(([type, value]) => ({ type, avg: Math.round(value.total / value.count) })).sort((a, b) => b.avg - a.avg)
  }, [posts])
  const positiveRate = comments.length ? Math.round(comments.filter((comment) => sentiment(comment) === 'positive').length / comments.length * 100) : 0
  const bestTopic = topics[0]?.topic ?? 'AI Automation'
  const bestTime = useMemo(() => {
    const windows = [
      { label: 'Morning', start: 5, end: 11 },
      { label: 'Afternoon', start: 11, end: 16 },
      { label: 'Evening', start: 16, end: 21 },
      { label: 'Night', start: 21, end: 5 },
    ]
    const timedPosts = posts.filter((post) => post.hour >= 0 && post.hour < 24)
    if (!timedPosts.length) return '—'
    return windows.map((window) => {
      const matching = timedPosts.filter((post) => window.end > window.start
        ? post.hour >= window.start && post.hour < window.end
        : post.hour >= window.start || post.hour < window.end)
      return { label: window.label, average: matching.length ? matching.reduce((sum, post) => sum + engagement(post), 0) / matching.length : -1 }
    }).sort((left, right) => right.average - left.average)[0]?.label ?? '—'
  }, [posts])

  function log(message: string, status: ActivityEntry['status'] = 'success', evidence?: { details?: string; memoryCount?: number }) {
    const hindsightOperation = message.match(/Hindsight (RETAIN|RECALL|REFLECT)/i)?.[1]
    const operation = hindsightOperation?.toUpperCase() ?? (/Groq LLM/i.test(message) ? 'GROQ' : 'AGENT')
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setActivity((items) => [{
      id,
      message,
      timestamp: new Date().toISOString(),
      operation,
      status,
      ...evidence,
    }, ...items].slice(0, 30))
    return id
  }
  function updateActivity(id: string, message: string, status: ActivityEntry['status'], evidence?: { details?: string; memoryCount?: number }) {
    setActivity((items) => items.map((entry) => entry.id === id ? { ...entry, message, status, ...evidence } : entry))
  }
  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }
  function currentContext() {
    return { posts: posts.slice(0, 50).map((post) => ({ ...post, hour: post.hour >= 0 ? post.hour : null })), comments: comments.slice(0, 30), audience: { topTopics: topics.slice(0, 6), positiveCommentRate: positiveRate, bestPostingWindow: bestTime } }
  }
  async function retainLearning(memory: string, description: string) {
    const activityId = log('Hindsight RETAIN · sending audience learning', 'pending')
    try {
      await requestAgent('retain', { memory })
      await refreshHindsightMemories()
      updateActivity(activityId, `Hindsight RETAIN · ${description} stored in the social-media-agent bank`, 'success', { details: memory.slice(0, 900) })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hindsight could not store this learning.'
      updateActivity(activityId, `Hindsight RETAIN unavailable · ${message}`, 'error', { details: memory.slice(0, 500) })
    }
  }
  function loadDemo() {
    const demoPosts = makeSamplePosts()
    setPosts(demoPosts); setComments(sampleComments); setMemories([])
    log('Loaded demo dataset · storing sample engagement history in Hindsight')
    void retainLearning(`Demo historical social-post records (${demoPosts.length} posts): ${JSON.stringify(demoPosts.map(({ topic, type, hour, likes, comments, shares, saves }) => ({ topic, format: type, hour, likes, comments, shares, saves })))}. Sample audience comments: ${JSON.stringify(sampleComments.slice(0, 20))}. These records are illustrative demo data, not real account metrics.`, 'demo engagement history')
    notify('Demo data loaded · sending learning to Hindsight')
  }
  function importCsv() {
    if (!csv.trim()) { setCsvStatus('Paste CSV data or choose a file first.'); return }
    const lines = csv.trim().split(/\r?\n/).filter(Boolean)
    const headers = parseCsvLine(lines.shift() ?? '').map((value) => value.trim().toLowerCase())
    const required = ['date', 'platform', 'content', 'topic', 'type', 'likes', 'comments', 'shares']
    const missing = required.filter((name) => !headers.includes(name))
    if (missing.length) { setCsvStatus(`Missing required columns: ${missing.join(', ')}`); return }
    const imported: Post[] = lines.map((line, index) => {
      const row = Object.fromEntries(headers.map((header, column) => [header, parseCsvLine(line)[column] ?? '']))
      const date = String(row.date)
      const timestamp = Date.parse(date)
      const day = Number.isNaN(timestamp) ? index % 7 : new Date(timestamp).getDay()
      const importedHour = Number(row.hour)
      const hour = Number.isFinite(importedHour) && importedHour >= 0 && importedHour < 24 && String(row.hour).trim() ? importedHour : date.includes('T') && !Number.isNaN(timestamp) ? new Date(timestamp).getHours() : -1
      return { id: `csv-${Date.now()}-${index}`, date, platform: String(row.platform), content: String(row.content), topic: String(row.topic), type: String(row.type), likes: Number(row.likes) || 0, comments: Number(row.comments) || 0, shares: Number(row.shares) || 0, saves: Number(row.saves) || 0, hour, day }
    })
    if (!imported.length) { setCsvStatus('No valid rows found in the CSV.'); return }
    setPosts((current) => [...imported, ...current]); log(`Imported ${imported.length} posts from CSV`)
    void retainLearning(`Imported historical social post engagement data (${imported.length} rows): ${JSON.stringify(imported.slice(0, 40).map(({ date, platform, content, topic, type, likes, comments, shares, saves, hour }) => ({ date, platform, content: content.slice(0, 500), topic, format: type, likes, comments, shares, saves, hour })))}. Analyze the provided records for audience interests, relative performance by topic and format, posting-time patterns, and notable engagement differences.`, `CSV engagement history (${imported.length} posts)`)
    setCsvStatus(`Successfully imported ${imported.length} posts.`); notify(`Imported ${imported.length} posts`)
    window.setTimeout(() => { setCsvOpen(false); setCsvStatus(''); setCsv('') }, 1000)
  }
  function uploadFile(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCsv(String(reader.result ?? ''))
    reader.readAsText(file)
  }
  async function analyzePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const content = String(form.get('post') ?? '').slice(0, 4_000)
    const topic = String(form.get('topic') || 'General')
    const type = String(form.get('type') || 'Educational')
    const likes = Number(form.get('likes')) || 0
    const postComments = Number(form.get('comments')) || 0
    const shares = Number(form.get('shares')) || 0
    const postData = { content, topic, format: type, platform: String(form.get('platform') || ''), postingTime: String(form.get('time') || ''), likes, comments: postComments, shares }
    setPending('analysis')
    log('Groq LLM · analyzing post with available audience evidence', 'pending')
    try {
      const result = await requestAgent('analysis', {
        question: `Assess this post using current post history and Hindsight memories. Post and supplied performance: ${JSON.stringify(postData)}`,
        context: currentContext(),
      })
      const fields = (result.text ?? '').split('|').map((field) => field.trim())
      if (fields.length !== 5 || fields.some((field) => !field)) throw new Error('The AI response could not be displayed. Please run the analysis again.')
      setMemories(result.memories ?? [])
      setAnalysis(fields.join('|'))
      if (result.hindsightWarning) log(`Hindsight unavailable · ${result.hindsightWarning}`, 'error')
      else log(`Hindsight RECALL · ${result.memories?.length ?? 0} memories retrieved`, 'success', { memoryCount: result.memories?.length ?? 0 })
      log('Groq LLM · analyzed post using available evidence')
      log(`Analyzed post on “${topic}”`)
      if (likes || postComments || shares) void retainLearning(`User-supplied post performance observation: ${JSON.stringify(postData)}. These engagement numbers are user-provided; retain them as historical evidence without inferring a winning or losing pattern from a single post.`, `performance for “${topic}”`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Post analysis failed. Try again.')
    } finally {
      setPending(null)
    }
  }
  async function analyzeComments(lines: string[]) {
    const cleaned = lines.map((line) => line.trim()).filter(Boolean).slice(0, 120)
    if (!cleaned.length) { notify('Add a few comments to analyze first'); return }
    setCommentAnalysis(cleaned); setComments(cleaned); setCommentInsight(''); setPending('comment-analysis')
    log('Groq LLM · analyzing comments with available audience evidence', 'pending')
    try {
      const result = await requestAgent('comment-analysis', {
        question: `Analyze these ${cleaned.length} actual audience comments. Identify recurring interests, questions, concerns, and requested content without inventing patterns.`,
        context: { ...currentContext(), comments: cleaned },
      })
      setMemories(result.memories ?? [])
      setCommentInsight(result.text ?? '')
      if (result.hindsightWarning) log(`Hindsight unavailable · ${result.hindsightWarning}`, 'error')
      else log(`Hindsight RECALL · ${result.memories?.length ?? 0} memories retrieved`)
      log('Groq LLM · analyzed audience comments using available evidence')
      log(`Analyzed ${cleaned.length} audience comments`)
      void retainLearning(`Audience comment sample (${cleaned.length} comments supplied by the workspace user): ${JSON.stringify(cleaned.slice(0, 80))}. These are actual comments; use them as evidence for recurring questions, interests, requested formats, and sentiment patterns.`, `${cleaned.length} audience comments`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Comment analysis failed. Try again.')
    } finally {
      setPending(null)
    }
  }
  async function generateContent(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const form = document.getElementById('generator-form') as HTMLFormElement | null
    if (!form) return
    const values = new FormData(form)
    const topic = String(values.get('topic') || bestTopic)
    const platform = String(values.get('platform') || 'LinkedIn')
    const type = String(values.get('type') || 'Educational')
    const tone = String(values.get('tone') || 'Practical and conversational')
    const audience = String(values.get('audience') || 'curious professionals')
    const goal = String(values.get('goal') || 'Increase engagement')
    const brief = `Create a ${type} ${platform} post about ${topic} for ${audience}. Tone: ${tone}. Goal: ${goal}. Return only the finished post.`
    setPending('content')
    log('Groq LLM · generating content with available audience evidence', 'pending')
    try {
      const result = await requestAgent('content', { question: brief, context: currentContext() })
      setDraft(result.text ?? '')
      setMemories(result.memories ?? [])
      if (result.hindsightWarning) log(`Hindsight unavailable · ${result.hindsightWarning}`, 'error')
      else log(`Hindsight RECALL · ${result.memories?.length ?? 0} memories retrieved`, 'success', { memoryCount: result.memories?.length ?? 0, details: result.memories?.slice(0, 3).join(' · ') || 'No relevant long-term memories were returned.' })
      log('Groq LLM · generated content using available evidence', 'success', { details: result.text })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Content generation failed. Try again.'
      log(`Content generation failed · ${message}`, 'error')
      notify(message)
    } finally {
      setPending(null)
    }
  }
  function saveDraft() { if (!draft) return; setSavedDrafts((items) => [draft, ...items]); notify('Draft saved to your library'); log('Saved generated content') }
  async function sendChat(question = chatInput) {
    const query = question.trim()
    if (!query || pending) return
    const action = chatMode === 'prediction' ? 'prediction-chat' : 'chat'
    setChatInput('')
    setChat((items) => [...items, { role: 'user', text: query }])
    setPending(action)
    const activityId = log(chatMode === 'prediction' ? 'Dataset predictor · estimating engagement from 5,000 synthetic examples' : 'Groq LLM · responding with available audience evidence', 'pending')
    try {
      const result = await requestAgent(action, { question: query, context: currentContext() })
      if (chatMode === 'normal') {
        setMemories(result.memories ?? [])
        if (result.hindsightWarning) log(`Hindsight unavailable · ${result.hindsightWarning}`, 'error')
        else log(`Hindsight RECALL · ${result.memories?.length ?? 0} memories retrieved`, 'success', { memoryCount: result.memories?.length ?? 0, details: result.memories?.slice(0, 3).join(' · ') || 'No relevant long-term memories were returned.' })
        if (result.reflected) log('Hindsight REFLECT · synthesized historical audience experience', 'success', { details: result.reflection || 'Hindsight reflection completed.' })
      }
      updateActivity(activityId, chatMode === 'prediction' ? 'Dataset predictor · returned a cohort-based estimate' : 'Groq LLM · generated a response', 'success', { details: result.text })
      setChat((items) => [...items, { role: 'agent', text: result.text ?? '' }])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The agent request failed. Try again.'
      updateActivity(activityId, `Agent request failed · ${message}`, 'error')
      setChat((items) => [...items, { role: 'agent', text: message }])
    } finally {
      setPending(null)
    }
  }
  async function trainPredictor() {
    if (pending) return
    setPending('train')
    log('Local predictor · summarizing the 5,000 synthetic training examples', 'pending')
    try {
      const result = await requestAgent('train')
      setChat((items) => [...items, { role: 'agent', text: result.text ?? 'Training data is ready.' }])
      log('Local predictor · training summary ready', 'success', { details: result.text })
      if (result.hindsightWarning) log(`Hindsight retention unavailable · ${result.hindsightWarning}`, 'error')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Training data could not be loaded.'
      log(`Predictor training failed · ${message}`, 'error')
      setChat((items) => [...items, { role: 'agent', text: message }])
    } finally {
      setPending(null)
    }
  }
  async function generateRecommendation() {
    if (pending) return
    setPending('recommendation')
    setRecommendation('')
    const activityId = log('Groq LLM · generating a recommendation with available audience evidence', 'pending')
    try {
      const result = await requestAgent('recommendation', { question: 'What should I post next?', context: currentContext() })
      setRecommendation(result.text ?? '')
      setMemories(result.memories ?? [])
      if (result.hindsightWarning) log(`Hindsight unavailable · ${result.hindsightWarning}`, 'error')
      else log(`Hindsight RECALL · ${result.memories?.length ?? 0} memories retrieved`, 'success', { memoryCount: result.memories?.length ?? 0, details: result.memories?.slice(0, 3).join(' · ') || 'No relevant long-term memories were returned.' })
      if (result.reflected) log('Hindsight REFLECT · synthesized historical audience experience', 'success', { details: result.reflection || 'Hindsight reflection completed.' })
      updateActivity(activityId, 'Groq LLM · generated a recommendation using available evidence', 'success', { details: result.text })
      notify(result.hindsightWarning ? 'Recommendation generated; Hindsight memory is unavailable' : 'Recommendation generated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Recommendation generation failed. Try again.'
      updateActivity(activityId, `Groq LLM · recommendation failed · ${message}`, 'error')
      notify(message)
    } finally {
      setPending(null)
    }
  }
  async function runLearningDemo() {
    if (pending) return
    const question = 'What should I post next for the SEA Hindsight demo cohort, and why?'
    const demoPosts = makeSamplePosts()
    const memoryMarker = `SEA-DEMO-${crypto.randomUUID()}`
    setPending('learning-demo-before')
    setDemoResults(null)
    setMemories([])
    let pendingActivityId: string | undefined
    let pendingOperation = 'Groq LLM'
    try {
      pendingActivityId = log('Groq LLM · generating baseline with no Hindsight Recall or sample history', 'pending')
      const before = await requestAgent('learning-demo-before', { question, context: { source: 'No current-session post history or comments supplied.' } })
      updateActivity(pendingActivityId, 'Groq LLM · generated baseline with no Hindsight Recall or sample history', 'success', { details: before.text })
      pendingActivityId = undefined

      const learning = `Memory proof marker: ${memoryMarker}. SEA Hindsight demo cohort: sample audience of early-career developers interested in practical automation. Illustrative sample posts (not real account analytics): ${JSON.stringify(demoPosts.map(({ topic, type, hour, likes, comments, shares, saves }) => ({ topic, format: type, hour, likes, comments, shares, saves })))}. Illustrative audience comments: ${JSON.stringify(sampleComments)}. Treat as historical sample evidence. Derive relative topic, format, posting-time performance, and audience interests from these records. Do not claim these are real account results.`
      pendingOperation = 'Hindsight RETAIN'
      pendingActivityId = log('Hindsight RETAIN · storing sample history and unique proof marker', 'pending')
      await requestAgent('retain', { memory: learning })
      updateActivity(pendingActivityId, 'Hindsight RETAIN · Hindsight accepted the sample history and proof marker', 'success', { details: learning.slice(0, 900) })
      pendingActivityId = undefined

      pendingOperation = 'Hindsight RECALL verification'
      pendingActivityId = log('Hindsight RECALL · verifying the exact memory saved in this run', 'pending')
      const after = await requestAgent('learning-demo-after', { question, memoryMarker })
      if (!after.retainedMemoryVerified || !after.memories?.some((memory) => memory.includes(memoryMarker))) {
        throw new Error('Hindsight Recall did not verify this run’s retained memory. The follow-up is not shown as a successful demo.')
      }
      setMemories(after.memories)
      updateActivity(pendingActivityId, 'Hindsight RECALL · retrieved this run’s uniquely marked memory', 'success', { memoryCount: after.memories.length, details: after.memories.join(' · ') })
      pendingActivityId = undefined
      log('Groq LLM · generated the same-question follow-up using recalled memory only', 'success', { details: after.text })
      setDemoResults({ before: before.text ?? '', after: after.text ?? '', recalled: after.memories, verified: true, memoryMarker })
      notify('Verified memory demo complete · Hindsight Recall changed the evidence available to the agent')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The memory-learning demo could not finish.'
      if (pendingActivityId) updateActivity(pendingActivityId, `${pendingOperation} failed · ${message}`, 'error')
      log(`Memory Learning Demo stopped · ${message}`, 'error')
      notify(message)
    } finally {
      setPending(null)
    }
  }
  function clearData() {
    setPosts([]); setComments([]); setMemories([]); setChat([]); setAnalysis(null); setCommentAnalysis(null); setCommentInsight(''); setDraft(''); setRecommendation(''); setDemoResults(null); log('Workspace session cleared · Hindsight long-term memories retained') ; notify('Workspace session cleared')
  }

  const responseChanged = Boolean(demoResults?.verified && demoResults.before.trim() !== demoResults.after.trim())

  return (
    <div className="sea-app">
      <aside className="sea-sidebar" aria-label="Main navigation">
        <button className="sea-logo" aria-label="SEA dashboard" onClick={() => setPage('dashboard')}>SEA</button>
        <nav className="sea-nav">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`sea-nav-item ${page === id ? 'is-active' : ''}`} aria-label={label} aria-current={page === id ? 'page' : undefined} title={label} onClick={() => setPage(id)}><Icon /></button>
          ))}
        </nav>
        <button className="sea-nav-item sea-lab" aria-label="Demo mode" title="Demo mode" onClick={loadDemo}><FlaskConical /></button>
      </aside>

      <div className="sea-workspace">
        <header className="sea-topbar">
          <button className="brand-switch" onClick={() => notify('Tech Innovators Co. workspace')} aria-label="Current workspace: Tech Innovators Co.">Tech Innovators Co. <ChevronDown /></button>
          <div className="memory-badge"><span className="memory-dot" /><span className="memory-name">HINDSIGHT CLOUD</span><span className="memory-engine"><b>{activity.filter((entry) => entry.operation === 'RECALL' && entry.status === 'success').length}</b> RECALLS</span></div>
          <div className="top-spacer" />
          <button className="button-primary import-top" onClick={() => { setCsvOpen(true); setCsvStatus('') }}><Upload /> <span>Import CSV</span></button>
        </header>

        <main className="sea-main" key={page}>
          {page === 'dashboard' && <Dashboard posts={posts} comments={comments} topics={topics} positiveRate={positiveRate} bestTime={bestTime} demoResults={demoResults} demoRunning={pending === 'learning-demo-before'} onRunLearningDemo={runLearningDemo} onDemo={loadDemo} onNavigate={setPage} />}
          {page === 'post' && <PostAnalyzer analysis={analysis} analysisLoading={pending === 'analysis'} onAnalyze={analyzePost} />}
          {page === 'comments' && <CommentAnalyzer comments={comments} analysis={commentAnalysis} insight={commentInsight} isAnalyzing={pending === 'comment-analysis'} memories={memories} onAnalyze={analyzeComments} />}
          {page === 'content' && <ContentGenerator draft={draft} saved={savedDrafts} showSaved={showSaved} isGenerating={pending === 'content'} memories={memories} onToggleSaved={() => setShowSaved(!showSaved)} onGenerate={generateContent} onSave={saveDraft} onCopy={() => { void navigator.clipboard?.writeText(draft); notify('Draft copied to clipboard') }} />}
          {page === 'knowledge' && <AudienceKnowledge posts={posts} topics={topics} comments={comments} memories={learnedMemories} isLoadingMemories={isLoadingHindsightMemories} memoryError={hindsightMemoryError?.message} />}
          {page === 'recs' && <Recommendations recommendation={recommendation} isGenerating={pending === 'recommendation'} onGenerate={generateRecommendation} />}
          {page === 'social' && <SocialAccounts count={posts.length} connected={connected} setConnected={setConnected} onCsv={() => setCsvOpen(true)} onDemo={loadDemo} />}
          {page === 'chat' && <AgentChat messages={chat} input={chatInput} setInput={setChatInput} mode={chatMode} onModeChange={setChatMode} isSending={pending === 'chat' || pending === 'prediction-chat'} isTraining={pending === 'train'} onSend={sendChat} onTrain={trainPredictor} />}
          {page === 'settings' && <SettingsPage count={posts.length} comments={comments.length} memories={learnedMemories.length} activeProviderKeys={activeProviderKeys} activeProviderKeyCounts={{ groq: getSessionProviderKeyCount('groq'), hindsight: getSessionProviderKeyCount('hindsight') }} onSaveProviderKeys={(provider, keys) => { setSessionProviderKeys(provider, keys); setActiveProviderKeys((current) => ({ ...current, [provider]: keys.length > 0 })); if (provider === 'hindsight') void refreshHindsightMemories(); notify(`${keys.length} ${provider === 'groq' ? 'Groq' : 'Hindsight'} key${keys.length === 1 ? '' : 's'} added to this session rotation`) }} onResetProviderKey={(provider) => { clearSessionProviderKey(provider); setActiveProviderKeys((current) => ({ ...current, [provider]: false })); notify(`Using the deployment ${provider === 'groq' ? 'Groq' : 'Hindsight'} key`) }} onClear={clearData} />}
        </main>
      </div>

      <section className={`activity-dock ${activityOpen ? 'activity-expanded' : ''}`} aria-label="Hindsight Memory Activity">
        <button className="activity-heading" onClick={() => setActivityOpen(!activityOpen)} aria-expanded={activityOpen}>
          <span className="activity-prompt">&gt;_</span><span className="activity-label">HINDSIGHT MEMORY ACTIVITY</span><ArrowRight className="activity-chevron-right" /><span className="activity-latest">{activity[0]?.message ?? 'No activity yet'}</span>{activityOpen ? <ChevronDown /> : <ChevronUp />}
        </button>
        {activityOpen && <div className="activity-panel">
          <section className="activity-audit" aria-labelledby="activity-audit-title">
            <div className="activity-audit-header">
              <div>
                <span className="activity-audit-kicker">CODE CHECK + LIVE MEMORY PROOF</span>
                <h2 id="activity-audit-title">Hindsight submission audit</h2>
                <p>Verified against the running retain → recall → response flow, not a README claim.</p>
              </div>
              <div className={`activity-verdict ${demoResults?.verified ? 'is-ready' : 'needs-proof'}`} aria-live="polite">
                <span>VERDICT</span>
                <strong>{responseChanged ? 'READY' : 'NEEDS FIXES'}</strong>
              </div>
            </div>

            <div className="activity-audit-columns">
              <section>
                <h3>What works</h3>
                <ul>
                  <li>Hindsight RETAIN and RECALL are real API operations; recalled memories are included in the agent&apos;s system prompt.</li>
                  <li>The learning demo asks the same question before and after storing a uniquely marked memory.</li>
                  <li>The follow-up is withheld unless Recall returns this run&apos;s exact marker.</li>
                </ul>
              </section>
              <section>
                <h3>What is missing / at risk</h3>
                <ul>
                  <li>{responseChanged ? 'The verified run uses an illustrative demo cohort; import real audience history before making claims about a specific account.' : demoResults?.verified ? 'Recall returned the marker, but the before/after answers are identical; a visible response improvement is not demonstrated.' : 'A live, verified memory round-trip has not been recorded in this session yet.'}</li>
                  <li>Demo posts and comments are illustrative, not real account metrics. A changed answer still needs human review to confirm it is better and grounded in recalled evidence.</li>
                </ul>
                <p className="activity-fix"><strong>Most important fix:</strong> {responseChanged ? 'replace illustrative examples with imported audience history and review the recalled evidence before submission.' : demoResults?.verified ? 'make the follow-up demonstrably use recalled facts, then rerun with imported audience history.' : 'run the proof with configured provider keys, then verify that Recall changes the same-question response.'}</p>
              </section>
            </div>

            <section className="activity-memory-proof" aria-labelledby="activity-memory-proof-title">
              <div className="activity-proof-heading">
                <h3 id="activity-memory-proof-title">Memory proof</h3>
                {demoResults?.verified && <span className={responseChanged ? 'activity-proof-verified' : 'activity-proof-warning'}>{responseChanged ? 'MARKER + RESPONSE CHANGED' : 'MARKER RETRIEVED · RESPONSE UNCHANGED'}</span>}
              </div>
              {demoResults?.verified ? <>
                <div className="activity-proof-grid">
                  <article><span>BEFORE · NO RECALL</span><p>{demoResults.before}</p></article>
                  <article><span>AFTER · RECALL USED</span><p>{demoResults.after}</p></article>
                </div>
                <p className="activity-proof-marker">Verified marker: <code>{demoResults.memoryMarker}</code></p>
                {demoResults.recalled.length > 0 && <details className="activity-recalled-evidence"><summary>Show recalled evidence ({demoResults.recalled.length})</summary><p>{demoResults.recalled.join(' · ')}</p></details>}
              </> : <p className="activity-proof-empty">No before/after proof is shown until Hindsight returns the exact memory marker. Run the check to record a real retain → later recall → response sequence.</p>}
              <button className="activity-audit-run" onClick={() => { setActivityOpen(true); void runLearningDemo() }} disabled={Boolean(pending)}>
                <Brain />{pending === 'learning-demo-before' ? 'Running verified memory proof…' : demoResults?.verified ? 'Run proof again' : 'Run verified memory proof'}
              </button>
            </section>
          </section>

          <div className="activity-list" aria-label="Hindsight operation log">{activity.map((entry) => <article className={`activity-entry activity-${entry.status}`} key={entry.id}>
            <div className="activity-entry-heading"><span className="activity-operation">{entry.operation}</span><span className="activity-status">{entry.status}</span>{typeof entry.memoryCount === 'number' && <span className="activity-count">{entry.memoryCount} memories</span>}<time dateTime={entry.timestamp} title={new Date(entry.timestamp).toLocaleString()}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div>
            <p>{entry.message}</p>{entry.details && <details><summary>Evidence / operation details</summary><p>{entry.details}</p></details>}
          </article>)}</div>
        </div>}
      </section>

      {csvOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCsvOpen(false) }}>
        <section className="csv-modal" role="dialog" aria-modal="true" aria-labelledby="csv-title">
          <div className="modal-top"><div><div className="eyebrow">IMPORT DATA</div><h2 id="csv-title">Bring your post history</h2></div><button className="icon-button" aria-label="Close import dialog" onClick={() => setCsvOpen(false)}><X /></button></div>
          <p className="muted">Upload a CSV or paste rows. Include date, platform, content, topic, type, likes, comments, and shares.</p>
          <button className="upload-zone" onClick={() => fileRef.current?.click()}><Upload /><strong>Choose a CSV file</strong><span>or paste your data below</span></button>
          <input ref={fileRef} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(event) => uploadFile(event.target.files?.[0])} />
          <label className="field-label" htmlFor="csv-data">CSV data</label><textarea id="csv-data" className="form-control csv-area" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder={'date,platform,content,topic,type,likes,comments,shares\n2026-09-27,Instagram,Python tips,Python,Educational,1200,80,150'} />
          {csvStatus && <p className={`csv-status ${csvStatus.startsWith('Successfully') ? 'success' : ''}`} role="status">{csvStatus}</p>}
          <div className="modal-actions"><button className="button-secondary" onClick={() => setCsvOpen(false)}>Cancel</button><button className="button-primary" onClick={importCsv}><ArrowDownToLine /> Import posts</button></div>
        </section>
      </div>}
      {toast && <div className="sea-toast" role="status"><Check />{toast}</div>}
    </div>
  )
}

function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) { return <div className="page-title-row"><h1>{children}</h1>{action}</div> }
function Eyebrow({ children }: { children: React.ReactNode }) { return <div className="eyebrow">{children}</div> }
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section> }
function EmptyState({ icon: Icon, title, children }: { icon: typeof Bot; title: string; children: React.ReactNode }) { return <div className="empty-state"><Icon /><strong>{title}</strong><p>{children}</p></div> }

function Dashboard({ posts, comments, topics, positiveRate, bestTime, demoResults, demoRunning, onRunLearningDemo, onDemo, onNavigate }: { posts: Post[]; comments: string[]; topics: { topic: string; count: number; total: number; rate: number }[]; positiveRate: number; bestTime: string; demoResults: DemoResults | null; demoRunning: boolean; onRunLearningDemo: () => void; onDemo: () => void; onNavigate: (page: PageId) => void }) {
  const totalEngagement = posts.reduce((sum, post) => sum + post.likes + post.comments + post.shares + post.saves, 0)
  const avgRate = posts.length ? (posts.reduce((sum, post) => sum + post.likes, 0) / posts.length / 100).toFixed(2) : '0.00'
  return <>
    <PageTitle>Dashboard <button className="button-secondary heading-action" onClick={onDemo}><Sparkles /> Load demo data</button></PageTitle>
  <div className="stat-grid">
  <Stat label="TOTAL POSTS" value={posts.length} hint="Historical posts learned" icon={BriefcaseBusiness} />
  <Stat label="AVG ENGAGEMENT" value={`${avgRate}%`} hint="Likes per post" icon={Gauge} />
  <Stat label="TOTAL ENGAGEMENT" value={totalEngagement.toLocaleString()} hint="Likes, comments, shares & saves" icon={ArrowUpRight} />
  <Stat label="AUDIENCE SENTIMENT" value={`${positiveRate}%`} hint={`${comments.length} comments analyzed`} icon={MessageSquareText} />
  </div>
  <Panel className="learning-demo-panel"><div className="panel-heading"><div><Eyebrow>VERIFIED HINDSIGHT FLOW</Eyebrow><h2>Memory Learning Demo</h2><p className="muted">Ask one question without history, retain sample observations, then ask the identical question with no sample data in the prompt. The follow-up is shown only after Recall returns this run&apos;s unique marker.</p></div><button className="button-primary" onClick={onRunLearningDemo} disabled={demoRunning}>{demoRunning ? 'Verifying memory flow…' : 'Run verified demo'}</button></div>
  <div className="learning-demo-grid"><section><Eyebrow>BEFORE · NO RECALL OR HISTORY</Eyebrow><p>{demoResults?.before ?? 'The baseline receives the question only. No sample posts, comments, or Hindsight memories are provided.'}</p></section><section><Eyebrow>AFTER · VERIFIED HINDSIGHT RECALL</Eyebrow>{demoResults?.verified ? <><p>{demoResults.after}</p><small className="demo-proof-status">Recall verified · {demoResults.recalled.length} matching memory result(s) · marker {demoResults.memoryMarker}</small><div className="demo-memory-evidence"><strong>Memory actually recalled</strong><p>{demoResults.recalled.join(' · ').slice(0, 700)}{demoResults.recalled.join(' · ').length > 700 ? '…' : ''}</p></div></> : <p>The follow-up will not be generated or shown unless Hindsight returns this run&apos;s uniquely marked memory.</p>}</section></div></Panel>
  <div className="dashboard-grid">

      <Panel className="performance-panel"><div className="panel-heading"><div><Eyebrow>PERFORMANCE</Eyebrow><h2>Engagement by topic</h2></div><button className="text-action" onClick={() => onNavigate('knowledge')}>View insights <ArrowUpRight /></button></div>
        {topics.length ? <div className="topic-bars">{topics.slice(0, 5).map((topic, index) => <div className="topic-bar-row" key={topic.topic}><div className="topic-bar-label"><span>{topic.topic}</span><small>{topic.count} posts</small><b>{topic.rate.toFixed(2)}%</b></div><div className="meter"><span style={{ width: `${Math.max(10, topic.total / (topics[0]?.total || 1) * 100)}%` }} /></div>{index === 0 && <div className="topic-caption">Your audience saves practical, step-by-step content.</div>}</div>)}</div> : <EmptyState icon={FileSearch} title="No posts yet">Import a CSV to begin learning from your content.</EmptyState>}
      </Panel>
      <Panel className="summary-panel"><div className="panel-heading"><div><Eyebrow>YOUR AUDIENCE</Eyebrow><h2>At a glance</h2></div><span className="live-pill"><span /> HINDSIGHT · social-media-agent</span></div>
        <div className="summary-highlight"><div className="summary-icon"><Lightbulb /></div><div><small>TOP PERFORMING TOPIC</small><strong>{topics[0]?.topic ?? 'Not enough data'}</strong><span>{topics[0] ? `${topics[0].rate.toFixed(2)}% average likes per post` : 'Import post history to unlock insights.'}</span></div></div>
        <div className="summary-row"><span>Best posting window</span><strong>{bestTime}</strong></div><div className="summary-row"><span>Best content format</span><strong>{posts.length ? 'Tutorial' : '—'}</strong></div><div className="summary-row"><span>Audience questions</span><strong>{comments.filter((item) => item.includes('?')).length}</strong></div>
        <button className="button-secondary button-wide" onClick={() => onNavigate('recs')}>See recommendations <ArrowRight /></button>
      </Panel>
      <Panel className="recent-panel"><div className="panel-heading"><div><Eyebrow>RECENT POSTS</Eyebrow><h2>What you’ve been sharing</h2></div><button className="text-action" onClick={() => onNavigate('post')}>Analyze a post <ArrowUpRight /></button></div>
        {posts.slice(0, 4).map((post) => <div className="post-row" key={post.id}><div className="platform-avatar">{post.platform === 'LinkedIn' ? 'in' : post.platform === 'Instagram' ? 'ig' : '𝕏'}</div><div className="post-copy"><strong>{post.content}</strong><span>{post.topic} <i>·</i> {post.platform}</span></div><div className="post-performance"><strong>{post.likes.toLocaleString()}</strong><span>likes</span></div></div>)}
      </Panel>
    </div>
  </>
}
function Stat({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint: string; icon: typeof Bot }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon /></div><strong>{value}</strong><small>{hint}</small></div> }

function PostAnalyzer({ analysis, analysisLoading, onAnalyze }: { analysis: string | null; analysisLoading: boolean; onAnalyze: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const parts = analysis?.split('|')
  return <><PageTitle>Post Analyzer</PageTitle><div className="two-column-layout">
    <Panel><Eyebrow>INPUT</Eyebrow><h2>Post &amp; engagement</h2><form onSubmit={onAnalyze}>
      <label className="field-label" htmlFor="post-content">Post</label><textarea required className="form-control post-textarea" id="post-content" name="post" placeholder="5 Python tips every beginner should know…" />
      <div className="form-grid"><div><label className="field-label" htmlFor="post-platform">Platform</label><select className="form-control" id="post-platform" name="platform"><option>Instagram</option><option>LinkedIn</option><option>X/Twitter</option></select></div><div><label className="field-label" htmlFor="post-type">Content type</label><select className="form-control" id="post-type" name="type">{sampleTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
      <div><label className="field-label" htmlFor="post-topic">Topic</label><input className="form-control" id="post-topic" name="topic" placeholder="Python" /></div><div><label className="field-label" htmlFor="post-time">Posting time</label><input className="form-control" id="post-time" name="time" type="datetime-local" /></div>
      <div><label className="field-label" htmlFor="post-likes">Likes</label><input className="form-control" id="post-likes" name="likes" type="number" min="0" placeholder="1200" /></div><div><label className="field-label" htmlFor="post-comments">Comments</label><input className="form-control" id="post-comments" name="comments" type="number" min="0" placeholder="85" /></div></div>
      <button className="button-primary form-submit" type="submit" disabled={analysisLoading}>{analysisLoading ? 'Checking audience memory…' : <><Sparkles /> Analyze post</>}</button>
    </form></Panel>
    <Panel><Eyebrow>ANALYSIS</Eyebrow><h2>AI assessment</h2>{parts ? <div className="analysis-results"><div className="assessment-score"><div><small>ENGAGEMENT POTENTIAL</small><strong>{parts[3]}</strong></div><Sparkles /></div>{[['HOOK', parts[0]], ['CALL TO ACTION', parts[1]], ['TOPIC FIT', parts[2]]].map(([label, value]) => <div className="assessment-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> : <EmptyState icon={FileSearch} title="No analysis yet">The agent checks hook, clarity, CTA, and audience fit against your post history.</EmptyState>}</Panel>
  </div></>
}

function CommentAnalyzer({ comments, analysis, insight, isAnalyzing, memories, onAnalyze }: { comments: string[]; analysis: string[] | null; insight: string; isAnalyzing: boolean; memories: string[]; onAnalyze: (lines: string[]) => void }) {
  const [tab, setTab] = useState<'Paste' | 'CSV upload' | 'Platform'>('Paste')
  const [commentInput, setCommentInput] = useState(analysis?.join('\n') ?? '')
  const parsed = analysis ?? comments
  const positive = parsed.filter((item) => sentiment(item) === 'positive').length
  const negative = parsed.filter((item) => sentiment(item) === 'negative').length
  const neutral = parsed.length - positive - negative
  const questions = parsed.filter((item) => item.includes('?'))
  const interestTerms = ['automation', 'python', 'tutorial', 'tool', 'career', 'workflow']
  const interests = interestTerms.map((term) => ({ term, count: parsed.filter((item) => item.toLowerCase().includes(term)).length })).filter((item) => item.count).sort((a, b) => b.count - a.count)
  return <><PageTitle>Comment Analyzer</PageTitle><div className="two-column-layout comments-layout">
    <Panel><Eyebrow>INPUT</Eyebrow><h2>Audience comments</h2><div className="segmented-tabs" role="tablist" aria-label="Comment source">{(['Paste', 'CSV upload', 'Platform'] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === 'Paste' ? <><label className="field-label" htmlFor="comment-input">One comment per line</label><textarea className="form-control comments-textarea" id="comment-input" placeholder={'Which tool do you use for this?\nLove this, more tutorials please!'} value={commentInput} onChange={(event) => setCommentInput(event.target.value)} /></> : tab === 'CSV upload' ? <label className="upload-zone comment-upload"><Upload /><strong>Choose a comments CSV</strong><span>CSV files with one comment per row</span><input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then((text) => { const rows = text.split(/\r?\n/).filter(Boolean); const headers = parseCsvLine(rows[0] ?? '').map((value) => value.trim().toLowerCase()); const commentColumn = headers.findIndex((header) => header === 'comment' || header === 'comments'); const lines = rows.slice(1).map((row) => parseCsvLine(row)[commentColumn >= 0 ? commentColumn : 0] ?? '').filter(Boolean); setCommentInput(lines.join('\n')); setTab('Paste') }) }} /></label> : <div className="platform-empty"><CircleHelp /><strong>Connect an account to sync comments</strong><span>Platform access can be configured in Social Accounts.</span></div>}
      <label className="field-label" htmlFor="comment-link">Link to a post <span className="optional">(optional)</span></label><select className="form-control" id="comment-link"><option>Not linked to a post</option></select><button className="button-primary form-submit" onClick={() => onAnalyze(commentInput.split('\n'))} disabled={isAnalyzing}>{isAnalyzing ? 'Checking audience memory…' : <><Sparkles /> Analyze comments</>}</button>
    </Panel>
    <Panel><Eyebrow>INSIGHTS</Eyebrow><h2>Latest analysis</h2>{parsed.length ? <><p className="analysis-meta">{parsed.length} comments <span>·</span> Updated just now</p><Eyebrow>AUDIENCE SENTIMENT</Eyebrow><SentimentBar label="Positive" count={positive} total={parsed.length} color="green" /><SentimentBar label="Neutral" count={neutral} total={parsed.length} color="neutral" /><SentimentBar label="Negative" count={negative} total={parsed.length} color="red" />
      <p className="sentiment-summary">{insight || (isAnalyzing ? 'Analyzing with Groq and Hindsight…' : 'Sentiment counts below use the current session comment sample.')}</p>{!!memories.length && <div className="memory-callout"><Brain /><div><Eyebrow>HINDSIGHT CONTEXT</Eyebrow><span>{memories.slice(0, 3).join(' · ')}</span></div></div>}<div className="interest-grid"><div><Eyebrow>TOP AUDIENCE INTERESTS</Eyebrow>{interests.length ? interests.slice(0, 4).map((item, index) => <div className="rank-row" key={item.term}><span>{index + 1}.&nbsp; {item.term}</span><small>×{item.count}</small></div>) : <p className="muted">No repeat topics found.</p>}</div><div><Eyebrow>RECURRING QUESTIONS</Eyebrow>{questions.length ? questions.slice(0, 4).map((question, index) => <div className="rank-row question-row" key={`${question}-${index}`}><span>{index + 1}.&nbsp; {question}</span></div>) : <p className="muted">No questions in this batch.</p>}</div></div>
    </> : <EmptyState icon={MessageSquareText} title="No analysis yet">Paste comments and analyze to reveal sentiment, interests, and recurring questions.</EmptyState>}</Panel>
  </div></>
}
function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) { const percent = total ? Math.round(count / total * 100) : 0; return <div className="sentiment-row"><span>{label}</span><div className="meter sentiment-meter"><span className={color} style={{ width: `${percent}%` }} /></div><strong>{percent}%</strong></div> }

function ContentGenerator({ draft, saved, showSaved, isGenerating, memories, onToggleSaved, onGenerate, onSave, onCopy }: { draft: string; saved: string[]; showSaved: boolean; isGenerating: boolean; memories: string[]; onToggleSaved: () => void; onGenerate: (event?: React.FormEvent<HTMLFormElement>) => void; onSave: () => void; onCopy: () => void }) {
  return <><PageTitle>Content Generator</PageTitle><div className="segmented-tabs generator-tabs"><button className={!showSaved ? 'selected' : ''} onClick={onToggleSaved}>Generate</button><button className={showSaved ? 'selected' : ''} onClick={onToggleSaved}>Saved content ({saved.length})</button></div><div className="two-column-layout generator-layout">
    <Panel><Eyebrow>BRIEF</Eyebrow><h2>What to create</h2><form id="generator-form" onSubmit={onGenerate}><label className="field-label" htmlFor="gen-topic">Topic</label><input className="form-control" id="gen-topic" name="topic" placeholder="AI tools" defaultValue="AI Automation" />
      <div className="form-grid"><div><label className="field-label" htmlFor="gen-platform">Platform</label><select className="form-control" id="gen-platform" name="platform"><option>LinkedIn</option><option>Instagram</option><option>X/Twitter</option></select></div><div><label className="field-label" htmlFor="gen-type">Content type</label><select className="form-control" id="gen-type" name="type">{sampleTypes.slice(0, 4).map((type) => <option key={type}>{type}</option>)}</select></div><div><label className="field-label" htmlFor="gen-tone">Tone</label><input className="form-control" id="gen-tone" name="tone" placeholder="Professional + conversational" defaultValue="Practical and conversational" /></div><div><label className="field-label" htmlFor="gen-goal">Goal</label><select className="form-control" id="gen-goal" name="goal"><option>Increase engagement</option><option>Drive saves</option><option>Grow followers</option></select></div></div>
      <label className="field-label" htmlFor="gen-audience">Target audience</label><input className="form-control" id="gen-audience" name="audience" placeholder="Early-career developers" defaultValue="early-career developers" /><button className="button-primary form-submit" type="submit" disabled={isGenerating}>{isGenerating ? 'Reading memory and writing…' : <><Sparkles /> Generate draft</>}</button>
    </form></Panel>
    <Panel><Eyebrow>{showSaved ? 'LIBRARY' : 'DRAFT'}</Eyebrow><h2>{showSaved ? 'Saved content' : 'Personalized content'}</h2>{showSaved ? saved.length ? saved.map((item, index) => <div className="saved-draft" key={`${item.slice(0, 30)}-${index}`}><p>{item}</p><button className="text-action" onClick={() => void navigator.clipboard?.writeText(item)}>Copy draft <ArrowUpRight /></button></div>) : <EmptyState icon={Sparkles} title="Nothing saved yet">Save a generated draft and it will be ready here.</EmptyState> : draft ? <><div className="draft-output">{draft}</div><div className="draft-actions"><button className="button-primary" onClick={() => onGenerate()}><Sparkles /> Regenerate</button><button className="button-secondary" onClick={onCopy}>Copy draft</button><button className="button-secondary" onClick={onSave}>Save</button></div><div className="why-note"><Eyebrow>HINDSIGHT AUDIENCE CONTEXT</Eyebrow><p>{memories.length ? memories.slice(0, 3).join(' · ') : 'No relevant Hindsight memories were returned. This draft is based only on the current brief and post history; historical evidence is limited.'}</p></div></> : <EmptyState icon={Sparkles} title="No draft yet">The agent uses your audience memory and best-performing posts before writing.</EmptyState>}</Panel>
  </div></>
}

function AudienceKnowledge({ posts, topics, comments, memories, isLoadingMemories, memoryError }: { posts: Post[]; topics: { topic: string; count: number; total: number; rate: number }[]; comments: string[]; memories: string[]; isLoadingMemories: boolean; memoryError?: string }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const windows = [{ label: 'MORNING', hours: '05–12h', start: 5, end: 12 }, { label: 'AFTERNOON', hours: '12–17h', start: 12, end: 17 }, { label: 'EVENING', hours: '17–22h', start: 17, end: 22 }, { label: 'NIGHT', hours: '22–05h', start: 22, end: 29 }]
  const heat = days.map((_, day) => windows.map((window) => posts.filter((post) => post.day === day && (window.end > 24 ? post.hour >= window.start || post.hour < window.end - 24 : post.hour >= window.start && post.hour < window.end)).length))
  const maxHeat = Math.max(1, ...heat.flat())
  const memoryStatus = isLoadingMemories && !memories.length ? 'SYNCING' : memoryError && !memories.length ? 'UNAVAILABLE' : memories.length ? 'PERSISTED' : '—'
  const memoryHint = isLoadingMemories && !memories.length ? 'Loading saved learnings from Hindsight' : memoryError && !memories.length ? 'Could not load Hindsight memories' : memories.length ? 'Saved in the Hindsight memory bank' : 'No learned facts in Hindsight yet'

  return (
    <>
      <PageTitle>Audience Knowledge</PageTitle>
      <div className="stat-grid knowledge-stats">
        <Stat label="MEMORIES" value={memories.length} hint="Saved in Hindsight" icon={Brain} />
        <Stat label="POSTS LEARNED" value={posts.length} hint={`${posts.filter((post) => post.hour >= 0).length} with posting time`} icon={BriefcaseBusiness} />
        <Stat label="COMMENTS" value={comments.length} hint="Classified by the agent" icon={MessageSquareText} />
        <Stat label="MEMORY STATUS" value={memoryStatus} hint={memoryHint} icon={ArrowUpRight} />
      </div>
      <div className="two-column-layout knowledge-layout">
        <Panel>
          <div className="panel-heading"><div><Eyebrow>CONTENT PERFORMANCE</Eyebrow><h2>High-performing topics</h2></div></div>
          {topics.length ? topics.map((topic, index) => (
            <div className="knowledge-topic" key={topic.topic}>
              <div className="topic-bar-label"><span>{topic.topic} <small>· {topic.count} posts</small></span><b>{topic.rate.toFixed(2)}% <i className={index ? 'down' : 'up'}>{index ? '−' : '+'}{Math.max(2, 64 - index * 17)}%</i></b></div>
              <div className="meter"><span style={{ width: `${topic.rate / (topics[0]?.rate || 1) * 100}%` }} /></div>
            </div>
          )) : <EmptyState icon={Brain} title="No audience data">Import posts to build your audience profile.</EmptyState>}
          <div className="memory-callout">
            <Brain />
            <div>
              <Eyebrow>WHAT THE AGENT REMEMBERS</Eyebrow>
              {memoryError && !memories.length ? <span>{memoryError}</span> : isLoadingMemories && !memories.length ? <span>Loading saved learnings from Hindsight…</span> : memories.length ? (
                <ul className="learned-memory-list">{memories.map((memory) => <li key={memory}>{memory}</li>)}</ul>
              ) : <span>No learned audience insights are stored yet. Import history or analyze comments to teach Hindsight.</span>}
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="panel-heading"><div><Eyebrow>WHEN TO POST</Eyebrow><h2>Best posting times</h2></div></div>
          <div className="heatmap">
            <div className="heat-spacer" />
            {windows.map((window) => <div className="heat-label" key={window.label}>{window.label}<span>{window.hours}</span></div>)}
            {days.map((day, index) => <div className="heat-row" key={day}><span>{day}</span>{heat[index].map((count, windowIndex) => <div className="heat-cell" key={`${day}-${windowIndex}`} style={{ backgroundColor: count ? `rgba(0, 229, 216, ${0.2 + count / maxHeat * 0.66})` : 'var(--surface-2)' }} title={`${day}: ${count} posts`}>{count || ''}</div>)}</div>)}
          </div>
          <div className="heat-legend"><span>Fewer posts</span><i /><i /><i /><i /><span>More posts</span></div>
        </Panel>
      </div>
    </>
  )
}


function Recommendations({ recommendation, isGenerating, onGenerate }: { recommendation: string; isGenerating: boolean; onGenerate: () => void }) {
  return <><PageTitle>Recommendations <button className="button-primary heading-action" onClick={onGenerate} disabled={isGenerating}>{isGenerating ? 'Checking Hindsight…' : <><Sparkles /> Generate recommendation</>}</button></PageTitle>
    {recommendation ? <Panel className="recommendation-card"><Eyebrow>HINDSIGHT + GROQ · LIVE RESULT</Eyebrow><div className="draft-output recommendation-output">{recommendation}</div></Panel> : <Panel><EmptyState icon={Lightbulb} title="No recommendation generated">Run the agent to retrieve Hindsight memories and create a recommendation from your actual audience history.</EmptyState></Panel>}
  </>
}

function SocialAccounts({ count, connected, setConnected, onCsv, onDemo }: { count: number; connected: string[]; setConnected: React.Dispatch<React.SetStateAction<string[]>>; onCsv: () => void; onDemo: () => void }) {
  const platforms = ['Instagram', 'Facebook', 'LinkedIn', 'X / Twitter']
  return <><PageTitle>Social Accounts</PageTitle><div className="social-grid">{platforms.map((name) => { const isConnected = connected.includes(name); return <Panel className="social-card" key={name}><div className="social-top"><h2>{name}</h2><span className={`connection-state ${isConnected ? 'connected' : ''}`}>{isConnected ? 'CONNECTED · DEMO' : 'NOT CONNECTED'}</span></div><p>{isConnected ? 'Demo connection enabled for this workspace. Platform API access is not configured.' : 'Connect your account to sync posts and audience comments. OAuth access can be configured when platform approval is available.'}</p><button className="button-secondary button-wide" onClick={() => setConnected((items) => isConnected ? items.filter((item) => item !== name) : [...items, name])}>{isConnected ? 'Disconnect demo' : 'Connect account'}</button></Panel> })}</div>
    <div className="three-column-layout"><Panel className="source-card"><Eyebrow>DATA SOURCES</Eyebrow><h2>Your workspace</h2><p>{count} posts available for analysis.</p><span className="connection-state connected">{count ? 'READY' : 'EMPTY'}</span></Panel><Panel className="source-card"><Eyebrow>CSV UPLOAD</Eyebrow><h2>Import history</h2><p>Bring your post history and engagement metrics into the workspace.</p><button className="button-secondary" onClick={onCsv}><Upload /> Import CSV</button></Panel><Panel className="source-card"><Eyebrow>DEMO DATA</Eyebrow><h2>Explore the workspace</h2><p>Load example posts and comments to explore the insight tools.</p><button className="button-secondary" onClick={onDemo}><Sparkles /> Load demo data</button></Panel></div>
  </>
}

function AgentChat({ messages, input, setInput, mode, onModeChange, isSending, isTraining, onSend, onTrain }: { messages: Message[]; input: string; setInput: (value: string) => void; mode: ChatMode; onModeChange: (mode: ChatMode) => void; isSending: boolean; isTraining: boolean; onSend: (query?: string) => void; onTrain: () => void }) {
  const suggestions = mode === 'prediction'
    ? ['Estimate engagement for Instagram AI content', 'Predict reach for LinkedIn educational posts', 'Compare the strongest topics and formats']
    : ['What should I post next?', 'What questions does my audience ask most?', 'Why do my best posts perform well?', 'Write a LinkedIn post about AI automation']
  const busy = isSending || isTraining
  return <><PageTitle>Agent Chat</PageTitle><section className="chat-card"><div className="chat-intro"><div className="chat-bot-icon"><Bot /></div><div><h2>{mode === 'prediction' ? 'Estimate post engagement.' : 'Ask your audience anything.'}</h2><p>{mode === 'prediction' ? 'Filter 5,000 synthetic CSV-derived examples for transparent per-post estimates.' : 'Normal chat uses Groq with optional Hindsight memory for open-ended social strategy.'}</p></div></div>
    <div className="chat-mode-row" role="group" aria-label="Choose chat mode"><button type="button" className={`chat-mode-button ${mode === 'normal' ? 'active' : ''}`} aria-pressed={mode === 'normal'} onClick={() => onModeChange('normal')}>Normal chat</button><button type="button" className={`chat-mode-button ${mode === 'prediction' ? 'active' : ''}`} aria-pressed={mode === 'prediction'} onClick={() => onModeChange('prediction')}>Prediction chat</button><span className="chat-mode-spacer" /><button type="button" className="train-button" onClick={onTrain} disabled={busy}>{isTraining ? 'Training…' : 'Train on 5,000 examples'}</button></div>
    <div className="training-note">Training set: reproducible synthetic variations based on the supplied CSV; this computes cohort statistics and does not fine-tune model weights. <a href="/social-media-engagement-training-5000.csv" download>Download dataset</a></div>
    {!messages.length && <div className="suggestion-grid">{suggestions.map((suggestion) => <button className="suggestion-chip" key={suggestion} disabled={busy} onClick={() => onSend(suggestion)}>{suggestion}<ArrowUpRight /></button>)}</div>}
    {!!messages.length && <div className="chat-transcript" aria-live="polite">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><div className="chat-message-icon">{message.role === 'agent' ? <Bot /> : 'Y'}</div><p>{message.text}</p></div>)}{busy && <p className="chat-status" role="status">{isTraining ? 'Analyzing the synthetic training set…' : mode === 'prediction' ? 'Filtering training examples and calculating cohort averages…' : 'Recalling available memory and asking Groq…'}</p>}</div>}
    <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); onSend() }}><label className="visually-hidden" htmlFor="agent-prompt">{mode === 'prediction' ? 'Describe a post to estimate' : 'Ask the agent a question'}</label><input id="agent-prompt" value={input} onChange={(event) => setInput(event.target.value)} placeholder={mode === 'prediction' ? 'Platform, topic, format, or posting time…' : 'Ask about your audience, content, or next post…'} disabled={busy} /><button className="button-primary send-button" type="submit" aria-label="Send message" disabled={busy || !input.trim()}><Send /></button></form>
  </section></>
}

function SettingsPage({ count, comments, memories, activeProviderKeys, activeProviderKeyCounts, onSaveProviderKeys, onResetProviderKey, onClear }: { count: number; comments: number; memories: number; activeProviderKeys: Record<Provider, boolean>; activeProviderKeyCounts: Record<Provider, number>; onSaveProviderKeys: (provider: Provider, keys: string[]) => void; onResetProviderKey: (provider: Provider) => void; onClear: () => void }) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [groqKeys, setGroqKeys] = useState(['', '', '', '', ''])
  const [hindsightKeys, setHindsightKeys] = useState(['', '', '', '', ''])
  function saveKeys(event: React.FormEvent<HTMLFormElement>, provider: Provider, values: string[], clear: (values: string[]) => void) {
    event.preventDefault()
    const keys = [...new Set(values.map((key) => key.trim()).filter(Boolean))]
    if (!keys.length) return
    onSaveProviderKeys(provider, keys)
    clear(['', '', ''])
  }
  function updateKey(values: string[], setValues: (values: string[]) => void, index: number, value: string) {
    setValues(values.map((key, keyIndex) => keyIndex === index ? value : key))
  }
  function addKeySlot(values: string[], setValues: (values: string[]) => void) {
    if (values.length < 10) setValues([...values, ''])
  }
  function removeKeySlot(values: string[], setValues: (values: string[]) => void, index: number) {
    setValues(values.length > 1 ? values.filter((_, keyIndex) => keyIndex !== index) : [''])
  }
  const providerForm = (provider: Provider, values: string[], setValues: (values: string[]) => void) => {
    const isGroq = provider === 'groq'
    const providerName = isGroq ? 'Groq' : 'Hindsight'
    const inputPrefix = isGroq ? 'groq' : 'hindsight'
    const isActive = activeProviderKeys[provider]
    return <form className="credential-card" onSubmit={(event) => saveKeys(event, provider, values, setValues)} key={provider}>
      <div className="credential-heading"><div><Eyebrow>{isGroq ? 'LANGUAGE MODEL' : 'LONG-TERM MEMORY'}</Eyebrow><h3>{providerName}</h3></div><span className={`credential-status ${isActive ? 'is-custom' : ''}`}>{isActive ? `Rotating ${activeProviderKeyCounts[provider]} session keys` : 'Deployment key'}</span></div>
      <div className="credential-key-list">{values.map((value, index) => <div className="credential-key-row" key={`${provider}-${index}`}><label className="field-label" htmlFor={`${inputPrefix}-api-key-${index}`}>{providerName} API key {index + 1}</label><div className="credential-key-input"><input id={`${inputPrefix}-api-key-${index}`} className="form-control" type="password" autoComplete="new-password" spellCheck={false} maxLength={512} value={value} onChange={(event) => updateKey(values, setValues, index, event.target.value)} placeholder={`Paste ${providerName} API key ${index + 1}`} />{values.length > 1 && <button className="key-slot-remove" type="button" aria-label={`Remove ${providerName} API key ${index + 1}`} onClick={() => removeKeySlot(values, setValues, index)}><X /></button>}</div></div>)}</div>
      <div className="credential-actions"><button className="button-secondary" type="button" onClick={() => addKeySlot(values, setValues)} disabled={values.length >= 10}>Add another key</button><button className="button-primary" type="submit" disabled={!values.some((key) => key.trim())}>Save {providerName} rotation</button>{isActive && <button className="button-secondary" type="button" onClick={() => onResetProviderKey(provider)}>Use deployment key</button>}</div>
    </form>
  }
  return <><PageTitle>Settings</PageTitle><div className="settings-grid"><Panel className="provider-settings-panel"><Eyebrow>API CONNECTIONS</Eyebrow><h2>Provider API keys</h2><p className="muted">Add multiple Groq and Hindsight keys. Hindsight tries every saved key in round-robin order for each task, then uses the deployment key as a fallback. Keys stay in this tab&apos;s memory only and are never saved to browser storage.</p><div className="credential-list">
    {providerForm('groq', groqKeys, setGroqKeys)}
    {providerForm('hindsight', hindsightKeys, setHindsightKeys)}
  </div><p className="credential-notice">Keys are sent to this app&apos;s server only when making provider requests. Hindsight tries saved keys sequentially on credit, quota, or authentication errors, then falls back to the deployment key. Rotation is session-only and resets when this tab reloads or closes.</p></Panel><Panel><Eyebrow>WORKSPACE</Eyebrow><h2>Tech Innovators Co.</h2><p className="muted">Your structured posts and comments live in this browser session. Hindsight Cloud stores long-term audience memories when you import or analyze data.</p><div className="settings-metrics"><span>Posts<strong>{count}</strong></span><span>Comments<strong>{comments}</strong></span><span>Memories<strong>{memories}</strong></span></div></Panel><Panel><Eyebrow>MEMORY &amp; DATA</Eyebrow><h2>Manage workspace data</h2><p className="muted">Clear posts, comments, and recalled results from this session. Hindsight Cloud memories are long-term and are not deleted here.</p>{confirmClear ? <div className="confirm-row"><span>Clear all workspace data? This cannot be undone.</span><button className="button-danger" onClick={onClear}>Confirm clear</button><button className="button-secondary" onClick={() => setConfirmClear(false)}>Cancel</button></div> : <button className="button-danger" onClick={() => setConfirmClear(true)}><X /> Clear all data</button>}</Panel></div></>
}
