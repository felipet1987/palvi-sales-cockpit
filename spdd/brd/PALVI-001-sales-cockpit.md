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
