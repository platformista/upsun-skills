'use client'

import Image from 'next/image'
import { SKILLS_META as SKILLS } from '@/lib/skills-meta'
import { ArrowRightIcon } from 'lucide-react'
import type { useConversations } from '@/lib/useConversations'

type Props = {
  store: ReturnType<typeof useConversations>
}

const SKILL_ICONS: Record<string, string> = {
  'flex-sizing': '⚖️',
  'usap': '🔒',
}

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  'flex-sizing': [
    'Size a Laravel app with 50k daily users',
    'Compare costs for a Node.js microservices setup',
    'Estimate resources for a high-traffic WordPress site',
  ],
  'usap': [
    'What certifications does Upsun hold?',
    'How is data encrypted at rest?',
    'Explain the incident response process',
  ],
}

export default function EmptyState({ store }: Props) {
  const skills = Object.values(SKILLS)

  const handlePrompt = (skillId: string, prompt: string) => {
    const conv = store.createConversation(skillId)
    // Slight delay to let the ChatView mount before we'd need to send
    // The user will see the conversation open with the prompt pre-filled — but actually
    // we just open the conversation and let the user see the suggested prompt as inspiration.
    // For a true "click to send" we'd need to wire through ChatView, which adds complexity.
    // For now, opening the conversation is the right UX.
    void conv
    void prompt
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center">
        {/* Logo and heading */}
        <div className="mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Image src="/upsun-logo.svg" alt="Upsun" width={40} height={10} />
            </div>
          </div>
          <h1 className="font-display text-[1.65rem] font-semibold tracking-tight mb-2.5">Upsun AI Skills</h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed max-w-md mx-auto">
            Specialist AI tools for infrastructure sizing, security assessments, and more.
            Choose a skill to start.
          </p>
        </div>

        {/* Skill cards */}
        <div className="grid gap-4 sm:grid-cols-2 text-left">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-all duration-200 overflow-hidden"
            >
              {/* Skill header */}
              <button
                onClick={() => store.createConversation(skill.id)}
                className="w-full flex items-center justify-between p-4 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{SKILL_ICONS[skill.id] ?? '🤖'}</span>
                  <div>
                    <p className="font-display font-medium text-[14.5px] tracking-[-0.01em]">{skill.name}</p>
                    <p className="text-[12.5px] text-muted-foreground/70 mt-0.5 line-clamp-1">{skill.description}</p>
                  </div>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>

              {/* Suggested prompts */}
              <div className="border-t border-border/40 px-4 py-3 space-y-1.5">
                {(SUGGESTED_PROMPTS[skill.id] ?? []).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handlePrompt(skill.id, prompt)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] text-muted-foreground/70 hover:text-foreground hover:bg-secondary/50 transition-colors leading-relaxed"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
