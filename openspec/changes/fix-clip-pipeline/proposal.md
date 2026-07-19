## Why

The core inference pipeline has never worked: wrong model, missing WASM headers, and no route to the test page mean the app crashes before a single frame is analyzed. This needs to be fixed before any monitoring features can be built or benchmarked.

## What Changes

- Replace `@xenova/transformers` v2 with `@huggingface/transformers` v3
- Add COOP + COEP headers to `vite.config.ts` so SharedArrayBuffer is available for WASM multi-threading
- Add `/minimal` route in `App.tsx` pointing to `AssessmentMinimal.tsx`
- Replace `Xenova/detr-resnet-50` (170MB object detector) with `Xenova/clip-vit-base-patch32` (int8, ~50MB) for zero-shot image+text reasoning
- Update `AssessmentMinimal.tsx` to use CLIP's zero-shot classification with monitoring prompts ("person looking at camera", "person looking away", etc.)

## Capabilities

### New Capabilities
- `clip-inference`: On-device CLIP inference on webcam frames using zero-shot text prompts — the core LLM-in-browser capability being demonstrated

### Modified Capabilities

## Impact

- `package.json`: swap `@xenova/transformers` → `@huggingface/transformers`
- `vite.config.ts`: add server headers
- `src/App.tsx`: add `/minimal` route
- `src/utils/aiModelLoader.ts`: update model config and pipeline task
- `src/pages/AssessmentMinimal.tsx`: update to use zero-shot CLIP prompts
