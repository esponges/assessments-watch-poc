## Context

The app uses `@xenova/transformers` v2 to load ONNX-quantized models in-browser via WebAssembly. The current model config points at `Xenova/detr-resnet-50`, a 170MB general object detector that is both too large and unsuitable for the zero-shot reasoning the PoC needs to demonstrate. Additionally, the Vite dev server doesn't set the security headers required by browsers to enable `SharedArrayBuffer`, which Transformers.js needs for WASM multi-threading — this is the most likely cause of the runtime crashes.

## Goals / Non-Goals

**Goals:**
- Get a single inference cycle working end-to-end: camera frame → model → scored output
- Use CLIP for zero-shot classification so the demo narrative ("LLM on device") holds
- Fix the WASM environment so models can use multi-threading
- Keep changes surgical — nothing beyond what unblocks the pipeline

**Non-Goals:**
- Redesigning the monitoring architecture
- Adding new UI components or pages beyond wiring the existing `/minimal` route
- Performance tuning beyond choosing an appropriate model size

## Decisions

### 1. @huggingface/transformers v3 over @xenova/transformers v2
V3 is the maintained package. Better quantization options, all new model checkpoints target it, and the migration is a find-and-replace on the import path. No reason to stay on v2.

### 2. CLIP (zero-shot image classification) over a dedicated face detector
A dedicated face detector (e.g. yolos-tiny) would be faster, but CLIP is the right model for the narrative: it performs real text-image reasoning ("does this image match this description?"), which demonstrates LLM-class inference on-device. The ~50MB int8 size is acceptable for the target device.

**Alternative considered**: MediaPipe face detection — rejected because it's a classical CV pipeline, not a transformer, which undercuts the LLM-in-browser story.

### 3. Zero-shot prompt set (initial)
```
"a person looking directly at the camera"
"a person looking away from the screen"
"multiple people visible"
"nobody visible in the frame"
```
These cover the core monitoring scenarios and are adjustable without retraining.

### 4. Vite headers approach
Add `server.headers` in `vite.config.ts`:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
This unlocks `SharedArrayBuffer` in the dev server. Production deployment will need equivalent headers at the web server level.

## Risks / Trade-offs

- **Inference speed on low-end hardware** → CLIP int8 on a budget device may hit 2-3s per frame. Mitigation: sample every 3s in AssessmentMinimal, making this acceptable.
- **Model download on first load** → ~50MB cold start. Mitigation: React Query caches the model in memory; subsequent navigations are instant within the session.
- **COOP/COEP headers break cross-origin iframes** → Not relevant for this PoC (no iframes), but worth noting for any future embedding scenario.
