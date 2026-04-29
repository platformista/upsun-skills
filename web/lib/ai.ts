/**
 * Provider-agnostic AI streaming layer.
 *
 * Configure via environment variables:
 *
 *   AI_PROVIDER   'anthropic' | 'openai'   (default: 'anthropic')
 *   AI_API_KEY    API key for the provider
 *   AI_BASE_URL   Optional base URL override — use this for proxies, LiteLLM,
 *                 Ollama, Azure OpenAI, or any OpenAI-compatible endpoint
 *   AI_MODEL      Model ID (default: see DEFAULT_MODELS below)
 *   AI_MAX_TOKENS Max tokens per response (default: 8192)
 *
 * PDF knowledge files (USAP skill) only work with the 'anthropic' provider.
 * With 'openai', the PDF content is skipped and a warning is logged.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { SkillConfig, Message } from './types'
import { readSkillPrompt, readKnowledgeFiles, readPdfAsBase64 } from './skills'

export type ProviderType = 'anthropic' | 'openai'

const DEFAULT_MODELS: Record<ProviderType, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
}

function getConfig() {
  const provider = (process.env.AI_PROVIDER ?? 'anthropic') as ProviderType
  const apiKey = process.env.AI_API_KEY ?? ''
  const baseUrl = process.env.AI_BASE_URL
  const model = process.env.AI_MODEL ?? DEFAULT_MODELS[provider]
  const maxTokens = parseInt(process.env.AI_MAX_TOKENS ?? '8192', 10)
  return { provider, apiKey, baseUrl, model, maxTokens }
}

export function validateConfig(): string | null {
  const { apiKey } = getConfig()
  if (!apiKey) return 'AI_API_KEY is not configured'
  return null
}

// --- System prompt builder (provider-independent) ---

export function buildSystemPrompt(skill: SkillConfig): string {
  const prompt = readSkillPrompt(skill)
  const knowledge = readKnowledgeFiles(skill)

  if (knowledge.length === 0) return prompt

  const knowledgeSection = knowledge
    .map(({ name, content }) => `--- FILE: ${name} ---\n${content}`)
    .join('\n\n')

  return `${prompt}\n\n---\n## Knowledge Files\n\n${knowledgeSection}`
}

// --- Streaming: returns an async generator of text chunks ---

export type ApiAttachment = {
  name: string
  kind: 'image' | 'text'
  mimeType: string
  content: string
}

export async function* streamCompletion(
  skill: SkillConfig,
  messages: Message[],
  modelOverride?: string,
  attachments?: ApiAttachment[]
): AsyncGenerator<string> {
  const { provider, apiKey, baseUrl, model: defaultModel, maxTokens } = getConfig()
  const model = modelOverride ?? defaultModel
  const systemPrompt = buildSystemPrompt(skill)

  // If a model override is provided and we have a base URL (proxy),
  // always use the OpenAI-compatible path — the proxy handles routing.
  const useOpenAI = (modelOverride && baseUrl) || provider === 'openai'

  if (useOpenAI) {
    yield* streamOpenAI({ skill, messages, systemPrompt, apiKey, baseUrl, model, maxTokens, attachments })
  } else {
    yield* streamAnthropic({ skill, messages, systemPrompt, apiKey, baseUrl, model, maxTokens })
  }
}

// --- Anthropic ---

async function* streamAnthropic({
  skill,
  messages,
  systemPrompt,
  apiKey,
  baseUrl,
  model,
  maxTokens,
}: {
  skill: SkillConfig
  messages: Message[]
  systemPrompt: string
  apiKey: string
  baseUrl?: string
  model: string
  maxTokens: number
}): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) })

  const anthropicMessages = buildAnthropicMessages(skill, messages)

  const response = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: anthropicMessages,
  })

  for await (const chunk of response) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text
    }
  }
}

function buildAnthropicMessages(
  skill: SkillConfig,
  messages: Message[]
): Anthropic.Messages.MessageParam[] {
  if (!skill.pdfFile) {
    return messages.map((m) => ({ role: m.role, content: m.content }))
  }

  const pdfBase64 = readPdfAsBase64(skill)
  if (!pdfBase64) {
    return messages.map((m) => ({ role: m.role, content: m.content }))
  }

  return messages.map((m, i) => {
    if (m.role === 'user' && i === 0) {
      return {
        role: 'user' as const,
        content: [
          {
            type: 'document' as const,
            source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: pdfBase64 },
          } as Anthropic.Messages.DocumentBlockParam,
          { type: 'text' as const, text: m.content },
        ],
      }
    }
    return { role: m.role, content: m.content }
  })
}

// --- OpenAI-compatible ---

function buildOpenAIMessages(
  messages: Message[],
  systemPrompt: string,
  attachments?: ApiAttachment[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const result: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]

    // Attachments are associated with the last user message
    const isLastUser = m.role === 'user' && i === messages.length - 1 && attachments?.length
    if (!isLastUser) {
      // Guard against empty content — APIs reject empty user/assistant messages
      const content = m.content || (m.role === 'user' ? '(no text)' : '...')
      result.push({ role: m.role, content })
      continue
    }

    // Split attachments into images and text files
    const imageAtts = attachments.filter((a) => a.kind === 'image')
    const textAtts = attachments.filter((a) => a.kind === 'text')

    // Build the text prefix from text-file attachments
    const textPrefix = textAtts
      .map((att) => `--- Attached file: ${att.name} ---\n${att.content}\n--- End of ${att.name} ---`)
      .join('\n\n')

    const userText = [textPrefix, m.content || '(see attached files)']
      .filter(Boolean)
      .join('\n\n')

    if (imageAtts.length > 0) {
      // Multimodal: use content array only when images are present
      const parts: OpenAI.Chat.ChatCompletionContentPart[] = []

      for (const att of imageAtts) {
        const base64Match = att.content.match(/^data:([^;]+);base64,(.+)$/)
        if (base64Match) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: att.content,
              detail: 'auto',
            },
          })
        }
      }

      parts.push({ type: 'text', text: userText })
      result.push({ role: 'user', content: parts })
    } else {
      // Text-only attachments: plain string content (no multimodal array)
      result.push({ role: 'user', content: userText })
    }
  }

  return result
}

async function* streamOpenAI({
  skill,
  messages,
  systemPrompt,
  apiKey,
  baseUrl,
  model,
  maxTokens,
  attachments,
}: {
  skill: SkillConfig
  messages: Message[]
  systemPrompt: string
  apiKey: string
  baseUrl?: string
  model: string
  maxTokens: number
  attachments?: ApiAttachment[]
}): AsyncGenerator<string> {
  if (skill.pdfFile) {
    console.warn(
      `[ai] PDF knowledge files are not supported with provider 'openai'. ` +
        `The USAP skill will run without the PDF context. Switch to AI_PROVIDER=anthropic for full support.`
    )
  }

  const client = new OpenAI({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) })

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: buildOpenAIMessages(messages, systemPrompt, attachments),
  })

  for await (const chunk of response) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}
