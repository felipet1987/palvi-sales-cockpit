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

Click `A` de vuelta. Lento, no apurado.

> "Cada dataset cuenta una historia distinta. Eso es lo que el brief pedía: que la app responda diferente a cada uno. Y no es porque haya código por dataset — es porque las severity rules tripean distinto sobre los datos de cada uno."

---

## 01:00 – 02:30 — Walk-through del código (90 s)

Switch to the editor, file `src/domain/metric-registry.ts`.

> "Éste es EL archivo. La decisión central del diseño: una sola tabla — REGISTRY — donde cada métrica vive como una fila."

Scroll to the `REGISTRY` declaration.

> "Cada fila tiene aggregate, format, caption, severity opcional, y un hint. La UI nunca hace switch sobre la metric key — lee Presentation. Agregar una métrica es UNA fila acá."

Scroll al tope del archivo (Cmd+F → `meanIgnoreNull`), mostrar `meanIgnoreNull` y `lastNonNull`.

> "Aggregator distinto por métrica. stale_deals es snapshot, así que último valor del window. Las flow metrics — traffic, leads, deals — son mean ignorando nulls."

Scroll a `deltaSeverity`.

> "Severity por defecto: direction-aware. Un +30% en deals_lost es malo, en deals_won es bueno. Esa inversión vive en una sola línea."

Scroll a `staleDealsSeverity` y `responseTimeSeverity`.

> "Para dos métricas hay overrides absolutos. stale_deals sobre 150 abiertos es CRIT aunque la tendencia sea estable. La severidad final es el max de trend y absolute."

Switch a `src/domain/analysis.ts`. Scroll a `analyze`.

> "La pipeline es función pura. Dataset + window → AnalysisResult. KPIs, alertas rankeadas, funnel 30d, win rate. La UI consume eso vía useMemo. Cero React acá. Por eso testear esto después es trivial."

---

## 02:30 – 03:00 — Lo que dejé fuera (30 s)

Back to the running app (or stay on the editor — does not matter much).

> "Dos cosas para una segunda iteración."

> "Tests por métrica. La pureza de analyze() los hace baratos, pero los dejé por el budget de tres horas."

> "Selector de ventana y anchor day. Hoy hardcoded a siete días sobre el último día del dataset. Cuando esto se conecte a datos en vivo con delay de pipelines, hay que dejar al usuario elegir."

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
