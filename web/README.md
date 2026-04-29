# Upsun AI Skills — Web App

A Next.js chat interface for the [Upsun AI Skills](../README.md) collection. Pick a specialist skill, describe your needs in plain language, and get expert answers backed by Upsun's internal knowledge base.

## Skills

| Skill | What it does |
|---|---|
| **Flex Sizing & Costing** | Generates Optimistic / Baseline / Pessimistic infrastructure sizing scenarios with multi-currency cost estimates |
| **Security Assurance Plan** | Answers security and compliance questions strictly from the 2026 Upsun Security Assurance Plan |

## Requirements

- Node.js 20+
- Access to an AI provider (Anthropic, OpenAI, or any OpenAI-compatible endpoint such as LiteLLM, Ollama, or Azure OpenAI)

## Local setup

**1. Install dependencies**

```bash
cd web
npm install
```

**2. Configure environment**

```bash
cp .env.local.example .env.local
```

Open `.env.local` and set at minimum `AI_API_KEY`. All variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_API_KEY` | Yes | — | API key for your provider |
| `AI_PROVIDER` | No | `anthropic` | `anthropic` or `openai` |
| `AI_BASE_URL` | No | — | Override endpoint URL (proxies, LiteLLM, Ollama, etc.) |
| `AI_MODEL` | No | `claude-sonnet-4-6` / `gpt-4o` | Model ID |
| `AI_MAX_TOKENS` | No | `8192` | Max tokens per response |
| `SKILLS_ROOT` | No | `../skills` | Absolute path to the `skills/` directory |

**3. Run**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Provider examples

**Anthropic (direct)**
```bash
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...
```

**OpenAI (direct)**
```bash
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o
```

**LiteLLM proxy** (or any OpenAI-compatible endpoint)
```bash
AI_PROVIDER=openai
AI_API_KEY=your-proxy-key
AI_BASE_URL=https://your-litellm-proxy.example.com
AI_MODEL=gemini-2.0-flash   # use the model name as configured in LiteLLM
```

**Ollama (local)**
```bash
AI_PROVIDER=openai
AI_API_KEY=ollama
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3
```

> **Note:** The USAP (Security Assurance Plan) skill uses native PDF injection, which is only supported with `AI_PROVIDER=anthropic`. With other providers the skill still works, but without the PDF as context — the model relies on the system prompt only. A warning is logged server-side.

## Deploy to Upsun

The `.upsun/config.yaml` at the repository root is already configured. From the repo root:

**1. Set secrets**

```bash
upsun variable:create --name AI_API_KEY --value "..." --sensitive true
upsun variable:create --name AI_PROVIDER --value "anthropic"

# Optional: for proxy setups
upsun variable:create --name AI_BASE_URL --value "https://your-proxy.example.com"
upsun variable:create --name AI_MODEL --value "your-model-id"
```

**2. Push**

```bash
upsun push
```

The build hook runs `npm ci && npm run build` inside `web/`. `SKILLS_ROOT` is pre-set to `/app/skills` in the config so skill knowledge files are resolved correctly.

## Project structure

```
web/
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Skill selector landing page
│   ├── globals.css
│   ├── chat/[skill]/
│   │   └── page.tsx             # Chat page (per skill)
│   └── api/chat/
│       └── route.ts             # Streaming POST endpoint
├── components/
│   ├── SkillCard.tsx            # Landing page card
│   └── ChatInterface.tsx        # nlux-powered chat UI
├── lib/
│   ├── types.ts                 # Shared TypeScript types
│   ├── skills.ts                # Skill registry and file loaders
│   └── ai.ts                    # Provider-agnostic AI streaming layer
├── .env.local.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Adding a new skill

1. Add your skill directory under `skills/` following the existing structure (a `.md` prompt file + a `knowledge/` subdirectory).
2. Register it in `web/lib/skills.ts` by adding an entry to the `SKILLS` object.
3. Add an icon mapping in `web/components/SkillCard.tsx` if desired.

No other changes needed — the routing and chat UI are fully dynamic.
