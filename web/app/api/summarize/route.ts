import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { Message } from '@/lib/types'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You generate short titles and summaries for chat conversations.

Given the opening exchange, respond with JSON only — no markdown, no explanation:
{"title": "...", "summary": "..."}

Rules:
- title: max 6 words, no punctuation at the end, sentence case
- summary: max 20 words, one sentence describing what the user is asking about
- Be specific — prefer concrete nouns over vague descriptions
- Do not wrap in code fences`

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: Message[] }

  const apiKey = process.env.AI_API_KEY ?? ''
  const baseUrl = process.env.AI_BASE_URL
  // Use the configured model, or fall back to a sensible default
  const model = process.env.AI_MODEL ?? 'gpt-4o-mini'

  if (!apiKey || !baseUrl) {
    return NextResponse.json({ title: null, summary: null })
  }

  // Only send the first few messages to keep it cheap and fast
  const trimmed = messages.slice(0, 4).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 500),
  }))

  try {
    const client = new OpenAI({ apiKey, baseURL: baseUrl })

    const response = await client.chat.completions.create({
      model,
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...trimmed,
        { role: 'user', content: 'Generate a title and summary for this conversation.' },
      ],
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? ''

    // Parse JSON from the response, tolerating code fences
    const jsonStr = raw.replace(/^```json?\s*/, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(jsonStr) as { title?: string; summary?: string }

    return NextResponse.json({
      title: parsed.title?.slice(0, 50) ?? null,
      summary: parsed.summary?.slice(0, 120) ?? null,
    })
  } catch (err) {
    console.error('[summarize] Error:', err)
    return NextResponse.json({ title: null, summary: null })
  }
}
