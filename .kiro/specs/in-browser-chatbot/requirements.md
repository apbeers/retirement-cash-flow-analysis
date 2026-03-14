# Requirements Document

## Introduction

This feature adds an in-browser AI chatbot to the Retirement Cash Flow Planner (RCFP) application. The chatbot uses the `@mlc-ai/web-llm` library to run a small language model entirely in the user's browser via WebGPU — no server or API keys required. Users can ask natural-language questions about their retirement plan, and the chatbot answers using the financial data (items and settings) already entered in the application.

## Glossary

- **Chatbot_Panel**: The slide-out UI panel that contains the chat interface, including the message list, input field, and send button.
- **Chat_Engine**: The WebLLM engine instance created via `CreateMLCEngine` that loads and runs the language model in the browser.
- **Chat_Module**: The JavaScript module (`js/chatbot.js`) that manages engine lifecycle, message handling, and context assembly.
- **Financial_Context**: A text summary of the user's current `state.items` and `state.settings` data, assembled into a system prompt for the language model.
- **Model_Loader**: The component within Chat_Module responsible for downloading, caching, and initializing the language model weights via WebLLM.
- **RCFP**: The Retirement Cash Flow Planner application.

## Requirements

### Requirement 1: Chatbot Panel Toggle

**User Story:** As a user, I want to open and close a chatbot panel so that I can ask questions about my retirement plan without leaving the current view.

#### Acceptance Criteria

1. WHEN the user clicks the chatbot toggle button, THE Chatbot_Panel SHALL become visible as a slide-out panel anchored to the right side of the viewport.
2. WHEN the user clicks the chatbot toggle button while the Chatbot_Panel is open, THE Chatbot_Panel SHALL close and return to a hidden state.
3. THE Chatbot_Panel SHALL not obscure or shift the sidebar navigation or the main content area on viewports wider than 768px.
4. WHEN the viewport width is 768px or narrower, THE Chatbot_Panel SHALL display as a full-width overlay above the main content.
5. THE chatbot toggle button SHALL be visible on every section of the application (dashboard and all item sections).

### Requirement 2: Model Loading and Initialization

**User Story:** As a user, I want the AI model to load in my browser so that I can chat without sending data to a server.

#### Acceptance Criteria

1. WHEN the user opens the Chatbot_Panel for the first time in a session, THE Model_Loader SHALL begin downloading and initializing the language model using `CreateMLCEngine` from the `@mlc-ai/web-llm` library.
2. WHILE the model is loading, THE Chatbot_Panel SHALL display a progress indicator showing the current download and initialization percentage.
3. WHEN model loading completes, THE Chatbot_Panel SHALL enable the message input field and send button.
4. WHILE the model is loading, THE Chatbot_Panel SHALL keep the message input field and send button disabled.
5. IF model loading fails, THEN THE Chatbot_Panel SHALL display a descriptive error message explaining the failure (e.g., WebGPU not supported, network error).
6. WHEN the model has been previously downloaded and cached by the browser, THE Model_Loader SHALL load from cache without re-downloading the full model weights.
7. THE Model_Loader SHALL use a small model suitable for in-browser execution (parameter count at or below 1.5B, such as Qwen2.5-0.5B, SmolLM2-360M, or Phi-3.5-mini).

### Requirement 3: Financial Context Assembly

**User Story:** As a user, I want the chatbot to know about my entered financial data so that it can give relevant answers about my retirement plan.

#### Acceptance Criteria

1. WHEN the user sends a message, THE Chat_Module SHALL assemble the Financial_Context from the current `state.items` and `state.settings` at the time of the message.
2. THE Financial_Context SHALL include for each item: name, type, category, amount, rate, startYear, endYear, contributionAmount, contributionFrequency, contributionEndYear, withdrawalAmount, withdrawalFrequency, and loan details when present.
3. THE Financial_Context SHALL include the projection settings: startYear, projectionYears, and tax settings (filingStatus, birthYear, annualSocialSecurityBenefit, socialSecurityStartYear).
4. THE Chat_Module SHALL inject the Financial_Context as a system message in the conversation sent to the Chat_Engine.
5. THE Financial_Context SHALL refresh on each user message so that changes made to items or settings between messages are reflected.

### Requirement 4: Chat Messaging

**User Story:** As a user, I want to type questions and receive AI-generated answers about my retirement plan in a conversational interface.

#### Acceptance Criteria

1. WHEN the user types a message and presses Enter or clicks the send button, THE Chat_Module SHALL send the message along with the Financial_Context and conversation history to the Chat_Engine.
2. WHILE the Chat_Engine is generating a response, THE Chatbot_Panel SHALL display a visible loading indicator in the message area.
3. WHEN the Chat_Engine returns a response, THE Chatbot_Panel SHALL display the response as a new message in the conversation thread.
4. THE Chatbot_Panel SHALL display user messages and assistant messages with visually distinct styling (alignment or background color).
5. THE Chatbot_Panel SHALL maintain the conversation history for the duration of the browser session.
6. WHEN a new message is added to the conversation, THE Chatbot_Panel SHALL auto-scroll to the most recent message.
7. IF the Chat_Engine encounters an error during response generation, THEN THE Chatbot_Panel SHALL display an error message in the conversation thread.

### Requirement 5: Streaming Responses

**User Story:** As a user, I want to see the AI response appear word-by-word so that I do not have to wait for the full response before reading.

#### Acceptance Criteria

1. THE Chat_Module SHALL request responses from the Chat_Engine with `stream: true`.
2. WHILE the Chat_Engine is streaming response chunks, THE Chatbot_Panel SHALL append each chunk to the assistant message in real time.
3. WHEN streaming completes, THE Chat_Module SHALL mark the assistant message as finalized in the conversation history.

### Requirement 6: Visual Theme Consistency

**User Story:** As a user, I want the chatbot to match the dark theme of the application so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Chatbot_Panel SHALL use the existing CSS custom properties (`--bg`, `--surface`, `--text`, `--accent`, `--border`) for all its styling.
2. THE Chatbot_Panel SHALL use the `card-surface` class or equivalent styling consistent with other panels in RCFP.
3. WHEN the user changes theme settings in the Settings panel, THE Chatbot_Panel SHALL reflect the updated theme without requiring a page reload.

### Requirement 7: Build System Integration

**User Story:** As a developer, I want the chatbot module to integrate with the existing build pipeline so that the feature works in both development and production modes.

#### Acceptance Criteria

1. THE Chat_Module SHALL be implemented as an ES module (`js/chatbot.js`) following the same pattern as other modules in the application.
2. THE build script (`build.js`) SHALL include `js/chatbot.js` in the concatenation order so that the chatbot is available in the bundled `app.bundle.js`.
3. THE `@mlc-ai/web-llm` library SHALL be loaded via CDN (`https://esm.run/@mlc-ai/web-llm`) using a dynamic import, keeping the library external to the application bundle.
4. THE chatbot HTML markup SHALL be added to `index.html` alongside the existing layout structure.

### Requirement 8: WebGPU Availability Check

**User Story:** As a user on a browser that does not support WebGPU, I want to be informed that the chatbot feature is unavailable so that I understand why it does not work.

#### Acceptance Criteria

1. WHEN the application loads, THE Chat_Module SHALL check for WebGPU support by verifying `navigator.gpu` is available.
2. IF WebGPU is not available, THEN THE chatbot toggle button SHALL display a tooltip or visual indicator stating that the chatbot requires a WebGPU-capable browser.
3. IF WebGPU is not available, THEN THE Chatbot_Panel SHALL display a message explaining that the feature requires WebGPU and listing compatible browsers (Chrome 113+, Edge 113+).
