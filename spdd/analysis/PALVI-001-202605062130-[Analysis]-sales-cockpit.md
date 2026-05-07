# SPDD Analysis: Palvi Sales Cockpit — Executive Daily Report

| Field | Value |
|---|---|
| Document ID | PALVI-001 (Analysis) |
| Source BRD | `spdd/brd/PALVI-001-sales-cockpit.md` |
| Source artifacts | `task.pdf`, `metrics.json` |
| Created | 2026-05-06 21:30 |
| Author | Felipe Fausset |
| Status | Draft, ready for review |

---

## 1. Original Business Requirement

The full BRD lives at `spdd/brd/PALVI-001-sales-cockpit.md`. Distilled here for self-contained reading:

```markdown
# Palvi Sales Cockpit — BRD (summary)

Audience: Sales Manager opening the page each morning, ~5 min before standup.
Goal: surface where to focus today to (a) increase sales, (b) improve customer attention.
Source: a single metrics.json with four sibling datasets (A/B/C/D), 365 daily points each, 11 metrics.
The same dashboard MUST respond differently to each dataset.

## R1. Multi-Dataset Navigation                 — switch A/B/C/D, no reload, URL-synced
## R2. Daily-Focus Hero Section                 — top 3 ranked items by severity + magnitude
## R3. Metric Presentation Registry             — single source of truth per metric
## R4. Severity Model                           — OK/WATCH/ALERT/CRIT, direction-aware, default delta + per-metric overrides
## R5. KPI Cards                                — value, sparkline 30d, delta, badge
## R6. Funnel & Bottleneck                      — visits→leads→qualified→deals→won, last 30d
## R7. Win Rate Indicator                       — period metric, won/(won+lost)
## R8. Comparison Window                        — 7d vs prior 7d, anchored on last day in dataset
## R9. Null Handling                            — aggregators ignore null, sparkline does not synthesize zeros
## R10. URL Persistence                         — ?dataset=A, popstate-aware
## R11. Visual Foundation                       — dark theme, tabular numerals, shadcn/ui primitives, Recharts
```

NFRs: Vite + React + TS strict; render under 1 s; switch under 300 ms; responsive desktop-first; a11y via dual-channel severity (color + label).

In Scope: single-page dashboard, all 11 metrics through the registry, hero ranking, KPI grid, funnel, win rate.
Out of Scope: backend, auth, window picker, side-by-side compare, drill-downs, exports, light theme, automated tests.

---

## 2. Domain Concept Identification

### 2.1 Existing concepts (from the dataset and B2B sales domain)

- **Dataset.** A 365-day daily metrics container. Four siblings (A/B/C/D) share schema but exhibit different underlying behavior. The brief defines this — the application is a *navigator* of comparable datasets, not a single-dataset viewer.
- **Day point.** `{ date: string; metrics: Record<MetricKey, number | null> }`. Some values are legitimately null (e.g. `avg_response_time_min` on a no-leads day).
- **Metric metadata.** `{ key, label, unit, direction, description }`. The `direction` flag (`higher_is_better` | `lower_is_better`) is given by the source — we do not need to re-derive domain semantics.
- **Direction.** A binary signal of whether a metric increasing is good or bad. Used everywhere severity, arrow color, or alert ranking is computed.
- **Lead.** Person or company that showed interest. `leads_created` counts new leads per day.
- **Qualified Lead.** Lead Sales accepted as a real prospect. `leads_qualified`.
- **Deal.** Sales opportunity opened on a qualified lead. `deals_created`, `deals_won`, `deals_lost`.
- **Stale Deal.** Open deal aging >60 days without close. **Snapshot at end of day**, not a flow.
- **Response Time.** Minutes from lead arrival to first sales contact (`avg_response_time_min`). Daily average; null when no leads.
- **Deal Cycle.** Days from open to close, averaged over deals that closed today (`avg_deal_cycle_days`). Null on days with zero closes.
- **Support Tickets.** `support_tickets_opened` is a flow (per-day count). `support_avg_resolution_hours` is a daily average.
- **Win Rate.** `sum(deals_won) / sum(deals_won + deals_lost)` over a window. **Period metric, not a cohort metric** — this matters for how it is aggregated.
- **Funnel.** `visits → leads → qualified → deals → won`. Each step has its own conversion ratio; an upstream clog appears downstream.
- **Comparison window.** A current N-day window vs. the prior N-day window. Default N = 7.

### 2.2 New concepts required (introduced by this design)

- **Metric Registry.** A keyed table where each metric carries a *Presentation* entry: `{ aggregate, format, caption, severity?, hint }`. The single source of truth for how the UI presents that metric. Adding a new metric is one row.
- **Aggregator.** `(values: (number | null)[]) => number`. Three concrete shapes used: `meanIgnoreNull`, `lastNonNull` (snapshot), and implicitly `sum` for funnel totals. Returning 0 on empty input is the convention; severity rules short-circuit on `prior === 0`.
- **Severity Tier.** Ordered enum: `OK < WATCH < ALERT < CRIT`. Drives badge color, sparkline accent, and inclusion in the hero list.
- **Severity Rule.** `(input: { current, prior, direction }) => Severity`. Default rule is delta-based and direction-aware. Specific metrics may override with absolute-threshold rules.
- **Severity Composition.** `max(trendSeverity, absoluteSeverity)`. A metric is as severe as its worst dimension.
- **KPI Result.** Per-metric output of analysis: `{ meta, current, prior, pctChange (signed-good), rawPctChange, severity, series30d, formatted, caption, hint }`. Renders one card.
- **Funnel Step.** `{ key, label, total, conversionFromPrev }`. Five steps; `visits` has null conversion; bottleneck is the lowest non-null `conversionFromPrev`.
- **Hero Alert List.** `KpiResult[]` filtered at WATCH+ and sorted by severity then by `|signedDelta|`. Capped at 3 in the UI.
- **Anchor Day.** The rightmost day in the dataset, treated as "today" for window slicing. Configurable parameter, hardcoded to last-day for the MVP.
- **Dataset Switcher.** Tabbed navigation primitive with two-way URL sync via a `useDatasetParam` hook (read on mount, pushState on change, popstate listener).
- **Analysis Pipeline.** `analyze(dataset, opts) => AnalysisResult`. Pure function, no React, no DOM, fully unit-testable. Composes the registry over the dataset to produce `{ kpis, alerts, funnel, winRate }`.

### 2.3 Key Business Rules

| ID | Rule | Notes |
|---|---|---|
| BR1 | Win rate is a *period* metric, not a cohort: `sum(won) / sum(won + lost)` over the window. | Cohort would mean "deals opened in window X — what fraction won by now?". The brief explicitly says period. |
| BR2 | `stale_deals` aggregates by **last value in window**. Summing a snapshot is meaningless. | Snapshot vs flow — easy to get wrong if registry is naive. |
| BR3 | Daily flow metrics (`traffic`, `leads_created`, `leads_qualified`, `deals_created`, `deals_won`, `deals_lost`, `support_tickets_opened`) aggregate by **mean over the window**. | We chose mean over sum so the value reads as "per day", which the user can compare day-to-day. |
| BR4 | Daily-average metrics (`avg_response_time_min`, `avg_deal_cycle_days`, `support_avg_resolution_hours`) aggregate by **mean over the window, ignoring null days**. | Ignoring nulls because a day with no signal should not count as zero. |
| BR5 | Direction inverts the sign of the signed delta. A +30 % move in `deals_lost` is bad (signed −30 %); the same in `deals_won` is good (signed +30 %). | Centralized so the UI does not need to special-case. |
| BR6 | Final severity = `max(trendSeverity, absoluteSeverity)`. | "Worst-of" composition. |
| BR7 | Empty / null-only window → severity OK (no signal, not a false alert). | Avoids panic on early-stage metrics. |
| BR8 | Hero filters at WATCH+ and ranks by severity DESC, then by `|signedDelta|` DESC. Caps at 3. | "Five minutes before standup": three things can be remembered. |
| BR9 | Funnel uses a 30-day flow window, NOT the 7-day comparison window. | Cycle time means "won" is sparse on 7-day windows. |
| BR10 | Bottleneck = the funnel step with the lowest non-null `conversionFromPrev`. | `visits` has no upstream and is excluded. |
| BR11 | Datasets MUST produce visibly distinct hero output. A vs C is the explicit contract from the brief. | This is the design's litmus test. |

---

## 3. Strategic Approach

### 3.1 Solution Direction

1. **Pure domain layer.** Everything that turns a dataset into "what to render" is React-free. `data/` for types and the loader; `domain/` for the registry and the analysis function.
2. **Registry-driven UI.** A single `Record<MetricKey, Presentation>` is the contract between the dataset and the screen. UI components consume `Presentation` and `KpiResult`, never branching on metric `key`.
3. **One-pass analysis.** `analyze(dataset, { windowDays, anchorDate })` walks the dataset once, emits everything the dashboard needs (`kpis`, `alerts`, `funnel`, `winRate`). Memoized in the Dashboard via `useMemo`.
4. **URL is the source of truth for navigation.** `useDatasetParam` hook does the read/write/popstate dance. Refresh-safe and shareable for free.
5. **Dumb layout.** `App` mounts `<Dashboard key={datasetId} dataset={dataset} />` so a dataset switch is a clean remount of the dashboard subtree (no stale memo concerns).

### 3.2 Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Stack | Vite + React 18 + TypeScript strict | Default fast-feedback dev loop; strict catches the registry → analysis interface drift. |
| Charting | Recharts | Sparklines and a horizontal funnel are five lines of code each. Bundle hit acceptable. |
| State | `useState` + Context-free local state | Single screen, single URL-scoped variable. No store framework needed. |
| Dataset selection | Tabs synced to `?dataset=` | Visible nav (vs. dropdown), shareable, refresh-safe. |
| `metrics.json` loading | Vite JSON import (bundled at build) | 670 KB is small; saves a fetch + loading state. Documented as a "second iteration" change once the file grows. |
| Window length | 7 days, hardcoded | Matches Sales Manager standup cadence. A user-controlled selector is deferred. |
| Anchor day | Last day in dataset | No real "now" exists in offline data. |
| Severity model | Direction-aware delta default + per-metric absolute overrides | Default rule covers most metrics. `stale_deals` and `avg_response_time_min` need absolute floors because *trend* alone can hide a bad steady state. |
| Severity composition | `max(trend, absolute)` | A metric is as severe as its worst dimension. |
| UI primitives | Hand-rolled shadcn-style `Card`, `Tabs` (Radix), `Badge` | Three primitives is faster to write than to scaffold via the shadcn CLI. |
| Theme | Dark only | Single audience, single moment of use. |
| Funnel window | 30 days | Cycle time would make 7-day "won" too sparse. |
| Severity → color mapping | Centralized in `ui/severity.ts` | One file owns the visual language. |
| Layout key on switch | `<Dashboard key={datasetId} />` | Forces a clean remount: avoids any possibility of stale per-card state across dataset switches. |

### 3.3 Alternatives Considered

- **Server-side analysis (Node API).** Rejected. No backend in scope. Computing `analyze()` on 365 × 11 numbers is a sub-millisecond operation in the browser.
- **Web Worker for analysis.** Rejected. Same reason: the analysis is fast enough that a worker adds complexity for no perceptible gain.
- **Per-metric React component (`TrafficCard`, `LeadsCard`, …).** Rejected. Hard-coded cards multiply work and make adding a metric an N-file change. Registry-driven generic `KpiCard` scales linearly in registry rows.
- **Generic chart driven only by `direction`.** Rejected as too thin. Direction does not capture aggregator shape (snapshot vs flow) or null semantics. `stale_deals` would be summed; `avg_response_time_min` would treat null as zero. Both wrong.
- **Plain `<button>` tabs vs. Radix Tabs.** Chose Radix. Keyboard navigation, focus management, and ARIA roles for one small dependency.
- **Zustand for dataset state.** Rejected. The state is one URL-scoped variable. Add a store the day a second one shows up.
- **Runtime fetch from `/public/metrics.json`.** Rejected for the MVP. Synchronous import keeps the code paths shorter; no loading state to design. If the dataset grew to multi-MB or became remote, switch.
- **Configurable severity thresholds via UI.** Rejected. Thresholds are a registry concern; exposing them via UI requires persistence and a settings surface that is firmly out of MVP scope.
- **Side-by-side dataset compare.** Rejected. The brief says "navigate between them and respond correctly to each one," not "compare." Compare is a different product feature.

---

## 4. Risk & Gap Analysis

### 4.1 Requirement Ambiguities

- **Hero size is fixed at 3 (R2).** Three is a heuristic anchored to "5 minutes before standup". A dataset with one obvious problem and ten minor ones is fine; a dataset with seven roughly equal alerts is not. We need to confirm with the reviewer that capping at 3 is the right behavior or whether we should allow 1–5 dynamic.
- **Severity absolute thresholds (R4).** `stale_deals` (60 / 100 / 150) and `avg_response_time_min` (30 / 60 / 90 min) are author-eyeballed against the four datasets so dataset A trips clearly and C stays calm. A Palvi domain expert may have different cutoffs. The registry is the single place to swap them.
- **Funnel window = 30 days (R6).** The brief does not state the window. 30 days is enough to see the "won" step at non-trivial volumes given B2B cycle time. Tighter (e.g. 7d) would underestimate "won".
- **Anchor day = last day in dataset (R8).** Assumes the data is fresh up to "today". A real product feeding from delayed pipelines would land 2–3 days earlier than expected.
- **Sparkline length = 30 days (R5).** Gives enough texture to read a trend without dominating the card. Could be 14 or 60 — a design call, not a domain call.
- **Light theme not offered (R11).** Confirmed deferred. Worth flagging that some Sales Managers may use the app in bright morning light; this is a comfort issue, not a functional one.

### 4.2 Edge Cases

- **All-null window for one metric.** Aggregator returns 0; severity rule short-circuits to OK on `prior === 0`. The card displays "0.0 min" which is technically correct but reads like a real value. Mitigation: show "—" when the entire current window is null. Defer to second iteration; flag as a small polish.
- **Dataset shorter than the comparison window.** Slice math holds (`curStart` clamped to 0). Prior window can be empty → prior=0 → severity OK. The "→ 0% vs prior" delta line is misleading in that case but not catastrophic.
- **Funnel with zero `traffic`.** `safeDiv` guards return 0. Funnel renders all bars at zero with 0% conversions. No bottleneck candidate. Acceptable rendering.
- **Severity tie in alert ranking.** Two ALERT items with identical `|signedDelta|`. We sort stably; first-in-source order wins. Acceptable; document it.
- **Browser back without history.** `popstate` fires only after a previous `pushState`. Initial page load reads the URL on mount — works.
- **Bad `?dataset=` value.** `isDatasetId` narrows; we fall back to `A`. Good. We do not surface "invalid dataset" because it is not a user error worth interrupting them over.
- **Sparkline trailing nulls.** Recharts `connectNulls={true}` draws across — visually preferable so the line does not break. Could be tightened later if the team prefers gaps.
- **Browser fontmetrics for tabular numerals.** Inter ships `tnum` via OpenType features. We enable it via CSS `font-feature-settings`. Numbers in cards align across rows.
- **Rapid dataset switching.** Each switch re-runs `analyze()`. Sub-millisecond, but `useMemo` keys on the dataset object identity, so memoization holds across re-renders.

### 4.3 Technical Risks

- **Registry typos pass type-check.** `aggregate: meanIgnoreNull` vs. `aggregate: lastNonNull` is a domain decision the type system cannot validate. A wrong choice (e.g. summing `stale_deals`) gives a plausible-looking but wrong number. **Mitigation:** add a short unit test per metric in the next iteration: assert that `stale_deals` aggregate is the latest value, that `traffic` is the mean, that null days are skipped where expected.
- **Implicit dataset ordering.** The slicing math assumes `dataset.days` is in chronological order. If the source ever ships unordered, every window computation breaks silently (no error, wrong numbers). **Mitigation:** add a defensive `[...days].sort((a, b) => a.date.localeCompare(b.date))` at the loader, or assert ordering in dev.
- **Bundling 670 KB JSON.** Acceptable for the demo; the production build will inline it in the main chunk. **Mitigation:** documented as a "second iteration" item — switch to fetch + loading skeleton if the file grows.
- **Recharts `ResponsiveContainer` requires a parent with a height.** Sparklines render inside cards with explicit `height={44}`. Refactoring the card layout could regress this silently (zero-height SVG, no error). **Mitigation:** keep height on the Sparkline component itself; do not rely on the card.
- **Future router migration.** If we add React Router later, the URL handling moves into router hooks. Current `useDatasetParam` becomes redundant. **Mitigation:** none needed today; mark as a known refactor cost.
- **Recharts SVG re-creation.** For 11 sparklines × 30 points = 330 nodes per dataset, switching is fast. With 50+ metrics this would be noticeable; we are nowhere near that.
- **No error boundary.** A throw inside `analyze` (e.g. malformed dataset) would unmount the entire app. **Mitigation:** add a top-level error boundary in the next iteration. For an internal demo, the cost of skipping it is acceptable.

### 4.4 Acceptance Criteria Coverage

| AC# | Description | Addressable? | Notes |
|---|---|---|---|
| AC1 | Switch A/B/C/D, full re-render under 300 ms | Yes | Pure `useMemo` over a 365 × 11 array; trivial. Verify by manual switch in dev tools "Performance" tab. |
| AC2 | Dataset A surfaces stale-pipeline signal at top; dataset C surfaces zero CRIT | Yes — load-bearing on threshold tuning | Severity model + per-metric absolute thresholds calibrated against all four datasets. **Risk:** thresholds are author-eyeballed; reviewer intuition may differ. Mitigation: brief one-line in README about threshold sources. |
| AC3 | Each KPI card: value + caption + sparkline + delta + badge | Yes | `KpiCard` reads every field from `KpiResult`. Visual smoke test required. |
| AC4 | Funnel renders 5 steps, totals + conversions, bottleneck highlighted | Yes | `analyze()` emits `funnel.bottleneck`; `Funnel` component highlights the matching step. |
| AC5 | `?dataset=B` reload lands on B; back/forward navigates | Yes | `useDatasetParam` reads URL on mount; `pushState` on change; `popstate` on back. |
| AC6 | Null-tolerant aggregation and sparkline rendering | Yes | `meanIgnoreNull` in registry; sparkline `connectNulls`. Polish item: render "—" on all-null windows. |
| AC7 | README ≤1 page, video ≤3 min, public repo | Out of analysis scope | Tracked at delivery. |

---

## 5. Notes for Downstream SPDD Phases

### 5.1 Inputs to the REASONS prompt

| REASONS section | Source in this analysis |
|---|---|
| **R**equirements | § 1 (BRD distillation) + § 4.4 AC table |
| **E**ntities | § 2.1 (existing) + § 2.2 (new) |
| **A**pproach | § 3.1 + § 3.2 |
| **S**tructure | The directory layout implied by § 3.1 (`data/`, `domain/`, `ui/components/`, `ui/`) |
| **O**perations | The implementation order in § 5.2 below |
| **N**orms | TypeScript strict, ESM, no `any`, named exports, registry as the only switching surface |
| **S**afeguards | § 2.3 BR table (must be preserved as invariants), § 4.2 edge cases |

### 5.2 Recommended implementation order

1. `src/data/types.ts`
2. `src/data/loader.ts` (Vite JSON import, `DatasetMap`, `isDatasetId`)
3. `src/lib/cn.ts` (clsx + tailwind-merge utility)
4. `src/domain/metric-registry.ts` — the central abstraction
5. `src/domain/analysis.ts` — pure function building `AnalysisResult`
6. `src/ui/severity.ts` — severity → color/label mapping
7. UI primitives: `Card`, `Tabs`, `Badge`
8. `Sparkline`, `KpiCard`, `AlertList`, `Funnel`, `WinRatePill`
9. `DatasetSwitcher`, `useDatasetParam` hook
10. `Dashboard`, `App`, `main.tsx`, `index.css`
11. Tailwind + Vite + tsconfig, package.json
12. README (one page) + manual smoke test against all four datasets

### 5.3 Open items to confirm before generating the prompt

- **Hero cap = 3** vs. dynamic 1–5. Recommend confirming.
- **Absolute thresholds** for `stale_deals` and `avg_response_time_min`. Recommend documenting the chosen values in the README so reviewers can see the calibration intent.
- **All-null window UX**: render "—" or "0.0"? Defer if time-bound; otherwise low-cost polish.

---

## 6. Conclusion

The design hinges on one abstraction: the **metric registry**. Every other choice (severity model, KPI card, alert ranking, funnel, win rate) is downstream of the registry being the single source of truth for "how to present each metric". The four-dataset differentiation requirement (R2 / AC2) falls out naturally from severity rules calibrated per metric: dataset A trips multiple absolute and trend thresholds; dataset C trips few; the hero list is the visual proof.

The riskiest item is threshold calibration: a reviewer with different intuition about "what counts as alert" can disagree even when the math is right. Documenting the calibration source in the README and making the registry the obvious first place to tune is the mitigation.

The analysis is ready to be translated into a REASONS-format prompt for code generation.
