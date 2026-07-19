## ADDED Requirements

### Requirement: CLIP model loads in-browser
The system SHALL load `Xenova/clip-vit-base-patch32` using `@huggingface/transformers` v3 with int8 quantization, without any server-side component.

#### Scenario: Model loads successfully on page open
- **WHEN** the user navigates to `/minimal`
- **THEN** the model status indicator shows "Loading..." then transitions to "Ready"
- **THEN** the loaded model is cached by React Query for the session duration

#### Scenario: Model load fails
- **WHEN** the model cannot be fetched (e.g. no network on first visit)
- **THEN** the status indicator shows "Error" with the failure reason

### Requirement: Webcam frame is classified against text prompts
The system SHALL run zero-shot image classification on each sampled video frame using a fixed set of monitoring prompts.

#### Scenario: Detection cycle produces scored output
- **WHEN** detection is running and a video frame is sampled
- **THEN** the model returns a score (0–1) for each prompt
- **THEN** scores are displayed in the detection log

#### Scenario: Highest-scoring prompt is highlighted
- **WHEN** scores are returned for a frame
- **THEN** the prompt with the highest score is visually highlighted in the UI

### Requirement: SharedArrayBuffer is available in the dev environment
The system SHALL configure the Vite dev server with COOP and COEP headers so WASM multi-threading is enabled.

#### Scenario: App loads without SharedArrayBuffer error
- **WHEN** the dev server is running with the updated vite.config.ts
- **THEN** the browser console shows no SharedArrayBuffer or cross-origin isolation errors
- **THEN** Transformers.js initializes with multi-threading enabled
