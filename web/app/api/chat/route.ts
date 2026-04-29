import { NextRequest } from 'next/server'
import { streamCompletion, validateConfig } from '@/lib/ai'
import { getSkill } from '@/lib/skills'
import type { Message } from '@/lib/types'

export const runtime = 'nodejs'

// Increase body size limit for file attachments
export const maxDuration = 120

export type ApiAttachment = {
  name: string
  kind: 'image' | 'text'
  mimeType: string
  content: string
}

export async function POST(req: NextRequest) {
  let body: {
    skill: string
    messages: Message[]
    model?: string
    attachments?: ApiAttachment[]
  }

  try {
    body = await req.json()
  } catch (err) {
    console.error('[chat] Failed to parse request body:', err)
    return new Response('Request body too large or malformed', { status: 413 })
  }

  const { skill: skillId, messages, model, attachments } = body

  const skill = getSkill(skillId)
  if (!skill) {
    return new Response('Unknown skill', { status: 400 })
  }

  const configError = validateConfig()
  if (configError) {
    return new Response(configError, { status: 500 })
  }

  let systemPrompt: string
  try {
    const { buildSystemPrompt } = await import('@/lib/ai')
    systemPrompt = buildSystemPrompt(skill)
    void systemPrompt
  } catch (err) {
    console.error('Failed to load skill files:', err)
    return new Response('Failed to load skill resources', { status: 500 })
  }

  // Sanitise: ensure no message has empty content (APIs reject empty strings)
  const sanitisedMessages = messages.map((m) => ({
    ...m,
    content: m.content || (m.role === 'user' ? '(no text provided)' : '...'),
  }))

  // Stream the response, but catch provider errors and return them as readable text
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamCompletion(skill, sanitisedMessages, model, attachments)) {
          controller.enqueue(new TextEncoder().encode(chunk))
        }
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('AI provider error:', message)
        // If nothing has been sent yet, the client will see this as the response body
        controller.enqueue(new TextEncoder().encode(`\n\n⚠️ Error from AI provider: ${message}`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
