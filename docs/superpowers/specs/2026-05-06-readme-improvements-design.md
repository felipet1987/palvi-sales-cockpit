# README improvements — Design

| Field | Value |
|---|---|
| Date | 2026-05-06 |
| Author | Felipe Fausset |
| File under change | `README.md` |
| Source brief | `task.pdf` (Palvi technical task) |
| Status | Approved by user, ready to plan |

---

## 1. Context

The repo `https://github.com/felipet1987/palvi-sales-cockpit` is published and the deliverables are otherwise complete. The current `README.md` is 40 lines, satisfies the brief's "one page, two sections" rule, and was already polished once during the delivery flow.

This document scopes a small, low-risk improvement pass on the README: reorder bullets so reading order matches importance, and convert file-path references inside bullets to clickable GitHub-relative links. The brief's two non-negotiable rules — *one page maximum* and *only two sections (Decisiones técnicas, Segunda iteración)* — must be preserved.

User decisions cached:

| Decision | Choice |
|---|---|
| Improvement category | Reorder + visual hierarchy (no new content) |
| Sub-headings inside the two sections | Not added (strict 2-section reading) |
| Bullet style | Stay flat; no nesting |
| Hyperlinks on file paths | Yes — purely annotation, no prose change |
| Docker option in the run block | Not added — current `npm` block stays |
| Screenshots / banner / badges / ToC / Demo URL | Not added — would either bloat the README or violate the section rule |

## 2. Improvements in scope

### 2.1 Reorder — `Decisiones técnicas`

Current order is roughly registry → severity → architecture → URL → windows → win rate → stack → bundle → theme. Move items so reading flows from "the central abstraction" outward to "tech choices we made":

| Pos | Bullet | Theme |
|---|---|---|
| 1 | Una sola "switching surface" — registry | central abstraction |
| 2 | Severity híbrida (trend + absolute) | domain rule |
| 3 | Win rate como métrica de período | domain rule |
| 4 | Ventanas: 7d vs 7d previos / 30d funnel | domain rule |
| 5 | Dominio puro vs UI tonta | architecture |
| 6 | URL como única fuente de verdad para navegación | architecture |
| 7 | Stack pragmático | tech choice |
| 8 | `metrics.json` bundleado, no fetched | tech choice |
| 9 | Dark theme único | scope choice |

Net moves:

- Win rate (was 6 → 3): grouped with the other two domain rules.
- Ventanas (was 5 → 4): grouped with the other two domain rules.
- Dominio puro (was 3 → 5): pushed below the domain rules so domain shows first, then architecture.
- URL (was 4 → 6): same reasoning.

### 2.2 Reorder — `Segunda iteración`

The intro line says "ordenadas por prioridad si esto fuera real". That promise is currently broken — em-dash (cosmetic) is at position 3, ahead of selector de ventana (real-product need) at position 4. Re-rank so cosmetic items go to the bottom.

| Pos | Bullet | Priority |
|---|---|---|
| 1 | Tests por métrica | High — regression safety |
| 2 | Error boundary top-level | High — UX safety |
| 3 | Selector de ventana / anchor day | High — real-product need |
| 4 | Calibración de thresholds documentada / configurable | Medium-High — domain feedback |
| 5 | Fetched JSON con loading skeleton | Medium — production readiness |
| 6 | Drill-down por métrica | Medium — UX |
| 7 | CSV / PDF export | Medium-Low |
| 8 | Light theme + responsive mobile | Low — cosmetic |
| 9 | Em-dash en ventanas all-null | Low — cosmetic |

Net moves:

- Selector de ventana (was 4 → 3): high-priority real-product need ahead of cosmetic items.
- Fetched JSON (was 9 → 5): production-readiness item, not a cosmetic.
- Em-dash (was 3 → 9): cosmetic, belongs at the bottom.
- Light theme (was 8 → 8): unchanged but now justified by neighbours.

### 2.3 Hyperlinks on file paths

Convert in-bullet file-path mentions to GitHub-relative Markdown links. No prose change — only the inline-code spans gain links. Specifically:

| Where | Before | After |
|---|---|---|
| Decisiones técnicas, bullet 1 | `` `src/domain/metric-registry.ts` `` | `` [`src/domain/metric-registry.ts`](./src/domain/metric-registry.ts) `` |
| Decisiones técnicas, bullet 5 | `` `src/data/` `` and `` `src/domain/` `` | `` [`src/data/`](./src/data/) `` and `` [`src/domain/`](./src/domain/) `` |
| Decisiones técnicas, bullet 5 | `` `analyze(dataset, opts) → AnalysisResult` `` | `` [`analyze(dataset, opts) → AnalysisResult`](./src/domain/analysis.ts) `` |
| Decisiones técnicas, bullet 6 | `` `useDatasetParam` `` | `` [`useDatasetParam`](./src/ui/useDatasetParam.ts) `` |
| Decisiones técnicas, bullet 7 | `` `Card`, `Tabs` `` | `` [`Card`](./src/ui/components/ui/Card.tsx), [`Tabs`](./src/ui/components/ui/Tabs.tsx) `` (and `Badge`) |

`spdd/` already has a link. The lead paragraph and the run-instructions block are unchanged.

## 3. What is NOT in scope

- New sections. The README stays at exactly two H2 sections.
- New paragraphs or bullets. No content additions.
- Word-by-word rewrite ("tightening"). The user explicitly chose reorder over rewrite — bullets keep their current wording.
- Sub-headings (`###`) inside the two sections.
- Banner / hero image / animated GIF.
- Badges (CI, license, version).
- Table of contents.
- Demo URL or GitHub Pages link.
- A `Docker` line inside the bash block.
- Translation to English.

## 4. Constraints and verification

| Constraint | How verified |
|---|---|
| Stays one page | `wc -l README.md` ≤ 50 lines after the edit |
| Exactly two H2 sections | `grep -c '^## ' README.md` returns `2` (`## Decisiones técnicas`, `## Segunda iteración`) |
| Same bullets, just reordered | `grep -c '^- ' README.md` is unchanged from the current count of 18 (9 + 9) |
| No prose changes inside bullets | A diff that touches only bullet ordering and inline-link annotations — no other word changes |
| All links point to files that exist | After the change, every linked path resolves on disk: `src/domain/metric-registry.ts`, `src/data/`, `src/domain/`, `src/domain/analysis.ts`, `src/ui/useDatasetParam.ts`, `src/ui/components/ui/Card.tsx`, `src/ui/components/ui/Tabs.tsx`, `src/ui/components/ui/Badge.tsx` |
| Lead paragraph unchanged | Lines 1–13 of the README are byte-identical to current |
| Run-instructions block unchanged | `npm install`, `npm run dev`, `npm run typecheck`, `npm run build` lines stay |

## 5. Risks

| Risk | Mitigation |
|---|---|
| Reordering accidentally drops or duplicates a bullet | Spec lists each bullet exactly once, in both orders, with explicit moves; verification step counts bullets. |
| A linked path is wrong and 404s on GitHub | Verification step asserts each path exists on disk before commit. |
| User views the change as "more than expected" | Spec is explicit about what is in/out of scope, and out-of-scope items are listed by name. |
| Total line count creeps over 50 | Re-check with `wc -l` post-edit; revert any incidental whitespace creep. |

## 6. Submission impact

None. The repo is already public; this is a follow-up commit pushed to `main`. The form has not been submitted yet — when the user submits, the README at HEAD is what evaluators will see.
