# Palvi Sales Cockpit

Executive daily report for a B2B SaaS Sales Manager. Reads a bundled `metrics.json` containing four sibling datasets (`A`, `B`, `C`, `D`) and surfaces, in five minutes or less, the top severity-ranked items the user should focus on today.

```bash
npm install
npm run dev          # http://localhost:5173/?dataset=A
                     # también ?dataset=B, ?dataset=C, ?dataset=D
                     # o usar las tabs A/B/C/D del header
npm run typecheck
npm run build
```

Los cuatro datasets están en `metrics.json` y se navegan vía la query string o las tabs. El trail completo de decisiones (BRD → análisis → REASONS Canvas prompt → código) vive en [`spdd/`](./spdd/), por si querés ver qué decidí yo y qué generó la IA.

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
