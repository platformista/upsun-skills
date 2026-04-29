import path from 'path'
import fs from 'fs'
import type { SkillConfig } from './types'

// On Upsun: SKILLS_ROOT env var points to /app/skills
// Locally: assumes `npm run dev` is run from the web/ directory
const SKILLS_ROOT = process.env.SKILLS_ROOT
  ? path.resolve(process.env.SKILLS_ROOT)
  : path.resolve(process.cwd(), '..', 'skills')

export const SKILLS: Record<string, SkillConfig> = {
  'flex-sizing': {
    id: 'flex-sizing',
    name: 'Upsun Flex Sizing & Costing',
    description:
      'Get expert sizing and cost estimates for your Upsun infrastructure. Share your stack, workload, or architecture and receive Optimistic, Baseline, and Pessimistic scenarios with multi-currency pricing.',
    placeholder: 'Describe your stack, expected traffic, SLAs, and any other requirements…',
    promptFile: path.join(SKILLS_ROOT, 'upsun-flex-sizing', 'upsun-flex-sizing-skill.md'),
    knowledgeFiles: [
      { path: path.join(SKILLS_ROOT, 'upsun-flex-sizing', 'knowledge', 'upsun-pricing.json'), name: 'upsun-pricing.json' },
      { path: path.join(SKILLS_ROOT, 'upsun-flex-sizing', 'knowledge', 'upsun-sizing-context.json'), name: 'upsun-sizing-context.json' },
      { path: path.join(SKILLS_ROOT, 'upsun-flex-sizing', 'knowledge', 'upsun-regions.json'), name: 'upsun-regions.json' },
      { path: path.join(SKILLS_ROOT, 'upsun-flex-sizing', 'knowledge', 'PIMCORE_PAAS_KNOWLEDGE_BASE.md'), name: 'knowledge/PIMCORE_PAAS_KNOWLEDGE_BASE.md' },
    ],
  },
  'usap': {
    id: 'usap',
    name: 'Upsun Security Assurance Plan',
    description:
      'Ask security and compliance questions answered strictly from the 2026 Upsun Security Assurance Plan. Ideal for RFPs, due diligence, and security assessments.',
    placeholder: 'Ask a security or compliance question about Upsun…',
    promptFile: path.join(SKILLS_ROOT, 'usap', 'usap-skill.md'),
    pdfFile: path.join(SKILLS_ROOT, 'usap', 'knowledge', 'usap-2026-en.pdf'),
  },
}

export function getSkill(id: string): SkillConfig | undefined {
  return SKILLS[id]
}

export function readSkillPrompt(skill: SkillConfig): string {
  return fs.readFileSync(skill.promptFile, 'utf-8')
}

export function readKnowledgeFiles(skill: SkillConfig): Array<{ name: string; content: string }> {
  if (!skill.knowledgeFiles) return []
  return skill.knowledgeFiles.map(({ path: filePath, name }) => ({
    name,
    content: fs.readFileSync(filePath, 'utf-8'),
  }))
}

export function readPdfAsBase64(skill: SkillConfig): string | null {
  if (!skill.pdfFile) return null
  return fs.readFileSync(skill.pdfFile).toString('base64')
}
