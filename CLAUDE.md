## Project: assessments-watch-poc

**What it is:** A browser-based POC for monitoring students during online assessments using on-device AI — no server-side video processing, no privacy exposure.

**What was built:**
- `/minimal` route (`src/pages/AssessmentMinimal.tsx`) — the main POC page with two parallel inference pipelines:
  - **CLIP** (`Xenova/clip-vit-base-patch32`, q8) via `@huggingface/transformers` v3: scene-level signals — multiple people visible, nobody present, person facing camera.
  - **MediaPipe FaceLandmarker** (478-point mesh, iris indices 468/473): geometric gaze analysis — head yaw from nose/eye-midpoint offset, iris offset from eye-centre deviation. Fires every 3 s via `setInterval`.
- Detection runs entirely client-side via WebAssembly; SharedArrayBuffer enabled with COOP (`same-origin`) + COEP (`credentialless`) headers in `vite.config.ts`.
- `useModel('face-detection')` hook (React Query) manages CLIP loading/caching.

**Key thresholds to tune:** `HEAD_YAW_THRESHOLD = 0.10`, `IRIS_THRESHOLD = 0.15` in `AssessmentMinimal.tsx`.

**Primary anti-cheat target:** second-monitor detection via gaze — identified as the biggest cheating vector.

**Status:** POC working end-to-end; thresholds and UX need real-world calibration before production use.

---

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
