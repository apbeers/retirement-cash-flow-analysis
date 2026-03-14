# Implementation Plan: In-Browser Chatbot

## Overview

Implement an in-browser AI chatbot for the Retirement Cash Flow Planner using WebLLM. The chatbot runs a small language model client-side via WebGPU, assembles financial context from app state, and provides streaming conversational responses. All chatbot logic lives in a single new module `js/chatbot.js`, integrated into the existing build pipeline with HTML/CSS additions.

## Tasks

- [x] 1. Create the chatbot module with core functions
  - [x] 1.1 Create `js/chatbot.js` with module-level state variables and `checkWebGPU()` function
    - Define `engine`, `engineLoading`, `engineReady`, `conversationHistory`, `isGenerating` module-level variables
    - Define `MODEL_ID` constant (`SmolLM2-360M-Instruct-q4f16_1-MLC`)
    - Implement `checkWebGPU()` that returns `!!navigator.gpu`
    - Export `toggleChatPanel` and `sendChatMessage` (stub initially)
    - _Requirements: 8.1, 7.1_

  - [x] 1.2 Implement `assembleFinancialContext()` in `js/chatbot.js`
    - Import `state` from `./appState.js`
    - Serialize `state.settings` (startYear, projectionYears, tax settings) into text
    - Serialize each item in `state.items` with name, type, category, amount, rate, startYear, endYear, contribution/withdrawal details, and loan details when present
    - Return the complete system prompt string
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 1.3 Write property test for financial context completeness
    - **Property 3: Financial context completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 1.4 Write property test for WebGPU detection correctness
    - **Property 9: WebGPU detection correctness**
    - **Validates: Requirements 8.1**

- [x] 2. Implement panel toggle and engine initialization
  - [x] 2.1 Implement `toggleChatPanel()` in `js/chatbot.js`
    - Toggle `#chatbot-panel` display between `none` and visible
    - On first open: call `checkWebGPU()`, show error if unsupported, otherwise call `initEngine()`
    - Set tooltip on toggle button when WebGPU is unavailable
    - _Requirements: 1.1, 1.2, 8.1, 8.2, 8.3_

  - [x] 2.2 Implement `initEngine()` in `js/chatbot.js`
    - Dynamic import `@mlc-ai/web-llm` from `https://esm.run/@mlc-ai/web-llm`
    - Call `CreateMLCEngine` with `MODEL_ID` and `initProgressCallback` that updates a progress bar in the panel
    - On success: set `engineReady = true`, enable input and send button
    - On failure: call `showError()` with descriptive message, keep input disabled
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 2.3 Write property test for toggle round-trip
    - **Property 1: Toggle round-trip**
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. Implement chat messaging and streaming
  - [x] 3.1 Implement `sendChatMessage()` in `js/chatbot.js`
    - Read and trim input from `#chatbot-input`; return early if empty or `isGenerating` is true
    - Call `assembleFinancialContext()` to build fresh system message
    - Build messages array: system message at index 0, then conversation history, then new user message
    - Append user message bubble via `appendMessage('user', text)`
    - Set `isGenerating = true`, disable input
    - Call `engine.chat.completions.create({ messages, stream: true })`
    - Loop over streamed chunks, accumulate text, call `updateStreamingMessage(accumulated)`
    - On completion: finalize assistant message in `conversationHistory`, set `isGenerating = false`, re-enable input, auto-scroll
    - On error: show error message bubble, do not add failed response to history, re-enable input
    - _Requirements: 3.4, 3.5, 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3_

  - [x] 3.2 Implement DOM helper functions in `js/chatbot.js`
    - `appendMessage(role, text)`: create a div with class `chatbot-msg-user` or `chatbot-msg-assistant`, append to `#chatbot-messages`
    - `updateStreamingMessage(text)`: update the current assistant bubble's text content during streaming
    - `setInputEnabled(enabled)`: enable/disable `#chatbot-input` and `#chatbot-send`
    - `showError(message)`: append an error-styled message bubble with class `chatbot-msg-error`
    - _Requirements: 4.3, 4.4, 4.7_

  - [ ]* 3.3 Write property test for message array structure
    - **Property 4: Message array structure**
    - **Validates: Requirements 3.4, 4.1**

  - [ ]* 3.4 Write property test for context freshness on state change
    - **Property 5: Context freshness on state change**
    - **Validates: Requirements 3.5**

  - [ ]* 3.5 Write property test for conversation history growth
    - **Property 7: Conversation history growth**
    - **Validates: Requirements 4.5**

  - [ ]* 3.6 Write property test for streaming chunk accumulation
    - **Property 8: Streaming chunk accumulation**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add HTML markup and CSS styles
  - [x] 5.1 Add chatbot toggle button and panel markup to `index.html`
    - Add `#chatbot-toggle` button (fixed bottom-right, chat icon, onclick `toggleChatPanel()`, aria-label)
    - Add `#chatbot-panel` div with header (title + close button), `#chatbot-messages` area (aria-live="polite"), and `#chatbot-input-area` (input + send button, both disabled initially)
    - Place before the closing `</body>` tag, after the modal markup
    - _Requirements: 1.1, 1.5, 7.4, 8.2_

  - [x] 5.2 Add chatbot CSS styles to `styles.css`
    - `#chatbot-toggle`: fixed position, bottom-right, z-index above content, uses `--accent`
    - `#chatbot-panel`: fixed position, right side, full height, 360px wide, uses `--surface`, `--border`, `--text`
    - `#chatbot-messages`: flex column, overflow-y auto, scrollable
    - `.chatbot-msg-user` / `.chatbot-msg-assistant`: distinct alignment and background colors using CSS custom properties
    - `.chatbot-msg-error`: error styling with red tint
    - `.chatbot-progress`: progress bar styling for model loading
    - Mobile responsive: full-width panel at ≤768px
    - _Requirements: 1.3, 1.4, 4.4, 6.1, 6.2, 6.3_

  - [ ]* 5.3 Write property test for toggle button present across all sections
    - **Property 2: Toggle button present across all sections**
    - **Validates: Requirements 1.5**

  - [ ]* 5.4 Write property test for message display and distinct styling
    - **Property 6: Message display and distinct styling**
    - **Validates: Requirements 4.3, 4.4**

- [x] 6. Build integration and wiring
  - [x] 6.1 Update `build.js` to include chatbot module
    - Add `'js/chatbot.js'` to the `files` array after `'js/eventHandlers.js'`
    - Add `window.toggleChatPanel = toggleChatPanel;` and `window.sendChatMessage = sendChatMessage;` to the globals section
    - _Requirements: 7.2_

  - [x] 6.2 Update `js/main.js` to import and expose chatbot functions
    - Import `toggleChatPanel` and `sendChatMessage` from `./chatbot.js`
    - Add `window.toggleChatPanel = toggleChatPanel;` and `window.sendChatMessage = sendChatMessage;`
    - _Requirements: 7.1_

  - [x] 6.3 Update `script.js` to re-export chatbot functions
    - Add re-exports for `toggleChatPanel` and `sendChatMessage` from `./js/chatbot.js`
    - _Requirements: 7.1_

  - [x] 6.4 Run build and verify bundle
    - Run `node build.js` to regenerate `app.bundle.js`
    - Verify no errors in the build output
    - _Requirements: 7.2, 7.3_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `@mlc-ai/web-llm` library is loaded via CDN dynamic import — it is NOT bundled into `app.bundle.js`
