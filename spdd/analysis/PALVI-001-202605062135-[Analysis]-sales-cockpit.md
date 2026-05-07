# SPDD Analysis: Palvi Sales Cockpit — Executive Daily Report

## Original Business Requirement

# Palvi Sales Cockpit — Business Requirements Document

| Field | Value |
|---|---|
| Document ID | PALVI-001 |
| Version | 1.0 |
| Status | Draft for SPDD intake |
| Author | Felipe Fausset |
| Created | 2026-05-06 |
| Source artifacts | `task.pdf`, `metrics.json` |
| Time budget | 3 hours MVP (per task brief) |
| Stack constraint | React + TypeScript (per task brief) |

---

## 1. Project Context

Palvi (Chilean B2B SaaS) provided a hiring task: build a web application that serves as an **executive sales report** for daily commercial metrics. The target user is a **Sales Manager** who opens the dashboard each morning, has roughly **5 minutes** before their first meeting, and needs to leave the screen knowing **where to focus today** to (a) increase sales and (b) improve customer attention.

The dataset (`metrics.json`) contains four sibling datasets (`A`, `B`, `C`, `D`) sharing the same metric definitions but exhibiting different underlying behaviors. The application MUST let the user switch among them and respond correctly to each one — not just the first.

The task brief explicitly states that decisions matter more than feature count: an opinionated, well-justified solution is preferred over a wide-but-shallow dashboard. Use of AI assistance is expected and not penalized.

### Source dataset shape

```jsonc
{
  "A": {
    "metadata": {
      "start_date": "2025-04-26",
      "end_date":   "2026-04-25",
      "days": 365,
      "metrics": [
        {
          "key": "traffic",
          "label": "Daily visits",
          "unit": "visits",
          "direction": "higher_is_better",
          "description": "Unique visits to the public marketing site."
        }
        // ... 11 metrics total
      ]
    },
    "days": [
      { "date": "2025-04-26", "metrics": { "traffic": 1834, "leads_created": 12, "avg_response_time_min": 31.2 /* ... */ } }
      // ... 365 days
    ]
  },
  "B": { /* same shape */ },
  "C": { /* same shape */ },
  "D": { /* same shape */ }
}
```

Eleven metrics per dataset: `traffic`, `leads_created`, `leads_qualified`, `deals_created`, `deals_won`, `deals_lost`, `avg_response_time_min`, `avg_deal_cycle_days`, `stale_deals`, `support_tickets_opened`, `support_avg_resolution_hours`. Each carries `direction` (`higher_is_better` | `lower_is_better`) — domain semantics are provided so we don't have to guess.

Metric values may be `null` on individual days (e.g. `avg_response_time_min` when no leads arrived).

---

## 2. Functional Requirements

### R1. Multi-Dataset Navigation

The application MUST allow the user to switch among the four datasets (`A`, `B`, `C`, `D`) without a page reload.

- **DoD:** Selecting a dataset updates every visible metric, alert, and chart on the page.
- **DoD:** Switching is reachable in one click from anywhere on the page.

### R2. Daily-Focus Hero Section

The top of the dashboard MUST present a "Focus today" section that ranks the most pressing items by severity. This is the headline answer to the Sales Manager's question.

- **DoD:** Hero shows up to 3 ranked items.
- **DoD:** Ranking is determined by severity tier first, then by magnitude of change.
- **DoD:** When a dataset has no `ALERT`/`CRIT` items, the hero shows a clear "no alerts" state instead of forcing irrelevant content.
- **DoD (differentiation):** Datasets `A` and `C` MUST produce visibly different hero output. (Dataset `A` exhibits a rotting pipeline; dataset `C` is healthy. The dashboard must reflect that.)

### R3. Metric Presentation Registry

A single source of truth MUST define, **per metric**, how that metric is presented to the user.

- Aggregator function: how to collapse a window of daily values into a single number (`mean` / `last` for snapshots like `stale_deals` / etc.).
- Formatter: how to render the resulting number (precision, unit suffix).
- Caption: short label printed next to the value (e.g. `/d`, `min`, `days`).
- Severity rule: optional override on the default delta rule.
- Hint copy: one line explaining what the value means in plain language.

- **DoD:** All UI components consume this registry. No component branches on metric `key` to special-case behavior.
- **DoD:** Adding a new metric requires only adding a row in the registry plus its `direction` already provided in the metadata.

### R4. Severity Model

The application MUST classify each metric into one of four severity tiers: `OK`, `WATCH`, `ALERT`, `CRIT`.

- The default rule is **delta-aware and direction-aware**: a 30 % increase in `deals_lost` is bad; the same increase in `deals_won` is good.
- Specific metrics MAY define **absolute-threshold overrides** (e.g. `stale_deals` count, `avg_response_time_min` minutes) and the final severity is the worst of trend and absolute.
- Severity drives badge color, sparkline accent color, and inclusion in the hero list.

- **DoD:** Every KPI card displays its severity tier (badge or absence of badge for `OK`).
- **DoD:** A dataset with poor numbers (e.g. `A`) lights up clearly; a healthy dataset (e.g. `C`) stays mostly green / unbadged.

### R5. KPI Cards

For each metric in the dataset metadata, the dashboard MUST render a KPI card containing:

- Metric label and one-line hint.
- Current aggregated value over the comparison window, formatted via the registry.
- 30-day sparkline.
- Delta versus prior window: arrow direction (▲/▼/→) reflects raw movement; arrow color reflects whether that movement is good (direction-aware).
- Severity badge (when not `OK`).

- **DoD:** Cards render in a responsive grid: 4 columns on desktop, 2 on tablet, 1 on mobile.
- **DoD:** Sparkline does not crash on `null` values.

### R6. Funnel & Bottleneck

The dashboard MUST visualize the funnel `visits → leads → qualified → deals → won` and call out the conversion bottleneck.

- Totals computed over the last 30 days (volume) — funnel is a flow metric, not a snapshot.
- Each step shows: total count, step-to-step conversion percentage.
- The step with the lowest conversion percentage is visually highlighted as the bottleneck.

### R7. Win Rate Indicator

The dashboard MUST display the period win rate prominently in the header area:

- Formula: `sum(deals_won) / sum(deals_won + deals_lost)` over the current window. Period metric, not cohort.
- Comparison: delta versus prior window.
- Severity color follows the same model as KPI cards (`higher_is_better`).

### R8. Comparison Window

- Default window: **7 days vs prior 7 days**. Aligns with a Sales Manager's daily standup cadence.
- Anchor day: the **last day in the dataset** (treated as "today").
- The window is hardcoded for the MVP. A user-facing window selector is **out of scope** (see § 4).

### R9. Null Handling

Metric values can legitimately be `null` (e.g. `avg_response_time_min` on a day with no leads).

- Aggregators MUST skip null values, not coerce them to zero.
- Sparklines MUST not draw fake zeros for null days.
- A window with **only** null values yields severity `OK` (no signal), not a false alert.

### R10. URL Persistence

The currently selected dataset MUST be reflected in the URL as a query parameter (e.g. `?dataset=A`).

- Refreshing the page lands on the same dataset.
- The URL is shareable: opening a colleague's link selects the correct dataset.
- Browser back/forward buttons navigate between previously selected datasets (`popstate` listener).

### R11. Visual Foundation

- Dark theme as the default and only theme for the MVP. Sales Managers viewing the screen at 7am do not need light/dark switching.
- Tabular numerals for all numeric displays — values must align across cards.
- shadcn/ui-style primitives for `Card`, `Tabs`, `Badge`. Component aesthetic matches modern SaaS dashboards.
- Recharts for sparklines and any inline charting.

---

## 3. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Stack | Vite + React 18 + TypeScript strict mode |
| Performance | Initial dashboard render under 1 s for the full 365-day dataset on a typical laptop. Dataset switch perceived as instant (<300 ms). |
| Bundle | No manual code-splitting required. The 670 KB `metrics.json` may be inlined in dev; no opinion required for the MVP. |
| Responsive | Desktop-first. Tablet and mobile layouts must remain readable; non-essential metadata can collapse. |
| Accessibility | Semantic HTML. Keyboard-navigable tabs. Severity is communicated via at least two channels (color **and** badge label / dot) so it survives colorblind users. |
| Browser support | Modern evergreen browsers only (Chrome / Safari / Firefox current). No IE / legacy Edge. |
| Internationalization | Spanish UI copy for headings / status messages aimed at the Chilean Sales Manager. Metric labels remain English (they live in the source data). |
| Testability | Domain layer (registry, analysis) MUST be pure functions, free of React or DOM, importable in isolation. Manual smoke testing is acceptable for the MVP itself; automated tests are deferred. |

---

## 4. Scope Boundaries

### In Scope (MVP)

- Single-page dashboard reading from the bundled `metrics.json`.
- All 11 metrics rendered through the registry.
- Hero alert ranking, KPI grid, funnel, win rate.
- Dataset switching (A/B/C/D) with URL persistence.

### Out of Scope (deferred — listed here so the second-iteration README section has a clear source)

- Backend service or live API integration.
- Authentication, multi-tenant accounts.
- User-controlled comparison window or anchor day picker.
- Side-by-side dataset comparison.
- Drill-down views per metric (tooltip on hover beyond the sparkline is fine; a dedicated detail page is not).
- Data export (CSV / PDF / image).
- Configurable severity thresholds via UI; thresholds are coded in the registry for the MVP.
- Light / system theme.
- Automated test suite (unit / integration / e2e).
- Server-side computation or caching.
- Real-time updates / WebSocket / SSE.

---

## 5. Success Criteria

| ID | Criterion |
|---|---|
| AC1 | The user can switch among A / B / C / D and every visual on the page updates accordingly within 300 ms. |
| AC2 | Dataset `A` surfaces `stale_deals` (or an equivalent pipeline-rot signal) at the top of the hero; dataset `C` surfaces zero `CRIT` items. The two datasets are visually distinguishable to a first-time viewer. |
| AC3 | Every KPI card shows: value + caption, 30-day sparkline, direction-aware delta versus prior window, severity badge when not OK. |
| AC4 | The funnel renders all five steps with absolute totals and conversion percentages, and one step is highlighted as the bottleneck. |
| AC5 | Reloading `…/?dataset=B` lands on dataset `B`. Browser back / forward navigates between previously selected datasets. |
| AC6 | A day with `avg_response_time_min: null` does not break aggregation, severity, or sparkline rendering. |
| AC7 | README is one page, mentions key technical decisions and a "second iteration" section, and pairs with a video under three minutes. Repo is publicly accessible on GitHub. |

---

## 6. Domain Glossary

Carried over from `task.pdf` for reference:

- **Lead:** a person or company that showed interest (form, demo). `leads_created` counts new leads per day.
- **Qualified lead:** a lead Sales has evaluated as a real prospect (fit, budget, timing). `leads_qualified`.
- **Deal:** a sales opportunity opened on a qualified lead. `deals_created` counts new deals per day.
- **Won / Lost deal:** `deals_won` and `deals_lost` count deals that closed today with each outcome.
- **Response time (`avg_response_time_min`):** minutes from lead arrival to first sales contact. Slow response kills B2B conversion.
- **Deal cycle (`avg_deal_cycle_days`):** average days from open to close for deals that closed that day.
- **Stale deal (`stale_deals`):** open deal aging more than 60 days without close. Snapshot at end of day.
- **Win rate:** `sum(deals_won) / sum(deals_won + deals_lost)` over a window. Period metric, not cohort.
- **Funnel:** `visits → leads → qualified → deals → won`. Each step has its conversion ratio; a clog upstream is felt downstream.
- **Support tickets:** `support_tickets_opened` is a daily count; `support_avg_resolution_hours` is the average resolution time for tickets opened today.

---

## 7. Open Questions & Assumptions

These are the points where the task brief is silent or ambiguous. Each has a working assumption documented; SPDD analysis should challenge any of them that feel load-bearing.

| Topic | Assumption taken | Why this matters |
|---|---|---|
| Comparison window length | 7 days vs prior 7 days | The brief does not specify a cadence; weekly windows match a Sales Manager's standup rhythm. A different cadence (e.g. month-over-month) would change every delta on the page. |
| Anchor day | Last day in the dataset is treated as "today" | The data ranges through `2026-04-25`. Without a real "now," the most recent day is the only sensible anchor. |
| Severity thresholds for `stale_deals` | `≥60` watch, `≥100` alert, `≥150` crit | Eyeballed against the four datasets so dataset A clearly trips and the others stay calmer. A domain expert at Palvi may want different cutoffs. |
| Severity thresholds for `avg_response_time_min` | `≥30` watch, `≥60` alert, `≥90` crit | Drawn from generic B2B benchmarks. Palvi may have its own service-level expectation. |
| Treatment of `support_tickets_opened` | Trend-only (no absolute floor); direction taken from the metadata | All four datasets exhibit the same large lift in late months (~+220 %), suggesting it is shared baseline noise rather than a differentiator. |
| Hero size | Top 3 items | Matches "5 minutes before standup" — three things are remembered, ten are not. |
| Language of UI chrome | Spanish (Chilean) | Audience is the Palvi Sales Manager. Metric labels stay English because they ship that way in `metrics.json`. |
| Audience of the BRD | Felipe (the author), and the SPDD analysis pipeline downstream | Tone is structured but not committee-ready. |

---

## 8. Inputs to SPDD Analysis

The downstream `spdd/analysis/` document should treat:

- **§ 2** as the requirements list to expand into the **Acceptance Criteria Coverage** matrix.
- **§ 6** as the seed for the **Domain Concept Identification** section.
- **§ 7** as the seed for the **Requirement Ambiguities** section.
- **§ 4 → Out of Scope** as the seed for the **Risk: items deferred to a second iteration** discussion.
- **§ 5** as the explicit success criteria the analysis must prove the proposal addresses.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

The repository is greenfield at the time of this analysis: only `metrics.json`, `task.pdf`, and the SPDD documents under `spdd/` are present. There is no prior application code. The "existing" concepts therefore come from the **dataset itself** — the schema and semantics established by `metrics.json` and the task brief.

- **Dataset (A | B | C | D):** the top-level container of a one-year daily time series. Four siblings share schema but exhibit independent behavior. The product is a *navigator* across comparable datasets, not a viewer of a single dataset.
- **Day Point:** a single calendar day inside a dataset, carrying a date and a record of metric readings; some readings can be `null` when the underlying activity did not occur (for example `avg_response_time_min` on a day with no leads).
- **Metric Metadata:** the per-metric descriptor that the dataset itself carries, including the `direction` flag (`higher_is_better` | `lower_is_better`) — domain semantics are provided rather than inferred.
- **Direction:** the binary signal that says whether a metric trending up is favorable or unfavorable. It is the linchpin that lets generic UI treat eleven different metrics consistently.
- **Lead, Qualified Lead, Deal, Stale Deal:** the B2B sales lifecycle entities flowing through the funnel. Counts of each appear in the metric set.
- **Win Rate:** a derived KPI, defined as a *period* metric (won over won-plus-lost across a window) — explicitly not a cohort metric.
- **Funnel:** the conversion chain `visits → leads → qualified → deals → won`. Each step has its own conversion ratio; an upstream clog is felt downstream.
- **Support load:** captured by tickets opened per day and average resolution hours; feeds the "improve customer attention" arm of the user goal.

### New Concepts Required

These concepts do not yet exist anywhere — they are the design's invention to translate the dataset into the daily executive view:

- **Metric Presentation Registry:** a single keyed table of presentation rules per metric (how to aggregate, how to format, what caption to show, an optional severity override, and a hint copy). It is the contract between the dataset and the screen.
- **Severity Tier:** an ordered classification of how much attention a metric currently demands (`OK < WATCH < ALERT < CRIT`). Drives badge color, sparkline accent, and inclusion in the hero list.
- **Severity Rule:** the function that, given a metric's current and prior window values plus its direction, yields a severity tier. The product offers a default trend-aware rule and per-metric absolute-threshold overrides.
- **Severity Composition:** the rule that combines trend severity with absolute severity by taking the worst of the two — a metric is as severe as its most concerning dimension.
- **Comparison Window:** the temporal frame the dashboard reasons over (a current N-day window versus the prior N-day window), anchored on a chosen day.
- **Anchor Day:** the day treated as "today" for window slicing. In offline data, this is the rightmost day in the dataset.
- **KPI Result:** the per-metric output of the analysis pass — current value, prior value, direction-aware signed change, severity tier, recent series for the sparkline. The thing a card needs to render itself.
- **Hero Alert List:** the ranked, capped list of KPI Results that demand attention today. Populates the "Focus today" section.
- **Funnel Step & Bottleneck:** the per-step volume and conversion-from-previous, plus the identification of the lowest-conversion step as the bottleneck call-out.
- **Dataset Switcher:** the navigation primitive that lets the user move across A / B / C / D, using the URL as the source of truth.
- **Analysis Pipeline:** the pure function that turns a Dataset + window options into the bundle of outputs the dashboard needs (KPIs, alerts, funnel, win rate). Pure-function nature is what enables predictable, memoizable rendering.

### Conceptual Relationships

- A **Dataset** owns a series of **Day Points** and a list of **Metric Metadata**. The Dataset is the lifecycle root for everything the dashboard renders.
- A **KPI Result** is produced by applying the **Metric Presentation Registry** entry for a metric to a **Comparison Window** of **Day Points**. The Day Points are the source of truth; the Registry is the lens; the Comparison Window is the frame.
- A **Severity Tier** is computed from a KPI Result's current/prior values and its **Direction**, optionally refined by per-metric **Severity Rule** overrides.
- The **Hero Alert List** is a derived *view* over the KPI Results — never authored independently; ranking is severity tier first, then magnitude of change.
- The **Funnel** is a parallel derivation over the same Day Points but on a separate (longer) window because cycle time would make a 7-day "won" too sparse.
- The **Dataset Switcher** changes which Dataset feeds the entire pipeline; everything else recomputes from that one input.

### Key Business Rules

- **Win rate is a period metric, not a cohort.** It is `sum(deals_won) / sum(deals_won + deals_lost)` over the window — the brief is explicit, and confusing it with a cohort metric would change every number on the page.
- **`stale_deals` is a snapshot, not a flow.** Aggregating it over a window means taking the latest reading, never summing daily values.
- **Per-day flow metrics aggregate as means over the window, not sums.** This makes values read as "per day" so the user can compare day-to-day; sums depend on window length and confuse comparisons.
- **Direction inverts the sign of the signed change.** A +30 % move in `deals_lost` is bad; the same move in `deals_won` is good. Centralizing this rule keeps the UI free of metric-by-metric special casing.
- **Final severity is the maximum of trend severity and absolute severity.** A metric is as severe as its worst dimension; "things are slowly getting better but the absolute number is still terrible" must surface, and so must "the absolute number is fine but the trend is collapsing".
- **A null-only window yields severity `OK`, not a false alert.** Absence of signal is not a problem to flag.
- **The hero is filtered at WATCH or worse and capped at three items.** "Five minutes before standup" — three things are remembered, ten are noise.
- **The funnel uses a 30-day window**, not the comparison window, because B2B cycle time means weekly "won" volumes are too sparse to reason about.
- **The bottleneck is the funnel step with the lowest non-null conversion-from-previous.** The first step (visits) has no upstream and is excluded from the candidate set.
- **Dataset A and dataset C must produce visibly different hero output.** This is the design's litmus test — if the page looks the same on a rotting pipeline and a healthy one, the dashboard has failed its purpose.

---

## Strategic Approach

### Solution Direction

The dashboard rests on a clean separation between a **pure domain layer** that turns a Dataset into "what to render" and a **presentational layer** that knows nothing about metrics, only about Presentations and KPI Results. Everything funnels through one central abstraction: the **Metric Presentation Registry** — a single keyed configuration that defines, for each metric, how its window of daily values is collapsed into a number, how that number is shown, when the user should care, and what to call it. UI components consume that registry and never branch on metric `key`. Adding a new metric is a one-row change.

The data flow is one-way: the URL chooses a Dataset, the analysis pipeline turns it into a bundle of derived results (KPIs, alerts, funnel, win rate) memoized on the dataset identity, and React components render those results. The pipeline is a pure function — the same Dataset and window options always yield the same bundle, with no React or DOM dependencies. This makes the analysis trivially memoizable and gives the team a target that can be exercised in isolation if automated tests are introduced later.

The "respond differently to each dataset" requirement is achieved not by per-dataset logic but by tuning the registry's severity rules so that the natural shape of each dataset surfaces. Dataset A's stale-pipeline behavior trips multiple severity rules; dataset C's healthy numbers trip none; the hero list is the visible evidence.

### Key Design Decisions

- **Domain layer is React-free; UI layer is dumb.** The alternative is to scatter aggregation, severity, and formatting across components. Trade-off: a small amount of indirection on day one buys testability, predictable memoization, and a clean place to evolve the analysis. Recommendation: invest in the separation.
- **Severity is a hybrid model — direction-aware delta plus per-metric absolute overrides.** A delta-only model misses the case "the absolute number is bad even when stable" (`stale_deals`, `avg_response_time_min`). An absolute-only model misses "the trend is collapsing fast" (`deals_won`, `avg_deal_cycle_days`). Recommendation: hybrid, composed by taking the worst of trend and absolute. This is the central design lever for differentiating the four datasets.
- **Comparison window is fixed at 7 days versus prior 7 days.** A picker would be a feature surface that costs design time and does not change the answer to "where do I focus today" for a Sales Manager opening the app daily. Recommendation: hardcode 7 d for the MVP; expose later if a use case appears.
- **Anchor day is the rightmost day in the dataset.** Offline data has no real "today". Recommendation: treat the last day as today, document it as a working assumption; revisit when the product feeds from live data.
- **Funnel uses a 30-day window, not the 7-day comparison window.** Cycle time would make "won" too sparse on a weekly window. Recommendation: 30 d for the funnel only; the rest of the dashboard stays on 7 d.
- **Dataset selection lives in the URL.** A query parameter is shareable, refresh-safe, and free under modern routers. Recommendation: URL is source of truth; component state mirrors it via a small custom hook.
- **`metrics.json` is bundled, not fetched at runtime.** The file is small (~670 KB), there is no network in scope, and a fetch path requires a loading state and error boundary that buy nothing. Recommendation: bundle for the MVP; flag as a "second iteration" change once the file grows or moves remote.
- **Hero is capped at three ranked items, with an explicit "no alerts" empty state.** Capping pushes the design toward picking the right three rather than dumping a long list. Recommendation: 3, with the empty state as a celebrated outcome ("Sin alertas — sigue así") rather than a missing component.
- **Dark theme only.** Single audience, single moment of use; theming is a polish item. Recommendation: dark only for the MVP.
- **Charting is delegated to a single library.** A bespoke SVG layer would be more flexible but consumes time on plumbing. Recommendation: pick one library (Recharts is the default in the BRD), keep all chart code inside dedicated components, and treat the dependency as swappable.

### Alternatives Considered

- **Per-dataset analysis logic** (e.g. branching on the dataset key to decide what to show). Rejected: it makes the analysis pipeline hostage to four hand-tuned code paths and would not generalize to a fifth dataset. The chosen approach achieves differentiation by tuning severity thresholds against the natural shape of each dataset, not by branching.
- **Per-metric React component** (`TrafficCard`, `LeadsCard`, …). Rejected: hard-coded components multiply work and make adding a metric an N-file change. The Registry-driven generic card scales linearly in registry rows.
- **Direction-only severity model** (rely solely on the `direction` flag plus a delta threshold). Rejected: too thin. It does not capture aggregator shape (snapshot vs. flow) or null semantics, and it cannot express "the absolute number is bad regardless of trend".
- **Server-side analysis (a small Node API).** Rejected: there is no backend in scope, and the analysis is fast enough on the client that a server would be overhead with no payoff.
- **Web Worker for analysis.** Rejected for the same reason as the server option: a sub-millisecond pure function does not need a worker.
- **Side-by-side dataset comparison** (showing A and B together). Rejected as out of scope: the brief asks for navigation between datasets, not comparison, and a compare view is a different product feature with its own design.
- **Configurable severity thresholds via UI.** Rejected for the MVP: it requires settings persistence and a settings surface. Thresholds are kept in the registry where a developer can tune them; "expose to user" is a second-iteration item.
- **Light / system theme.** Rejected for the MVP: comfort improvement, not a functional gap.

---

## Risk & Gap Analysis

### Requirement Ambiguities

- **Hero cap of three items is a heuristic.** A dataset with one obvious problem and ten minor ones is fine. A dataset with seven roughly equal alerts is awkward — the design forces a cut at 3 even if items 4–5 are nearly as severe. Worth confirming with the reviewer that 3 is right or whether dynamic 1–5 is preferred.
- **Severity absolute thresholds are author-eyeballed.** `stale_deals` (60 / 100 / 150) and `avg_response_time_min` (30 / 60 / 90 min) are calibrated against the four datasets so that dataset A trips clearly and dataset C stays calm. A domain expert at Palvi may have different cutoffs; the reviewer is the next-best proxy.
- **Funnel window length is not in the brief.** The choice of 30 days is justified by cycle-time reasoning, but it is not anchored to a Palvi-side fact. A different choice would not break the design; it would change the funnel's apparent volumes and conversions.
- **Anchor day choice assumes data is fresh up to the dataset's last day.** A real product feeding from delayed pipelines would land 2–3 days behind the dataset's `end_date`. Hardcoded "last day" is correct for offline data but should be revisited if the product moves to live ingestion.
- **"Visibly different" between A and C is a qualitative target.** The design's litmus is severity rules tuned per metric. The reviewer's intuition about "visibly different" may not match the author's; a one-line README note about how the severity model is calibrated reduces this risk.
- **Hero copy language vs. metric label language.** The BRD calls for Spanish UI chrome and English metric labels (because they ship that way in the data). This is consistent but worth flagging to a Chilean reviewer who might prefer fully Spanish.

### Edge Cases

- **All-null current window.** The aggregator yields nothing; the severity model returns `OK`. Visually, the card would display a value of zero with a benign delta — technically correct but readable as a real number. A small polish item: render an em-dash or "—" when the entire current window is null. Tracked as a second-iteration improvement.
- **Dataset shorter than the comparison window.** Window slicing is defensive (current window clamps to the dataset start), but a prior window can collapse to empty. Severity correctly returns `OK`, but the delta line may read as `→ 0% vs prior` even though there is no prior data — slightly misleading.
- **Funnel with zero traffic.** Conversion ratios collapse to zero, and no step qualifies as the bottleneck. The funnel still renders, just empty. Acceptable.
- **Severity tie in the hero ranking.** Two ALERT items with identical magnitude of change. Stable ordering keeps source order; document it so the reviewer is not surprised.
- **Bad `?dataset=` value in the URL.** Should fall back to `A` silently — the user did not type the URL; they followed a stale link. Surfacing an error would interrupt without value.
- **Sparkline trailing nulls.** Choosing to connect across nulls keeps the line continuous; choosing to break at nulls reflects reality more honestly. The default is "connect" for visual continuity; flag as a small visual decision a reviewer might want to revisit.
- **Browser back without prior pushState.** First page load reads the URL on mount, no history dependency. Subsequent dataset changes push history; back/forward then walk that history correctly. Edge case: opening the app fresh and immediately pressing back leaves the app, as expected.
- **Dataset whose `direction` for `support_tickets_opened` is `higher_is_better`.** All four datasets show a sharp baseline lift in this metric (~+220 %), and the metadata's direction would mark that as good. This is documented as shared noise, treated trend-only with no absolute floor; a reviewer with different domain knowledge may want a different stance.

### Technical Risks

- **Registry typos pass type-check.** A wrong aggregator or formatter would render plausible-looking but wrong numbers. Mitigation direction: a per-metric fixture test asserting the right shape (snapshot vs. flow) when automated tests are introduced.
- **Implicit dataset ordering.** All sliding-window math relies on `days[]` being chronological. The dataset ships in order today, but a future producer could break that invariant silently. Mitigation direction: defensive sort or assertion at ingestion.
- **Bundling 670 KB of JSON.** Acceptable for the demo; in a production deployment the file would move to a fetch path with a loading skeleton. Mitigation direction: documented as a known second-iteration change.
- **Chart library responsive container behavior.** Charts inside a card with no explicit height collapse silently. Mitigation direction: every chart wrapper carries an explicit height; do not rely on flex behavior.
- **No top-level error boundary.** A throw inside the analysis pipeline would unmount the app. Mitigation direction: add an error boundary in a follow-up; for an internal demo the cost of skipping it is acceptable.
- **Threshold calibration is author-driven.** A reviewer with different intuition about "what counts as alert" can disagree even when the math is right. Mitigation direction: a one-line README note about calibration sources, and pointing the reviewer at the registry as the obvious tuning surface.

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|---|---|---|---|
| AC1 | Switch among A / B / C / D, full re-render under 300 ms | Yes | The analysis pipeline is a memoized pure pass over a 365 × 11 array — sub-millisecond on modern hardware. No risk. |
| AC2 | Dataset A surfaces a pipeline-rot signal at the top of the hero; dataset C surfaces zero CRIT items | Yes — load-bearing | Achieved through severity-rule tuning per metric, not per dataset. **Risk:** thresholds are author-eyeballed; reviewer intuition may differ. **Mitigation:** documenting the calibration approach in the README so the reviewer can see the intent. |
| AC3 | Each KPI card includes value, caption, sparkline, direction-aware delta, severity badge | Yes | Driven entirely by the Metric Presentation Registry; no per-metric branching in the card component. |
| AC4 | Funnel renders five steps with totals and conversions, bottleneck highlighted | Yes | Bottleneck is the lowest non-null conversion-from-previous. The first step (visits) has no upstream and is excluded from candidates. |
| AC5 | `?dataset=B` reloads to B; back/forward navigate between previous selections | Yes | URL is the source of truth; pushState on change; popstate listener for back/forward. |
| AC6 | Null-tolerant aggregation and rendering | Yes | Aggregators ignore nulls; null-only windows yield `OK`. Polish item: render an em-dash on all-null current windows (tracked as second iteration). |
| AC7 | One-page README + ≤3-min video + public repo | Out of analysis scope | Tracked at delivery time. The README needs to mention the registry as the central abstraction, the second-iteration list, and the threshold-calibration note. |
