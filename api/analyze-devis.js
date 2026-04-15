import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, buildExtractionPrompt } from './_prompt.js'
import { listAvailablePostes } from './_postesLoader.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rate limit naïf en mémoire : 10 req / 60s par IP
const rateLimit = new Map()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 10

function checkRateLimit(ip) {
  const now = Date.now()
  const entries = rateLimit.get(ip) || []
  const recent = entries.filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) return false
  recent.push(now)
  rateLimit.set(ip, recent)
  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Trop de requêtes. Réessaie dans une minute.' })
    return
  }

  const { fullText } = req.body || {}
  if (typeof fullText !== 'string' || fullText.length < 50) {
    res.status(400).json({ error: 'Texte de devis trop court ou manquant.' })
    return
  }
  if (fullText.length > 200_000) {
    res.status(413).json({ error: 'Devis trop volumineux.' })
    return
  }

  const availablePostes = listAvailablePostes()
  const userPrompt = buildExtractionPrompt(fullText, availablePostes)

  try {
    const response = await callClaudeWithRetry(userPrompt)
    const json = parseClaudeJson(response)
    res.status(200).json(json)
  } catch (err) {
    console.error('analyze-devis error:', err)
    res.status(502).json({
      error: 'Analyse impossible. Réessaie dans quelques instants.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }
}

async function callClaudeWithRetry(userPrompt, attempt = 1) {
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })
    return msg
  } catch (err) {
    if (attempt >= 3) throw err
    await new Promise(r => setTimeout(r, 1000 * attempt))
    return callClaudeWithRetry(userPrompt, attempt + 1)
  }
}

function parseClaudeJson(response) {
  const block = response.content?.find(b => b.type === 'text')
  if (!block) throw new Error('Réponse Claude sans texte')
  let text = block.text.trim()
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`JSON Claude invalide: ${e.message}`)
  }
}
