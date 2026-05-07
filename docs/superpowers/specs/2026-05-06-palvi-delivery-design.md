# Palvi Sales Cockpit — Delivery Design

| Field | Value |
|---|---|
| Date | 2026-05-06 |
| Author | Felipe Fausset |
| Source brief | `task.pdf` (Palvi technical task) |
| Status | Approved by user, ready to plan |
| Scope | Push the implementation to GitHub and provide a recording script for the 3-minute video |

---

## 1. Context

The implementation is complete and committed locally to `/Volumes/Secundary/tarea_palvi` (11 commits on `main`). Three deliverables remain per the Palvi task brief:

1. **Public GitHub repo** with clear instructions to run locally.
2. **One-page README** (already written and committed).
3. **Video of at most 3 minutes**, single take, no editing, with a fixed 3-section structure.

This document covers the *delivery* of those artifacts — not implementation work.

The user has approved the following decisions:

| Decision | Choice |
|---|---|
| Repo visibility | Public |
| `task.pdf` handling | Keep in repo (user accepts the risk) |
| `spdd/` folder visibility | Keep visible — evidence of process and AI use |
| Video host | Loom |
| Approach | A — lean delivery, no GitHub Pages, no extra polish |

## 2. GitHub publishing

### 2.1 Repo creation

Run from the project root:

```bash
cd /Volumes/Secundary/tarea_palvi
gh repo create felipet1987/palvi-sales-cockpit \
  --public \
  --description "Executive sales report for B2B SaaS — Palvi technical task" \
  --source . \
  --remote origin \
  --push
```

Result:

- Repo created at `https://github.com/felipet1987/palvi-sales-cockpit`.
- All 11 commits on `main` pushed.
- `origin` remote configured.

### 2.2 What ships

Visible in the public repo:

- `README.md` — one page, two sections (Decisiones técnicas, Segunda iteración).
- `metrics.json` — provided dataset, required to run.
- `task.pdf` — kept per user decision.
- `Dockerfile`, `nginx.conf`, `.dockerignore` — container deployment.
- `src/` — the implementation.
- Build configuration: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.gitignore`.
- `spdd/` — BRD, analysis, REASONS Canvas. Demonstrates the design trail and AI collaboration.
- `docs/superpowers/specs/` — including this design.

Excluded by `.gitignore`:

- `node_modules/`, `dist/`, `.DS_Store`, `*.log`, `.env*`, `.claude/`.

### 2.3 No CI, no Pages, no extras

The brief does not require a deployed URL. GitHub Pages was considered (approach B) and rejected to keep failure surface low. CI workflows, issue templates, contributing guides, badges, and topics are all out of scope for this delivery.

## 3. Verification

After the push, run these checks before considering delivery complete:

| Check | Command / action | Expected |
|---|---|---|
| Repo exists + public | `gh repo view felipet1987/palvi-sales-cockpit --json visibility,url` | `"visibility": "PUBLIC"` |
| README renders | Open `https://github.com/felipet1987/palvi-sales-cockpit` in a browser | Markdown renders, two sections visible |
| Raw README accessible | `curl -s -o /dev/null -w "%{http_code}\n" https://raw.githubusercontent.com/felipet1987/palvi-sales-cockpit/main/README.md` | `200` |
| Required artifacts visible | Browse the file tree | `src/`, `metrics.json`, `Dockerfile`, `task.pdf`, `spdd/` all visible |
| Clone + run smoke test | `git clone …` to `/tmp`, `npm install`, `npm run dev` | Localhost serves at `:5173` with the dashboard |

If any check fails, fix locally, push the fix, re-verify.

## 4. Video script (3 minutes, Loom, single take)

The brief is explicit: no intro, no edits, single take. The script below is timing-budgeted, not word-for-word — adapt phrasing live.

### 4.1 00:00 – 01:00 · Demo (60s)

Open the running app (`npm run dev` at `http://localhost:5173/?dataset=A` or the podman container at `:8080`).

- "Palvi Sales Cockpit. Dataset A — pipeline pudriéndose. Hero: stale_deals 180 CRIT, average deal cycle ALERT, support tickets WATCH."
- Click tab `C`. "Mismo dashboard, dataset C — sano. Cero alertas críticas. Solo dos WATCH."
- Switch back to `A`, then `B`, then back to `C`. "Responde diferente a cada uno porque las severity rules tripean distinto. No hay código por dataset, solo umbrales calibrados."

### 4.2 01:00 – 02:30 · Walk-through del código (90s)

Open the editor on `src/domain/metric-registry.ts`.

- "Éste es EL archivo. Cada métrica es una fila con `aggregate`, `format`, `caption`, `severity`, `hint`. La UI no hace `switch` sobre el key — lee `Presentation`."
- Scroll to `staleDealsSeverity` and `responseTimeSeverity`. "Severity híbrida: trend + absolute, máximo de las dos. Stale_deals 161 con tendencia mala es CRIT; 88 estable es WATCH."
- Switch to `src/domain/analysis.ts`. "La pipeline es función pura: dataset + window → AnalysisResult. KPIs, alertas, funnel, win rate. UI lo consume vía `useMemo`. Cero React acá."

### 4.3 02:30 – 03:00 · Lo que dejé fuera (30s)

- "Tres cosas para una segunda iteración:"
  - "Tests por métrica — la pureza de `analyze()` lo hace barato. Lo dejé por el budget de 3h."
  - "Selector de ventana y anchor day — hoy hardcoded a 7d sobre el último día del dataset."
  - "Em-dash en ventanas all-null — hoy renderiza `0.0`, técnicamente correcto pero leíble como valor real."
- "Listo, gracias."

### 4.4 Recording checklist

Pre-recording:

- Cerrar tabs ruidosos del browser.
- Editor con file tree colapsado si distrae.
- App corriendo (dev server o container) y verificada visualmente.
- Loom abierto, micrófono testeado.

During:

- Una toma única. No editar.
- Si te equivocas en los primeros 30s, reiniciar la grabación. Después de los 30s, continuar.
- Hablar pausado. 3 minutos se hacen cortos.
- Mostrar el cursor donde estás explicando — Loom no resalta automático.

Post:

- Loom procesa, genera link público.
- Pegar URL en el formulario de Asana junto al GitHub URL.

## 5. Submission

Submit via the Palvi Asana form (URL en el correo de Palvi):

| Field | Value |
|---|---|
| Nombre | Felipe Fausset |
| Email | fausset@agy.cl |
| URL del repo | `https://github.com/felipet1987/palvi-sales-cockpit` |
| URL del video | (Loom URL después de grabar) |

Verificar antes de enviar:

- Repo es accesible sin auth (abrir en ventana incógnito).
- Video es accesible sin auth (abrir en ventana incógnito).
- README renderiza correctamente en GitHub.
- Una sola entrega — no se aceptan re-envíos.

## 6. Out of scope

- GitHub Pages deploy. Considerado y rechazado (riesgo de fallo en CI sin upside material).
- GIF de demo en README. Rechazado (rompería la regla de 1 página).
- Branches separadas, tags, releases. No exigidos.
- Topics / badges / CONTRIBUTING / issue templates. No exigidos.
- CI workflow. No exigido.
- Difundir el repo más allá del formulario. No exigido.

## 7. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `gh repo create` falla por nombre tomado | Bajo | Verificar primero con `gh repo view felipet1987/palvi-sales-cockpit` o usar otro nombre |
| Video pasa de 3 min | Medio | Cronometrar pre-grabación. Si pasa, regrabar |
| Loom free tier corta a 5 min | Bajo | Free tier soporta 5 min; nuestro target es 3 min |
| README no renderiza igual en GitHub | Bajo | Auto-verificar visual post-push |
| Evaluadores no abren `task.pdf` desde el repo público | Nulo | No es requerido; solo es artefacto histórico |
| Filtración de info sensible | Nulo | task.pdf y metrics.json son lo que ellos mandaron; no hay secretos propios |
