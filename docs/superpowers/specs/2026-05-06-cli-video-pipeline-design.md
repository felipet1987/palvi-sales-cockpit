# CLI Video Pipeline — Design

**Date:** 2026-05-06
**Author:** felipe (fausset@agy.cl)
**Source script:** `VIDEO_SCRIPT.md`
**Goal:** Producir el video de 3 minutos descrito en `VIDEO_SCRIPT.md` desde la línea de comandos, sin Loom y sin grabación humana en vivo. Output: `build/palvi-demo.mp4`.

## Motivation

`VIDEO_SCRIPT.md` está escrito para grabarse con Loom (GUI, una toma humana). Esta spec reemplaza ese flujo por un pipeline CLI reproducible: cada vez que el script o la app cambian, se regenera el video con `bash scripts/make_video.sh`. Sin tomas, sin re-grabar, sin mic.

Tradeoff aceptado: la voz es TTS macOS (`say -v Mónica`), no humana. Calidad inferior a una grabación con micrófono pero suficiente para la entrega y reproducible.

## Approach (chosen: A — pipeline 3-segmentos paralelos → ffmpeg concat)

Tres segmentos independientes, cada uno producido por su propio script, después concatenados:

- **Segmento 1 (00:00–01:00, 60s):** demo de la app. `agent-browser` (Playwright headed) abre `localhost:5173/?dataset=A`, hace click en tab C, vuelve a A. `ffmpeg` con `avfoundation` graba la región del browser.
- **Segmento 2 (01:00–02:30, 90s):** walkthrough del código. `silicon` renderiza PNGs de cada snippet del archivo `metric-registry.ts` y `analysis.ts`. `ffmpeg` los stitchea como slideshow con crossfade.
- **Segmento 3 (02:30–03:00, 30s):** cierre. `agent-browser` muestra la app de vuelta. `ffmpeg` graba.

Audio paralelo: `say -v Mónica` genera tres `.aiff`, conversión a `.wav` con `ffmpeg`. Sincronización por duración real medida con `ffprobe`.

Composición final: `ffmpeg concat` para video, otro `concat` para audio, mux a `palvi-demo.mp4`.

### Approaches descartadas

- **B (single-pass live):** una sola grabación de pantalla durante toda la corrida. Frágil — si agent-browser falla a 02:30, perdés todo. Sincronización TTS-acción difícil porque `say` introduce latencia variable.
- **C (slideshow reveal.js):** todo en deck web, agent-browser maneja el deck. Pierde "ver app real" — el reviewer ve screenshots embebidos, no la app moviéndose. El brief explícitamente pide ver dataset A vs C en vivo.

## Architecture

### File layout

```
video/
├── script/
│   ├── narration_01_demo.txt        # 60s narración bloque 1
│   ├── narration_02_editor.txt      # 90s bloque 2
│   └── narration_03_close.txt       # 30s bloque 3
├── snippets/                         # input para silicon
│   ├── 01_registry.ts
│   ├── 02_aggregators.ts
│   ├── 03_delta_severity.ts
│   ├── 04_absolute_overrides.ts
│   └── 05_analyze.ts
├── build/                            # generados, gitignored
│   ├── audio_01.wav … audio_03.wav
│   ├── code_01.png … code_05.png
│   ├── seg_01_demo.mp4
│   ├── seg_02_editor.mp4
│   ├── seg_03_close.mp4
│   ├── logs/NN_*.log
│   └── palvi-demo.mp4               # FINAL
├── scripts/
│   ├── 00_preflight.sh              # checa deps, dev server
│   ├── 01_record_demo.sh            # agent-browser + ffmpeg seg_01
│   ├── 02_render_editor.sh          # silicon → seg_02 slideshow
│   ├── 03_record_close.sh           # agent-browser + ffmpeg seg_03
│   ├── 04_tts.sh                    # say → wavs
│   ├── 05_compose.sh                # ffmpeg concat + amix → final
│   └── make_video.sh                # orchestrador (corre 00→05)
└── README.md
```

`video/` es un subdirectorio nuevo en la raíz del repo. `video/build/` se agrega al `.gitignore`.

### Pipeline

```
00_preflight ──► 04_tts (TTS independiente) ─┐
              │                              │
              ├─► 01_record_demo (paralelizable)
              ├─► 02_render_editor (paralelizable)
              ├─► 03_record_close (paralelizable)
                                             │
                                             ▼
                                    05_compose ──► palvi-demo.mp4
```

`make_video.sh` orquesta secuencialmente por defecto. Flag `--parallel` corre 01/02/03/04 en paralelo (todos independientes).

## Components

| Componente | Tool | Input | Output |
|------------|------|-------|--------|
| TTS | `say -v Mónica -o build/audio_NN.aiff -r 175` + `ffmpeg -i .aiff .wav` | `script/narration_NN.txt` | `build/audio_NN.wav` (mono 44.1k) |
| Code render | `silicon --language ts --theme Dracula --background '#1e1e2e' --no-window-controls --pad-horiz 40 --pad-vert 40 -o build/code_NN.png` | `snippets/NN_*.ts` | PNG ~1280×720 fit |
| Browser drive | `agent-browser` (Playwright headed, viewport 1280×720) | URL + steps JSON | ventana visible en display 1 |
| Screen rec | `ffmpeg -f avfoundation -i "1:none" -framerate 30 -video_size 1280x720 -pix_fmt yuv420p -c:v libx264 -preset fast -crf 23` | display index + región | `build/seg_NN.mp4` (silent) |
| Slideshow | `ffmpeg -loop 1 -t <dur> -i code_NN.png` per snippet + filter complex `xfade` chain | PNGs + duraciones | `seg_02_editor.mp4` |
| Compose | `ffmpeg -f concat -i video.txt -f concat -i audio.txt` | 3 mp4 + 3 wav | `palvi-demo.mp4` |

### Resolución y codec

- Video: 1280×720, 30fps, h264 yuv420p (compat universal).
- Audio: 44.1kHz mono → upmix a stereo en compose, AAC 128k.
- Container: mp4, `+faststart` para streaming-friendly.

### agent-browser steps (segmento 1)

Selectores existentes verificados en código (`src/ui/components/AlertList.tsx`, `src/ui/components/DatasetSwitcher.tsx`). NO hace falta agregar `data-testid` — Radix Tabs renderiza `role="tab"` y el hero contiene texto fijo "Tu foco hoy".

Pseudocódigo (ajustar a API real de agent-browser):

```
await page.goto('http://localhost:5173/?dataset=A')
await page.getByText('Tu foco hoy').waitFor()
await sleep(<dur_01a>)                                      # narración bloque 1a (dataset A intro)
await page.getByRole('tab', { name: 'C' }).click()
await sleep(<dur_01b>)                                      # narración bloque 1b (dataset C sano)
await page.getByRole('tab', { name: 'A' }).click()
await sleep(<dur_01c>)                                      # narración bloque 1c (cierre)
```

**Sleep timing strategy:** dividir cada `narration_NN.txt` en sub-archivos por acción (`narration_01a.txt`, `01b.txt`, `01c.txt`). TTS genera un wav por sub-archivo. La duración exacta de cada wav (medida con `ffprobe`) es el `sleep` correspondiente. Concat los sub-wavs en `audio_01.wav` final. Esto da sincronización determinística sin marcadores manuales.

## Composition timeline

```
[seg_01_demo.mp4   60s] [seg_02_editor.mp4   90s] [seg_03_close.mp4   30s]   ← video track
[audio_01.wav      60s] [audio_02.wav        90s] [audio_03.wav       30s]   ← audio track

0────────────────60───────────────────────150──────────────────180s
```

### Sync strategy

1. Generar TTS primero (script `04_tts.sh`).
2. Medir duración real con `ffprobe -i audio_NN.wav -show_entries format=duration -of csv=p=0`.
3. Para cada segmento de video:
   - Sub-narración drives sleeps → video duration ≈ audio duration por construcción.
   - Si video < audio (sleeps acumulados < wav real): padear con `tpad=stop_mode=clone:stop_duration=<diff>` (freeze last frame).
   - Si video > audio: agregar silencio al final del wav con `apad=pad_dur=<diff>`. Nunca speedup audio (cambia pitch).
4. Concat con `-c copy` si todos los segmentos comparten codec params; sino re-encode antes.

### Slideshow editor (seg_02 interno)

- 5 snippets × ~18s c/u = 90s.
- Crossfade 0.5s entre PNGs (`xfade=transition=fade:duration=0.5`).
- Highlight progresivo: out of scope fase 1.

## Error handling

| Failure | Detection | Recovery |
|---------|-----------|----------|
| dev server no corre | `curl -fsS localhost:5173` en preflight | Bash exit 1 + msg "corre `npm run dev` primero" |
| `silicon` no instalado | `command -v silicon` en preflight | Exit 1 + msg "`brew install silicon`" |
| ffmpeg sin permiso AVFoundation | Stderr pattern `Operation not permitted` | Exit 1 + msg "Privacy → Screen Recording → autorizar Terminal" |
| agent-browser timeout (selector no aparece) | Playwright `TimeoutError` | Retry 1×, después fail. Log selector faltante. |
| Audio más largo que video | `ffprobe` compara duraciones | Pad video con `tpad` |
| Concat fail (codec mismatch) | ffmpeg stderr | Re-encode segments con params idénticos antes concat |
| Display index incorrecto | `ffmpeg -f avfoundation -list_devices true -i ""` muestra opciones | Default a "1" (main display), exponer flag `--display N` |

### Idempotencia

- Cada script chequea si su output ya existe; salta si no se pasó `--force`.
- `make_video.sh --clean` borra `build/` (excepto logs).
- Logs en `build/logs/NN_*.log`. Falla → tail último log a stderr.

## Testing / verification

Manual gates por etapa (no unit tests — pipeline shell):

1. **Preflight:** `bash scripts/00_preflight.sh` → exit 0 sin tocar nada.
2. **TTS:** `bash scripts/04_tts.sh` → reproducir `audio_01.wav` con `afplay`. Confirmar pronuncia "stale_deals", "deltaSeverity", "useMemo" inteligible. Si Mónica dice raro algún término técnico, reescribir narración fonéticamente (`useMemo` → `iús memo`, `severity` → `severiti`).
3. **Snippets render:** `open build/code_01.png` → texto legible, theme dark, padding correcto.
4. **Demo grab:** `open build/seg_01_demo.mp4` → ver cursor, click tab C visible, hero data legible. Sin truncar bordes.
5. **Editor slideshow:** `open build/seg_02_editor.mp4` → cada snippet aparece ~18s, crossfade suave.
6. **Final:** `open build/palvi-demo.mp4` → reproducción end-to-end, audio sincroniza con visual ±0.5s, total ≈180s.

### Acceptance criteria

- Duración 170–190s.
- File size <100MB.
- Audio inteligible con headphones.
- Cada bloque del script ejecuta su acción visual.
- No frames negros prolongados (>1s).

### Out of scope (fase 2 si hay tiempo)

- Highlight progresivo de líneas en silicon PNG.
- Camera bubble (TTS no la necesita).
- Subtítulos burned-in.
- Smooth zoom/pan dentro slides editor (Ken Burns).
- Voz humana grabada.

## Dependencies

Instaladas (verificadas):
- `ffmpeg` (`/usr/local/bin/ffmpeg`)
- `agent-browser` (`/usr/local/bin/agent-browser`)
- `playwright` (npm global)
- macOS `say` con voz `Mónica` (es_ES)
- VS Code (referencia visual del script original — no requerido por el pipeline)

A instalar:
- `silicon` → `brew install silicon` (~10s, single binary).

Permisos macOS:
- Terminal/iTerm: Screen Recording habilitado en System Settings → Privacy & Security.

## Risks

- **TTS pronunciación de términos técnicos en inglés** dentro de narración española suena artificial. Mitigación: reescritura fonética en los `narration_NN.txt`; pre-revisar cada wav antes de componer.
- **Selectores text/role pueden romperse si la app cambia copy.** Mitigación: si el plan rompe sincronización, agregar `data-testid` mínimos a `AlertList` y `TabsTrigger` (cambio trivial, una línea c/u). Por ahora innecesario.
- **Latencia de `agent-browser` puede desfasar visual vs audio.** Mitigación: `sleep` durations vienen del `ffprobe` de cada sub-wav; tolerancia ±0.5s aceptable. Si latencia consistente, restar offset fijo.
- **AVFoundation device index varía entre máquinas.** Mitigación: `00_preflight.sh` lista displays y exporta `DISPLAY_INDEX` env var.
- **silicon no soporta animación.** Aceptado — slideshow estático es deliberado.
