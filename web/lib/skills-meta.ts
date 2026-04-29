/**
 * Browser-safe skill metadata — no fs/path imports.
 * Import this in client components.
 * The API route uses lib/skills.ts for file reading.
 */

export type SkillMeta = {
  id: string
  name: string
  description: string
  placeholder: string
}

export const SKILLS_META: Record<string, SkillMeta> = {
  'flex-sizing': {
    id: 'flex-sizing',
    name: 'Upsun Flex Sizing & Costing',
    description:
      'Get expert sizing and cost estimates for your Upsun infrastructure. Share your stack, workload, or architecture and receive Optimistic, Baseline, and Pessimistic scenarios with multi-currency pricing.',
    placeholder: 'Describe your stack, expected traffic, SLAs, and any other requirements…',
  },
  'usap': {
    id: 'usap',
    name: 'Upsun Security Assurance Plan',
    description:
      'Ask security and compliance questions answered strictly from the 2026 Upsun Security Assurance Plan. Ideal for RFPs, due diligence, and security assessments.',
    placeholder: 'Ask a security or compliance question about Upsun…',
  },
}
