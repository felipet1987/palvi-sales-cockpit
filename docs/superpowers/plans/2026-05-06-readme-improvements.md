# README Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder bullets in `README.md`'s two sections so reading order matches importance/priority, and convert in-bullet file-path mentions to GitHub-relative Markdown links — all in one commit, while preserving the brief's "one page max, exactly two H2 sections" contract.

**Architecture:** Single-file edit. Two `Edit` operations replace each section's bullet list verbatim with the new ordered+linked version. Verification gates (line count ≤ 50, exactly two `^## ` lines, all linked paths resolve on disk) run before the commit. One commit + one push.

**Tech Stack:** `git`, `gh`, `bat`, `grep`, `wc`. No code, no tests — Markdown content edit with grep-based verification.

---

## File Structure

| Path | Type | Purpose |
|---|---|---|
| `README.md` | Modify (lines 16-26 and 28-40) | Reorder both bullet lists; add inline links to file paths in Decisiones técnicas. |

The lead paragraph (lines 1-14) and the run-instructions block are unchanged.

---

## Task 0: Pre-flight checks

**Files:** none (read-only)

- [ ] **Step 1: Confirm working directory**

Run: `pwd`
Expected: `/Volumes/Secundary/tarea_palvi`

- [ ] **Step 2: Confirm git is clean and on main**

Run: `git status --short && git branch --show-current`
Expected: empty status output, then a single line `main`. Any uncommitted changes → STOP and address them first.

- [ ] **Step 3: Confirm origin tracks main**

Run: `git rev-parse --abbrev-ref --symbolic-full-name @{u}`
Expected: `origin/main`.

- [ ] **Step 4: Confirm current README baseline**

Run: `wc -l README.md`
Expected: `40 README.md` (or close — the plan was written against 40 lines).

Run: `grep -c '^## ' README.md`
Expected: `2`.

Run: `grep -c '^- ' README.md`
Expected: `18`.

- [ ] **Step 5: Confirm every path the new links will point to exists**

Run:
```bash
for p in src/domain/metric-registry.ts src/data src/domain src/domain/analysis.ts \
         src/ui/useDatasetParam.ts \
         src/ui/components/ui/Card.tsx src/ui/components/ui/Tabs.tsx src/ui/components/ui/Badge.tsx; do
  if [ -e "$p" ]; then echo "OK $p"; else echo "MISSING $p"; fi
done
```
Expected: 8 lines, all starting with `OK`. Any `MISSING` → STOP and report BLOCKED — the link target does not exist on disk and would 404 on GitHub.

---

## Task 1: Reorder + link Decisiones técnicas section

**Files:**
- Modify: `README.md:16-26` (the "Decisiones técnicas" header + its 9 bullets)

- [ ] **Step 1: Replace the entire Decisiones técnicas block**

Use the `Edit` tool with these exact strings.

OLD (the literal current content of lines 16-26 in `README.md`):

```
## Decisiones técnicas

- **Una sola "switching surface" — `src/domain/metric-registry.ts`.** Cada métrica vive como una fila en `REGISTRY` con `aggregate`, `format`, `caption`, `severity?`, `hint`. Agregar una métrica = una fila. Los componentes UI no hacen `switch (key)` — leen `Presentation` y `KpiResult`.
- **Severity híbrida — trend + absolute, `max` de las dos.** El default `deltaSeverity` es direction-aware (umbrales en −5 / −15 / −30 %); `stale_deals` y `avg_response_time_min` agregan thresholds absolutos (60/100/150 deals · 30/60/90 min). Esto es lo que diferencia A (pipeline pudriéndose, varios CRIT/ALERT) de C (sano, casi todo OK).
- **Dominio puro vs UI tonta.** `src/data/` y `src/domain/` no importan React, DOM ni librerías de chart. La pipeline `analyze(dataset, opts) → AnalysisResult` es una función pura memoizada con `useMemo` sobre la identidad del dataset. Tests automatizados quedaron diferidos pero el seam está listo.
- **URL como única fuente de verdad para navegación.** `?dataset=A` se refleja vía `useDatasetParam` (read on mount, pushState on change, popstate listener). Sin router, sin Context, sin store global. `<Dashboard key={datasetId} dataset={dataset} />` remonta limpio al cambiar.
- **Ventanas: 7d vs 7d previos para KPIs / win rate; 30d para funnel.** El cycle time B2B haría que "won" fuera demasiado escaso en una ventana de 7d.
- **Win rate como métrica de período**, no de cohorte: `sum(won) / sum(won + lost)` sobre la ventana, alineado con la definición del brief.
- **Stack pragmático.** Vite 5 + React 18 + TypeScript strict + Tailwind 3 + shadcn-style primitives hechas a mano (`Card`, `Tabs` vía Radix, `Badge`) + Recharts solo para sparklines. Funnel hecho a mano (Tailwind widths) — el funnel de Recharts no encajaba con el layout que quería.
- **`metrics.json` bundleado, no fetched.** 670 KB es chico; fetch + loading state no aporta para un demo offline.
- **Dark theme único.** Audiencia única, momento único de uso. Theming queda como polish.
```

NEW (same nine bullets, reordered, with paths linked):

```
## Decisiones técnicas

- **Una sola "switching surface" — [`src/domain/metric-registry.ts`](./src/domain/metric-registry.ts).** Cada métrica vive como una fila en `REGISTRY` con `aggregate`, `format`, `caption`, `severity?`, `hint`. Agregar una métrica = una fila. Los componentes UI no hacen `switch (key)` — leen `Presentation` y `KpiResult`.
- **Severity híbrida — trend + absolute, `max` de las dos.** El default `deltaSeverity` es direction-aware (umbrales en −5 / −15 / −30 %); `stale_deals` y `avg_response_time_min` agregan thresholds absolutos (60/100/150 deals · 30/60/90 min). Esto es lo que diferencia A (pipeline pudriéndose, varios CRIT/ALERT) de C (sano, casi todo OK).
- **Win rate como métrica de período**, no de cohorte: `sum(won) / sum(won + lost)` sobre la ventana, alineado con la definición del brief.
- **Ventanas: 7d vs 7d previos para KPIs / win rate; 30d para funnel.** El cycle time B2B haría que "won" fuera demasiado escaso en una ventana de 7d.
- **Dominio puro vs UI tonta.** [`src/data/`](./src/data/) y [`src/domain/`](./src/domain/) no importan React, DOM ni librerías de chart. La pipeline [`analyze(dataset, opts) → AnalysisResult`](./src/domain/analysis.ts) es una función pura memoizada con `useMemo` sobre la identidad del dataset. Tests automatizados quedaron diferidos pero el seam está listo.
- **URL como única fuente de verdad para navegación.** `?dataset=A` se refleja vía [`useDatasetParam`](./src/ui/useDatasetParam.ts) (read on mount, pushState on change, popstate listener). Sin router, sin Context, sin store global. `<Dashboard key={datasetId} dataset={dataset} />` remonta limpio al cambiar.
- **Stack pragmático.** Vite 5 + React 18 + TypeScript strict + Tailwind 3 + shadcn-style primitives hechas a mano ([`Card`](./src/ui/components/ui/Card.tsx), [`Tabs`](./src/ui/components/ui/Tabs.tsx) vía Radix, [`Badge`](./src/ui/components/ui/Badge.tsx)) + Recharts solo para sparklines. Funnel hecho a mano (Tailwind widths) — el funnel de Recharts no encajaba con el layout que quería.
- **`metrics.json` bundleado, no fetched.** 670 KB es chico; fetch + loading state no aporta para un demo offline.
- **Dark theme único.** Audiencia única, momento único de uso. Theming queda como polish.
```

- [ ] **Step 2: Spot-check the edit**

Run:
```bash
sed -n '16,26p' README.md | head -1
sed -n '17p' README.md
```
Expected: line 16 is `## Decisiones técnicas`. Line 17 starts with `- **Una sola "switching surface"`.

Run: `grep -n "Win rate como métrica de período" README.md | head -1`
Expected: a line number BETWEEN 18 and 19 (Win rate moved up to position 3, just under the registry and severity bullets).

Run: `grep -n "Dominio puro vs UI tonta" README.md | head -1`
Expected: a line number BETWEEN 20 and 21 (Dominio puro moved down to position 5).

- [ ] **Step 3: Do not commit yet**

The next task edits the second section. Both edits ship in one commit at Task 4.

---

## Task 2: Reorder Segunda iteración section

**Files:**
- Modify: `README.md` (Segunda iteración header + its 9 bullets)

- [ ] **Step 1: Replace the entire Segunda iteración block**

Use the `Edit` tool with these exact strings.

OLD (the literal current content of lines 28-40 in `README.md`):

```
## Segunda iteración

Cosas que sé que faltan o haría distinto, ordenadas por prioridad si esto fuera real:

- **Tests por métrica.** Una fixture chica que asegure que `stale_deals` se agrega como snapshot, que `traffic` es mean, que los nulls se ignoran. La pureza de `analyze()` lo hace barato; quedó fuera por el budget de 3h.
- **Error boundary top-level.** Un throw en `analyze` hoy desmonta la app entera. Para producción interna no es aceptable.
- **Em-dash en ventanas all-null.** Un día con `avg_response_time_min` null por toda la ventana actual hoy renderiza "0.0 min" — técnicamente correcto pero leíble como valor real.
- **Selector de ventana / anchor day.** Hardcoded a 7d y al último día. Si el producto se conecta a datos en vivo con delay de pipelines, hay que dejar al usuario pedir "ayer" o "hace 2 días".
- **Calibración de thresholds documentada / configurable.** Los umbrales absolutos de `stale_deals` y `avg_response_time_min` los calibré contra los 4 datasets dados. Un experto de Palvi probablemente quiere otros números — ahora vive en código, debería ser configurable.
- **Drill-down por métrica.** Click en card → vista detalle con ventanas más largas y breakdown. Hoy solo sparkline 30d.
- **CSV / PDF export del reporte.** Para mandarle el "foco de hoy" al equipo por mail.
- **Light theme + responsive mobile más cuidado.** El mobile funciona pero la jerarquía colapsa; un tomar 30 min más sería razonable.
- **Fetched JSON con loading skeleton.** Cuando el dataset crezca o se mueva a un endpoint, el loader cambia y aparece un estado de carga.
```

NEW (same nine bullets, reordered by priority descending; em-dash and Light theme go to the bottom; Selector and Fetched JSON move up):

```
## Segunda iteración

Cosas que sé que faltan o haría distinto, ordenadas por prioridad si esto fuera real:

- **Tests por métrica.** Una fixture chica que asegure que `stale_deals` se agrega como snapshot, que `traffic` es mean, que los nulls se ignoran. La pureza de `analyze()` lo hace barato; quedó fuera por el budget de 3h.
- **Error boundary top-level.** Un throw en `analyze` hoy desmonta la app entera. Para producción interna no es aceptable.
- **Selector de ventana / anchor day.** Hardcoded a 7d y al último día. Si el producto se conecta a datos en vivo con delay de pipelines, hay que dejar al usuario pedir "ayer" o "hace 2 días".
- **Calibración de thresholds documentada / configurable.** Los umbrales absolutos de `stale_deals` y `avg_response_time_min` los calibré contra los 4 datasets dados. Un experto de Palvi probablemente quiere otros números — ahora vive en código, debería ser configurable.
- **Fetched JSON con loading skeleton.** Cuando el dataset crezca o se mueva a un endpoint, el loader cambia y aparece un estado de carga.
- **Drill-down por métrica.** Click en card → vista detalle con ventanas más largas y breakdown. Hoy solo sparkline 30d.
- **CSV / PDF export del reporte.** Para mandarle el "foco de hoy" al equipo por mail.
- **Light theme + responsive mobile más cuidado.** El mobile funciona pero la jerarquía colapsa; un tomar 30 min más sería razonable.
- **Em-dash en ventanas all-null.** Un día con `avg_response_time_min` null por toda la ventana actual hoy renderiza "0.0 min" — técnicamente correcto pero leíble como valor real.
```

- [ ] **Step 2: Spot-check the edit**

Run: `grep -n "Em-dash en ventanas all-null" README.md`
Expected: a single line near the end of the file (was line ~34, now near line ~40 — last bullet of Segunda iteración).

Run: `grep -n "Selector de ventana / anchor day" README.md`
Expected: a line number that is now SMALLER than the Em-dash line number (Selector now precedes Em-dash).

Run: `grep -n "Fetched JSON con loading skeleton" README.md`
Expected: a line number BETWEEN the Calibración line and the Drill-down line (Fetched JSON moved up from last position to position 5).

---

## Task 3: Verify all constraints before committing

**Files:** none (read-only)

- [ ] **Step 1: Line count under 50**

Run: `wc -l README.md | awk '{print $1}'`
Expected: ≤ `50`. Likely the same as before (40) or close — we did not add or remove bullets.

- [ ] **Step 2: Exactly two H2 sections**

Run: `grep -c '^## ' README.md`
Expected: `2`.

- [ ] **Step 3: Bullet count unchanged**

Run: `grep -c '^- ' README.md`
Expected: `18` (9 + 9, same as before).

- [ ] **Step 4: All bullets from Decisiones técnicas survive (uniqueness check)**

Run:
```bash
for s in 'switching surface' 'Severity híbrida' 'Win rate como métrica de período' \
         'Ventanas: 7d vs 7d previos' 'Dominio puro vs UI tonta' \
         'URL como única fuente de verdad' 'Stack pragmático' \
         '`metrics.json` bundleado' 'Dark theme único'; do
  c=$(grep -c "$s" README.md)
  if [ "$c" = "1" ]; then echo "OK 1× $s"; else echo "FAIL ${c}× $s"; fi
done
```
Expected: 9 lines, all starting `OK 1×`.

- [ ] **Step 5: All bullets from Segunda iteración survive (uniqueness check)**

Run:
```bash
for s in 'Tests por métrica' 'Error boundary top-level' \
         'Selector de ventana / anchor day' 'Calibración de thresholds' \
         'Fetched JSON con loading skeleton' 'Drill-down por métrica' \
         'CSV / PDF export del reporte' 'Light theme + responsive mobile' \
         'Em-dash en ventanas all-null'; do
  c=$(grep -c "$s" README.md)
  if [ "$c" = "1" ]; then echo "OK 1× $s"; else echo "FAIL ${c}× $s"; fi
done
```
Expected: 9 lines, all starting `OK 1×`.

- [ ] **Step 6: All linked paths resolve**

Run:
```bash
grep -oE '\(\.\/[^)]+\)' README.md | sed 's/^(//;s/)$//' | sort -u | while read p; do
  if [ -e "$p" ]; then echo "OK $p"; else echo "MISSING $p"; fi
done
```
Expected: every line starts with `OK`. Any `MISSING` → STOP, the new README has a broken link; revisit Task 1 / Task 2.

- [ ] **Step 7: Reading-order spot check**

Run: `grep -n '^- \*\*' README.md`
Expected (line numbers may shift slightly; the order is what matters):
1. `Una sola "switching surface"`
2. `Severity híbrida — trend + absolute`
3. `Win rate como métrica de período`
4. `Ventanas: 7d vs 7d previos`
5. `Dominio puro vs UI tonta`
6. `URL como única fuente de verdad`
7. `Stack pragmático`
8. `\`metrics.json\` bundleado`
9. `Dark theme único`
10. `Tests por métrica`
11. `Error boundary top-level`
12. `Selector de ventana / anchor day`
13. `Calibración de thresholds`
14. `Fetched JSON con loading skeleton`
15. `Drill-down por métrica`
16. `CSV / PDF export del reporte`
17. `Light theme + responsive mobile`
18. `Em-dash en ventanas all-null`

If any pair is out of order, STOP — the edit landed wrong; revisit the failed task.

---

## Task 4: Commit and push

**Files:**
- Modify (in this commit): `README.md`

- [ ] **Step 1: Stage and commit**

Run:
```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs(readme): reorder bullets + link in-bullet file paths

Decisiones técnicas: regroup so domain rules (registry, severity, win
rate, windows) lead, architecture (pure domain, URL) follows, tech
choices (stack, bundling, theme) close.

Segunda iteración: re-rank by real priority — em-dash and light theme
fall to the bottom (cosmetic), selector de ventana and fetched JSON
rise (real-product needs).

Inline file-path mentions in Decisiones técnicas now link to the
corresponding files at the repo root, so a reviewer can click straight
from a bullet to the central artifact (metric-registry.ts, analysis.ts,
useDatasetParam, the shadcn-style primitives).

No new sections, no prose rewrite, no length growth — same 18 bullets
in same words, just reordered and annotated.
EOF
)"
```
Expected: a `[main <sha>]` line followed by `1 file changed`.

- [ ] **Step 2: Push to origin**

Run: `git push origin main`
Expected: a final line `<old>..<new>  main -> main`.

- [ ] **Step 3: Verify the new HEAD on GitHub matches local**

Run:
```bash
gh api repos/felipet1987/palvi-sales-cockpit/commits/main --jq '.sha'
```
Expected: matches `git rev-parse HEAD` exactly.

Run: `git rev-parse HEAD` and visually compare.

- [ ] **Step 4: Verify the live README reflects the change (cache-busting URL)**

Run:
```bash
sleep 5
curl -s "https://raw.githubusercontent.com/felipet1987/palvi-sales-cockpit/main/README.md?$(date +%s)" \
  | grep -c "switching surface"
```
Expected: `1`. (CDN can lag a few seconds; if 0, retry once after `sleep 30`.)

Run:
```bash
curl -s "https://raw.githubusercontent.com/felipet1987/palvi-sales-cockpit/main/README.md?$(date +%s)" \
  | grep -A0 -B0 -n "Em-dash en ventanas all-null"
```
Expected: a single result whose line number is greater than the line containing `"Light theme + responsive mobile"` (em-dash now last).

---

## Self-Review

**1. Spec coverage**

| Spec section | Plan coverage |
|---|---|
| § 1 Context — decisions cached | Pre-flight Task 0 confirms baseline; Task 1+2 honor the "no rewrite, no new content" rule |
| § 2.1 Reorder Decisiones técnicas (9 items, with explicit moves) | Task 1 (verbatim OLD/NEW blocks, plus Step 2 spot-checks the move of Win rate to position 3 and Dominio puro to position 5) |
| § 2.2 Reorder Segunda iteración (9 items, priority descending) | Task 2 (verbatim OLD/NEW blocks, plus Step 2 spot-checks Em-dash now last and Selector before it) |
| § 2.3 Hyperlinks on file paths (5 named replacements) | Task 1 NEW block contains every link from the spec table; Task 0 Step 5 confirms each path exists; Task 3 Step 6 confirms all `./...` links in the file resolve |
| § 3 What is NOT in scope | The plan never adds a section, sub-heading, paragraph, banner, badge, ToC, Demo URL, Docker line, or English translation — confirmed by absence |
| § 4 Constraints + verification | Task 3 Steps 1–7 implement every row of the spec's verification table |
| § 5 Risks: drop/dup bullet | Task 3 Steps 4 and 5 grep-count each named bullet exactly once |
| § 5 Risks: broken link 404s | Task 0 Step 5 (pre) and Task 3 Step 6 (post) cover this twice |
| § 5 Risks: scope creep | Out-of-scope list reads as the inverse of the OLD/NEW diff |
| § 5 Risks: line creep | Task 3 Step 1 enforces ≤ 50 |
| § 6 Submission impact | One push to `main`; Task 4 Step 4 verifies the live raw README |

**2. Placeholder scan:** none. Every OLD/NEW block is the literal text. Every command is concrete with an explicit expected output.

**3. Type consistency:** no code interfaces; only file paths. The 8 paths checked in Task 0 Step 5 match exactly the 8 paths whose links appear in Task 1 Step 1's NEW block. Bullet text appears identically across spec, OLD, and NEW. Commit message body matches the actual change.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-06-readme-improvements.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
