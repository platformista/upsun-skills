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

## Repository Structure

```
upsun-skills/
├── skills/
│   ├── upsun-flex-sizing/          # Sizing and Costing Skill
│   │   ├── knowledge/              # Context data (pricing, regions, sizing rules)
│   │   └── upsun-flex-sizing-agent.md  # Main agent prompt and logic
├── LICENSE
└── README.md
```

## Usage

To use a skill, point your AI agent (e.g., Antigravity) to the relevant `*agent.md` file. The agent should ingest this file to understand its role, constraints, and the specific data available in the `knowledge/` directory.

## Contributing

Contributions are welcome! If you have developed a new skill or improved an existing one:
1. Create a new directory under `skills/` for your skill.
2. Include a main agent definition file (e.g., `my-skill-agent.md`).
3. Place any supporting data or context files in a `knowledge/` subdirectory.
4. Submit a Pull Request.
