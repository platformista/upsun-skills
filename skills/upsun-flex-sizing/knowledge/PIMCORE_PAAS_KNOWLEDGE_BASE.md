# Pimcore on Upsun Flex — Sizing Knowledge Base (Revised)

**Version:** 2025.1+
**Platform:** Upsun Flex
**Purpose:** Reference for sizing and costing Pimcore Enterprise solutions on Upsun Flex

---

## Scope and Conventions

This document has been pruned to retain **only information relevant to sizing and costing** Pimcore workloads on **Upsun Flex**. All references to legacy "Upsun Fixed" sizing concepts (T-shirt sizes `S/M/L/XL/2XL`, `AUTO` sizing, `base_memory` / `memory_ratio` formulas, Grid project limitations, "no horizontal scaling") have been removed, as they conflict with the Flex model where:

- CPU is selected explicitly from a discrete matrix (e.g. `0.1`, `0.5`, `1`, `2`, `4` vCPU).
- RAM is **not** set directly — it is derived from CPU × Container Profile (`HIGH_CPU`, `BALANCED`, `HIGH_MEMORY`, `HIGHER_MEMORY`)[1].
- Horizontal scaling (multiple instances per app) **is** supported on Flex; resources are allocated per instance, not split[1].
- CPU type (Shared vs Guaranteed) is selectable per component[1].

All YAML snippets, hooks, scripts, environment variables, deployment workflows, build/deploy pipelines, S3/CloudFront integration details, and other configuration-level content have been removed: they are not used in sizing or costing decisions.

---

## 1. Platform Overview

**Pimcore PaaS** is a managed Pimcore Enterprise offering running on the **Upsun** technology stack. From a sizing standpoint, it is composed of:

- A **main PHP application** (Pimcore web tier, PHP 8.4 / FPM).
- A set of **managed services** (database, caches, queue, storage, optional search, optional PDF service).
- One or more **worker containers** for asynchronous processing.
- Optional **secondary applications** (e.g. Mercure for Direct Edit, dedicated asset/thumbnail container).

Pimcore Enterprise license is included in the offering and is **not** a sizing or Upsun-Flex pricing variable.

---

## 2. Components Relevant to Sizing

### 2.1 Applications

| Application | Runtime | Default Container Profile | Purpose |
|---|---|---|---|
| `pimcore` (main) | PHP 8.4 (FPM) | `HIGH_CPU` (default for PHP) — may move to `BALANCED` or `HIGH_MEMORY` for image-heavy workloads | Pimcore web app |
| `mercure` (optional) | Go 1.18+ | `HIGH_CPU` | Real-time pub/sub for Direct Edit Bundle |
| `pimcore-assets` (optional) | PHP 8.4 (FPM) | `BALANCED` or `HIGH_MEMORY` | Dedicated container for thumbnail / asset routes (see §5) |

**Profile selection rationale:**
- Standard PHP web tier → `HIGH_CPU` (typical Pimcore frontend traffic).
- Pimcore admin / asset-heavy / image-processing tier → upgrade to `BALANCED` or `HIGH_MEMORY` because thumbnail generation is RAM-bound (see §5).

### 2.2 Managed Services

**Core services (always provisioned):**

| Service | Type | Default Container Profile | Notes for sizing |
|---|---|---|---|
| `db` | MariaDB 11.4 | `HIGH_MEMORY` | RAM ≥ DB size + 10%. Disk sized with growth buffer. |
| `redis` (cache) | Redis 7.2 | `BALANCED` | Application/Doctrine/output cache. `volatile-lru`. |
| `redis-sessions` | Redis 7.2 | `BALANCED` | Session store. `allkeys-lru`. Can be merged into `db` (MySQL sessions) for very low-traffic projects. |
| `gotenberg8` | Gotenberg 8 | `HIGH_CPU` | PDF generation. Size only if Web-to-Print is used. |
| `storage` | network-storage 2.0 | n/a (storage service) | Persistent shared storage for `/var/` and `/public/var`. Sized by asset volume. |
| `queue` | RabbitMQ 3.13 | `BALANCED` | Symfony Messenger broker. Remove if Messenger is not used. |

**Optional services:**

| Service | Type | Default Container Profile | Notes |
|---|---|---|---|
| `opensearch` | OpenSearch 2 | `HIGH_MEMORY` | Recommended search engine. Size by index volume. |
| `elasticsearch` | Elasticsearch Enterprise 8.5 | `HIGH_MEMORY` (Premium service — billed by RAM only)[2] | Legacy option. Note that **Elasticsearch is a Premium service in Upsun pricing** and is billed via `premium_elasticsearch_ram_gb` rather than the standard service CPU/RAM rates[2]. |

> **Pricing note on premium services:** MongoDB and Elasticsearch are billed under their own RAM-only premium rates in the Upsun pricebook (`premium_mongodb_ram_gb`, `premium_elasticsearch_ram_gb`)[2]. There is no separate CPU charge for these services.

### 2.3 Workers

Workers are sized as small PHP containers with the `HIGH_CPU` profile by default.

| Worker | When to provision | Sizing notes |
|---|---|---|
| `worker_core` | Always | Consumes core Symfony Messenger queues (`pimcore_core`, `pimcore_maintenance`, `pimcore_scheduled_tasks`, `pimcore_asset_update`, `pimcore_search_backend_message`, `pimcore_image_optimize`). Memory limit per process: 250 MB. Time limit: 1h. |
| `worker_portal_engine` | Only if Portal Engine is used | Same baseline. |
| `worker_additional_bundles` | Only if DataHub / Data Import / Generic Execution Engine are used | Same baseline; may need more CPU/RAM under heavy export loads. |

Each worker = one separate Flex container. Size per concurrent process: ~250–500 MB RAM.

---

## 3. Sizing Model on Upsun Flex

### 3.1 How Flex sizing works (replaces all "T-shirt" guidance)

On Upsun Flex you do **not** select a size like `S` / `M` / `XL`. For each container you select:

1. **CPU type** — Shared or Guaranteed.
2. **CPU value** — from the matrix (e.g. shared: `0.1`, `0.25`, `0.5`, `1`, `2`, `4`, `6`, `8` vCPU; guaranteed: `2`, `4`, `8`, `16`, `32`, `48`, `64` vCPU)[1].
3. **Container profile** — `HIGH_CPU`, `BALANCED`, `HIGH_MEMORY`, or `HIGHER_MEMORY`. RAM is then derived automatically from CPU × profile[1].
4. **Disk** — explicit MB allocation (storage services and any container needing persistent disk).
5. **Instance count** — for horizontal scaling. Resources are per-instance, not split[1].

> **Important:** `HIGHER_MEMORY` is **not available** with Guaranteed CPU[1].

### 3.2 Shared vs Guaranteed CPU for Pimcore

- **Shared CPU** is appropriate for development environments, preview environments, low-traffic production frontends, and admin tiers where occasional CPU contention is tolerable.
- **Guaranteed CPU** should be considered for:
   - The **MariaDB** service in any production where data consistency under sustained load matters.
   - The **OpenSearch / Elasticsearch** service when indexing or query throughput is critical.
   - The **main PHP application** when traffic is sustained (high RPS) or latency-sensitive (e-commerce checkout, real-time APIs).
   - The **asset/thumbnail container** when on-demand thumbnail generation under load is part of the SLA.

CPU type is a **performance** decision and is independent of any SLA contractual tier.

### 3.3 Container profile defaults for Pimcore components

| Component | Default profile | Move up to a heavier profile when… |
|---|---|---|
| Pimcore main app (PHP) | `HIGH_CPU` | Heavy in-request image processing → `BALANCED` or `HIGH_MEMORY` |
| Pimcore asset/thumbnail container (if isolated) | `HIGH_MEMORY` | Routinely processing very large JPEG/PSD files |
| Mercure | `HIGH_CPU` | — |
| MariaDB (`db`) | `HIGH_MEMORY` | Very large DB (> tens of GB working set) → `HIGHER_MEMORY` (Shared CPU only) |
| Redis (cache) | `BALANCED` | Very large cache → `HIGH_MEMORY` |
| Redis (sessions) | `BALANCED` | — |
| RabbitMQ (`queue`) | `BALANCED` | — |
| Gotenberg | `HIGH_CPU` | — |
| OpenSearch | `HIGH_MEMORY` | Large indices → keep `HIGH_MEMORY`, scale CPU/RAM up |
| Elasticsearch (premium) | RAM-billed, treat as `HIGH_MEMORY`-equivalent[2] | — |
| Workers | `HIGH_CPU` | DataHub / heavy export → `BALANCED` |

### 3.4 Horizontal scaling on Flex

The main `pimcore` application **can** be scaled horizontally (multiple instances) on Flex. Treat it as the primary horizontal-scaling target. Per the global Upsun Flex rules:

- Horizontally scale **applications** (the PHP web tier, Mercure, dedicated asset containers).
- Do **not** horizontally scale **data services** (MariaDB, Redis, RabbitMQ, OpenSearch). Scale them vertically.
- Storage on the `storage` network-storage service is shared across all horizontal instances.

---

## 4. Sizing Heuristics (Pimcore-specific)

These heuristics give you the *resource requirement*. Translate the requirement into a CPU value from the Flex matrix and pick the appropriate profile (which then yields the RAM)[1].

### 4.1 MariaDB

```
required_RAM (GB) = MAX(DB_size_GB × 1.1, 2)
required_disk (GB) = DB_size_GB × 1.5     # 50% growth buffer
```

Pick the smallest CPU value in the chosen matrix (Shared or Guaranteed) whose `HIGH_MEMORY` RAM allocation meets the requirement[1].

### 4.2 Pimcore PHP application

PHP-FPM concurrency: `pm.max_children ≈ container_RAM_MB / per_request_RAM_MB`. One FPM worker handles one concurrent HTTP request.

```
If heavy image processing in-request:
  required_RAM (GB) ≈ MAX( (avg_decoded_image_MB × 5 × concurrent_FPM_workers) / 1024 , 4 )
Else:
  required_RAM (GB) ≈ MAX( (50 × concurrent_FPM_workers) / 1024 , 2 )
```

Then pick the CPU value such that the resulting RAM under the chosen profile satisfies the requirement[1]. Use horizontal scaling (multiple `pimcore` instances) to add concurrent FPM capacity rather than scaling a single container indefinitely.

### 4.3 Storage service (network-storage)

```
required_disk (GB) = (asset_size_GB + var_size_GB) × 1.5
```

### 4.4 Workers

```
required_RAM (MB) per worker container = MAX(250 × concurrent_processes_in_container, 512)
```

Workers are typically 1 instance each; provision additional worker containers (rather than horizontally scaling one) when queue throughput requires it.

### 4.5 OpenSearch / Elasticsearch

Size by index size (RAM ≥ active index working set) and query concurrency. Use `HIGH_MEMORY` profile. For Elasticsearch, remember it is billed under the premium RAM rate[2].

---

## 5. Image Processing — Critical Sizing Driver for Pimcore

Thumbnail generation is the single most resource-intensive operation in Pimcore and is the dominant input to PHP container sizing.

### 5.1 Memory-per-image rule of thumb

```
RAM ≈ decoded_size × 3–5     (single-layer images: JPG, PNG, WEBP)
RAM ≈ decoded_size × 10+     (layered files: PSD, AI)

decoded_size = width × height × channels × bytes_per_channel
```

**Empirical reference points:**

| Format | File size | Peak RAM |
|---|---|---|
| WEBP | 155 KB | ~155 MB |
| JPG | 10 MB | ~473 MB |
| JPG | 74 MB | ~2.7 GB |
| JPG | 125 MB | ~4.9 GB |
| PSD | 154 MB | ~1 GB |
| PSD | 1.6 GB | ~24 GB |

### 5.2 Implication for Flex sizing

- The Pimcore admin generates up to **25 thumbnails in parallel** when browsing an asset folder. With realistic image sizes this can require many GB of RAM.
- This is why the default `HIGH_CPU` profile is often **insufficient** for the Pimcore main app once real assets are involved.

### 5.3 Three sizing strategies

1. **Scale the main app vertically + change profile.** Move the main `pimcore` app from `HIGH_CPU` to `BALANCED` or `HIGH_MEMORY`, and pick a CPU value whose derived RAM covers `peak_image_RAM × concurrent_FPM_workers`[1].
2. **Isolate image processing into a dedicated container** (`pimcore-assets`). The main app stays small/cheap; the asset container is sized aggressively (e.g. `HIGH_MEMORY` profile, higher CPU) and the admin thumbnail routes are upstreamed to it. Cost is more predictable because image bursts don't consume frontend capacity.
3. **Pre-generate thumbnails via workers.** Move thumbnail work out of the request path entirely; workers are sized for image RAM, the main app stays lean.

For costing scenarios, option (2) is usually the **Baseline** for asset-heavy customers; option (1) for **Optimistic** small-asset customers; and a combination of (2) and horizontal scaling for **Pessimistic**.

---

## 6. Storage Sizing on Upsun Flex

Storage is billed per GB per month, plus backup per GB per month, in the selected currency from the Upsun pricebook[2].

For Pimcore, the dominant storage consumer is the `storage` (network-storage) service holding `/var/` and `/public/var` (assets, thumbnails, generated files), followed by the MariaDB disk.

When sizing non-production environments, keep in mind that **storage allocation is inherited from production when an environment is cloned**: a feature/preview environment gets the same total storage as production, regardless of actual need. This must be factored into per-environment cost projections.

---

## 7. Routing, CDN and Network Traffic

Upsun Flex includes per project:

- **500,000 incoming requests / month** (free tier).
- **10 GB of egress bandwidth / month** (free tier).
- Built-in **Fastly CDN**: requests served from cache do not count against billable container egress.

For Pimcore costing this means:

- Aggressively cache static and cache-busted asset routes (`/bundles/`, `/cache-buster-`, `/static/`) at the edge — they fall outside the egress budget when served from cache.
- The HTML/admin paths are uncached and consume both ingress and egress allowances.
- Estimate page-view volume × average page weight (HTML + uncached assets) to project egress overage. Estimate request volume to project ingress overage. Both overages are billed per the rates in the pricebook[2].

External CDN (e.g. CloudFront in front of S3 buckets) is an architectural option but does **not** alter Upsun-side billing: it affects only what is offloaded from origin.

---

## 8. Project Isolation Rules (applied to Pimcore)

Per Upsun Flex sizing rules, an Upsun project is a **strict isolation boundary**. For Pimcore this means:

- **One Pimcore instance = one Upsun project**, with its own MariaDB, Redis(es), RabbitMQ, storage and (if used) OpenSearch/Elasticsearch.
- Two Pimcore tenants must **not** share a MariaDB or Redis across projects.
- Multi-site WordPress-style consolidation does **not** apply to Pimcore: separate Pimcore applications go in separate Upsun projects.
- Every project carries its own `project_fee`, user licenses, and (if applied) SLA / support uplifts[2].

---

## 9. Environment Strategy

Default to **production-only**. Add non-production environments only when explicitly requested.

When non-production environments are required:

- Use Shared CPU and the lowest viable CPU value from the matrix for each component.
- Remember storage is inherited from production on clone (see §6).
- Apply the standard cost-optimisation recommendations: scheduled pause outside office hours, ephemeral PR-based preview environments with auto-destroy, and aggressive cleanup of stale branches.

---

## 10. Sizing Worksheet — Pimcore Inputs

Collect from the user:

1. **Database**: current size (GB), monthly growth.
2. **Assets**: total volume (GB), typical and peak file sizes, file types (importantly: any PSD/AI), expected concurrent admin users browsing asset folders.
3. **Traffic**: monthly page views or RPS, admin-vs-frontend split, cache hit ratio expectations, peak hours.
4. **Background workloads**: DataHub, Portal Engine, Data Import, scheduled exports — volumes per hour.
5. **Search**: required (yes/no), index size, query volume.
6. **PDF / Web-to-Print**: required (yes/no), volume.
7. **Real-time editing (Mercure)**: required (yes/no).
8. **Sessions**: traffic level (justifies dedicated `redis-sessions` vs MySQL-backed sessions).
9. **SLA / support tier**: only if explicitly requested by the user; otherwise apply Standard support and present SLA options separately.
10. **Currency**: default EUR if not specified[2].

These inputs feed directly into:
- CPU value + profile selection per container (using §3 and §4)[1].
- Disk allocation for `db` and `storage`.
- Decision on isolating an asset/thumbnail container (§5).
- Worker container count.
- Search service inclusion (and whether premium Elasticsearch billing applies)[2].
- Egress / ingress overage projection (§7).

---

## 11. Version Reference

- Pimcore PaaS bundle: **2025.1+**
- Platform: **Upsun (Flex billing model)**
- PHP: 8.4 (default), 8.3 supported
- MariaDB: 11.4
- Redis: 7.2
- RabbitMQ: 3.13
- Gotenberg: 8
- OpenSearch: 2 (recommended)
- Elasticsearch: 8.5 (legacy; **premium-billed**)[2]
