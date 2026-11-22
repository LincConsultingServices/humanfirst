// Server-only LLM access. API keys and prompts never reach the browser.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod/v4'

const MODEL = process.env.FA_MODEL || 'claude-opus-5-5'
// The 50-second survey's single request can use a different (faster) model if you set FA_FAST_MODEL.
const FAST_MODEL = process.env.FA_FAST_MODEL || MODEL
// Server-side refusal fallback: if the model declines, the API re-runs the request
// on a fallback model inside the same call.
const BETAS = ['server-side-fallback-2026-07-01']

export const aiEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)

let _client: Anthropic | null = null
const client = () => (_client ??= new Anthropic())

export class AIError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.status = status
  }
}

function toAIError(e: unknown): AIError {
  if (e instanceof AIError) return e
  if (e instanceof Anthropic.RateLimitError) return new AIError('The AI is busy right now. Please try again in a moment.', 429)
  if (e instanceof Anthropic.AuthenticationError) return new AIError('AI is not configured correctly (authentication failed).', 500)
  if (e instanceof Anthropic.BadRequestError) {
    console.error('[fa] bad request', e.message)
    return new AIError('The AI request was rejected. Please try again.', 500)
  }
  if (e instanceof Anthropic.APIError) return new AIError('The AI service had a problem. Please try again.', 502)
  console.error('[fa] ai error', e)
  return new AIError('Something went wrong talking to the AI. Please try again.', 500)
}

export type Turn = { role: 'user' | 'assistant'; content: string }

/** One structured call: returns data validated against the Zod schema. */
export async function generate<S extends z.ZodType>(opts: {
  system: string
  prompt: string
  schema: S
  history?: Turn[]
  effort?: 'low' | 'medium' | 'high'
  fast?: boolean
}): Promise<z.infer<S>> {
  try {
    const res = await client().beta.messages.parse({
      model: opts.fast ? FAST_MODEL : MODEL,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: 'default',
      output_config: { effort: opts.effort ?? 'medium', format: betaZodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [...(opts.history ?? []), { role: 'user', content: opts.prompt }],
    })
    if (res.stop_reason === 'refusal') throw new AIError('The AI could not help with that request. Try rephrasing your answer.', 422)
    if (res.stop_reason === 'max_tokens') throw new AIError('The response was cut off. Please try again.', 502)
    if (res.parsed_output == null) throw new AIError('The AI response could not be read. Please try again.', 502)
    return res.parsed_output as z.infer<S>
  } catch (e) {
    throw toAIError(e)
  }
}

/** Plain conversational reply (validator advisor chat). */
export async function chat(system: string, history: Turn[]): Promise<string> {
  try {
    const res = await client().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system,
      messages: history,
    })
    if (res.stop_reason === 'refusal') throw new AIError('The advisor could not help with that request.', 422)
    return res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim()
  } catch (e) {
    throw toAIError(e)
  }
}

/** Live web research with the Claude web search tool. Returns notes + the source URLs it read. */
export async function research(system: string, query: string): Promise<{ notes: string; sources: { title: string; url: string }[] }> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: query }]
  const sources = new Map<string, { title: string; url: string }>()
  let notes = ''
  try {
    for (let i = 0; i < 4; i++) {
      const res = await client().beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: BETAS,
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
        messages,
      })
      for (const b of res.content) {
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
          for (const r of b.content) if (r.type === 'web_search_result') sources.set(r.url, { title: r.title, url: r.url })
        }
        if (b.type === 'text') notes += b.text
      }
      if (res.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: res.content })
        continue
      }
      break
    }
  } catch (e) {
    // Research is best-effort: the report says clearly when it could not be done.
    console.error('[fa] research failed', e)
    return { notes: '', sources: [] }
  }
  return { notes: notes.trim(), sources: [...sources.values()].slice(0, 20) }
}
