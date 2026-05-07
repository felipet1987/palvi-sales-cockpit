# Palvi Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the implemented Palvi Sales Cockpit to a public GitHub repo, verify everything is reachable from the outside, and hand the user a finalized recording script for the 3-minute Loom video.

**Architecture:** Two-stage delivery. Stage 1 is fully automatable (gh CLI, curl smoke tests). Stage 2 produces a single Markdown artifact (`VIDEO_SCRIPT.md`) the user can read aloud while recording — no automation possible there because Loom recording requires the user.

**Tech Stack:** `gh` CLI (GitHub auth via SSH), `git`, `curl`, `bat`, `eza`. No application code changes — the implementation is already complete and committed (commit `c483860` and earlier).

---

## File Structure

| Path | Type | Purpose |
|---|---|---|
| `VIDEO_SCRIPT.md` | Create | Time-budgeted Loom recording script the user reads while recording. Lives at repo root so it travels with the deliverable and the user can keep it open in a second window during recording. |
| GitHub repo `felipet1987/palvi-sales-cockpit` | Create remote | Public repo holding all 13 commits at delivery time. |
| `git remote origin` | Add | Points local `main` at the new GitHub repo. |

No source code changes. No test files (delivery has no automated tests — verification is via gh/curl smoke checks).

---

## Pre-flight checks

### Task 0: Verify environment is ready to publish

**Files:** none

- [ ] **Step 1: Confirm working directory**

Run: `pwd`
Expected: `/Volumes/Secundary/tarea_palvi`

- [ ] **Step 2: Confirm git state is clean**

Run: `git status --short`
Expected: empty output (no uncommitted changes, no untracked files).
If there are leftover changes from earlier work, commit or stash them before proceeding.

- [ ] **Step 3: Confirm we are on `main`**

Run: `git branch --show-current`
Expected: `main`

- [ ] **Step 4: Confirm there is no `origin` remote yet**

Run: `git remote -v`
Expected: empty output. If `origin` already exists, abort and investigate — the spec assumes a fresh remote.

- [ ] **Step 5: Confirm the gh CLI is authenticated**

Run: `gh auth status 2>&1 | head -10`
Expected: contains `Logged in to github.com account felipet1987` and `Active account: true`.
If not authenticated, run `gh auth login` interactively and retry.

- [ ] **Step 6: Confirm the target repo name is free**

Run: `gh repo view felipet1987/palvi-sales-cockpit 2>&1 | head -3`
Expected: error containing `Could not resolve to a Repository`. (If the repo already exists, choose a different name and update every later step accordingly.)

- [ ] **Step 7: Confirm commit count**

Run: `git log --oneline | wc -l | awk '{print $1}'`
Expected: `13` (or higher if more commits landed since the spec was written). The actual number is informational — the next task will push whatever is on `main`.

---

## Stage 1 — GitHub publishing

### Task 1: Create the public GitHub repo and push

**Files:**
- Modify (remote-side): repository `felipet1987/palvi-sales-cockpit`
- Modify (local): `.git/config` (adds `origin` remote)

- [ ] **Step 1: Create the repo and push in one shot**

Run:
```bash
gh repo create felipet1987/palvi-sales-cockpit \
  --public \
  --description "Executive sales report for B2B SaaS — Palvi technical task" \
  --source . \
  --remote origin \
  --push
```

Expected output: a final line containing
`https://github.com/felipet1987/palvi-sales-cockpit`
plus push progress lines from git.

If the command fails halfway (repo created but push failed), recover with:
```bash
git remote -v          # confirm 'origin' is set
git push -u origin main
```

- [ ] **Step 2: Confirm `origin` is set and tracks main**

Run: `git remote -v && git rev-parse --abbrev-ref --symbolic-full-name @{u}`

Expected:
```
origin  git@github.com:felipet1987/palvi-sales-cockpit.git (fetch)
origin  git@github.com:felipet1987/palvi-sales-cockpit.git (push)
origin/main
```
(SSH URL because the active gh protocol is SSH per `gh auth status`.)

- [ ] **Step 3: Confirm GitHub state matches local**

Run: `gh repo view felipet1987/palvi-sales-cockpit --json visibility,defaultBranchRef,url --jq '.visibility, .defaultBranchRef.name, .url'`

Expected:
```
PUBLIC
main
https://github.com/felipet1987/palvi-sales-cockpit
```

If visibility is anything other than `PUBLIC`, run:
```bash
gh repo edit felipet1987/palvi-sales-cockpit --visibility public --accept-visibility-change-consequences
```
and re-run Step 3.

- [ ] **Step 4: No commit needed for this task**

`gh repo create --source . --push` makes no local commits — it only adds a remote. There is nothing to commit here. Move to Task 2.

---

### Task 2: Smoke-test the published repo from outside

**Files:** none

- [ ] **Step 1: Verify the README is reachable from raw.githubusercontent.com**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://raw.githubusercontent.com/felipet1987/palvi-sales-cockpit/main/README.md
```
Expected: `200`.

- [ ] **Step 2: Verify the metric registry — the central artifact reviewers will look for — is reachable**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://raw.githubusercontent.com/felipet1987/palvi-sales-cockpit/main/src/domain/metric-registry.ts
```
Expected: `200`.

- [ ] **Step 3: Verify the SPDD trail is browsable**

Run:
```bash
gh api repos/felipet1987/palvi-sales-cockpit/contents/spdd \
  --jq '.[].name'
```
Expected (order may vary): `analysis`, `brd`, `prompt`.

- [ ] **Step 4: Confirm the public web view renders the README correctly**

Run: `gh repo view felipet1987/palvi-sales-cockpit --web`
Expected: a browser tab opens at `https://github.com/felipet1987/palvi-sales-cockpit`.
Visually confirm:
- Repo header reads "Executive sales report for B2B SaaS — Palvi technical task".
- README renders with the two sections "Decisiones técnicas" and "Segunda iteración".
- File tree shows `src/`, `spdd/`, `metrics.json`, `task.pdf`, `Dockerfile`, `nginx.conf`, `README.md`, `package.json`.

- [ ] **Step 5: Confirm anonymous (logged-out) access works**

Either open the URL above in a browser private/incognito window, or run:
```bash
curl -s -H "User-Agent: anonymous" \
  -o /dev/null -w "%{http_code}\n" \
  https://github.com/felipet1987/palvi-sales-cockpit
```
Expected: `200`. (Anything in the 3xx range is fine too — GitHub may redirect for canonicalization. A `404` would mean the repo is not public.)

- [ ] **Step 6: No commit needed**

This task only verifies. No file changes. Continue to Task 3.

---

### Task 3: Clone-and-run smoke test

**Files:** none. Performed against a temporary clone in `/tmp`.

- [ ] **Step 1: Clone fresh into a scratch directory**

Run:
```bash
rm -rf /tmp/palvi-smoke
git clone https://github.com/felipet1987/palvi-sales-cockpit.git /tmp/palvi-smoke
```
Expected: clone completes without error, ending in `Resolving deltas: 100% (...)`.

- [ ] **Step 2: Inspect the cloned tree matches local**

Run: `eza -la /tmp/palvi-smoke | head -20`
Expected: `README.md`, `metrics.json`, `task.pdf`, `Dockerfile`, `nginx.conf`, `package.json`, `package-lock.json`, `src/`, `spdd/`, `docs/`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.gitignore`, `.dockerignore`.
Confirm `node_modules/` is NOT present.

- [ ] **Step 3: Install dependencies in the clone**

Run: `cd /tmp/palvi-smoke && npm install 2>&1 | tail -5`
Expected: a final line containing `added` and a count of packages, no `npm ERR!`.

- [ ] **Step 4: Typecheck the clone**

Run: `cd /tmp/palvi-smoke && npm run typecheck 2>&1 | tail -3`
Expected: empty output (or the npm script prelude only). A non-zero exit means TypeScript errors slipped past local typecheck — fix locally and push before proceeding.

- [ ] **Step 5: Boot the dev server and probe it**

Run, in order:
```bash
cd /tmp/palvi-smoke
npm run dev > /tmp/palvi-smoke.log 2>&1 &
DEV_PID=$!
until grep -q "ready in" /tmp/palvi-smoke.log; do sleep 0.5; done
curl -s -o /dev/null -w "/?dataset=A → %{http_code}\n" http://localhost:5173/?dataset=A
curl -s -o /dev/null -w "/?dataset=C → %{http_code}\n" http://localhost:5173/?dataset=C
kill "$DEV_PID"
```
Expected: both probes return `200`. Then dev server is killed.

- [ ] **Step 6: Clean up**

Run: `rm -rf /tmp/palvi-smoke /tmp/palvi-smoke.log`
Expected: empty output.

- [ ] **Step 7: No commit needed**

This task only verifies a fresh clone. No file changes. Continue to Stage 2.

---

## Stage 2 — Recording script artifact

### Task 4: Write the finalized video script as `VIDEO_SCRIPT.md`

**Files:**
- Create: `/Volumes/Secundary/tarea_palvi/VIDEO_SCRIPT.md`

The script lives at repo root so the user can keep it open in a second window while Loom records the editor. It is not the README — the README is for evaluators reading the repo, the script is for the recording session only.

- [ ] **Step 1: Write `VIDEO_SCRIPT.md` with the full script**

Create the file with exactly this content:

````markdown
# Loom Recording Script — 3 minutes, single take

Open this in a second window while Loom records the primary monitor.
Do not read it word-for-word — use it as a timing budget.

## Pre-flight (do BEFORE clicking record)

- App running. Either:
  - `npm run dev` and open `http://localhost:5173/?dataset=A`
  - or the podman container at `http://192.168.100.60:8080/?dataset=A`
- Browser zoom at 110% so cards are legible on Loom playback.
- Editor open at `src/domain/metric-registry.ts`. File-tree collapsed.
- Quit Slack, Mail, anything that pings.
- Loom: full screen + camera bubble bottom-right.
- Mic check: speak a sentence, play it back. Sound is the easiest way to ruin a take.

---

## 00:00 – 01:00 — Demo (60 s)

> "Esto es Palvi Sales Cockpit, reporte ejecutivo diario para un Jefe de Ventas B2B."

Show dataset A.

> "Dataset A: pipeline pudriéndose. El hero arriba — 'Tu foco hoy' — me dice las tres cosas que importan: stale_deals 180 abiertos hace más de 60 días en CRIT, average deal cycle en ALERT, support tickets en WATCH."

Click tab `C` (top-right).

> "Mismo dashboard, dataset C: cero alertas críticas. Pipeline sano. Solo dos WATCH."

Click `A` again, then `B`, then `D`, vuelve a `A`. Lento, no apurado.

> "Cada dataset cuenta una historia distinta. Eso es lo que el brief pedía: que la app responda diferente a cada uno. Y no es porque haya código por dataset — es porque las severity rules tripean distinto sobre los datos de cada uno."

---

## 01:00 – 02:30 — Walk-through del código (90 s)

Switch to the editor, file `src/domain/metric-registry.ts`.

> "Éste es EL archivo. La decisión central del diseño: una sola tabla — REGISTRY — donde cada métrica vive como una fila."

Scroll to the `REGISTRY` declaration.

> "Cada fila tiene aggregate, format, caption, severity opcional, y un hint. La UI nunca hace switch sobre la metric key — lee Presentation. Agregar una métrica es UNA fila acá."

Scroll up a bit, mostrar `meanIgnoreNull` y `lastNonNull`.

> "Aggregator distinto por métrica. stale_deals es snapshot, así que último valor del window. Las flow metrics — traffic, leads, deals — son mean ignorando nulls."

Scroll a `deltaSeverity`.

> "Severity por defecto: direction-aware. Un +30% en deals_lost es malo, en deals_won es bueno. Esa inversión vive en una sola línea."

Scroll a `staleDealsSeverity` y `responseTimeSeverity`.

> "Para dos métricas hay overrides absolutos. stale_deals con 161 abiertos es CRIT aunque la tendencia sea estable. La severidad final es el max de trend y absolute."

Switch a `src/domain/analysis.ts`. Scroll a `analyze`.

> "La pipeline es función pura. Dataset + window → AnalysisResult. KPIs, alertas rankeadas, funnel 30d, win rate. La UI consume eso vía useMemo. Cero React acá. Por eso testear esto después es trivial."

---

## 02:30 – 03:00 — Lo que dejé fuera (30 s)

Back to the running app (or stay on the editor — does not matter much).

> "Tres cosas para una segunda iteración."

> "Tests por métrica. La pureza de analyze() los hace baratos, pero los dejé por el budget de tres horas."

> "Selector de ventana y anchor day. Hoy hardcoded a siete días sobre el último día del dataset. Cuando esto se conecte a datos en vivo con delay de pipelines, hay que dejar al usuario elegir."

> "Em-dash en ventanas all-null. Hoy un día sin datos para una métrica renderiza cero punto cero. Es técnicamente correcto pero leíble como valor real."

> "Eso es todo. Gracias."

---

## Recording rules

- Una sola toma. No editar.
- Si te equivocas en los primeros 30 s, reiniciá la grabación.
- Después de 30 s, sigue. Errores menores son humanos.
- Hablar pausado. Tres minutos se hacen cortos pero no aceleres.
- Mostrá el cursor donde estás explicando — Loom no lo resalta automático.

## After recording

- Loom procesa, da link público.
- Verificar el link en ventana de incógnito antes de pegarlo en el form.
- Pegar URL en el form de Asana junto al GitHub URL.
````

- [ ] **Step 2: Verify the file was written**

Run: `bat -p VIDEO_SCRIPT.md | head -5`
Expected: starts with `# Loom Recording Script — 3 minutes, single take`.

Run: `wc -l VIDEO_SCRIPT.md | awk '{print $1}'`
Expected: between `60` and `120` lines.

- [ ] **Step 3: Commit**

```bash
git add VIDEO_SCRIPT.md
git commit -m "docs(video): add 3-min Loom recording script

Time-budgeted script for the single-take video deliverable:
- 00:00–01:00 demo (dataset switch, A vs C contrast)
- 01:00–02:30 walk-through of metric-registry.ts and analysis.ts
- 02:30–03:00 second-iteration items (tests per metric, window picker,
  em-dash on all-null windows)

Lives at repo root so the user can keep it open during recording."
```

- [ ] **Step 4: Push the new commit**

Run: `git push origin main`
Expected: `To github.com:felipet1987/palvi-sales-cockpit.git` followed by ` … main -> main`.

- [ ] **Step 5: Verify the push reached GitHub**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://raw.githubusercontent.com/felipet1987/palvi-sales-cockpit/main/VIDEO_SCRIPT.md
```
Expected: `200`.

---

## Stage 3 — Submission handoff

### Task 5: Print the submission checklist for the user

This task is informational — the agent does NOT submit the form. The user submits.

**Files:** none.

- [ ] **Step 1: Compute and print the final URLs**

Run:
```bash
echo "Repo URL:   https://github.com/felipet1987/palvi-sales-cockpit"
echo "Raw README: https://raw.githubusercontent.com/felipet1987/palvi-sales-cockpit/main/README.md"
echo "Form:       (see Palvi email — Asana form)"
echo "Video URL:  (paste after recording on Loom)"
```

- [ ] **Step 2: Hand the user the final checklist**

Output to the user (do not commit):

```
✅ Repo published: https://github.com/felipet1987/palvi-sales-cockpit
✅ Smoke tests passed (raw fetches, anonymous access, fresh clone + dev server)
✅ Recording script committed at VIDEO_SCRIPT.md

Remaining for the user:
1. Open VIDEO_SCRIPT.md in a second window.
2. Open Loom, set up screen + camera capture.
3. Record one take, ≤ 3 minutes.
4. Wait for Loom to process and copy the public URL.
5. Verify the Loom URL works in an incognito window.
6. Submit the Asana form with:
   - Nombre:  Felipe Fausset
   - Email:   fausset@agy.cl  (override if different)
   - Repo:    https://github.com/felipet1987/palvi-sales-cockpit
   - Video:   <Loom URL>
7. Single-shot submission — no resubmits.
```

- [ ] **Step 3: No commit needed**

The agent's work ends here. The user takes over.

---

## Self-review

**Spec coverage:**

| Spec section | Plan coverage |
|---|---|
| § 1 Context (decisions cached) | Pre-flight Task 0 confirms environment; Task 1 honors public-repo decision; Task 4 honors Loom decision |
| § 2.1 Repo creation command | Task 1 Step 1 (verbatim command) |
| § 2.2 What ships | Task 2 Step 3 (SPDD), Task 2 Step 4 (visual file-tree check), Task 3 Step 2 (clone-side file inspection) |
| § 2.3 No CI/Pages/extras | No tasks add any of those — confirmed by absence |
| § 3 Verification table | Task 1 Step 3 (visibility), Task 2 Step 1 (raw README), Task 2 Step 4 (rendered README), Task 3 (clone + dev server smoke) |
| § 4 Video script | Task 4 — committed `VIDEO_SCRIPT.md` |
| § 4.4 Recording checklist | Embedded in `VIDEO_SCRIPT.md` "Pre-flight" + "Recording rules" + "After recording" |
| § 5 Submission | Task 5 prints the checklist; explicitly NOT performed by the agent |
| § 6 Out of scope | No tasks touch Pages, GIFs, branches, tags, releases, topics, badges, CONTRIBUTING, issue templates, CI |
| § 7 Risks | Task 0 Step 6 (name conflict), Task 1 Step 1 recovery branch (push-failed mid-create), Task 1 Step 3 fallback (visibility wrong), Task 4 length check (script over-budget) |

**Placeholder scan:** none. Every command, file path, and expected output is concrete.

**Type consistency:** no code interfaces in this plan. Only shell commands and one Markdown file. URLs and repo names match across all tasks (`felipet1987/palvi-sales-cockpit`).

**Critical edge case re-checked:** Task 4 commit happens AFTER Task 1's repo creation. If a reader executes Task 4 first, the `git push origin main` in Step 4 will fail because no `origin` exists yet. The task ordering is therefore load-bearing — captured in the dependency graph (Tasks 1 → 2 → 3 → 4 → 5).
