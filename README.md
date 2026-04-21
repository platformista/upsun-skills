# Upsun Skills

A collection of specialized agent skills and prompts designed to enhance AI assistants with deep knowledge of the Upsun platform.

## Overview

This repository houses "skills"—packages of context, constraints, and logic that transform a general-purpose AI into a specialist for specific Upsun tasks. Each skill is self-contained within the `skills/` directory and includes necessary knowledge files and prompt definitions.

## Available Skills

### 1. Upsun Flex Sizing & Costing
**Directory:** `skills/upsun-flex-sizing`

This skill equips an agent to act as a specialist in Upsun Flex sizing and costing. It covers:
- **Resource Logic:** Calculating CPU and RAM requirements based on Upsun's specific container profiles (HIGH_CPU, BALANCED, HIGH_MEMORY, HIGHER_MEMORY) and shared/guaranteed CPU matrices.
- **Three-Scenario Approach:** Automatically generates Optimistic, Baseline (recommended), and Pessimistic sizing scenarios with cost comparisons and use-case fit analysis.
- **Comprehensive Pricing:** Multi-currency cost estimation (EUR, USD, AUD, GBP, CAD, CHF) including compute resources, storage, network traffic (ingress/egress), premium services (MongoDB, Elasticsearch), SLA uplifts, and support tiers.
- **Platform-Specific Knowledge:** Specialized sizing heuristics for specific platforms (e.g., Pimcore Enterprise with heavy image processing, asset management, and DAM workloads).
- **Project Isolation Rules:** Strict enforcement of Upsun's project boundaries and zero-shared-state architecture.
- **Regions:** Awareness of available Upsun regions with green energy discount eligibility.
- **Optimization:** Cost-efficiency strategies including environment management, scheduled pausing, ephemeral previews, and horizontal vs vertical scaling trade-offs.

### 2. Upsun Security Assurance Plan (USAP)
**Directory:** `skills/usap`

This skill transforms the agent into an Upsun Security Specialist. It enables:
- **Security Compliance:** Answering questions strictly based on the 2026 Upsun Security Assurance Plan.
- **Direct Sourcing:** Precise references to the USAP document for all answers.
- **Scope Enforcement:** Guarantees that only Upsun-related security questions are addressed.

## Repository Structure

```
upsun-skills/
├── skills/
│   ├── upsun-flex-sizing/          # Sizing and Costing Skill
│   │   ├── knowledge/              # Context data (pricing, regions, sizing rules)
│   │   └── upsun-flex-sizing-skill.md  # Main agent prompt and logic
│   ├── usap/                       # Security Assurance Skill
│   │   ├── knowledge/              # Security documents (USAP PDF)
│   │   └── usap-skill.md           # Main agent prompt and logic
├── LICENSE
└── README.md
```

## Usage

This repository stores the skill content in a reusable project structure. If your AI platform supports custom skills or agent instructions, use the skill prompt file as the main instruction source and the resources in `knowledge/` as the only knowledge source.

### 1. Upsun Flex Sizing & Costing

The exact setup depends on the platform:
- **Gemini Gem:** use `skills/upsun-flex-sizing/upsun-flex-sizing-skill.md` as the master prompt and attach `skills/upsun-flex-sizing/knowledge/*` as context.
- **Other agent platforms:** place the files wherever that platform expects custom skills or instructions, then point the agent to the prompt file and the resources files.

**Note:** filenames matter, because the prompt references them by name. If you rename the files, update the prompt accordingly.

### 2. Upsun Security Assurance Plan (USAP)

The exact setup depends on the platform:
- **Gemini Gem:** use `skills/usap/usap-skill.md` as the master prompt and attach `skills/usap/knowledge/usap-2026-en.pdf` as context.
- **Other agent platforms:** place the files wherever that platform expects custom skills or instructions, then point the agent to the prompt file and the PDF.

The important part is not the folder name itself, but that the agent:
1. uses the USAP prompt as its instructions,
2. uses only the USAP PDF as its source document,
3. answers only Upsun-related security questions.

**Note:** the PDF filename matters, because the prompt references it by name. If you rename the file, update the prompt accordingly.


## Contributing

Contributions are welcome! If you have developed a new skill or improved an existing one:
1. Create a new directory under `skills/` for your skill.
2. Include a main skill definition file (e.g., `my-own-skill.md`).
3. Place any supporting data or context files in a `knowledge/` subdirectory.
4. Submit a Pull Request.