---
inclusion: fileMatch
fileMatchPattern: "**/chatbot.js"
---

# Chatbot Module Guide

## Model
- `Qwen2.5-3B-Instruct-q4f16_1-MLC` — 4096 token context window
- Loaded lazily via dynamic `import('https://esm.run/@mlc-ai/web-llm')` on first panel open
- Requires WebGPU (Chrome 113+ / Edge 113+)

## Context assembly
`assembleFinancialContext()` builds the system prompt from `state.items` and `state.settings`. Sections:
1. Settings (start year, projection years, tax config)
2. Items list (all user items with details)
3. Projection table (year-by-year net worth + type breakdowns)
4. Loan summaries (payoff year, total interest)
5. Monthly cash flow (sampled net monthly in/out)
6. Milestones (net worth thresholds, loan payoffs, contribution ends)
7. Per-item balances (sampled individual asset values)

Tables are sampled every 5 years for 15+ year projections to fit the 4096 token limit.

## Key functions
- `assembleFinancialContext()` → system prompt string
- `toggleChatPanel()` → open/close panel, lazy-load engine
- `sendChatMessage()` → streaming chat completion
- `checkWebGPU()` → boolean WebGPU availability check
