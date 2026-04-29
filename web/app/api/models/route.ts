import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY ?? ''
  const fixedModel = process.env.AI_MODEL || null

  // If AI_MODEL is explicitly set, return it as the fixed model — no selector needed
  if (fixedModel) {
    return NextResponse.json({ models: [], fixedModel })
  }

  // No fixed model — fetch available models from the proxy
  if (!baseUrl) {
    return NextResponse.json({ models: [], fixedModel: null })
  }

  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/v1/models`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error(`[models] Failed to fetch models: ${res.status} ${res.statusText}`)
      return NextResponse.json({ models: [], fixedModel: null })
    }

    const body = await res.json()

    const models: { id: string; owned_by?: string }[] = (body.data ?? [])
      .map((m: { id: string; owned_by?: string }) => ({
        id: m.id,
        owned_by: m.owned_by ?? 'unknown',
      }))
      .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))

    return NextResponse.json({ models, fixedModel: null })
  } catch (err) {
    console.error('[models] Error fetching models:', err)
    return NextResponse.json({ models: [], fixedModel: null })
  }
}
