# Upsun Skills

A collection of specialized agent skills and prompts designed to enhance AI assistants with deep knowledge of the Upsun platform.

## Overview

This repository houses "skills"—packages of context, constraints, and logic that transform a general-purpose AI into a specialist for specific Upsun tasks. Each skill is self-contained within the `skills/` directory and includes necessary knowledge files and prompt definitions.

## Available Skills

### 1. Upsun Flex Sizing & Costing
**Directory:** `skills/upsun-flex-sizing`

This skill equips an agent to act as a specialist in Upsun Flex sizing and costing. It covers:
- **Resource Logic:** Calculating CPU and RAM requirements based on Upsun's specific container profiles (HIGH_CPU, BALANCED, HIGH_MEMORY, etc.).
- **Pricing Model:** Detailed cost estimation including per-environment resources, storage, egress, and support tiers.
- **Regions:** Awareness of available Upsun regions (via `knowledge/upsun-regions.json`).
- **Optimization:** Strategies for cost-efficiency, such as managing non-production environments.

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
│   │   └── upsun-flex-sizing-agent.md  # Main agent prompt and logic
│   ├── usap/                       # Security Assurance Skill
│   │   ├── knowledge/              # Security documents (USAP PDF)
│   │   └── usap-agent.md           # Main agent prompt and logic
├── LICENSE
└── README.md
```

## Usage

Currently, these skills are actually the byproduct of the work I have been doing to create Gemini Gems.

To use them, create a new Gemini Gem, use the relevant `*agent.md` file as the master prompt, and add the contents of the `knowledge/` directory as context.

## Contributing

Contributions are welcome! If you have developed a new skill or improved an existing one:
1. Create a new directory under `skills/` for your skill.
2. Include a main agent definition file (e.g., `my-skill-agent.md`).
3. Place any supporting data or context files in a `knowledge/` subdirectory.
4. Submit a Pull Request.