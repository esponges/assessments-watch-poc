## 1. Dependencies and Environment

- [ ] 1.1 Replace `@xenova/transformers` with `@huggingface/transformers` v3 in `package.json` and run `npm install`
- [ ] 1.2 Add COOP + COEP headers to `vite.config.ts` (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`)

## 2. Routing

- [ ] 2.1 Add `/minimal` route in `App.tsx` pointing to `AssessmentMinimal`

## 3. Model Config

- [ ] 3.1 Update `aiModelLoader.ts`: change import to `@huggingface/transformers`, swap model URL to `Xenova/clip-vit-base-patch32`, set task to `zero-shot-image-classification`, add `dtype: 'int8'`
- [ ] 3.2 Remove unused model configs (`object-detection`, `pose-estimation`, `image-classification`) or mark them non-required so only `face-detection` (now CLIP) loads

## 4. AssessmentMinimal Update

- [ ] 4.1 Update import in `AssessmentMinimal.tsx` to match new model output format (zero-shot returns `{ label, score }[]` ranked by score)
- [ ] 4.2 Replace the `predictions.forEach` drawing logic with a simple text display of scored prompts
- [ ] 4.3 Define the monitoring prompt set as a constant: `["a person looking directly at the camera", "a person looking away from the screen", "multiple people visible", "nobody visible in the frame"]`
- [ ] 4.4 Pass prompts to model call: `faceModel(canvas, { candidate_labels: PROMPTS })`

## 5. Verification

- [ ] 5.1 Run dev server — confirm no SharedArrayBuffer console errors
- [ ] 5.2 Navigate to `/minimal` — confirm model status reaches "Ready"
- [ ] 5.3 Start detection — confirm scores appear in the log for each sampled frame
